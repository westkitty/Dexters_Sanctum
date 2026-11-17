import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { randomFrom } from './model';

type Surface = 'stone' | 'wood' | 'plaster' | 'earth';
const textures = new Map<Surface, T.CanvasTexture>();

// One small shared relief map per material family. The color remains art-directed per object.
function relief(kind: Surface) {
  const cached = textures.get(kind);
  if (cached) return cached;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d')!;
  const pixels = context.createImageData(size, size);
  const rand = randomFrom(683);
  const circle = Math.PI * 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size * circle, v = y / size * circle;
      const grain = (rand() - .5) * 37;
      const broad = Math.sin(u * 3 + Math.cos(v * 4)) * Math.cos(v * 2 - u * 2);
      const fine = Math.sin(u * 11 + v * 13) * Math.cos(v * 9 - u * 8);
      const pattern = kind === 'wood'
        ? 32 * Math.sin(v * 15 + Math.sin(u * 2) * 1.9) + 15 * Math.cos(v * 31 + Math.cos(u * 4))
        : kind === 'stone'
          ? 29 * broad + 22 * fine + 15 * Math.sin(v * 17 + 2 * Math.sin(u * 5))
          : 27 * broad + (kind === 'earth' ? 23 : 9) * fine;
      const shade = Math.round(170 + pattern + grain);
      const offset = (y * size + x) * 4;
      pixels.data.set([shade, shade, shade, 255], offset);
    }
  }
  context.putImageData(pixels, 0, 0);
  const map = new T.CanvasTexture(canvas);
  map.wrapS = map.wrapT = T.RepeatWrapping;
  textures.set(kind, map);
  return map;
}

export function finish(color: T.ColorRepresentation, kind: Surface, roughness = .9) {
  const bumpMap = relief(kind);
  return new T.MeshStandardMaterial({
    color, roughness, bumpMap, bumpScale: kind === 'wood' ? .041 : kind === 'plaster' ? .024 : .066,
  });
}

// Bake stationary detail while keeping its parent and shared materials available to ray picking.
export function bakeStatic(root: T.Object3D) {
  root.updateWorldMatrix(true, true);
  const inverse = root.matrixWorld.clone().invert();
  const batches = new Map<string, T.Mesh<T.BufferGeometry, T.Material>[]>();
  root.traverse(object => {
    if (!(object instanceof T.Mesh) || object instanceof T.InstancedMesh || object instanceof T.SkinnedMesh || Array.isArray(object.material)) return;
    const key = `${object.material.uuid}/${object.castShadow}/${object.receiveShadow}`;
    const objects = batches.get(key) ?? [];
    objects.push(object);
    batches.set(key, objects);
  });
  const matrix = new T.Matrix4();
  for (const objects of batches.values()) {
    if (objects.length < 2) continue;
    const parts = objects.map(object => {
      const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
      return geometry.applyMatrix4(matrix.multiplyMatrices(inverse, object.matrixWorld));
    });
    const geometry = mergeGeometries(parts);
    for (const part of parts) part.dispose();
    if (!geometry) continue;
    const first = objects[0];
    const baked = new T.Mesh(geometry, first.material);
    baked.castShadow = first.castShadow;
    baked.receiveShadow = first.receiveShadow;
    root.add(baked);
    for (const object of objects) object.removeFromParent();
  }
}
