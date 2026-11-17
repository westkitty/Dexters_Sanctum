import * as T from 'three';
import { blob, ground, group, mesh, randomFrom, TAU } from './model';
import { sprite } from './sky';

export function makeWater(scene:T.Scene, aura:T.Texture) {
  const root=group(scene);
  const poolMat=new T.ShaderMaterial({
    uniforms:{
      clock:{value:0}, reflection:{value:0}, sparkle:{value:0}, palette:{value:new T.Color('#a8ffee')},
    },
    vertexShader:`
      varying vec2 vUv;
      void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}
    `,
    fragmentShader:`
      varying vec2 vUv;
      uniform float clock,reflection,sparkle;
      uniform vec3 palette;
      void main(){
        vec2 p=vUv*2.-1.;
        float r=length(p);
        float waves=sin(p.y*47.+sin(p.x*9.+clock)*1.6-clock*2.)*.5+.5;
        float threads=pow(waves,12.)*(.45+.55*sin(p.x*31.+clock+p.y*19.));
        float trail=exp(-pow((p.x-reflection*.6-p.y*.25)*3.8,2.))*.45;
        vec3 c=mix(vec3(.036,.19,.26),vec3(.14,.56,.54),.38+.3*sin(p.x*4.+p.y*6.));
        c+=vec3(.10,.35,.35)*(threads*.74+smoothstep(.81,1.,r)*.47);
        c+=palette*trail*(.27+threads*.5)+sparkle*.10;
        gl_FragColor=vec4(c,1.);
        #include <colorspace_fragment>
      }
    `,
  });
  const pond=new T.Shape();
  for(let i=0;i<=96;i++){
    const angle=i/96*TAU;
    const spill=Math.exp(-Math.pow((angle-.90)/.25,2));
    const x=Math.cos(angle)*(1.65+spill*.75);
    const y=-Math.sin(angle)*(1.59+spill*.75);
    if(i===0)pond.moveTo(x,y);
    else pond.lineTo(x,y);
  }
  const pondGeometry=new T.ShapeGeometry(pond);
  const pondUv=pondGeometry.attributes.uv;
  for(let i=0;i<pondUv.count;i++)pondUv.setXY(i,(pondUv.getX(i)+1.65)/3.5,(pondUv.getY(i)+2)/4);
  const pool=mesh(root,pondGeometry,poolMat,[2.7,.315,.89],false);
  pool.rotation.x=-Math.PI/2;
  const fallMat = new T.ShaderMaterial({
    transparent:true,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending,
    uniforms:{ clock:poolMat.uniforms.clock },
    vertexShader:`
      varying vec2 vUv;
      void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
    `,
    fragmentShader:`
      varying vec2 vUv;
      uniform float clock;
      void main(){
        float thread=.5+.5*sin(vUv.x*79.+sin(vUv.y*6.-clock*1.9)*2.+sin(vUv.x*21.));
        float streaming=.52+.46*sin(vUv.y*54.-clock*7.+vUv.x*24.);
        float edges=smoothstep(0.,.14,vUv.x)*(1.-smoothstep(.86,1.,vUv.x));
        float veil=edges*(1.-smoothstep(.72,1.,vUv.y));
        gl_FragColor=vec4(.21+thread*.38,.70+thread*.22,.82+thread*.18,veil*(.27+streaming*thread*.60));
      }
    `,
  });
  const vertices:number[]=[], uv:number[]=[],indices:number[]=[];
  for(let i=0;i<=35;i++){
    const t=i/35;
    for(let j=0;j<=10;j++){
      const u=j/10;
      vertices.push(4.15+(u-.5)*(.70+t*.26)+.47*t, .35-4.15*t*t, 2.61+1.00*t);
      uv.push(u,t);
      if(i>0&&j>0){const n=i*11+j;indices.push(n,n-1,n-12,n,n-12,n-11);}
    }
  }
  const fallGeo=new T.BufferGeometry();
  fallGeo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
  fallGeo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  fallGeo.setIndex(indices);
  mesh(root,fallGeo,fallMat,[0,0,0],false);
  const mist=Array.from({length:11},(_,i)=>sprite(root,aura,1,.55-i*.035));
  const rings=Array.from({length:15},()=>{
    const material=new T.MeshBasicMaterial({color:'#93ffeb',transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending});
    const ring=mesh(root,new T.RingGeometry(.94,1,44),material,[0,.34,0],false);
    ring.rotation.x=-Math.PI/2;
    ring.visible=false;
    return {ring,material,birth:-30};
  });
  const fishMat=new T.MeshBasicMaterial({color:'#e4a78f',toneMapped:false});
  const fish=Array.from({length:6},()=>blob(root,fishMat,[0,.329,0],[.073,.008,.022],false));
  const rand=randomFrom(541);
  const bubbleGeo=new T.BufferGeometry();
  const bubblePositions=new Float32Array(3*54);
  bubbleGeo.setAttribute('position',new T.BufferAttribute(bubblePositions,3));
  const bubbles=new T.Points(bubbleGeo,new T.PointsMaterial({color:'#81e4ef',size:.040,transparent:true,opacity:.78}));
  bubbles.frustumCulled=false;
  root.add(bubbles);
  const bubblePhases=Array.from({length:54},()=>[rand(),rand(),rand()]);
  let last=-20, index=0,reactionX=2.7,reactionZ=.89;
  return {surfaces:[pool],ripple(position:T.Vector3,time:number){
    reactionX=position.x;reactionZ=position.z;
    for(let i=0;i<3;i++){
      const entry=rings[index++%rings.length];
      entry.birth=time+i*.18;
      entry.ring.position.set(position.x,Math.max(.347,ground(position.x,position.z)+.025),position.z);
    }
    last=time;
  },update(time:number,motion:number,arc:number,charged:number){
    poolMat.uniforms.clock.value=time*motion;
    poolMat.uniforms.reflection.value=arc;
    poolMat.uniforms.sparkle.value=charged;
    rings.forEach(({ring,material,birth})=>{
      const age=time-birth;
      ring.visible=age>=0&&age<1.65;
      if(ring.visible){
        ring.scale.setScalar(.025+age*.47);
        material.opacity=(1-age/1.65)*.88;
      }
    });
    mist.forEach((p,i)=>{
      const a=time*.47*motion+i*1.7;
      p.position.set(4.47+Math.cos(a)*(.23+i*.055),-3.73-i*.065+Math.sin(a)*.18,3.70+Math.sin(a)*.35);
      p.scale.set(1.1+i*.19,.29+i*.065,1);
    });
    fish.forEach((p,i)=>{
      const a=time*(.33+i*.08)*motion+i*TAU/fish.length;
      const scatter=Math.exp(-Math.max(0,time-last)*1.3)*.48;
      const x=2.7+Math.cos(a)*(.55+i*.076), z=.89+Math.sin(a)*(.45+i*.066);
      const angle=Math.atan2(z-reactionZ,x-reactionX);
      p.position.set(T.MathUtils.clamp(x+Math.cos(angle)*scatter,1.35,4.03),.329,z+Math.sin(angle)*scatter*.5);
      p.rotation.y=a;
    });
    bubblePhases.forEach(([a,b,c],i)=>{
      const life=(a+time*(.15+b*.11)*motion)%1;
      bubblePositions.set([4.1+(b-.5)*.82+life*.72,.30-life*life*4.18,2.61+life*(.76+c*.41)],i*3);
    });
    bubbleGeo.attributes.position.needsUpdate=true;
  }};
}
