import * as T from 'three';
import { blob, ground, group, matte, mesh, TAU, tube } from './model';

const coat=matte('#23222b'), ridge=matte('#34313b'), inner=matte('#15141d');
const cream=matte('#f1dcb2'), light=matte('#fff0d1'), tan=matte('#d59c5e'), shadowCream=matte('#ceb78e');
const nose=matte('#161521',.30), iris=matte('#533826',.33), glint=new T.MeshBasicMaterial({color:'#fff0d2'});
const tooth=matte('#ffebcc'), tongue=matte('#ca727b',.6);

function lock(parent:T.Object3D, mat:T.Material, points:number[][], size:number, flatten=1) {
  const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
  const frames=curve.computeFrenetFrames(8,false);
  const vertices:number[]=[],indices:number[]=[];
  for(let step=0;step<=8;step++){
    const t=step/8,p=curve.getPointAt(t);
    const radius=size*(.58+.55*Math.sin(Math.PI*t))*(1-.97*t);
    for(let side=0;side<8;side++){
      const a=side/8*TAU;
      const v=p.clone().addScaledVector(frames.normals[step],Math.cos(a)*radius)
        .addScaledVector(frames.binormals[step],Math.sin(a)*radius*flatten);
      vertices.push(v.x,v.y,v.z);
      if(step>0){const n=step*8+side,k=step*8+(side+1)%8;indices.push(n,n-8,k,k,n-8,k-8);}
    }
  }
  const shape=new T.BufferGeometry();
  shape.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
  shape.setIndex(indices);
  shape.computeVertexNormals();
  return mesh(parent,shape,mat);
}

function makeLeg(root:T.Object3D, side:number, front:boolean) {
  const limb=group(root,side*(front?.28:.32),0,0);
  const upper=blob(limb,front?coat:ridge,[0,0,0],[front?.145:.212,.2,front?.147:.224]);
  const lower=blob(limb,cream,[0,0,0],[.112,.17,.112]);
  const paw=group(limb);
  blob(paw,light,[0,0,.013],[.135,.096,.183]);
  for(const x of [-.047,.044]) tube(paw,shadowCream,[[x,.060,.118],[x,.041,.16],[x,.020,.18]],.006,5);
  const hip=new T.Vector3(),knee=new T.Vector3(),foot=new T.Vector3();
  const align=new T.Vector3(), up=new T.Vector3(0,1,0);
  function segment(target:T.Mesh,a:T.Vector3,b:T.Vector3) {
    target.position.copy(a).lerp(b,.5);
    align.subVectors(a,b);
    target.scale.y=align.length()*.5+.085;
    target.quaternion.setFromUnitVectors(up,align.normalize());
  }
  return {front,side,pose(time:number,walk:number,sit:number,lay:number,phase:number,floor:number){
    const stride=Math.sin(phase);
    const swing=Math.max(0,Math.cos(phase));
    const base=front?.37:-.47;
    hip.set(0,.59-sit*(front?.05:.27)-lay*.32,base);
    knee.set(side*.02,.30-sit*(front?.02:.19)-lay*.17,base+(front?-.035:.13)+stride*.106*walk+lay*.13);
    foot.set(side*(sit+lay)*.06,.096+swing*.15*walk+floor,base+stride*.22*walk+sit*(front?.075:.32)+lay*(front?.37:-.23));
    segment(upper,hip,knee);
    segment(lower,knee,foot);
    paw.position.copy(foot);
    paw.rotation.x=-swing*.26*walk+Math.sin(time*2.1)*.018;
  }};
}

export function makeDexter(scene:T.Scene) {
  const root=group(scene,-2.28,0,.14);
  root.name='Dexter';
  const rig=group(root);
  const trunk=group(rig);
  blob(trunk,coat,[0,0,-.10],[.442,.369,.69]);
  blob(trunk,ridge,[0,.113,-.22],[.393,.263,.55]);
  blob(trunk,coat,[0,-.02,-.47],[.408,.354,.37]);
  blob(trunk,cream,[0,-.02,.364],[.388,.391,.31]);
  for(const s of [-1,1]) {
    for(let i=0;i<4;i++) {
      lock(trunk,i%2?light:cream,[[s*(.18+i*.047),.20-i*.055,.48-i*.05],
        [s*(.24+i*.041),.022-i*.031,.565-i*.09],[s*(.21+i*.052),-.28-i*.008,.495-i*.075]],.139-i*.009,.78);
      lock(trunk,i%2?coat:ridge,[[s*.27,.18-i*.057,-.34],[s*.408,.04-i*.04,-.43-i*.025],[s*.385,-.14,-.61-i*.04]],.12,.72);
    }
    blob(trunk,shadowCream,[s*.278,-.164,-.435],[.166,.18,.29]);
  }
  lock(trunk,light,[[0,.27,.50],[0,.03,.655],[.03,-.35,.596]],.2,.90);
  const head=group(rig,0,1.05,.49);
  blob(head,coat,[0,.045,0],[.449,.385,.354]);
  blob(head,ridge,[0,.20,-.054],[.387,.258,.273]);
  blob(head,cream,[0,-.206,.146],[.353,.214,.242]);
  lock(head,cream,[[0,.345,.205],[-.020,.268,.296],[0,.048,.364]],.067,.95);
  const ears:T.Group[]=[],eyes:T.Group[]=[],brows:T.Mesh[]=[];
  for(const s of [-1,1]){
    const ear=group(head,s*.345,.24,-.056);
    ears.push(ear);
    lock(ear,coat,[[0,.038,0],[s*.135,-.065,.045],[s*.137,-.30,.083],[s*.105,-.415,.098]],.21,.77);
    blob(ear,coat,[s*.115,-.144,.047],[.163,.235,.147]);
    lock(ear,ridge,[[s*.02,.105,-.055],[s*.152,.047,-.041],[s*.224,-.152,-.033]],.106,.76);
    lock(ear,coat,[[s*.17,-.115,.077],[s*.142,-.29,.13],[s*.179,-.414,.155]],.115,.69);
    lock(ear,coat,[[s*.11,-.156,.13],[s*.093,-.289,.163],[s*.049,-.413,.17]],.085,.74);
    for(let t=0;t<3;t++){
      const ox=.204+t*.055,oy=-.114-t*.019;
      lock(head,t===0?tan:cream,[[s*ox,oy,.285-t*.04],[s*(ox+.031),oy-.093,.34-t*.055],[s*(ox+.066),oy-.187,.286-t*.055]],.101,.65);
    }
    const eye=group(head,s*.173,.027,.309);
    eye.rotation.y=s*.28;
    eyes.push(eye);
    blob(eye,inner,[0,0,.003],[.124,.106,.067]);
    blob(eye,light,[0,-.014,.043],[.088,.074,.029]);
    blob(eye,iris,[-s*.010,-.008,.064],[.063,.067,.023]);
    blob(eye,nose,[-s*.010,-.008,.081],[.041,.049,.012]);
    blob(eye,glint,[-.022,.016,.092],[.017,.016,.008],false);
    blob(eye,glint,[.021,-.034,.09],[.007,.007,.005],false);
    const lid=blob(head,coat,[s*.173,.084,.369],[.108,.039,.044]);
    lid.rotation.z=s*.19;
    const brow=blob(head,tan,[s*.177,.157,.334],[.101,.047,.036]);
    brow.rotation.z=s*.26;
    brows.push(brow);
    blob(head,light,[s*.090,-.131,.348],[.151,.108,.127]);
  }
  const muzzle=group(head,0,-.195,.31);
  blob(muzzle,inner,[0,-.045,.048],[.145,.046,.092]);
  blob(muzzle,cream,[0,-.081,.031],[.14,.064,.09]);
  const mouth=group(muzzle,0,-.045,.124);
  blob(mouth,inner,[0,0,0],[.119,.038,.018]);
  blob(mouth,tongue,[.020,-.02,.017],[.041,.022,.01]);
  blob(mouth,tooth,[-.064,.013,.015],[.022,.014,.009]);
  blob(head,nose,[0,-.116,.454],[.111,.067,.072]);
  blob(head,ridge,[-.024,-.096,.508],[.051,.014,.017]);
  tube(head,inner,[[0,-.159,.473],[0,-.196,.467],[-.091,-.217,.438],[-.138,-.196,.417]],.010,12);
  tube(head,inner,[[0,-.187,.473],[.093,-.218,.437],[.134,-.196,.416]],.010,12);

  const tail=group(rig,0,.64,-.67);
  lock(tail,coat,[[0,0,0],[.15,.17,-.26],[.23,.43,-.39],[.17,.68,-.20],[.065,.72,.04],[-.08,.59,.09]],.29,.77);
  lock(tail,ridge,[[.04,.11,-.04],[.22,.36,-.34],[.24,.62,-.26],[.14,.79,-.064],[-.033,.73,.07]],.175,.79);
  for(let i=0;i<4;i++){
    lock(tail,i%2?cream:light,[[.19-i*.043,.60+i*.035,-.22+i*.032],[.11-i*.045,.73+i*.022,-.06+i*.033],[-.081-i*.033,.59+i*.025,.09+i*.034]],.12,.83);
  }
  const legs=[makeLeg(rig,-1,true),makeLeg(rig,1,true),makeLeg(rig,-1,false),makeLeg(rig,1,false)];
  const targets=[
    [-2.27,.18,1.3],[-1.48,1.04,1.8],[-.36,1.79,2.65],[.75,2.93,2.6],
    [-.39,2.68,2.6],[-1.58,2.42,3.2],[-2.72,1.7,2.7],[-1.87,.56,1.7],
  ];
  let target=0,wait=.5,walk=0,sit=0,lay=0,angle=.70,phase=0,reactAt=-40,retreat=0;
  let reaction='suspicious';
  let portraitYaw:number|undefined;
  let mood='emerging';
  const query=new T.Vector3();
  return {
    root,head,
    get mood(){return mood;},
    react(kind:string,time:number){reaction=kind;reactAt=time;retreat=kind==='sneeze'?.35:0;},
    update(time:number,dt:number,motion:number,lift:number,view:T.Vector3,portrait:boolean){
      let wanted=0,wantedSit=0,wantedLay=0;
      const [x,z,pause]=targets[target];
      const dx=x-root.position.x,dz=z-root.position.z;
      const distance=Math.hypot(dx,dz);
      const reactionAge=time-reactAt;
      let wantedAngle=angle;
      if(!portrait)portraitYaw=undefined;
      if(portrait){
        portraitYaw??=Math.atan2(view.x-root.position.x,view.z-root.position.z);
        wantedAngle=portraitYaw;
        wantedSit=1;
        mood='portrait';
      }else if(reactionAge<1.45||lift>.07){
        mood=lift>.07?'weightless':reaction;
        if(retreat>0){
          const step=Math.min(retreat,dt*.45);
          root.position.x-=Math.sin(angle)*step;
          root.position.z-=Math.cos(angle)*step;
          retreat-=step;
          wanted=.65;
        }
      }else if(time<3.1){
        mood='emerging';
      }else if(distance>.045){
        mood=target===0?'emerging':'patrol';
        wanted=1;
        wantedAngle=Math.atan2(dx,dz);
        const step=Math.min(distance,dt*(time<8?.79:.67));
        root.position.x+=dx/distance*step;
        root.position.z+=dz/distance*step;
        wait=pause;
      }else{
        wait-=dt;
        wantedAngle=target===3?.6:target===5?.48:target===6?-.25:.70;
        wantedSit=target===3||target===5?1:0;
        wantedLay=target===6?1:0;
        mood=target===6?'sleepy':target===3?'serene':target===5?'side-eye':'sniffing';
        if(wait<=0) target=(target+1)%targets.length;
      }
      const delta=Math.atan2(Math.sin(wantedAngle-angle),Math.cos(wantedAngle-angle));
      angle+=delta*Math.min(1,dt*(portrait?6:4.5));
      root.rotation.y=angle;
      root.position.y=ground(root.position.x,root.position.z)+lift*1.24;
      const follow=1-Math.exp(-dt*7);
      walk=T.MathUtils.lerp(walk,wanted,follow);
      sit=T.MathUtils.lerp(sit,wantedSit,follow*.60);
      lay=T.MathUtils.lerp(lay,wantedLay,follow*.60);
      phase+=dt*(7.4+walk*1.2);
      const breath=Math.sin(time*3.5)*.013*motion;
      trunk.position.set(0,.575+breath+Math.sin(phase*2)*walk*.025-sit*.12-lay*.30,0);
      trunk.rotation.x=-sit*.27+lay*.08;
      const sniff=mood==='sniffing'?.19+Math.sin(time*8)*.10:0;
      const surprise=reactionAge<1.12&&['sneeze','comet','moon'].includes(reaction);
      head.position.y=1.063+breath-sit*.06-lay*.68-sniff*.19;
      head.position.z=.49+lay*.24;
      head.rotation.x=sniff+lay*.14-(surprise?.19:0)+Math.sin(phase)*walk*.042;
      head.rotation.y=(mood==='side-eye'?-.30:0)+Math.sin(time*1.24)*(.13-walk*.08)*motion;
      head.rotation.z=(mood==='serene'?.08:0)+(surprise?-.07:0);
      const blink=Math.max(0,Math.sin(time*1.12+.83))**53;
      const grin=mood==='serene'||(reaction==='garden'&&reactionAge<1.45);
      mouth.visible=grin||surprise;
      mouth.scale.y=grin?1:.84;
      eyes.forEach((eye,i)=>{
        eye.scale.y=Math.max(.08,(surprise?1.19:1)-blink*.86-lay*.82);
        brows[i].position.y=.157+(surprise?.061:0);
        brows[i].rotation.z=(i?1:-1)*(mood==='side-eye'?.44:.26);
        ears[i].rotation.z=(i?1:-1)*(Math.sin(phase+.4)*.073*walk+(surprise?.10:0));
        ears[i].rotation.x=Math.sin(phase-.37)*walk*.11+lay*.16;
      });
      tail.position.y=.64-sit*.24-lay*.30;
      tail.rotation.y=Math.sin(time*(grin?6:3.4))*motion*(grin?.49:.23);
      tail.rotation.x=-sit*.29+lay*.39+Math.sin(time*4.2)*.08*motion;
      legs.forEach((leg,i)=>{
        query.set(leg.side*.30,0,leg.front?.4:-.49).applyAxisAngle(T.Object3D.DEFAULT_UP,angle).add(root.position);
        const floor=ground(query.x,query.z)-ground(root.position.x,root.position.z);
        leg.pose(time,walk,sit,lay,phase+((i===1||i===2)?Math.PI:0),floor);
      });
    },
  };
}
