import * as T from 'three';
import { batches, blob, block, glow, ground, group, matte, randomFrom, TAU, tube } from './model';
import { sprite } from './sky';
import { inPool, onIsland } from './terrain';

export function makeGarden(scene: T.Scene, amber:T.Texture, blue:T.Texture) {
  const root=group(scene);
  const rand=randomFrom(13582);
  const stalks: Parameters<typeof batches>[3]=[], flowers: Parameters<typeof batches>[3]=[];
  const pickable:T.Object3D[]=[];
  const palette=['#87e0c8','#d691bc','#a7abae','#faad9d','#c1a7e2','#9dd8be'];
  const grassMaterial=matte('#ffffff');
  const sway={value:0};
  grassMaterial.onBeforeCompile=shader=>{
    shader.uniforms.sway=sway;
    shader.vertexShader='uniform float sway;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      float bend=pow(max(0.0,position.y+.5),2.0);
      transformed.x+=bend*.38*sin(sway*1.7+instanceMatrix[3].x*2.0+instanceMatrix[3].z);
    `);
  };
  const grassGeo=new T.ConeGeometry(1,1,3);
  const bloomGeo=new T.IcosahedronGeometry(1,0);
  for(let i=0;i<2400;i++){
    const x=(rand()-.5)*11.4,z=(rand()-.5)*7.8;
    if(!onIsland(x,z,.96)||inPool(x,z,1.08)||(x<-1.05&&x>-3.87&&z<-0.09&&z>-2.29)) continue;
    const pathX=-2.37+(z+.16)*1.07;
    if(z>-.35&&Math.abs(x-pathX)<.42) continue;
    const height=.07+rand()*.31;
    const color=new T.Color(['#5b907d','#477c78','#4c7868','#91a58a','#6b8b70'][i%5]);
    stalks.push({x,y:ground(x,z)+height*.46,z,sx:.026,sy:height,sz:.022,yaw:rand()*TAU,lean:(rand()-.5)*.75,color});
    if(i%8===0){
      const r=.037+rand()*.043;
      const tint=new T.Color(palette[i%palette.length]);
      for(let p=0;p<4;p++){
        const a=p/4*TAU;
        flowers.push({x:x+Math.cos(a)*r*.75,y:ground(x,z)+height*.88,z:z+Math.sin(a)*r*.75,
          sx:r,sy:r*.38,sz:r,yaw:a,color:tint});
      }
      flowers.push({x,y:ground(x,z)+height*.91,z,sx:r*.58,sy:r*.43,sz:r*.58,color:new T.Color('#ffe1a1')});
    }
  }
  batches(root,grassGeo,grassMaterial,stalks);
  const blossoms=batches(root,bloomGeo,glow('#ffffff',.025),flowers);
  pickable.push(blossoms);

  const branch=matte('#4e384f');
  const leaves: Parameters<typeof batches>[3]=[];
  const treePositions=[[-4.33,-1.70,.79],[.47,-2.68,.88],[3.89,-1.52,.69],[-4.63,.35,.54]];
  treePositions.forEach(([x,z,size], index)=>{
    const tree=group(root,x,ground(x,z),z);
    tree.scale.setScalar(size);
    tube(tree,branch,[[0,0,0],[.11,.61,0],[.09,1.33,.053],[-.10,2.23,.1],[.06,2.93,.08]],.095,14);
    for(let i=0;i<8;i++){
      const a=i/8*TAU+.4, y=1.22+rand()*1.22;
      const bx=Math.cos(a)*(.43+rand()*.6), bz=Math.sin(a)*(.39+rand()*.54);
      tube(tree,branch,[[.07,y-.34,0],[bx*.56,y+.2,bz*.56],[bx,y+.53,bz]],.04,8);
      for(let j=0;j<10;j++){
        const s=.20+rand()*.27;
        leaves.push({x:x+(bx+(rand()-.5)*.93)*size,y:tree.position.y+(y+.55+(rand()-.37)*.7)*size,
          z:z+(bz+(rand()-.5)*.83)*size,sx:s*size,sy:s*.58*size,sz:s*.83*size,
          yaw:rand()*TAU,lean:rand(),color:new T.Color((index===1 ? ['#466b78','#668492','#69889d','#8081a3'] : ['#5a526f','#795778','#94728e','#5c667f'])[j%4])});
      }
    }
  });
  batches(root,new T.IcosahedronGeometry(1,1),matte('#ffffff'),leaves,true);
  const lanterns:[[number,number], ...[number,number][]]=[[-3.72,.8],[-1.03,.66],[-.24,2.95],[1.08,2.18],[4.70,.25],[1.42,-2.5],[-2.02,2.86]];
  const iron=matte('#422c43'), gold=glow('#ffb963',1.8);
  const lamps=lanterns.map(([x,z],i)=>{
    const stand=group(root,x,ground(x,z),z);
    const y=.80+(i%3)*.145;
    tube(stand,iron,[[0,-.07,0],[.005,y-.13,0],[.025,y+.09,0],[.27,y+.15,0],[.32,y+.04,0]],.031,10);
    const lamp=group(stand,.32,y-.035,0);
    block(lamp,gold,[0,0,0],[.18,.23,.18]);
    for(const a of [-.096,.096]) for(const b of [-.096,.096]) block(lamp,iron,[a,0,b],[.025,.252,.025]);
    block(lamp,iron,[0,-.13,0],[.235,.043,.23]);
    const cap=new T.Mesh(new T.ConeGeometry(.173,.105,4),iron);
    cap.rotation.y=Math.PI/4;
    cap.position.y=.16;
    lamp.add(cap);
    const shine=sprite(lamp,amber,1.55,.71);
    const base=lamp.position.clone();
    pickable.push(lamp);
    return {lamp,shine,stand,base};
  });
  const swarm=Array.from({length:38},(_,i)=>{
    const flame=sprite(root,i%3 ? amber : blue,.11,.5);
    return {flame,x:(rand()-.5)*8,z:(rand()-.5)*5,y:.46+rand()*1.7,a:rand()*TAU};
  });
  const wake=group(root);
  const sparks=Array.from({length:30},(_,i)=>sprite(wake,i%3===0?amber:blue,.19,.8));
  const blooms=Array.from({length:12},(_,i)=>{
    const flower=group(wake);
    for(let p=0;p<5;p++){
      const theta=p/5*TAU;
      blob(flower,glow(i%2?'#a7e7cb':'#f59fc0',.90),[Math.cos(theta)*.07,.02,Math.sin(theta)*.07],[.075,.031,.065],false);
    }
    blob(flower,gold,[0,.046,0],[.047,.035,.047],false);
    return flower;
  });
  wake.visible=false;
  let awakened=-20;
  return {root,pickable,lamps,awaken(point:T.Vector3,time:number){
    wake.position.set(point.x,Math.max(ground(point.x,point.z),.13),point.z);
    awakened=time;
    wake.visible=true;
  },update(time:number,motion:number,parade:number,lift:number){
    sway.value=time*motion;
    lamps.forEach(({lamp,shine,base},i)=>{
      lamp.position.set(base.x+Math.sin(i+time*2)*parade*.42,base.y+parade*(.6+i*.15)+lift*(.3+i*.1),base.z+Math.cos(i+time*2)*parade*.34);
      shine.material.opacity=.61+.1*Math.sin(time*(1+i*.23)+i)+parade*.25;
    });
    swarm.forEach(({flame,x,z,y,a},i)=>{
      flame.position.set(x+Math.cos(time*.28*motion+a)*.58,y+Math.sin(time*.9*motion+a)*.26,z+Math.sin(time*.33*motion+a)*.43);
      flame.material.opacity=.18+.55*Math.pow(.5+.5*Math.sin(time*(.46+i%8*.19)+a),2);
    });
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
