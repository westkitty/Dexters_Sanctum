import { decodePostcard, type IslandView } from './postcard.ts';

const signature = [137, 80, 78, 71, 13, 10, 26, 10];
const keyword = 'DextersSanctum\0';
const textType = 0x74455874;
const headerType = 0x49484452;
const dataType = 0x49444154;
const endType = 0x49454e44;
const maxBytes = 16 * 1024 * 1024;
const maxPixels = 4_000_000;
const maxTextBytes = 512;
const maxChunks = 8192;

const crcTable = Uint32Array.from({length: 256}, (_, byte) => {
  for (let bit = 0; bit < 8; bit++) byte = (byte >>> 1) ^ (byte & 1 ? 0xedb88320 : 0);
  return byte >>> 0;
});

function crc32(bytes: Uint8Array, start: number, end: number) {
  let crc = 0xffffffff;
  for (let i = start; i < end; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[i]) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

const encoder = new TextEncoder();
const marker = encoder.encode(keyword);

function containsMarker(bytes: Uint8Array, start: number, length: number) {
  return length >= marker.length && marker.every((value, i) => bytes[start + i] === value);
}

type Inspection = {end: number; view: IslandView | null};

/** Read only PNG structure and our text chunk. Image data is never inflated by this parser. */
function inspect(bytes: Uint8Array): Inspection | null {
  if (!signature.every((byte, i) => bytes[i] === byte)) return null;
  const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = signature.length;
  let sawImageData = false;
  let view: IslandView | null = null;
  for (let chunk = 0; chunk < maxChunks && offset + 12 <= bytes.length; chunk++) {
    const length = data.getUint32(offset);
    const type = data.getUint32(offset + 4);
    const start = offset + 8;
    const end = start + length;
    if (end + 4 > bytes.length) return null;

    if (chunk === 0) {
      if (type !== headerType || length !== 13 || crc32(bytes, offset + 4, end) !== data.getUint32(end)) return null;
      const width = data.getUint32(start), height = data.getUint32(start + 4);
      if (width < 1 || height < 1 || width * height > maxPixels) return null;
    } else if (type === headerType) {
      return null;
    }
    if (type === dataType) sawImageData = true;
    if (type === textType && containsMarker(bytes, start, length)) {
      if (view || length > maxTextBytes || crc32(bytes, offset + 4, end) !== data.getUint32(end)) return null;
      const fragment = String.fromCharCode(...bytes.subarray(start + marker.length, end));
      view = decodePostcard(fragment);
      if (!view) return null;
    }
    if (type === endType) {
      if (!sawImageData || length !== 0 || end + 4 !== bytes.length ||
          crc32(bytes, offset + 4, end) !== data.getUint32(end)) return null;
      return {end: offset, view};
    }
    offset = end + 4;
  }
  return null;
}

export async function sealPostcard(png: Blob, fragment: string): Promise<Blob | null> {
  if (png.size > maxBytes || !decodePostcard(fragment)) return null;
  const inspected = inspect(new Uint8Array(await png.arrayBuffer()));
  if (!inspected || inspected.view) return null;

  const payload = encoder.encode(keyword + fragment);
  if (png.size + payload.length + 12 > maxBytes) return null;
  const chunk = new Uint8Array(payload.length + 12);
  const header = new DataView(chunk.buffer);
  header.setUint32(0, payload.length);
  header.setUint32(4, textType);
  chunk.set(payload, 8);
  header.setUint32(8 + payload.length, crc32(chunk, 4, 8 + payload.length));
  return new Blob([png.slice(0, inspected.end), chunk, png.slice(inspected.end)], {type:'image/png'});
}

export async function readPostcard(file: Blob): Promise<
  {status:'ready'; view:IslandView} | {status:'missing'|'invalid'|'too-large'}
> {
  if (file.size > maxBytes) return {status:'too-large'};
  const inspected = inspect(new Uint8Array(await file.arrayBuffer()));
  if (!inspected) return {status:'invalid'};
  return inspected.view ? {status:'ready',view:inspected.view} : {status:'missing'};
}
