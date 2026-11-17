import * as T from 'three';
import { makeAudio } from './audio';
import { makeDexter } from './dexter';
import { makeGarden } from './garden';
import { makeIncidents } from './incidents';
import { ground, group } from './model';
import { halo, makeSky, sprite } from './sky';
import { makeTerrain, onIsland } from './terrain';
import { cueAt, smooth } from './timeline';
import { makeWater } from './water';
import './style.css';

const byId=<E extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as E;
const world=byId('world'), fallback=byId('fallback'), notice=byId('notice'), cue=byId('cue');
const quality=byId<HTMLSelectElement>('quality'), sound=byId<HTMLButtonElement>('sound');
const trouble=byId<HTMLButtonElement>('trouble'), postcard=byId<HTMLButtonElement>('postcard');
const portraitButton=byId<HTMLButtonElement>('portrait');
const guide=byId<HTMLDialogElement>('guide');
const tools=['moon','stars','garden','water'] as const;
type Tool=typeof tools[number];
type Quality='auto'|'high'|'low';
const media=matchMedia('(prefers-reduced-motion: reduce)');
const seedCursor=new T.Vector2(.04,.39);

function getQuality():Quality {
  try {
    const value=localStorage.getItem('dexter-quality-v1');
    if(value==='low'||value==='high') return value;
  }catch{/* Storage may be unavailable in private mode. */}
  return 'auto';
}

function setFallback(show:boolean){
  fallback.hidden=!show;
  world.hidden=show;
  for(const id of [...tools,'sound','quality','trouble','postcard','portrait']) {
    byId<HTMLButtonElement>(id).disabled=show;
  }
}

function boot(){
  let renderer:T.WebGLRenderer;
  try{
    const canvas=document.createElement('canvas');
    const context=canvas.getContext('webgl2',{alpha:false,antialias:true,powerPreference:'high-performance'});
    if(!context){setFallback(true);return;}
    renderer=new T.WebGLRenderer({canvas,context});
  }catch{
    setFallback(true);
    return;
  }
  renderer.setClearColor('#101927');
  renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.17;
  renderer.shadowMap.type=T.PCFSoftShadowMap;
  const canvas=renderer.domElement;
  canvas.tabIndex=0;
  canvas.setAttribute('role','region');
  canvas.setAttribute('aria-label','Interactive island. Choose a tool to explore. Press question mark for help.');
  world.append(canvas);

  const scene=new T.Scene();
  scene.fog=new T.FogExp2('#202b3a',.025);
  const camera=new T.PerspectiveCamera(37,1,.1,85);
  const look=new T.Vector3(), position=new T.Vector3();
  const hemi=new T.HemisphereLight('#c3d4e9','#59483d',1.64);
  const rim=new T.DirectionalLight('#8fbfc9',1.68);
  rim.position.set(-5,5,-7);
  const fill=new T.DirectionalLight('#d4d8f3',.80);
  fill.position.set(3,3,7);
  const key=new T.DirectionalLight('#ffce9d',2.5);
  key.castShadow=true;
  key.shadow.mapSize.set(1024,1024);
  Object.assign(key.shadow.camera,{left:-8,right:8,top:7,bottom:-7,near:.3,far:31});
  key.shadow.normalBias=.028;
  key.shadow.bias=-.00019;
  scene.add(hemi,rim,fill,key,key.target);
  const sky=makeSky(scene);
  const blue=halo('#54dccc');
  const terrain=makeTerrain(scene,sky.amber);
  const water=makeWater(scene,blue);
  const garden=makeGarden(scene,sky.amber,blue);
  const dexter=makeDexter(scene);
  const incidents=makeIncidents(scene,sky.amber,blue);
  const audio=makeAudio();

  const constellations=group(scene);
  const starCount=54;
  const starNodes=Array.from({length:starCount},()=>{
    const node=sprite(constellations,sky.amber,.29,.95);
    node.visible=false;
    return node;
  });
  const positions=new Float32Array((starCount-1)*6);
  const lineGeom=new T.BufferGeometry();
  lineGeom.setAttribute('position',new T.BufferAttribute(positions,3));
  lineGeom.setDrawRange(0,0);
  const lines=new T.LineSegments(lineGeom,new T.LineBasicMaterial({color:'#8ee7e7',transparent:true,opacity:.57,depthWrite:false}));
  lines.frustumCulled=false;
  constellations.add(lines);
  const cursor=sprite(scene,blue,.38,.85);
  cursor.visible=false;
  const cursorAt=seedCursor.clone();
  const stars:T.Vector3[]=[];
  const ray=new T.Raycaster();
  const ndc=new T.Vector2();
  const skyPlane=new T.Plane();
  const groundPlane=new T.Plane(new T.Vector3(0,1,0),-.14);
  const cameraDirection=new T.Vector3(), planePosition=new T.Vector3(), hit=new T.Vector3();
  const moonLight=new T.Color(), colorWarm=new T.Color('#ffd39e'), colorCool=new T.Color('#a5c1e0');
  const horizonWarm=new T.Color('#4a3c41'), horizonCool=new T.Color('#264351');
  const inspectBegin=12.5, inspectEnd=16.4;

  let active:Tool|null=null, charge=0, moonArc=0, moonTarget=0, selectedQuality=getQuality();
  let yaw=0,yawTarget=0, pitch=0,pitchTarget=0, noticeUntil=-1;
  let time=0,previous=0,accumulator=0,animation=0,mobile=false,portrait=false,portraitBlend=0,lost=false, ready=false;
  let userInteracted=false;
  let introAmount=media.matches?0:1;
  let slowFrames=0, adaptiveScale=1;
  const dogFocus=new T.Vector3().copy(dexter.root.position);
  let lastFrame=incidents.update(0,1,sky.moon.position,camera);
  const point=(x:number,y:number)=>{
    const r=canvas.getBoundingClientRect();
    ndc.set((x-r.left)/r.width*2-1,1-(y-r.top)/r.height*2);
    ray.setFromCamera(ndc,camera);
  };
  const announce=(message:string,duration=3.4)=>{
    notice.textContent=message;
    noticeUntil=time+duration;
  };
  function resize(){
    const width=world.clientWidth||innerWidth, height=world.clientHeight||innerHeight;
    mobile=width/height<.79;
    camera.aspect=width/height;
    camera.fov=mobile?T.MathUtils.radToDeg(2*Math.atan(.397/camera.aspect)):37;
    camera.updateProjectionMatrix();
    sky.resize(camera.aspect);
    const ratio=selectedQuality==='high'?1.7:selectedQuality==='low'?.85:mobile?1.2:1.45;
    renderer.setPixelRatio(Math.min(devicePixelRatio,ratio)*(selectedQuality==='auto'?adaptiveScale:1));
    renderer.setSize(width,height,false);
    renderer.shadowMap.enabled=selectedQuality!=='low';
  }
  function setPortrait(value:boolean, showNotice=false){
    portrait=value;
    portraitButton.setAttribute('aria-pressed',String(value));
    if(value){
      active=null;
      userInteracted=true;
      tools.forEach(id=>byId(id).setAttribute('aria-pressed','false'));
    }
    if(showNotice)announce(value?'Dexter, briefly permitting a portrait.':'Back to the island.');
  }
  function setTool(tool:Tool){
    active=active===tool?null:tool;
    tools.forEach(id=>byId(id).setAttribute('aria-pressed',String(active===id)));
    if(active){
      userInteracted=true;
      setPortrait(false);
      const hints={moon:'Drag the moon or use the arrow keys.',stars:'Draw on the open sky, or use arrows and Enter.',garden:'Touch a plant, lantern or cottage. Enter awakens the garden.',water:'Touch the turquoise pool. Enter sends out ripples.'};
      announce(hints[active]);
    }
  }
  function positionAtSky(at:T.Vector2,result:T.Vector3){
    camera.getWorldDirection(cameraDirection);
    planePosition.copy(camera.position).addScaledVector(cameraDirection,26);
    skyPlane.setFromNormalAndCoplanarPoint(cameraDirection,planePosition);
    ray.setFromCamera(at,camera);
    return ray.ray.intersectPlane(skyPlane,result);
  }
  function openSky(){
    return ndc.y>-.36&&!ray.intersectObjects([terrain.root,...water.surfaces,sky.globe],true).length;
  }
  function addStar(at:T.Vector2,verify:boolean){
    if(verify&&!openSky())return;
    if(!positionAtSky(at,hit))return;
    if(stars.length&&stars[stars.length-1].distanceTo(hit)<.48)return;
    if(stars.length>=starCount)stars.shift();
    stars.push(hit.clone());
    stars.forEach((p,i)=>{
      starNodes[i].visible=true;
      starNodes[i].position.copy(p);
      if(i>0){
        positions.set(stars[i-1].toArray(),(i-1)*6);
        positions.set(p.toArray(),(i-1)*6+3);
      }
    });
    lineGeom.setDrawRange(0,(stars.length-1)*2);
    lineGeom.attributes.position.needsUpdate=true;
    charge=Math.min(1,charge+.29);
    if(stars.length===1||stars.length%5===0)audio.chime('star');
  }
  function wake(point:T.Vector3){
    garden.awaken(point,time);
    dexter.react('garden',time);
    audio.chime('garden');
    announce('Something in the garden woke up.');
  }
  function splash(point:T.Vector3){
    water.ripple(point,time);
    dexter.react('water',time);
    audio.chime('water');
    announce('A ripple crossed the pool.');
  }
  function moveMoon(value:number){
    moonTarget=T.MathUtils.clamp(value,-.95,.95);
    if(Math.abs(moonTarget-moonArc)>.045)dexter.react('moon',time);
  }
  function activate(){
    const surface=ray.intersectObjects(water.surfaces,false)[0];
    if(surface&&(!active||active==='water')){splash(surface.point);return;}
    const plant=(!active||active==='garden')&&ray.intersectObjects([...garden.pickable,terrain.cottage.house],true)[0];
    if(plant){wake(plant.point);return;}
    if(!active&&ray.intersectObject(dexter.root,true).length){setPortrait(!portrait,true);return;}
    if(active==='garden'&&ray.ray.intersectPlane(groundPlane,hit)&&onIsland(hit.x,hit.z))wake(hit);
  }
  function makeTrouble(){
    const event=incidents.trigger(time);
    if(!event)return;
    userInteracted=true;
    trouble.disabled=true;
    setPortrait(false);
    dexter.react(event.kind,time);
    audio.chime(event.kind);
    announce(event.notice,event.duration-.4);
  }
  function capture(){
    const size=renderer.getSize(new T.Vector2());
    const originalRatio=renderer.getPixelRatio();
    const exportRatio=Math.max(originalRatio,Math.min(2.6,1800/size.x,2200/size.y));
    renderer.setPixelRatio(exportRatio);
    renderer.render(scene,camera);
    const result=document.createElement('canvas');
    result.width=canvas.width;
    result.height=canvas.height;
    const context=result.getContext('2d')!;
    context.drawImage(canvas,0,0);
    renderer.setPixelRatio(originalRatio);
    renderer.render(scene,camera);
    const unit=Math.max(12,result.width*.018);
    const vignette=context.createLinearGradient(0,result.height*.74,0,result.height);
    vignette.addColorStop(0,'#0c162000');
    vignette.addColorStop(1,'#0c1620d1');
    context.fillStyle=vignette;
    context.fillRect(0,result.height*.74,result.width,result.height*.26);
    const margin=unit*1.31;
    context.strokeStyle='#dfbe8170';
    context.lineWidth=Math.max(1,unit*.028);
    context.beginPath();
    context.moveTo(margin,result.height-unit*2.12);
    context.lineTo(margin+unit*4.25,result.height-unit*2.12);
    context.stroke();
    context.fillStyle='#f5d4a0';
    context.font=`italic ${unit}px Georgia`;
    context.fillText('Dexter’s Sanctum',unit*1.4,result.height-unit*1.1);
    result.toBlob(blob=>{
      if(!blob){announce('The postcard couldn’t be saved.');return;}
      const url=URL.createObjectURL(blob), link=document.createElement('a');
      link.href=url;
      link.download='dexters-sanctum-postcard.png';
      link.click();
      window.setTimeout(()=>URL.revokeObjectURL(url),10000);
      announce('A postcard from the Lantern Isle.');
    },'image/png');
  }

  let drag:{id:number;x:number;y:number;lastX:number;lastY:number;type:'moon'|'stars'|'orbit'|'tap';moved:boolean}|null=null;
  canvas.addEventListener('pointerdown',event=>{
    if(drag||event.button!==0)return;
    point(event.clientX,event.clientY);
    const moonHit=ray.intersectObject(sky.globe).length>0;
    const type=active==='moon'||moonHit?'moon':active==='stars'?'stars':active?'tap':'orbit';
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,lastX:event.clientX,lastY:event.clientY,type,moved:false};
    userInteracted=true;
    cursor.visible=false;
    canvas.setPointerCapture(event.pointerId);
    if(type==='stars')addStar(ndc,true);
  });
  canvas.addEventListener('pointermove',event=>{
    if(!drag||drag.id!==event.pointerId)return;
    const dx=event.clientX-drag.lastX,dy=event.clientY-drag.lastY;
    drag.lastX=event.clientX;
    drag.lastY=event.clientY;
    drag.moved||=Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>4;
    if(drag.type==='moon')moveMoon(moonTarget+dx/Math.max(130,canvas.clientWidth*.30));
    if(drag.type==='stars'){
      point(event.clientX,event.clientY);
      addStar(ndc,true);
    }
    if(drag.type==='orbit'&&drag.moved){
      yawTarget=T.MathUtils.clamp(yawTarget-dx*.004,portrait?-1.48:-.54,portrait?1.48:.50);
      pitchTarget=T.MathUtils.clamp(pitchTarget+dy*.004,-.19,.25);
    }
  });
  canvas.addEventListener('pointerup',event=>{
    if(!drag||drag.id!==event.pointerId)return;
    if(!drag.moved&&drag.type!=='stars'&&drag.type!=='moon'){
      point(event.clientX,event.clientY);
      activate();
    }
    drag=null;
  });
  canvas.addEventListener('lostpointercapture',()=>{drag=null;});
  canvas.addEventListener('blur',()=>{cursor.visible=false;});
  canvas.addEventListener('keydown',event=>{
    const x=Number(event.key==='ArrowRight')-Number(event.key==='ArrowLeft');
    const y=Number(event.key==='ArrowUp')-Number(event.key==='ArrowDown');
    if(x||y){
      event.preventDefault();
      userInteracted=true;
      if(active==='moon')moveMoon(moonTarget+(x||y)*.14);
      else if(active==='stars'){
        cursor.visible=true;
        cursorAt.x=T.MathUtils.clamp(cursorAt.x+x*.09,-.9,.9);
        cursorAt.y=T.MathUtils.clamp(cursorAt.y+y*.09,-.26,.85);
        positionAtSky(cursorAt,cursor.position);
      }else{
        yawTarget=T.MathUtils.clamp(yawTarget+x*.11,portrait?-1.48:-.54,portrait?1.48:.50);
        pitchTarget=T.MathUtils.clamp(pitchTarget+y*.07,-.19,.25);
      }
    }
    if(event.key==='Enter'||event.key===' '){
      event.preventDefault();
      if(active==='stars'){
        ndc.copy(cursorAt);
        ray.setFromCamera(ndc,camera);
        if(openSky())addStar(cursorAt,false);
        else announce('Move the star cursor to open sky.');
      }
      if(active==='garden')wake(new T.Vector3(-1.03,0,.66));
      if(active==='water')splash(new T.Vector3(2.7,.32,.89));
      if(active==='moon')moveMoon(moonTarget>.52?-.56:moonTarget+.31);
    }
  });
  window.addEventListener('keydown',event=>{
    if(event.altKey||event.ctrlKey||event.metaKey||guide.open||event.repeat||['INPUT','SELECT'].includes((event.target as HTMLElement).tagName))return;
    const keys:Record<string,Tool>={m:'moon',s:'stars',g:'garden',w:'water'};
    const key=event.key.toLowerCase();
    if(keys[key]){
      setTool(keys[key]);
      canvas.focus();
    }else if(key==='?')guide.showModal();
    else if(key==='d')setPortrait(!portrait);
    else if(key==='escape'&&active)setTool(active);
    else if(key==='escape')setPortrait(false);
  });
  tools.forEach(id=>byId(id).addEventListener('click',()=>setTool(id)));
  trouble.addEventListener('click',makeTrouble);
  postcard.addEventListener('click',capture);
  portraitButton.addEventListener('click',()=>setPortrait(!portrait,true));
  quality.value=selectedQuality;
  quality.addEventListener('change',()=>{
    selectedQuality=quality.value as Quality;
    slowFrames=0;
    adaptiveScale=1;
    try{localStorage.setItem('dexter-quality-v1',selectedQuality);}catch{/* Storage may be unavailable. */}
    resize();
  });
  sound.addEventListener('click',async()=>{
    sound.disabled=true;
    try{
      const enabled=await audio.toggle();
      sound.setAttribute('aria-pressed',String(enabled));
      sound.querySelector('span')!.textContent=enabled?'Sound on':'Sound off';
    }catch{announce('Audio couldn’t be started.');}
    sound.disabled=false;
  });

  function step(dt:number,dogSteps:number){
    const motion=media.matches?.24:1;
    moonArc=T.MathUtils.damp(moonArc,moonTarget,6,dt);
    if(!portrait)yawTarget=T.MathUtils.clamp(yawTarget,-.54,.50);
    yaw=T.MathUtils.damp(yaw,yawTarget,media.matches?16:5.5,dt);
    pitch=T.MathUtils.damp(pitch,pitchTarget,media.matches?16:5.5,dt);
    portraitBlend=T.MathUtils.damp(portraitBlend,portrait?1:0,media.matches?16:3.2,dt);
    const introTarget=userInteracted||media.matches?0:1-smooth(0,3,time);
    introAmount=media.matches?0:T.MathUtils.damp(introAmount,introTarget,3.8,dt);
    const intro=introAmount;
    const angle=portrait&&dexter.root.position.z<.90?T.MathUtils.clamp(.46+yaw,-1.42,1.42):.46+yaw;
    const height=5.83+pitch*9+intro*.50;
    const distance=16.8+intro*.7;
    const portraitDistance=mobile?3.8:3.65;
    const focusSettle=portrait?1-Math.exp(-Math.max(.016,dt)*8):1;
    dogFocus.lerp(dexter.root.position,focusSettle);
    look.set(mobile?.15:0,-.08,0);
    look.lerp(position.set(dogFocus.x,.89,dogFocus.z),portraitBlend);
    camera.position.set(Math.sin(angle)*distance,height,Math.cos(angle)*distance);
    position.set(dogFocus.x+Math.sin(angle)*portraitDistance,1.83+pitch*4,dogFocus.z+Math.cos(angle)*portraitDistance);
    camera.position.lerp(position,portraitBlend);
    camera.lookAt(look);
    camera.updateMatrixWorld();
    if(cursor.visible)positionAtSky(cursorAt,cursor.position);
    lastFrame=incidents.update(time,motion,sky.moon.position,camera);
    sky.update(camera,time,moonArc,motion,lastFrame.sneeze,mobile);
    key.position.copy(sky.moon.position);
    key.color.copy(moonLight.copy(colorWarm).lerp(colorCool,(moonArc+1)*.32));
    key.intensity=2.35+charge*.50+lastFrame.sneeze*.49;
    hemi.intensity=1.56+charge*.31+lastFrame.gravity*.26;
    scene.backgroundIntensity=.96+moonArc*.08+lastFrame.shower*.08;
    scene.fog!.color.copy(horizonWarm).lerp(horizonCool,(moonArc+1)*.50);
    const moment=userInteracted?0:smooth(10,inspectBegin,time)*(1-smooth(inspectEnd,20,time));
    water.update(time,motion,moonArc,charge+moment*.57,sky.moon.position);
    terrain.cottage.warmLight.intensity=9.6+Math.sin(time*.85)*1.1+lastFrame.parade*7;
    terrain.cottage.update(time,motion);
    garden.update(time,motion,lastFrame.parade,lastFrame.gravity);
    for(let i=0;i<dogSteps;i++)dexter.update(time,1/60,motion,lastFrame.gravity,camera.position,portrait);
    if(time>78&&Math.floor(time/83)!==Math.floor((time-dt)/83)&&!lastFrame.active&&time>=noticeUntil)announce('Nothing suspicious. Probably.',3.2);
    charge*=Math.exp(-dt*.35);
    trouble.disabled=lastFrame.active;
    if(time>=noticeUntil&&notice.textContent)notice.textContent='';
    const hint=userInteracted?'':cueAt(time);
    if(cue.textContent!==hint)cue.textContent=hint;
  }
  function frame(now:number){
    const elapsed=previous===0?1/60:(now-previous)/1000;
    previous=now;
    time+=elapsed;
    if(selectedQuality==='auto'&&time>2&&adaptiveScale===1){
      slowFrames=elapsed>.042?slowFrames+1:Math.max(0,slowFrames-2);
      if(slowFrames>=48){
        adaptiveScale=.82;
        resize();
      }
    }
    accumulator=Math.min(6/60,accumulator+elapsed);
    const dogSteps=Math.floor(accumulator*60);
    accumulator-=dogSteps/60;
    step(Math.min(.25,elapsed),dogSteps);
    renderer.render(scene,camera);
    if(!ready){ready=true;canvas.dataset.ready='true';}
    animation=requestAnimationFrame(frame);
  }
  function start(){
    if(!lost&&!document.hidden&&animation===0){
      previous=0;
      animation=requestAnimationFrame(frame);
    }
  }
  function stop(){
    cancelAnimationFrame(animation);
    animation=0;
    previous=0;
    accumulator=0;
  }
  const visibility=()=>{
    audio.suspend(document.hidden);
    if(document.hidden)stop();
    else start();
  };
  window.addEventListener('resize',resize);
  document.addEventListener('visibilitychange',visibility);
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();stop();lost=true;setFallback(true);});
  canvas.addEventListener('webglcontextrestored',()=>{lost=false;setFallback(false);resize();start();});
  window.addEventListener('pagehide',event=>{
    stop();
    if(event.persisted)return;
    audio.dispose();
    const disposed=new Set<object>();
    const dispose=(resource:{dispose():void})=>{if(!disposed.has(resource)){resource.dispose();disposed.add(resource);}};
    scene.traverse(object=>{
      if(object instanceof T.Light&&object.shadow)dispose(object.shadow);
      if(!('material' in object))return;
      const item=object as T.Mesh;
      if(item.geometry)dispose(item.geometry);
      for(const material of Array.isArray(item.material)?item.material:[item.material]){
        for(const slot of ['map','bumpMap'] as const){
          const map=(material as T.MeshStandardMaterial)[slot];
          if(map instanceof T.Texture)dispose(map);
        }
        dispose(material);
      }
      if(object instanceof T.InstancedMesh)dispose(object);
    });
    sky.dispose();
    renderer.dispose();
  });
  window.addEventListener('pageshow',start);
  if(import.meta.env.DEV){
    const worldPoint=(v:T.Vector3)=>v.clone().project(camera).toArray();
    Object.assign(window,{sanctumProof:()=>{
      const dogCenter=dexter.root.getWorldPosition(new T.Vector3()).add(new T.Vector3(0,.80,0));
      return {time,moonArc,dog:dexter.mood,dogPosition:dogCenter.toArray(),stars:stars.length,charge,
        incident:incidents.index,effects:lastFrame,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,pixelRatio:renderer.getPixelRatio(),memory:{...renderer.info.memory},
        moon:worldPoint(sky.moon.position),comet:worldPoint(incidents.comet.position),water:worldPoint(water.surfaces[0].position),
        garden:worldPoint(garden.lamps[2].lamp.getWorldPosition(new T.Vector3())),dexter:worldPoint(dogCenter)};
    }});
  }
  resize();
  step(0,1);
  start();
}

byId('help').addEventListener('click',()=>guide.showModal());
byId('retry').addEventListener('click',()=>location.reload());
boot();
