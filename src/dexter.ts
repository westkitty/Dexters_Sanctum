import * as T from 'three';
import { blob, ground, group, matte, mesh, TAU, tube } from './model';

const coat=matte('#222127'), ridge=matte('#302e35'), inner=matte('#15141a');
const cream=matte('#dbc59d'), light=matte('#f4e4c4'), tan=matte('#bf8d55'), shadowCream=matte('#b3a080');
const nose=matte('#16151a',.44), iris=matte('#4c3222',.38), glint=new T.MeshBasicMaterial({color:'#fff0d2'});
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

const skull = { y: .04, z: -.012, width: .424, height: .355, depth: .361 };

function foreheadAt(x: number, y: number) {
  const radius = (x / skull.width) ** 2 + ((y - skull.y) / skull.height) ** 2;
  return skull.z + skull.depth * Math.sqrt(Math.max(.045, 1 - radius));
}

// Project the sheet's irregular color markings onto the sculpted forehead.
function marking(parent: T.Object3D, material: T.Material, outline: [number, number][]) {
  const middle = outline.reduce((point, [x, y]) => point.add(new T.Vector2(x, y)), new T.Vector2())
    .multiplyScalar(1 / outline.length);
  const contour = outline.map(([x, y]) => new T.Vector2(x, y));
  if (T.ShapeUtils.isClockWise(contour)) contour.reverse();
  const count = contour.length;
  const positions = [middle.x, middle.y, foreheadAt(middle.x, middle.y) + .006];
  const indices: number[] = [];
  for (let ring = 1; ring <= 4; ring++) {
    contour.forEach((point, i) => {
      const x = T.MathUtils.lerp(middle.x, point.x, ring / 4);
      const y = T.MathUtils.lerp(middle.y, point.y, ring / 4);
      positions.push(x, y, foreheadAt(x, y) + .007);
      const current = 1 + (ring - 1) * count + i;
      const next = 1 + (ring - 1) * count + (i + 1) % count;
      if (ring === 1) indices.push(0, current, next);
      else indices.push(current - count, current, next, current - count, next, next - count);
    });
  }
  const shape = new T.BufferGeometry();
  shape.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  shape.setIndex(indices);
  shape.computeVertexNormals();
  return mesh(parent, shape, material, [0, 0, 0], false);
}

function earLeather(parent: T.Object3D, side: number) {
  // Broad at the fold, then narrowing into a low outward sweep.
  const contour = [
    [0, .076, -.027, .043, .035],
    [.047, .034, -.016, .123, .077],
    [.081, -.068, .006, .151, .096],
    [.099, -.188, .039, .140, .082],
    [.117, -.287, .071, .103, .054],
    [.148, -.357, .085, .064, .029],
    [.193, -.390, .074, .011, .007],
  ];
  const vertices: number[] = [], indices: number[] = [];
  const segments = 22;
  const axis = new T.CatmullRomCurve3(contour.map(([x,y,z]) => new T.Vector3(side*x,y,z)));
  const radii = new T.CatmullRomCurve3(contour.map(([, , , width, depth], i) => new T.Vector3(width, depth, i)));
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const center = axis.getPoint(t);
    const width = radii.getPoint(t);
    for (let j = 0; j < segments; j++) {
      const angle = j / segments * TAU;
      const ridge = 1 + .038 * Math.cos(angle * 5 + t * 7);
      vertices.push(center.x + Math.cos(angle) * width.x * ridge, center.y, center.z + Math.sin(angle) * width.y * ridge);
      if (i > 0) {
        const next = i * segments + (j + 1) % segments;
        const current = i * segments + j;
        indices.push(current, current - segments, next, next, current - segments, next - segments);
      }
    }
  }
  const shape = new T.BufferGeometry();
  shape.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
  shape.setIndex(indices);
  shape.computeVertexNormals();
  mesh(parent, shape, coat);
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
  root.name='Dexter — The Furious Little Stinkweasel';
  const contactMaterial = new T.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { strength: { value: .31 } },
    vertexShader: `
      varying vec2 contactUv;
      void main() {
        contactUv = uv * 2.0 - 1.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 contactUv;
      uniform float strength;
      void main() {
        float softEdge = 1.0 - smoothstep(.10, 1.0, length(contactUv));
        gl_FragColor = vec4(.025, .018, .043, softEdge * strength);
      }
    `,
  });
  const contact = mesh(root, new T.PlaneGeometry(1.36, 1.75), contactMaterial, [0,.022,-.048], false);
  contact.rotation.x = -Math.PI / 2;
  contact.raycast = () => {};
  const rig=group(root);
  const trunk=group(rig);
  blob(trunk,coat,[0,-.014,-.14],[.419,.351,.642]);
  blob(trunk,coat,[0,-.041,-.429],[.386,.326,.361]);
  blob(trunk,cream,[0,-.004,.359],[.350,.348,.286]);
  lock(trunk,cream,[[0,.26,.491],[.003,.032,.627],[-.028,-.355,.488]],.190,.78);
  for(const side of [-1,1]) {
    for(let i=0;i<6;i++) {
      const f=i/5;
      const x=.09+f*.244;
      lock(trunk,i%3===0?light:cream,[[side*x,.208-f*.036,.487-f*.154],
        [side*(x+.046),.018+f*.026,.592-f*.132],[side*(x+.017),-.334+f*.215,.499-f*.163]],
      .105-f*.039,.58);
      lock(trunk,i%2?coat:ridge,[[side*.263,.143-f*.247,-.22-f*.015],
        [side*(.385-f*.026),.064-f*.198,-.402-f*.054],
        [side*(.379-f*.042),-.025-f*.185,-.583-f*.061]],.083-f*.021,.51);
    }
    blob(trunk,shadowCream,[side*.278,-.152,-.462],[.154,.166,.252]);
  }

  const head=group(rig,0,1.05,.49);
  blob(head,coat,[0,skull.y,skull.z],[skull.width,skull.height,skull.depth]);
  const cheeks=blob(head,cream,[0,-.174,.139],[.309,.185,.229]);
  cheeks.rotation.x=-.13;
  marking(head,light,[[-.025,.360],[-.014,.330],[-.026,.349],[-.020,.311],[-.039,.293],
    [-.024,.267],[-.020,.220],[-.013,.170],[.000,.130],[.009,.189],[.015,.245],
    [.033,.290],[.022,.302],[.031,.348],[.013,.331],[.005,.367],[-.005,.321]]);
  const ears:T.Group[]=[],eyes:T.Group[]=[],brows:T.Mesh[]=[];
  for(const side of [-1,1]){
    const ear=group(head,side*.327,.201,-.028);
    ears.push(ear);
    earLeather(ear,side);
    for(let i=0;i<5;i++){
      const offset=side*(i-2)*.038;
      lock(ear,i%4===0?ridge:coat,[[side*.061+offset,-.029,.052],
        [side*.119+offset,-.184,.109-i*.005],
        [side*.159+offset,-.335+i*.014,.101-i*.009]],.062-i*.004,.56);
    }
    for(let i=0;i<3;i++){
      lock(head,i===0?ridge:coat,[[side*(.207+i*.039),.275-i*.012,-.038],
        [side*(.263+i*.041),.345-i*.008,-.035-i*.024],
        [side*(.319+i*.054),.316-i*.052,-.086-i*.016]],.077-i*.008,.72);
    }
    const chevron: [number,number][]=[[.091,.128],[.099,.155],[.141,.174],[.176,.177],
      [.210,.165],[.239,.138],[.216,.145],[.227,.125],[.197,.135],[.171,.111],[.132,.106]];
    const brow=marking(head,tan,chevron.map(([x,y])=>[side*x,y]));
    brows.push(brow);
    for(let i=0;i<6;i++){
      const x=.181+i*.026,y=-.061-i*.019;
      lock(head,i<3?tan:i%2?cream:light,[[side*x,y,.266-i*.020],
        [side*(x+.036),y-.054,.303-i*.031],
        [side*(x+.100),y-.082-i*.008,.233-i*.025]],.077-i*.007,.49);
    }

    const eye=group(head,side*.157,.026,.295);
    eye.rotation.y=side*.25;
    eye.rotation.z=side*.30;
    eyes.push(eye);
    blob(eye,inner,[0,0,0],[.109,.080,.048]);
    blob(eye,light,[0,-.010,.031],[.082,.046,.028]);
    blob(eye,iris,[-side*.008,-.004,.053],[.051,.046,.020]);
    blob(eye,nose,[-side*.008,-.004,.069],[.035,.038,.010]);
    blob(eye,glint,[-.020,.014,.077],[.010,.011,.006],false);
    blob(eye,glint,[.015,-.025,.078],[.004,.004,.004],false);

    const upperLid=blob(head,coat,[side*.155,.064,.328],[.105,.035,.036]);
    upperLid.rotation.z=side*.33;
    const muzzlePad=blob(head,light,[side*.061,-.112,.325],[.115,.078,.120]);
    muzzlePad.rotation.z=side*.09;
    for(let i=0;i<3;i++){
      blob(head,shadowCream,[side*(.102+i*.017),-.108-(i%2)*.017,.423-i*.014],[.005,.005,.004],false);
    }
  }
  const muzzle=group(head,0,-.194,.322);
  blob(muzzle,light,[0,-.017,.018],[.140,.058,.106]);
  const mouth=group(muzzle,0,-.006,.116);
  blob(mouth,inner,[0,0,0],[.097,.032,.015]);
  blob(mouth,tongue,[.016,-.014,.012],[.036,.017,.008]);
  blob(mouth,tooth,[-.052,.011,.012],[.018,.009,.008]);
  const noseBridge=blob(head,nose,[0,-.079,.420],[.094,.055,.069]);
  noseBridge.rotation.x=-.25;
  blob(head,inner,[0,-.103,.445],[.057,.033,.041]);
  blob(head,ridge,[-.020,-.064,.476],[.039,.011,.010]);
  tube(head,inner,[[0,-.119,.465],[0,-.155,.449],[-.044,-.165,.439],[-.087,-.175,.418],[-.108,-.189,.397]],.007,11);
  tube(head,inner,[[0,-.155,.449],[.046,-.163,.439],[.086,-.174,.419],[.109,-.185,.398]],.007,11);
  tube(head,shadowCream,[[-.047,-.209,.425],[0,-.220,.426],[.042,-.210,.424]],.0045,8);

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
      contact.position.y=.022-lift*1.24;
      contactMaterial.uniforms.strength.value=.31-lift*.23;
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
        brows[i].position.y=surprise?.026:0;
        brows[i].position.z=surprise?.014:0;
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
