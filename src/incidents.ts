import * as T from 'three';
import { blob, glow, ground, group, matte, mesh, randomFrom, TAU } from './model';
import { halo, sprite } from './sky';
import { incidentFrame, incidents } from './timeline';

export function makeIncidents(scene:T.Scene,amber:T.Texture,blue:T.Texture) {
  const root=group(scene);
  const comet=group(root), floated=group(root);
  const rand=randomFrom(71252);
  const sparkCount=75;
  const sparkPositions=new Float32Array(sparkCount*3);
  const sparkColors=new Float32Array(sparkCount*3);
  const showerGeometry=new T.BufferGeometry();
  showerGeometry.setAttribute('position',new T.BufferAttribute(sparkPositions,3).setUsage(T.DynamicDrawUsage));
  showerGeometry.setAttribute('color',new T.BufferAttribute(sparkColors,3).setUsage(T.DynamicDrawUsage));
  const showerMaterial=new T.PointsMaterial({
    color:'#ffffff',map:halo('#ffffff'),vertexColors:true,size:.32,transparent:true,
    blending:T.AdditiveBlending,depthWrite:false,toneMapped:false,
  });
  const rain=new T.Points(showerGeometry,showerMaterial);
  rain.frustumCulled=false;
  root.add(rain);
  const sparks=Array.from({length:sparkCount},(_,i)=>({
    offset:rand()*4.7,x:rand(),z:rand(),speed:.85+rand()*1.25,tint:new T.Color(i%4?'#f4b962':'#84eddf'),
  }));
  const cometBody=blob(comet,glow('#ffce8d',2.6),[0,0,0],[.53,.27,.28],false);
  cometBody.rotation.z=-.19;
  sprite(comet,amber,3,.71);
  const eyes=new T.MeshBasicMaterial({color:'#74344f'});
  blob(comet,eyes,[-.17,.06,.257],[.028,.06,.016],false);
  blob(comet,eyes,[.028,.04,.285],[.029,.061,.016],false);
  blob(comet,eyes,[-.09,-.066,.274],[.092,.016,.014],false);
  for(let i=0;i<14;i++){
    const tail=sprite(comet,i<7?amber:blue,1,.52-i*.024);
    tail.position.set(i*.34+.3,i*.035+Math.sin(i*.34)*.12,-.10);
    tail.scale.set(1.54+i*.13,.29+i*.042,1);
    tail.center.set(.2,.5);
  }
  const stones=Array.from({length:17},(_,i)=>{
    const theta=i/17*TAU;
    const x=Math.cos(theta)*3.95,z=Math.sin(theta)*2.81;
    const rock=mesh(floated,new T.DodecahedronGeometry(.11+rand()*.145,0),matte(i%3?'#82738f':'#a18b9e'),[x,ground(x,z)+.035,z]);
    rock.scale.y=.64;
    return {rock,x,z,y:rock.position.y,t:rand()*TAU};
  });
  let current=-1,began=-100;
  return {
    comet,
    get index(){return current;},
    trigger(time:number){
      if(current>=0&&time-began<incidents[current].duration) return null;
      current=(current+1)%incidents.length;
      began=time;
      return incidents[current];
    },
    update(time:number,motion:number,moon:T.Vector3,camera:T.PerspectiveCamera){
      const age=time-began;
      const frame=incidentFrame(current,age);
      rain.visible=frame.shower>0;
      if(rain.visible){
        showerMaterial.opacity=frame.shower*.88;
        sparks.forEach(({offset,x,z,speed,tint},i)=>{
          const fall=(age-1.02-offset*.065)*speed;
          const slot=i*3;
          const visible=fall>=0&&fall<9;
          const alpha=visible?(.83+.41*z)*Math.min(1,fall*5.1)*Math.min(1,(9-fall)*.9):0;
          sparkPositions[slot]=moon.x-.86-fall*(.67+x*2.62);
          sparkPositions[slot+1]=moon.y+.26-fall*(.22+z*.94)+Math.sin(z*8+fall*2)*.17*motion;
          sparkPositions[slot+2]=moon.z+1.48+fall*(.21+z*.75);
          sparkColors[slot]=tint.r*alpha;
          sparkColors[slot+1]=tint.g*alpha;
          sparkColors[slot+2]=tint.b*alpha;
        });
        showerGeometry.attributes.position.needsUpdate=true;
        showerGeometry.attributes.color.needsUpdate=true;
      }
      comet.visible=frame.comet>0;
      if(comet.visible){
        const crossing=Math.min(1,Math.max(0,age/7.3));
        const depth=23;
        const extent=depth*Math.tan(T.MathUtils.degToRad(camera.fov*.5));
        const x=1.23-2.55*crossing;
        const y=(camera.aspect<.79?.49:.58)+Math.sin(crossing*Math.PI)*.14;
        comet.position.set(x*extent*camera.aspect,y*extent,-depth);
        camera.localToWorld(comet.position);
        comet.quaternion.copy(camera.quaternion);
        comet.scale.setScalar(.55+.5*frame.comet);
      }
      stones.forEach(({rock,x,y,z,t},i)=>{
        rock.position.set(x+Math.sin(age+t)*frame.gravity*.35,y+frame.gravity*(.75+i%5*.30),z+Math.cos(age+t)*frame.gravity*.31);
        rock.rotation.set(frame.gravity*age*.35,frame.gravity*(t+age*.49),frame.gravity*Math.cos(age+t)*.42);
      });
      return frame;
    }
  };
}
