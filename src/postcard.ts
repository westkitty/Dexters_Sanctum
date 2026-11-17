export const starLimit = 54;
export const islandViewBounds = {
  moon: [-.95, .95],
  yaw: [-.54, .50],
  pitch: [-.19, .25],
} as const;

export type StarPoint = [number, number, number];
export type IslandView = {
  moon: number;
  yaw: number;
  pitch: number;
  stars: StarPoint[];
};

export const postcardPrefix = '#postcard=';
const version = '1.';
const cameraPrecision = 10_000;
const starPrecision = 64;
const starExtent = 128;
const headerBytes = 7;
const pointBytes = 6;
const maxPayloadLength = Math.ceil((headerBytes + starLimit * pointBytes) * 4 / 3);

const viewFields = ['moon', 'yaw', 'pitch'] as const;

function within(value: number, min: number, max: number) {
  return Number.isFinite(value) && value >= min && value <= max;
}

function validView(view: IslandView) {
  return viewFields.every(field => {
    const [min, max] = islandViewBounds[field];
    return within(view[field], min, max);
  }) &&
    view.stars.length <= starLimit &&
    view.stars.every(point => point.length === 3 && point.every(value => within(value, -starExtent, starExtent)));
}

/** V1 stores the star count, three camera values, and signed world coordinates in stroke order. */
export function encodePostcard(view: IslandView): string | null {
  if (!validView(view)) return null;
  const bytes = new Uint8Array(headerBytes + view.stars.length * pointBytes);
  const data = new DataView(bytes.buffer);
  bytes[0] = view.stars.length;
  viewFields.forEach((field, index) => data.setInt16(1 + index * 2, Math.round(view[field] * cameraPrecision)));
  view.stars.forEach((point, index) => point.forEach((value, axis) =>
    data.setInt16(headerBytes + index * pointBytes + axis * 2, Math.round(value * starPrecision))));
  const payload = btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
  return postcardPrefix + version + payload;
}

export function decodePostcard(hash: string): IslandView | null {
  const prefix = postcardPrefix + version;
  if (!hash.startsWith(prefix) || hash.length > prefix.length + maxPayloadLength) return null;
  const payload = hash.slice(prefix.length);
  if (!/^[A-Za-z0-9_-]+$/.test(payload)) return null;
  try {
    const bytes = Uint8Array.from(atob(payload.replaceAll('-', '+').replaceAll('_', '/')), char => char.charCodeAt(0));
    const count = bytes[0];
    if (bytes.length < headerBytes || count > starLimit || bytes.length !== headerBytes + count * pointBytes) return null;
    const data = new DataView(bytes.buffer);
    const view: IslandView = {
      moon: data.getInt16(1) / cameraPrecision,
      yaw: data.getInt16(3) / cameraPrecision,
      pitch: data.getInt16(5) / cameraPrecision,
      stars: [],
    };
    for (let index = 0; index < count; index++) {
      const offset = headerBytes + index * pointBytes;
      view.stars.push([
        data.getInt16(offset) / starPrecision,
        data.getInt16(offset + 2) / starPrecision,
        data.getInt16(offset + 4) / starPrecision,
      ]);
    }
    return validView(view) ? view : null;
  } catch {
    return null;
  }
}
