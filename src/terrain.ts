import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { batches, blob, block, glow, ground, group, matte, mesh, randomFrom, TAU, tube } from './model';
import { sprite } from './sky';
import { bakeStatic, finish } from './surfaces';

const rand = randomFrom(9183);
const stone = ['#40464b','#56535a','#564a50','#333946','#766561','#4e5660'];
const greens = ['#40583f','#55634a','#465449','#5f6851','#394f43','#536353','#383f44'];

function rim(theta: number) {
  return 1 + .07*Math.sin(theta*3+1) + .06*Math.cos(theta*5-.3) + .045*Math.sin(theta*9);
}

export function onIsland(x: number, z: number, margin = 1) {
  return Math.hypot(x/5.75,z/3.95) < rim(Math.atan2(z/3.95,x/5.75))*margin;
}

export function inPool(x: number, z: number, margin = 1) {
  return Math.hypot((x-2.7)/1.63,(z-.89)/1.58) < margin;
}

function islandGeometry() {
  const rings = [[.039,0],[.21,0],[.45,0],[.67,0],[.84,0],[.97,0],[1.02,-.30],[.96,-.87],[.78,-1.65],[.68,-2.55],[.42,-3.35],[.18,-4.25],[0,-4.55]];
  const b = 96;
  const positions: number[] = [], indices: number[] = [], colors: number[] = [], uv: number[] = [];
  rings.forEach(([ratio,y], row) => {
    for (let j = 0; j < b; j++) {
      const theta = j/b*TAU;
      const rough = rim(theta) * (row < 6 ? 1 : .90 + .16*rand());
      const x = Math.cos(theta) * 5.75 * ratio * rough + Math.max(0,row-7)*.17;
      const z = Math.sin(theta) * 3.95 * ratio * rough;
      positions.push(x, y + ground(x,z)+(row>5 ? (rand()-.5)*.41 : 0), z);
      uv.push(x*.68+y*.23,z*.65-y*.61);
      const variety = .5 + Math.sin(theta*7+y*.94)*.23 + Math.sin(theta*13-y*2)*.17;
      const top = greens[Math.min(greens.length-1,Math.floor(variety*greens.length))];
      const edge = stone[(row+Math.floor(rand()*3))%stone.length];
      const tint = new T.Color(row<6?top:edge);
      tint.multiplyScalar(.89+rand()*.22);
      colors.push(tint.r,tint.g,tint.b);
      if (row > 0) {
        const a = (row-1)*b+j, next = (row-1)*b+(j+1)%b;
        indices.push(a,next,a+b,next,next+b,a+b);
      }
    }
  });
  for(let j=1;j<b-1;j++)indices.push(0,j+1,j);
  const geom = new T.BufferGeometry();
  geom.setAttribute('position', new T.Float32BufferAttribute(positions,3));
  geom.setAttribute('color', new T.Float32BufferAttribute(colors,3));
  geom.setAttribute('uv', new T.Float32BufferAttribute(uv,2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

export function makeTerrain(scene: T.Scene, halo: T.Texture) {
  const root = group(scene);
  const soil = finish('#d1ccb3','earth',.96);
  soil.vertexColors = true;
  soil.side = T.DoubleSide;
  mesh(root,islandGeometry(),soil);
  const rock = new T.DodecahedronGeometry(1,0);
  const cliffs = Array.from({length:140}, (_,i) => {
    const a = rand()*TAU, row = (i%4 + rand()*.72)/4, ring = rim(a);
    const distance = 1.015-.63*row;
    return {x:Math.cos(a)*5.75*ring*distance+.5*row, z:Math.sin(a)*3.95*ring*distance,
      y:-.25-row*3.62, sx:.18+rand()*.64, sy:.17+rand()*.52, sz:.18+rand()*.49,
      yaw:rand()*TAU, lean:rand()*.6, color:new T.Color(i%6===0 ? '#586c6c' : stone[i%stone.length])};
  });
  batches(root,rock,finish('#e1daca','stone'),cliffs,true);
  const path = Array.from({length:26},(_,i) => {
    const t = i/25;
    const x = -2.37 + t*3.5 + Math.sin(t*TAU)*.25, z = -.16+t*3.27;
    return {x,z,y:ground(x,z)-.025,sx:.29+rand()*.15,sy:.077,sz:.17+rand()*.13,yaw:rand()*.5,color:new T.Color(i%3 ? '#8b8277':'#695f61')};
  });
  batches(root,rock,finish('#ddd2ba','stone'),path);
  const poolRim = Array.from({length:30},(_,i) => {
    const a=i/30*TAU;
    if(a>.56&&a<1.30)return null;
    const x=2.7+Math.cos(a)*1.68,z=.89+Math.sin(a)*1.59;
    return {x,z,y:ground(x,z)+.05,sx:.15+rand()*.22,sy:.08+rand()*.13,sz:.11+rand()*.145,yaw:rand()*TAU,color:new T.Color(i%4 ? '#677b72':'#a39b84')};
  });
  batches(root,rock,matte('#ffffff'),poolRim.filter(item=>item!==null),true);
  const wood=finish('#623d32','wood'), edge=finish('#9b6950','wood');
  const bridge=group(root,.87,ground(.87,1.1),1.10);
  bridge.rotation.y=-.29;
  for(let i=0;i<12;i++) {
    const x=(i-5.5)*.14, y=.21-Math.pow(x,2)*.20;
    const plank=block(bridge,i%3 ? wood : edge,[x,y,0],[.137,.09,.68]);
    plank.rotation.z=-x*.21;
  }
  for (const z of [-.39,.39]) {
    for (const x of [-.77,0,.77]) block(bridge,edge,[x,.31,z],[.062,.35,.062]);
    tube(bridge,wood,[[-.87,.4,z],[0,.54,z],[.87,.4,z]],.032,12);
  }

  bakeStatic(bridge);

  const vines = [];
  const crawlers = group(root);
  const ledgeSeed = randomFrom(4673);
  const moss = finish('#495441','earth');
  for (let i=0;i<27;i++) {
    const a=ledgeSeed()*TAU;
    const x=Math.cos(a)*5.64*rim(a), z=Math.sin(a)*3.82*rim(a);
    const y=ground(x,z)-.04;
    const drop=.32+ledgeSeed()*.70;
    tube(crawlers,moss,[[x*.94,y,z*.94],[x,y-.07,z],[x*1.008,y-drop*.48,z*1.012],
      [x*.963,y-drop,z*.981]],.013+ledgeSeed()*.017,11);
    for(let leaf=0;leaf<5;leaf++){
      const t=leaf/5, side=leaf%2?-1:1, size=.025+ledgeSeed()*.05;
      vines.push({x:x*(1-t*.039)+side*.043,y:y-t*drop,z:z*(1-t*.024),sx:size,sy:size*.80,
        sz:size*.40,lean:side*.7,yaw:a,color:new T.Color(leaf%3?'#60704a':'#938153')});
    }
  }
  bakeStatic(crawlers);
  batches(root,new T.IcosahedronGeometry(1,0),matte('#aaa69b'),vines);

  const cottage=makeCottage(root,halo);
  return {root,cottage};
}

function makeCottage(parent:T.Object3D, halo:T.Texture) {
  const house=group(parent,-2.46,ground(-2.46,-1.13),-1.13);
  house.rotation.y=.16;
  const plaster=finish('#ad8d74','plaster'), plinth=finish('#655b56','stone'), beam=finish('#422a27','wood');
  const lip=finish('#96624e','wood'), roof=finish('#43323b','stone'), copper=new T.MeshStandardMaterial({color:'#92604b',roughness:.61,metalness:.24});
  const amber=glow('#ffb357',1.32), deep=finish('#261c22','wood');
  block(house,plinth,[0,.08,0],[2.8,.21,1.96]);
  block(house,plaster,[0,.86,0],[2.52,1.53,1.68]);
  const shape=new T.Shape().moveTo(-1.26,0).lineTo(1.26,0).lineTo(-.12,1.19).closePath();
  mesh(house,new T.ExtrudeGeometry(shape,{depth:1.68,bevelEnabled:false}),plaster,[0,1.58,-.84]);
  for(const x of [-1.28,1.28]) {
    for(const z of [-.85,.85]) block(house,beam,[x,.88,z],[.12,1.61,.12]);
  }
  for(const y of [.23,1.52]) block(house,beam,[0,y,.865],[2.63,.095,.12]);
  for(const side of [-1,1]){
    const brace=block(house,beam,[side*.99,1.36,.864],[.67,.073,.08]);
    brace.rotation.z=side*.67;
    const gable=block(house,lip,[side*.33,1.79,.862],[.052,.44,.07]);
    gable.rotation.z=side*.23;
  }
  const foundation:Parameters<typeof batches>[3]=[];
  for(let row=0;row<2;row++) for(let i=0;i<12;i++){
    const tint=new T.Color(i%3===0?'#877565':'#635d59').multiplyScalar(.84+rand()*.35);
    foundation.push({x:(i-5.5)*.223+(row-.5)*.07,y:.085+row*.087,z:.984,
      sx:.202,sy:.085,sz:.11,yaw:(rand()-.5)*.14,lean:(rand()-.5)*.08,color:tint});
  }
  batches(house,new RoundedBoxGeometry(1,1,1,1,.11),finish('#eee1cb','stone'),foundation);
  const tiles: Parameters<typeof batches>[3]=[];
  for (const side of [-1,1]) {
    const cover=block(house,roof,[side*.70-.1,2.16,0],[1.89,.15,2.16]);
    cover.rotation.z=-side*.635;
    for(let column=0;column<14;column++) for(let row=0;row<7;row++) {
      const x=side*(.075+row*.212)-.1;
      tiles.push({x,y:2.75-row*.157,z:(column-6.5)*.153+(row%2)*.035,
        sx:.257,sy:.065+rand()*.013,sz:.148,lean:-side*.635+(rand()-.5)*.04,color:new T.Color(['#63444a','#775148','#815448','#66474d','#936050'][Math.floor(rand()*5)])});
    }
    for(const z of [-1.086,1.086]) {
      const bar=block(house,copper,[side*.70-.1,2.19,z],[1.9,.105,.085]);
      bar.rotation.z=-side*.635;
    }
  }
  batches(house,new RoundedBoxGeometry(1,1,1,1,.14),finish('#eee0d6','stone'),tiles,true);
  block(house,copper,[-.10,2.82,0],[.14,.105,2.23]);
  block(house,plinth,[.64,2.73,-.48],[.39,.87,.40]);
  for(let i=0;i<4;i++) block(house,lip,[.64,2.4+i*.17,-.48],[.407,.036,.418]);
  block(house,beam,[.64,3.16,-.48],[.5,.13,.49]);
  const ridgeEnd=group(house,-.10,2.88,.98);
  const ridgeKnob=new T.Mesh(new T.OctahedronGeometry(.115),copper);
  ridgeKnob.position.y=.11;
  ridgeEnd.add(ridgeKnob);
  const finial=new T.Mesh(new T.ConeGeometry(.048,.19,8),copper);
  finial.position.y=.24;
  ridgeEnd.add(finial);

  const door=group(house,.2,.16,.919);
  blob(door,beam,[0,.54,0],[.37,.57,.074]);
  block(door,deep,[0,.30,.035],[.56,.6,.085]);
  blob(door,deep,[0,.55,.044],[.285,.42,.065]);
  for(let i=-2;i<=2;i++) block(door,beam,[i*.104,.35,.104],[.015,.65,.02]);
  blob(door,copper,[.19,.45,.119],[.039,.039,.027]);
  const wreath = new T.Mesh(new T.TorusGeometry(.087,.013,6,18),copper);
  wreath.position.set(0,.725,.107);
  door.add(wreath);
  for(let i=0;i<3;i++) block(house,plinth,[.20,.15-i*.044,.98+i*.13],[.80+i*.09,.12,.24]);
  function window(x:number,y:number,z:number,turn:number,size:number) {
    const window=group(house,x,y,z);
    window.rotation.y=turn;
    window.scale.setScalar(size);
    block(window,beam,[0,0,0],[.67,.82,.105]);
    block(window,amber,[0,0,.07],[.52,.66,.046]);
    block(window,beam,[0,0,.115],[.047,.67,.04]);
    block(window,beam,[0,0,.115],[.54,.043,.04]);
    block(window,lip,[0,-.405,.09],[.76,.085,.24]);
    for(const side of [-1,1]){
      const shutter=block(window,lip,[side*.376,.012,.057],[.126,.67,.062]);
      shutter.rotation.y=side*.42;
      block(window,beam,[side*.384,.148,.112],[.108,.033,.037]);
      block(window,beam,[side*.384,-.148,.112],[.108,.033,.037]);
    }
    block(window,lip,[0,.418,.079],[.76,.065,.14]);
    const gleam=sprite(window,halo,2.05,.48);
    gleam.position.z=.12;
  }
  window(-.77,.92,.89,0,.87);
  window(.91,.94,.89,0,.63);
  window(1.27,1.01,0,Math.PI/2,.92);
  const high=group(house,-.095,1.942,.88);
  blob(high,beam,[0,0,0],[.26,.26,.07]);
  blob(high,amber,[0,0,.055],[.18,.18,.05]);
  block(high,beam,[0,0,.11],[.025,.34,.02]);
  block(high,beam,[0,0,.11],[.34,.025,.02]);
  const rose = new T.Mesh(new T.TorusGeometry(.232,.023,8,28),copper);
  rose.position.z=.105;
  high.add(rose);
  bakeStatic(house);

  const warmLight=new T.PointLight('#ffad61',11,6,1.7);
  warmLight.position.set(-.3,1.22,1.35);
  house.add(warmLight);
  const smoke=Array.from({length:9},()=>sprite(house,halo,1,.12));
  return {house,warmLight,amber,update(time:number,motion:number) {
    smoke.forEach((p,i)=>{
      const a=(time*.23*motion+i/9)%1;
      p.position.set(.64+a*1.8,3.27+a*1.24,-.48-a*.38);
      p.scale.setScalar(.22+1.3*a);
      p.material.opacity=.24*Math.sin(a*Math.PI);
      p.material.color.set('#ab92dd');
    });
  }};
}
