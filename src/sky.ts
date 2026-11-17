import * as T from 'three';
import { blob, group, mesh, randomFrom, TAU, tube } from './model';
import skyPainting from './assets/lantern-isle-sky.webp';

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
  scene.background = new T.Color('#111b2a');
  const painting = new T.TextureLoader().load(skyPainting, background => {
    scene.background = background;
  });
  painting.colorSpace = T.SRGBColorSpace;
  painting.anisotropy = 2;

  const moon = group(scene);
  const amber = halo('#edab63');
  const haze = halo('#8bb9c0');
  const moonGlow = sprite(moon, amber, 7.7, .69);
  moonGlow.position.z = -.2;
  const face = group(moon);
  const surface = new T.MeshBasicMaterial({ color: '#ffda9d', toneMapped: false });
  const crater = new T.MeshBasicMaterial({ color: '#e1a779', toneMapped: false });
  const eye = new T.MeshBasicMaterial({ color: '#60304d', toneMapped: false });
  surface.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec3 moonNormal;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nmoonNormal = normal;');
    shader.fragmentShader = `
      varying vec3 moonNormal;
      float craterRelief(vec2 point, vec2 center, vec2 extent, float strength) {
        float d = length((point - center) / extent);
        float basin = 1.0 - smoothstep(.2, 1.0, d);
        float rim = smoothstep(.78, .98, d) * (1.0 - smoothstep(.98, 1.22, d));
        return strength * (rim * .28 - basin);
      }
    ` + shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      vec3 direction = normalize(moonNormal);
      vec2 face = direction.xy;
      float rolling = sin(face.x*12.0 + cos(face.y*15.0)*1.6) * cos(face.y*17.0 - face.x*4.0);
      float filigree = sin(face.x*57.0 + face.y*63.0) * sin(face.y*78.0 - face.x*11.0);
      float freckles = sin(dot(direction,vec3(336.0,410.0,260.0))) * cos(dot(direction,vec3(501.0,373.0,145.0)));
      float maria = .071*rolling + .022*filigree + .014*freckles;
      maria += craterRelief(face,vec2(-.45,.46),vec2(.22,.13),.17);
      maria += craterRelief(face,vec2(-.66,.49),vec2(.069,.062),.12);
      maria += craterRelief(face,vec2(-.52,-.30),vec2(.15,.12),.17);
      maria += craterRelief(face,vec2(.52,.51),vec2(.15,.12),.14);
      maria += craterRelief(face,vec2(.65,.32),vec2(.13,.073),.13);
      maria += craterRelief(face,vec2(.27,-.57),vec2(.22,.10),.16);
      maria += craterRelief(face,vec2(.47,-.64),vec2(.10,.07),.13);
      maria += craterRelief(face,vec2(-.22,-.67),vec2(.13,.08),.13);
      float phase = smoothstep(-.83,.65,dot(direction,normalize(vec3(-.5,.58,.62))));
      float rim = pow(1.0 - max(0.0,direction.z),3.4);
      diffuseColor.rgb *= .64 + phase*.37 + maria + rim*.07;
      diffuseColor.rgb = mix(diffuseColor.rgb,vec3(.83,.46,.33),(1.0-phase)*.20);
    `);
  };
  const globe = mesh(face, new T.SphereGeometry(1.62,48,32), surface, [0,0,0], false);
  const haloRing = new T.MeshBasicMaterial({
    color: '#d7a16e', side: T.DoubleSide, transparent: true, opacity: .19, depthWrite: false, toneMapped: false,
  });
  mesh(face, new T.RingGeometry(1.76,1.768,98), haloRing,[0,0,-.07], false);
  mesh(face, new T.RingGeometry(1.9,1.904,98), haloRing,[0,0,-.08], false);
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
  for (let i = 0; i < 13; i++) {
    const cloud = sprite(softClouds, i % 3 ? haze : amber, 1, .10 + rand() * .17);
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
    map: oceanCanvas, color: '#8883b8', transparent: true, opacity: .35,
    depthWrite: false, blending: T.AdditiveBlending, toneMapped: false,
  }));
  ocean.position.set(0, -6.15, -3);
  ocean.rotation.x = -Math.PI / 2;
  scene.add(ocean);

  return {
    moon, face, globe, amber, haze,
    dispose() { painting.dispose(); },
    resize(aspect:number) {
      const ratio = aspect / 1.5;
      painting.repeat.set(Math.min(.97,ratio*.97), Math.min(.97,.97/ratio));
      painting.offset.copy(painting.repeat).multiplyScalar(-.5).addScalar(.5);
    },
    update(camera: T.Camera, time: number, arc: number, motion: number, sneeze: number, mobile: boolean) {
      const angle = arc * .79 + .09;
      moon.position.set((mobile ? 1.8 : 4.15) + Math.sin(angle)*(mobile ? 3.3 : 3.9), (mobile ? 4.95 : 2.25) + Math.cos(angle)*1.35 + Math.sin(time*.24)*.08*motion, -4.8);
      face.quaternion.copy(camera.quaternion);
      face.scale.set(1 + sneeze*.12, 1-sneeze*.12, 1);
      moonGlow.material.opacity = .49 + .14 * Math.cos(angle) + sneeze * .18;
      painting.offset.x=(1-painting.repeat.x)*.5+Math.sin(camera.position.x*.12)*.011*motion;
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
