import * as T from 'three';

export const TAU = Math.PI * 2;

export function randomFrom(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export const ground = (x: number, z: number) =>
  0.14 + 0.10 * Math.sin(x * 0.72 + z * 0.65) + 0.07 * Math.cos(z * 1.5 - x * 0.55);

const sphere = new T.SphereGeometry(1, 16, 12);
const box = new T.BoxGeometry(1, 1, 1);

export function matte(color: T.ColorRepresentation, roughness = 0.85) {
  return new T.MeshStandardMaterial({ color, roughness });
}

export function glow(color: T.ColorRepresentation, strength = 0.8) {
  return new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: strength, roughness: 0.55 });
}

export function mesh(parent: T.Object3D, geometry: T.BufferGeometry, material: T.Material | T.Material[], xyz = [0, 0, 0], shadows = true) {
  const object = new T.Mesh(geometry, material);
  object.position.set(xyz[0], xyz[1], xyz[2]);
  object.castShadow = shadows;
  object.receiveShadow = shadows;
  parent.add(object);
  return object;
}

export function blob(parent: T.Object3D, material: T.Material, xyz: number[], size: number[], shadows = true) {
  const object = mesh(parent, sphere, material, xyz, shadows);
  object.scale.set(size[0], size[1], size[2]);
  return object;
}

export function block(parent: T.Object3D, material: T.Material, xyz: number[], size: number[]) {
  const object = mesh(parent, box, material, xyz);
  object.scale.set(size[0], size[1], size[2]);
  return object;
}

export function tube(parent: T.Object3D, material: T.Material, points: number[][], width: number, segments = 20) {
  const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(p[0], p[1], p[2])));
  return mesh(parent, new T.TubeGeometry(curve, segments, width, 6), material);
}

export function group(parent: T.Object3D, x = 0, y = 0, z = 0) {
  const object = new T.Group();
  object.position.set(x, y, z);
  parent.add(object);
  return object;
}

export function batches(parent: T.Object3D, geometry: T.BufferGeometry, material: T.Material, transforms: {x: number; y: number; z: number; sx: number; sy: number; sz: number; yaw?: number; lean?: number; color?: T.Color}[], shadows = false) {
  const objects = new T.InstancedMesh(geometry, material, transforms.length);
  const dummy = new T.Object3D();
  transforms.forEach((p, index) => {
    dummy.position.set(p.x, p.y, p.z);
    dummy.rotation.set(0, p.yaw ?? 0, p.lean ?? 0);
    dummy.scale.set(p.sx, p.sy, p.sz);
    dummy.updateMatrix();
    objects.setMatrixAt(index, dummy.matrix);
    if (p.color) objects.setColorAt(index, p.color);
  });
  objects.castShadow = shadows;
  objects.receiveShadow = true;
  parent.add(objects);
  return objects;
}
