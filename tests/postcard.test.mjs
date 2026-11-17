import assert from 'node:assert/strict';
import test from 'node:test';
import { decodePostcard, encodePostcard, postcardPrefix, starLimit } from '../src/postcard.ts';

const view = {
  moon: -.78641,
  yaw: .23558,
  pitch: -.16744,
  stars: [[-13.729, 7.526, -12.001], [4.263, -5.822, 19.488]],
};

test('living postcards round-trip the moon, camera and world-space stroke order', () => {
  const hash = encodePostcard(view);
  assert.match(hash, /^#postcard=1\.[A-Za-z0-9_-]+$/);
  const restored = decodePostcard(hash);
  for (const field of ['moon', 'yaw', 'pitch']) {
    assert.ok(Math.abs(restored[field] - view[field]) <= .00005);
  }
  assert.equal(restored.stars.length, view.stars.length);
  restored.stars.forEach((point, i) => {
    point.forEach((coordinate, axis) => assert.ok(Math.abs(coordinate - view.stars[i][axis]) <= 1 / 128));
  });
});

test('an empty island and a full constellation fit in bounded fragments', () => {
  for (const stars of [[], Array.from({length: starLimit}, (_, i) => [i - 30, 4, 16])]) {
    const state = {moon: .95, yaw: -.54, pitch: .25, stars};
    const hash = encodePostcard(state);
    assert.ok(hash.length <= 454);
    assert.deepEqual(decodePostcard(hash), state);
  }
});

test('malformed, oversized, out-of-range and future postcard fragments are rejected', () => {
  const hash = encodePostcard(view);
  for (const invalid of [
    '', '#not-a-postcard', '#postcard=1.%20', '#postcard=1.A',
    hash.slice(0, -3), hash.replace('1.', '2.'), '#postcard=1.' + 'A'.repeat(900),
  ]) assert.equal(decodePostcard(invalid), null);

  const bytes = Uint8Array.from(atob(hash.slice(postcardPrefix.length + 2)
    .replaceAll('-', '+').replaceAll('_', '/')), char => char.charCodeAt(0));
  const data = new DataView(bytes.buffer);
  data.setInt16(7, 32767);
  const forged = btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
  assert.equal(decodePostcard(postcardPrefix + '1.' + forged), null);
  assert.equal(encodePostcard({...view, pitch: Infinity}), null);
  assert.equal(encodePostcard({...view, stars: Array(starLimit + 1).fill([0, 1, 2])}), null);
});
