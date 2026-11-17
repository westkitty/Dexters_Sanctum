import * as T from 'three';
import { batches, blob, block, glow, ground, group, matte, randomFrom, TAU, tube } from './model';
import { sprite } from './sky';
import { inPool, onIsland } from './terrain';
import { bakeStatic, finish } from './surfaces';

function lance(curve: number) {
  const shape = new T.BufferGeometry();
  shape.setAttribute('position', new T.Float32BufferAttribute([
    0,-.50,0, -.51,-.21,curve*.32, .51,-.21,curve*.32,
    -.57,.13,curve*.63, .57,.13,curve*.63, 0,.04,curve*.78, .2,.50,curve,
  ],3));
  shape.setIndex([0,2,5,0,5,1,1,5,3,2,4,5,3,5,6,5,4,6]);
  shape.computeVertexNormals();
  return shape;
}

function fernFrond() {
  const positions:number[]=[], colors:number[]=[];
  const deep=new T.Color('#6e8356'), bright=new T.Color('#c4cc83');
  const blade=(a:number[],b:number[],tip:number[],side:number[])=>{
    for(const [point,tint] of [[a,deep],[b,bright],[tip,bright],[a,deep],[tip,bright],[side,deep]] as const){
      positions.push(point[0],point[1],point[2]);
      colors.push(tint.r,tint.g,tint.b);
    }
  };
  const spine=(t:number)=>Math.sin(Math.PI*t*.76)*.49;
  for(let i=0;i<8;i++){
    const t=i/8, next=(i+1)/8;
    blade([-.012,spine(t),t],[.015,spine(t),t],[.012,spine(next),next],[-.009,spine(next),next]);
    const width=.26*Math.sin(Math.PI*(.11+t*.78))*(1-t*.36);
    for(const side of [-1,1]){
      blade([0,spine(t),t],[width*.58*side,spine(t)+.075,t+.04],
        [width*side,spine(t)+.086,t+.145],[width*.40*side,spine(t)+.013,t+.110]);
    }
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  geometry.computeVertexNormals();
  return geometry;
}

export function makeGarden(scene: T.Scene, amber:T.Texture, blue:T.Texture) {
  const root=group(scene);
  const rand=randomFrom(13582);
  const stalks: Parameters<typeof batches>[3]=[], flowers: Parameters<typeof batches>[3]=[];
  const pickable:T.Object3D[]=[];
  const palette=['#75bda5','#ba688a','#9eb1ac','#d99a73','#9b8dad','#8dbb8e'];
  const grassMaterial=matte('#d5ddc2');
  grassMaterial.side=T.DoubleSide;
  const sway={value:0};
  grassMaterial.onBeforeCompile=shader=>{
    shader.uniforms.sway=sway;
    shader.vertexShader='uniform float sway;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      float bend=pow(max(0.0,position.y+.5),2.0);
      transformed.x+=bend*.80*sin(sway*1.22+instanceMatrix[3].x*.72+instanceMatrix[3].z*.91);
    `);
  };
  const grassGeo=lance(1.5);
  const bloomGeo=new T.IcosahedronGeometry(1,0);
  for(let i=0;i<2400;i++){
    const x=(rand()-.5)*11.4,z=(rand()-.5)*7.8;
    if(!onIsland(x,z,.96)||inPool(x,z,1.08)||(x<-1.05&&x>-3.87&&z<-0.09&&z>-2.29)) continue;
    const pathX=-2.37+(z+.16)*1.07;
    if(z>-.35&&Math.abs(x-pathX)<.42) continue;
    const bank=.56+.44*(.5+.5*Math.sin(x*1.41-1.32*z));
    const height=(.071+rand()*.36)*bank;
    const color=new T.Color(['#809854','#4f7864','#789462','#b1a477','#667d51'][i%5]);
    stalks.push({x,y:ground(x,z)+height*.46,z,sx:.059,sy:height,sz:.046,yaw:rand()*TAU,lean:(rand()-.5)*.75,color});
    if(i%8===0){
      const r=.035+rand()*.057;
      const tint=new T.Color(palette[i%palette.length]);
      for(let p=0;p<5;p++){
        const a=p/5*TAU;
        flowers.push({x:x+Math.cos(a)*r*.75,y:ground(x,z)+height*.88,z:z+Math.sin(a)*r*.75,
          sx:r*.75,sy:r*.35,sz:r*1.05,yaw:-a,color:tint});
      }
      flowers.push({x,y:ground(x,z)+height*.91,z,sx:r*.58,sy:r*.43,sz:r*.58,color:new T.Color('#ffe1a1')});
    }
  }
  batches(root,grassGeo,grassMaterial,stalks);
  const blossoms=batches(root,bloomGeo,matte('#e9d9c2',.74),flowers);
  pickable.push(blossoms);

  const ferns:Parameters<typeof batches>[3]=[];
  const fernSeed=randomFrom(964);
  for(const [x,z,scale] of [[-3.12,1.26,.65],[-3.75,2.02,.55],[-2.6,2.44,.70],[-.84,2.70,.52],
    [.51,2.78,.56],[3.0,2.51,.43],[4.56,1.35,.67],[4.75,-.42,.49],[2.38,-1.83,.56],[-4.58,-.56,.54]]){
    for(let i=0;i<5;i++){
      const s=scale*(.69+fernSeed()*.38);
      ferns.push({x:x+(fernSeed()-.5)*.15,y:ground(x,z)+.026,z:z+(fernSeed()-.5)*.15,
        sx:s,sy:s*.89,sz:s,yaw:i*1.25+fernSeed()*.20,lean:(fernSeed()-.5)*.21,
        color:new T.Color(i%2?'#8eb18b':'#92a875')});
    }
  }
  const fernMaterial=matte('#ece4c4',.82);
  fernMaterial.vertexColors=true;
  fernMaterial.side=T.DoubleSide;
  fernMaterial.onBeforeCompile=shader=>{
    shader.uniforms.sway=sway;
    shader.vertexShader='uniform float sway;\n'+shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      transformed.x += position.z*position.z*.11*sin(sway*1.24+instanceMatrix[3].x);
    `);
  };
  pickable.push(batches(root,fernFrond(),fernMaterial,ferns));

  const branch=finish('#503b35','wood');
  const crowns: Parameters<typeof batches>[3]=[], leaves: Parameters<typeof batches>[3]=[];
  const reflective=group(root);
  const trees=group(reflective);
  const leafRand=randomFrom(77411);
  const treePositions=[[-4.33,-1.70,.79],[.47,-2.68,.88],[3.89,-1.52,.69],[-4.63,.35,.54]];
  treePositions.forEach(([x,z,size], index)=>{
    const tree=group(trees,x,ground(x,z),z);
    tree.scale.setScalar(size);
    tube(tree,branch,[[0,0,0],[.11,.61,0],[.09,1.33,.053],[-.10,2.23,.1],[.06,2.93,.08]],.095,14);
    for(let i=0;i<8;i++){
      const a=i/8*TAU+.4, y=1.22+rand()*1.22;
      const bx=Math.cos(a)*(.43+rand()*.6), bz=Math.sin(a)*(.39+rand()*.54);
      tube(tree,branch,[[.07,y-.34,0],[bx*.56,y+.2,bz*.56],[bx,y+.53,bz]],.04,8);
      for(let j=0;j<10;j++){
        const s=.20+rand()*.27;
        const lx=x+(bx+(rand()-.5)*.93)*size, ly=tree.position.y+(y+.55+(rand()-.37)*.7)*size;
        const lz=z+(bz+(rand()-.5)*.83)*size;
        const colors=index===1?['#3e6660','#5d7865','#829184','#a09b75']:['#62504e','#795d50','#936b59','#596557'];
        const tint=new T.Color(colors[j%4]);
        crowns.push({x:lx,y:ly,z:lz,sx:s*.72*size,sy:s*.49*size,sz:s*.69*size,
          yaw:rand()*TAU,lean:rand(),color:tint});
        for(let leaf=0;leaf<12;leaf++){
          const a=leafRand()*TAU, r=s*(.30+.52*leafRand())*size;
          const blade=(.13+leafRand()*.17)*size;
          leaves.push({x:lx+Math.cos(a)*r,y:ly+(leafRand()-.3)*s*.99*size,z:lz+Math.sin(a)*r,
            sx:blade*.68,sy:blade,sz:blade*.68,yaw:a,lean:(leafRand()-.5)*2.2,
            color:tint.clone().multiplyScalar(.82+leafRand()*.47)});
        }
      }
    }
  });
  bakeStatic(trees);
  batches(reflective,new T.IcosahedronGeometry(1,1),matte('#d4cab7'),crowns,true);
  const leafMaterial=matte('#f8edc9',.84);
  leafMaterial.side=T.DoubleSide;
  leafMaterial.onBeforeCompile=shader=>{
    shader.uniforms.sway=sway;
    shader.vertexShader='uniform float sway;\n'+shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      transformed.z+=.20*sin(sway*1.24+instanceMatrix[3].x*.92+instanceMatrix[3].y*2.0)*(position.y+.5);
    `);
  };
  batches(root,lance(.59),leafMaterial,leaves);
  const lanterns:[[number,number], ...[number,number][]]=[[-3.72,.8],[-1.03,.66],[-.24,2.95],[1.08,2.18],[4.70,.25],[1.42,-2.5],[-2.02,2.86]];
  const iron=new T.MeshStandardMaterial({color:'#604737',metalness:.45,roughness:.44});
  const gold=glow('#ffc377',1.35);
  const lanternGlass=glow('#e9a353',1.0);
  const flicker={value:0};
  lanternGlass.onBeforeCompile=shader=>{
    shader.uniforms.flicker=flicker;
    shader.vertexShader='varying vec2 lanternUv;\n'+shader.vertexShader.replace(
      '#include <begin_vertex>','#include <begin_vertex>\nlanternUv = uv;',
    );
    shader.fragmentShader='varying vec2 lanternUv;\nuniform float flicker;\n'+shader.fragmentShader.replace('#include <emissivemap_fragment>', `
      #include <emissivemap_fragment>
      float core=1.0-smoothstep(.04,.65,distance(lanternUv,vec2(.50,.39)));
      float glass=sin(lanternUv.x*79.0+lanternUv.y*39.0)*cos(lanternUv.y*88.0-lanternUv.x*23.0);
      totalEmissiveRadiance*=.58+.72*core+glass*.086+.055*sin(flicker*3.2);
    `);
  };
  const lamps=lanterns.map(([x,z],i)=>{
    const stand=group(reflective,x,ground(x,z),z);
    const y=.80+(i%3)*.145;
    tube(stand,iron,[[0,-.07,0],[.005,y-.13,0],[.025,y+.09,0],[.27,y+.15,0],[.32,y+.04,0]],.031,10);
    const lamp=group(stand,.32,y-.035,0);
    block(lamp,lanternGlass,[0,0,0],[.18,.23,.18]);
    for(const a of [-.096,.096]) for(const b of [-.096,.096]) block(lamp,iron,[a,0,b],[.025,.252,.025]);
    block(lamp,iron,[0,-.13,0],[.235,.043,.23]);
    const cap=new T.Mesh(new T.ConeGeometry(.173,.105,4),iron);
    cap.rotation.y=Math.PI/4;
    cap.position.y=.16;
    lamp.add(cap);
    const finial=new T.Mesh(new T.OctahedronGeometry(.042),iron);
    finial.position.y=.232;
    lamp.add(finial);
    block(lamp,iron,[0,-.151,0],[.131,.035,.13]);
    bakeStatic(lamp);
    const shine=sprite(lamp,amber,1.66,.68);
    const base=lamp.position.clone();
    pickable.push(lamp);
    return {lamp,shine,stand,base};
  });
  const swarm=Array.from({length:29},(_,i)=>{
    const flame=sprite(root,i%3 ? amber : blue,.11,.5);
    return {flame,x:(rand()-.5)*8,z:(rand()-.5)*5,y:.46+rand()*1.7,a:rand()*TAU};
  });
  const wingShape=new T.Shape().moveTo(0,0).quadraticCurveTo(.022,.047,.059,.035)
    .quadraticCurveTo(.062,.019,.046,.008).quadraticCurveTo(.028,-.012,0,0);
  const wingMaterial=glow('#dec78d',.36);
  wingMaterial.side=T.DoubleSide;
  const wings=batches(root,new T.ShapeGeometry(wingShape,4),wingMaterial,
    Array.from({length:6},()=>({x:0,y:0,z:0,sx:1,sy:1,sz:1})));
  wings.instanceMatrix.setUsage(T.DynamicDrawUsage);
  wings.frustumCulled=false;
  const mothPose=new T.Object3D();

  const wake=group(root);
  const sparks=Array.from({length:30},(_,i)=>sprite(wake,i%3===0?amber:blue,.19,.8));
  const blooms=Array.from({length:12},(_,i)=>{
    const flower=group(wake);
    const petal=glow(i%2?'#a7e7cb':'#e9a081',.70);
    for(let p=0;p<5;p++){
      const theta=p/5*TAU;
      blob(flower,petal,[Math.cos(theta)*.07,.02,Math.sin(theta)*.07],[.075,.031,.065],false);
    }
    blob(flower,gold,[0,.046,0],[.047,.035,.047],false);
    bakeStatic(flower);
    return flower;
  });
  wake.visible=false;
  let awakened=-20;
  return {root,reflective,pickable,lamps,awaken(point:T.Vector3,time:number){
    wake.position.set(point.x,Math.max(ground(point.x,point.z),.13),point.z);
    awakened=time;
    wake.visible=true;
  },update(time:number,motion:number,parade:number,lift:number){
    sway.value=time*motion;
    flicker.value=sway.value;
    lamps.forEach(({lamp,shine,base},i)=>{
      lamp.position.set(base.x+Math.sin(i+time*2)*parade*.42,base.y+parade*(.6+i*.15)+lift*(.3+i*.1),base.z+Math.cos(i+time*2)*parade*.34);
      shine.material.opacity=.58+.09*Math.sin(time*(1+i*.23)+i)+parade*.27+lift*.15;
    });
    swarm.forEach(({flame,x,z,y,a},i)=>{
      flame.position.set(x+Math.cos(time*.28*motion+a)*.58,y+Math.sin(time*.9*motion+a)*.26,z+Math.sin(time*.33*motion+a)*.43);
      flame.material.opacity=.18+.55*Math.pow(.5+.5*Math.sin(time*(.46+i%8*.19)+a),2);
    });
    for(let i=0;i<3;i++){
      const travel=sway.value*(.74+.07*i)+i*2.399;
      const flap=Math.sin(sway.value*(15.7+i*.76)+i);
      const {lamp,stand}=lamps[i+1];
      mothPose.position.set(stand.position.x+lamp.position.x+Math.cos(travel)*(.34+i*.091),
        stand.position.y+lamp.position.y+.03+Math.sin(travel*1.96)*.135,
        stand.position.z+lamp.position.z+Math.sin(travel)*(.28+i*.08));
      for(let wing=0;wing<2;wing++){
        const side=wing===0?1:-1;
        mothPose.rotation.set(.37,travel+.17+wing*Math.PI,side*flap*.82);
        mothPose.updateMatrix();
        wings.setMatrixAt(i*2+wing,mothPose.matrix);
      }
    }
    wings.instanceMatrix.needsUpdate=true;
    const age=time-awakened;
    wake.visible=age<6;
    if(wake.visible){
      const fade=Math.min(1,(6-age)/1.4);
      sparks.forEach((p,i)=>{
        const a=i*2.399+age*.42;
        const radius=(.12 + i%7*.12) * Math.min(1,age*.9);
        p.position.set(Math.cos(a)*radius,.15+(i%13)*.06+age*.12,Math.sin(a)*radius);
        p.material.opacity=fade*(.56+.35*Math.sin(a+age*3));
      });
      blooms.forEach((b,i)=>{
        const a=i*2.399,r=.1+(i%6)*.135;
        b.position.set(Math.cos(a)*r,.12+(i%3)*.06,Math.sin(a)*r);
        b.scale.setScalar(Math.max(0,Math.min(1.3,age*2-i*.07))*fade);
      });
    }
  }};
}
