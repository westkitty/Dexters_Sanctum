import * as T from 'three';
import { blob, group, mesh, randomFrom, TAU, tube } from './model';

function texture(width: number, height: number, paint: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext('2d')!);
  const result = new T.CanvasTexture(canvas);
  result.colorSpace = T.SRGBColorSpace;
  return result;
}

export function halo(color: string) {
  return texture(128, 128, c => {
    const lens = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    lens.addColorStop(0, color + 'ba');
    lens.addColorStop(.18, color + '75');
    lens.addColorStop(.48, color + '27');
    lens.addColorStop(1, color + '00');
    c.fillStyle = lens;
    c.fillRect(0, 0, 128, 128);
  });
}

export function sprite(parent: T.Object3D, map: T.Texture, size: number, opacity = 1) {
  const object = new T.Sprite(new T.SpriteMaterial({
    map, opacity, transparent: true, depthWrite: false, toneMapped: false, blending: T.AdditiveBlending,
  }));
  object.scale.setScalar(size);
  parent.add(object);
  return object;
}

export function makeSky(scene: T.Scene) {
  const rand = randomFrom(23719);
  const background = texture(1600, 1000, c => {
    const night = c.createLinearGradient(0, 0, 0, 1000);
    night.addColorStop(0, '#0c0c26');
    night.addColorStop(.48, '#211b40');
    night.addColorStop(1, '#11122a');
    c.fillStyle = night;
    c.fillRect(0, 0, 1600, 1000);
    c.globalCompositeOperation = 'screen';
    for (let i = 0; i < 190; i++) {
      const x = rand() * 1770 - 85;
      const lane = 690 - 0.25 * x + 155 * Math.sin(x * .004);
      const y = lane + (rand() + rand() - 1) * 260;
      const radius = 24 + rand() * 145;
      const mist = c.createRadialGradient(x, y, 0, x, y, radius);
      mist.addColorStop(0, ['#60395912', '#3d38731a', '#334e7318', '#31617413'][i % 4]);
      mist.addColorStop(1, '#00000000');
      c.fillStyle = mist;
      c.fillRect(x - radius, y - radius, 2 * radius, 2 * radius);
    }
    for (let i = 0; i < 1800; i++) {
      const x = rand() * 1600, y = rand() * 1000;
      const spark = rand();
      c.globalAlpha = .13 + Math.pow(spark, 3) * .71;
      c.fillStyle = ['#f5e0bc', '#c6e4ff', '#e5bcfa'][i % 3];
      const size = .22 + Math.pow(spark, 8) * 1.48;
      c.beginPath();
      c.arc(x, y, size, 0, TAU);
      c.fill();
      if (i % 95 === 0) {
        c.fillRect(x - 5, y - .45, 10, .9);
        c.fillRect(x - .45, y - 5, .9, 10);
      }
    }
  });
  scene.background = background;

  const moon = group(scene);
  const amber = halo('#ffbf77');
  const haze = halo('#a69aff');
  const moonGlow = sprite(moon, amber, 8.9, .86);
  moonGlow.position.z = -.2;
  const face = group(moon);
  const surface = new T.MeshBasicMaterial({ color: '#ffd594', toneMapped: false });
  const crater = new T.MeshBasicMaterial({ color: '#e1a779', toneMapped: false });
  const light = new T.MeshBasicMaterial({ color: '#ffe6af', toneMapped: false });
  const eye = new T.MeshBasicMaterial({ color: '#60304d', toneMapped: false });
  surface.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec3 moonNormal;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nmoonNormal = normal;');
    shader.fragmentShader = 'varying vec3 moonNormal;\n' + shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      float crescent = .77 + .25*smoothstep(-.90,.75,moonNormal.x+.38*moonNormal.y);
      diffuseColor.rgb *= crescent;
    `);
  };
  const globe = mesh(face, new T.SphereGeometry(1.62,48,32), surface, [0,0,0], false);
  for (let i = 0; i < 55; i++) {
    const x = (rand() - .5) * 3;
    const y = (rand() - .5) * 3;
    if (x * x + y * y > 1.84 || (Math.abs(x) < .9 && Math.abs(y) < .75)) continue;
    const r = .035 + rand() * .155;
    const z = Math.sqrt(1.62 ** 2 - x * x - y * y) - .02;
    blob(face, i % 3 ? crater : light, [x, y, z], [r, r * .78, .04], false);
  }
  const expression = group(face, 0, 0, 1.53);
  for (const s of [-1, 1]) {
    tube(expression, eye, [[s*.23,.14,.06],[s*.42,.22,.035],[s*.64,.13,-.035]], .023, 9);
    blob(expression, crater, [s*.72,-.13,-.075],[.17,.076,.03],false);
  }
  tube(expression, eye, [[-.14,-.21,.078],[.01,-.25,.09],[.17,-.19,.078]], .016, 9);
  const traveller=group(scene);
  traveller.visible=false;
  for(let i=0;i<6;i++){
    const step=sprite(traveller,i%2?amber:haze,1,1-i*.13);
    step.position.set(i*.16,i*.027,0);
    step.scale.set(.33+i*.19,.16+i*.032,1);
  }
  const softClouds = group(scene);
  const nightPink=new T.Color('#f3a7e8'), nightBlue=new T.Color('#99dbff');
  const clouds: {sprite: T.Sprite; x: number; y: number; z: number; phase: number}[] = [];
  for (let i = 0; i < 31; i++) {
    const cloud = sprite(softClouds, i % 3 ? haze : amber, 1, .16 + rand() * .31);
    cloud.scale.set(8 + rand() * 12, 1 + rand() * 2.7, 1);
    const x = (rand() - .5) * 49, y = -4.9 + rand() * 4.4, z = -13 + rand() * 13;
    clouds.push({sprite: cloud, x, y, z, phase: rand() * TAU});
  }
  const oceanCanvas = texture(512, 256, c => {
    c.clearRect(0, 0, 512, 256);
    for (let i = 0; i < 110; i++) {
      const x = rand() * 512, y = rand() * 250, width = 2 + rand() * 67;
      const strip = c.createLinearGradient(x - width, 0, x + width, 0);
      const tint = i % 3 === 0 ? '#ebb386' : '#7ad3e4';
      strip.addColorStop(0, tint + '00');
      strip.addColorStop(.5, tint + (i % 4 ? '54' : '99'));
      strip.addColorStop(1, tint + '00');
      c.fillStyle = strip;
      c.fillRect(x-width, y, width*2, i % 3 ? .7 : 1.45);
    }
  });
  const ocean = new T.Mesh(new T.PlaneGeometry(51, 30), new T.MeshBasicMaterial({
    map: oceanCanvas, color: '#8883b8', transparent: true, opacity: .67,
    depthWrite: false, blending: T.AdditiveBlending, toneMapped: false,
  }));
  ocean.position.set(0, -6.15, -3);
  ocean.rotation.x = -Math.PI / 2;
  scene.add(ocean);

  return {
    moon, face, globe, amber, haze,
    resize(aspect:number) {
      const ratio = aspect / 1.6;
      background.repeat.set(Math.min(1,ratio), Math.min(1,1/ratio));
      background.offset.copy(background.repeat).multiplyScalar(-.5).addScalar(.5);
    },
    update(camera: T.Camera, time: number, arc: number, motion: number, sneeze: number, mobile: boolean) {
      const angle = arc * .79 + .09;
      moon.position.set((mobile ? 1.8 : 4.15) + Math.sin(angle)*(mobile ? 3.3 : 3.9), (mobile ? 4.95 : 2.25) + Math.cos(angle)*1.35 + Math.sin(time*.24)*.08*motion, -4.8);
      face.quaternion.copy(camera.quaternion);
      face.scale.set(1 + sneeze*.12, 1-sneeze*.12, 1);
      moonGlow.material.opacity = .65 + .16 * Math.cos(angle) + sneeze * .14;
      for (const item of clouds) {
        item.sprite.material.color.copy(nightPink).lerp(nightBlue,(arc+1)*.50);
        item.sprite.position.set(item.x + 2 * motion * Math.sin(time * .045 + item.phase), item.y, item.z);
      }
      ocean.position.x = Math.sin(time*.13)*.6*motion;
      const passing=(time+21)%83;
      traveller.visible=passing<3.3;
      if(traveller.visible)traveller.position.set(5.5-passing*3.4,4.8-passing*.26,-6.9);
    },
  };
}
