import * as T from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { blob, ground, group, mesh, randomFrom, TAU } from './model';
import { sprite } from './sky';

export const waterReflectionLayer = 3;

export function reflectInPond(object: T.Object3D) {
  object.traverse(child => child.layers.enable(waterReflectionLayer));
}

export function makeWater(scene:T.Scene, aura:T.Texture) {
  const root=group(scene);
  const waterShader={
    uniforms:{
      clock:{value:0}, reflection:{value:0}, sparkle:{value:0}, moonWorld:{value:new T.Vector3()},
      pulse:{value:new T.Vector3(2.7,.89,9)},
      tDiffuse:{value:null},color:{value:new T.Color()},
      textureMatrix:{value:new T.Matrix4()},reflectionMix:{value:0},
    },
    vertexShader:`
      varying vec2 vUv;
      varying vec3 worldPoint;
      varying vec4 reflectionPoint;
      uniform mat4 textureMatrix;
      void main(){
        vUv=uv;
        reflectionPoint=textureMatrix*vec4(position,1.0);
        worldPoint=(modelMatrix*vec4(position,1.0)).xyz;
        gl_Position=projectionMatrix*viewMatrix*vec4(worldPoint,1.0);
      }
    `,
    fragmentShader:`
      varying vec2 vUv;
      varying vec3 worldPoint;
      uniform float clock,reflection,sparkle;
      uniform vec3 moonWorld,pulse;
      uniform sampler2D tDiffuse;
      uniform float reflectionMix;
      varying vec4 reflectionPoint;
      void main(){
        vec2 p=vUv*2.-1.;
        float flow=sin(p.y*21.+p.x*7.+sin(p.x*7.+clock*.72)*1.42-clock*1.7);
        float crossFlow=cos(p.x*19.-p.y*24.+clock*1.2+1.4*sin(p.y*8.-clock*.5));
        float tiny=cos(p.x*111.+p.y*49.-clock*2.);
        float shore=smoothstep(.70,1.0,length(vec2(p.x,p.y*1.10)));
        vec3 surfaceNormal=normalize(vec3(.055*crossFlow+.016*tiny,1.,.073*flow));
        vec3 eye=normalize(cameraPosition-worldPoint);
        vec3 moon=normalize(moonWorld-worldPoint);
        float fresnel=pow(1.-clamp(dot(surfaceNormal,eye),0.,1.),3.);
        float moonlight=pow(max(0.,dot(reflect(-moon,surfaceNormal),eye)),43.);
        float grain=pow(clamp(.47+.26*flow+.25*crossFlow,0.,1.),7.);
        float banks=sin(p.x*5.1+p.y*3.0)+.6*cos(p.y*7.+p.x*2.);
        float ring=length(worldPoint.xz-pulse.xy)-pulse.z*.51;
        float touch=exp(-abs(ring)*77.)*clamp(1.-pulse.z*.59,0.,1.);
        float moonTrail=exp(-pow((p.x-reflection*.63+p.y*.28)*4.2,2.));
        vec3 water=mix(vec3(.019,.107,.139),vec3(.064,.234,.198),.38+banks*.13+shore*.19);
        water=mix(water,vec3(.051,.127,.174),fresnel*.61);
        if(reflectionMix>.01){
          vec2 uv=reflectionPoint.xy/reflectionPoint.w;
          vec2 distortion=vec2(crossFlow*.0015+tiny*.00035,flow*.0025);
          vec3 reflected=texture2D(tDiffuse,uv+distortion).rgb;
          water=mix(water,reflected*vec3(.71,.86,.81),reflectionMix*(.31+.65*fresnel));
        }
        water+=vec3(.12,.26,.22)*grain*(.48+shore*.40);
        water+=vec3(.38,.35,.22)*moonlight*.70;
        water+=vec3(.18,.31,.23)*moonTrail*(grain+.11)*.53;
        water+=vec3(.18,.55,.48)*(touch*.61 + sparkle*.25);
        gl_FragColor=vec4(water,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  };
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
  const pool=new Reflector(pondGeometry,{
    shader:waterShader,clipBias:.005,textureWidth:384,textureHeight:224,multisample:0,
  });
  pool.position.set(2.7,.315,.89);
  pool.rotation.x=-Math.PI/2;
  root.add(pool);
  const poolMat=pool.material as T.ShaderMaterial;
  const redraw=pool.onBeforeRender.bind(pool);
  pool.onBeforeRender=()=>{};
  pool.camera.layers.set(waterReflectionLayer);
  const nightMirror=new T.Color('#202b37');
  const projectedCenter=new T.Vector3();
  let lastReflection=-Infinity, reflectionCount=0;
  const reflectedResolution={width:384,height:224};
  const reflectionTarget=pool.getRenderTarget();
  const drawGroup=new T.Group();
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
        float thread=.5+.5*sin(vUv.x*64.+sin(vUv.y*5.-clock*1.32)*1.99+sin(vUv.x*21.));
        float streaming=.52+.46*sin(vUv.y*49.-clock*6.4+sin(vUv.x*34.)*4.);
        float edges=smoothstep(0.,.14,vUv.x)*(1.-smoothstep(.86,1.,vUv.x));
        float veil=edges*(1.-smoothstep(.72,1.,vUv.y));
        float center=sin(3.14159265*vUv.x);
        gl_FragColor=vec4(.17+thread*.34,.62+thread*.29,.63+thread*.25,veil*(.13+streaming*thread*.51+center*.14));
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
  const fishMat=new T.MeshBasicMaterial({color:'#9e9274',toneMapped:false});
  const fish=Array.from({length:6},()=>blob(root,fishMat,[0,.329,0],[.073,.008,.022],false));
  const rand=randomFrom(541);
  const bubbleGeo=new T.BufferGeometry();
  const bubblePositions=new Float32Array(3*54);
  bubbleGeo.setAttribute('position',new T.BufferAttribute(bubblePositions,3));
  const bubbles=new T.Points(bubbleGeo,new T.PointsMaterial({color:'#81e4ef',size:.040,transparent:true,opacity:.78}));
  bubbles.frustumCulled=false;
  root.add(bubbles);
  const bubblePhases=Array.from({length:54},()=>[rand(),rand(),rand()]);
  const droplets = new T.BufferGeometry();
  const dropletsArray = new Float32Array(12 * 3);
  droplets.setAttribute('position',new T.BufferAttribute(dropletsArray,3));
  const spray = new T.Points(droplets,new T.PointsMaterial({
    color:'#adf8e2',size:.059,transparent:true,depthWrite:false,blending:T.AdditiveBlending,
  }));
  spray.frustumCulled=false;
  root.add(spray);
  let last=-20, index=0,reactionX=2.7,reactionZ=.89;
  return {
    surfaces:[pool],
    get reflectionCount(){return reflectionCount;},
    dispose(){reflectionTarget.dispose();},
    prepareReflection(renderer:T.WebGLRenderer,scene:T.Scene,camera:T.Camera,time:number,enabled:boolean,hi:boolean,force=false){
      projectedCenter.copy(pool.position).project(camera);
      const inView=projectedCenter.z<1&&Math.abs(projectedCenter.x)<1.42&&Math.abs(projectedCenter.y)<1.31;
      if(!enabled||!inView||!renderer.extensions.has('EXT_color_buffer_float')){
        poolMat.uniforms.reflectionMix.value=0;
        lastReflection=-Infinity;
        return;
      }
      if(!force&&time-lastReflection<1/(hi?15:9))return;
      const width=hi?576:384, height=hi?320:224;
      if(width!==reflectedResolution.width||height!==reflectedResolution.height){
        reflectionTarget.setSize(width,height);
        reflectedResolution.width=width;
        reflectedResolution.height=height;
      }
      const background=scene.background;
      try{
        scene.background=nightMirror;
        pool.updateWorldMatrix(true,false);
        redraw(renderer,scene,camera,pool.geometry,poolMat,drawGroup);
        poolMat.uniforms.reflectionMix.value=.81;
        lastReflection=time;
        reflectionCount++;
      }finally{
        scene.background=background;
      }
    },
    ripple(position:T.Vector3,time:number){
    reactionX=position.x;reactionZ=position.z;
    for(let i=0;i<3;i++){
      const entry=rings[index++%rings.length];
      entry.birth=time+i*.18;
      entry.ring.position.set(position.x,Math.max(.347,ground(position.x,position.z)+.025),position.z);
    }
    last=time;
  },update(time:number,motion:number,arc:number,charged:number,moon:T.Vector3){
    poolMat.uniforms.clock.value=time*motion;
    poolMat.uniforms.reflection.value=arc;
    poolMat.uniforms.sparkle.value=charged;
    poolMat.uniforms.moonWorld.value.copy(moon);
    const touchAge=time-last;
    poolMat.uniforms.pulse.value.set(reactionX,reactionZ,touchAge);
    spray.visible=touchAge<.89;
    if(spray.visible){
      spray.material.opacity=Math.max(0,1-touchAge/.89)*.82;
      for(let i=0;i<12;i++){
        const angle=i*2.399;
        const t=touchAge*(.99+i%4*.28);
        const flight=Math.max(0, .95*t - .95*t*t);
        const offset=t*(.32+i%3*.070);
        const start=i*3;
        dropletsArray[start]=reactionX+Math.cos(angle)*offset;
        dropletsArray[start+1]=.339+flight*motion;
        dropletsArray[start+2]=reactionZ+Math.sin(angle)*offset;
      }
      droplets.attributes.position.needsUpdate=true;
    }
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
      bubblePositions[i*3]=4.1+(b-.5)*.82+life*.72;
      bubblePositions[i*3+1]=.30-life*life*4.18;
      bubblePositions[i*3+2]=2.61+life*(.76+c*.41);
    });
    bubbleGeo.attributes.position.needsUpdate=true;
  }};
}
