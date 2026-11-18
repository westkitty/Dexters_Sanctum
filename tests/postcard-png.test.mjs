import assert from 'node:assert/strict';
import test from 'node:test';
import { encodePostcard } from '../src/postcard.ts';
import { readPostcard, sealPostcard } from '../src/postcard-png.ts';

const plain = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGN4vL/lPwAH1QMmDfrJzQAAAABJRU5ErkJggg==','base64');
const image = new Blob([plain],{type:'image/png'});
const view = {moon:-.37,yaw:.20,pitch:-.09,stars:[[-9,8,-7],[3,6,-12]]};

test('the PNG carries the same versioned view and retains the original image chunks', async () => {
  const sealed=await sealPostcard(image,encodePostcard(view));
  assert.equal(sealed.type,'image/png');
  const bytes=Buffer.from(await sealed.arrayBuffer());
  const originalEnd=plain.length-12;
  assert.deepEqual(bytes.subarray(0,originalEnd),plain.subarray(0,originalEnd));
  assert.deepEqual(bytes.subarray(-12),plain.subarray(-12));
  assert.deepEqual(await readPostcard(sealed),{status:'ready',view});
  assert.equal(await sealPostcard(sealed,encodePostcard(view)),null);
});

test('ordinary, non-PNG, and oversized imports report distinct recoverable conditions', async () => {
  assert.deepEqual(await readPostcard(image),{status:'missing'});
  assert.deepEqual(await readPostcard(new Blob(['not a PNG'])),{status:'invalid'});
  assert.deepEqual(await readPostcard(new Blob([new Uint8Array(16*1024*1024+1)])),{status:'too-large'});
  assert.equal(await sealPostcard(image,'#postcard=2.future'),null);
});

test('corrupted metadata, duplicate metadata and truncated PNGs cannot supply a view', async () => {
  const sealed=await sealPostcard(image,encodePostcard(view));
  const bytes=Buffer.from(await sealed.arrayBuffer());
  const textChunk=bytes.subarray(plain.length-12,bytes.length-12);
  const duplicate=new Blob([bytes.subarray(0,bytes.length-12),textChunk,bytes.subarray(-12)]);
  assert.deepEqual(await readPostcard(duplicate),{status:'invalid'});
  assert.deepEqual(await readPostcard(sealed.slice(0,-1)),{status:'invalid'});
  bytes[bytes.indexOf('#postcard=')+2]^=1;
  assert.deepEqual(await readPostcard(new Blob([bytes])),{status:'invalid'});
});
