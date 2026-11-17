import * as T from 'three';
import { blob, glow, ground, group, matte, mesh, randomFrom, TAU } from './model';
import { sprite } from './sky';
import { incidentFrame, incidents } from './timeline';

export function makeIncidents(scene:T.Scene,amber:T.Texture,blue:T.Texture) {
  const root=group(scene);
  const rain=group(root), comet=group(root), floated=group(root);
  const rand=randomFrom(71252);
  const sparks=Array.from({length:75},(_,i)=>{
    const light=sprite(rain,i%4?amber:blue,.09+rand()*.19,.9);
    return {light,offset:rand()*4.7,x:rand(),z:rand(),speed:.85+rand()*1.25};
  });
  const cometBody=blob(comet,glow('#ffce8d',2.6),[0,0,0],[.53,.27,.28],false);
  cometBody.rotation.z=-.19;
  sprite(comet,amber,4,.81);
  const eyes=new T.MeshBasicMaterial({color:'#74344f'});
  blob(comet,eyes,[-.17,.06,.257],[.028,.06,.016],false);
  blob(comet,eyes,[.028,.04,.285],[.029,.061,.016],false);
  blob(comet,eyes,[-.09,-.066,.274],[.092,.016,.014],false);
  for(let i=0;i<14;i++){
    const tail=sprite(comet,i<5?amber:blue,1,.63-i*.029);
    tail.position.set(i*.39+.3,i*.077,-.10);
    tail.scale.set(1.6+i*.13,.39+i*.078,1);
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
        sparks.forEach(({light,offset,x,z,speed})=>{
          const fall=(age-1.05-offset*.21)*speed;
          light.visible=fall>=0&&fall<9;
          light.position.set(moon.x+(x-.72)*fall*2,moon.y-fall*1.35,moon.z+fall*(.49+z*1.1));
          light.material.opacity=frame.shower*(.4+.53*z);
          light.scale.y=light.scale.x*(1+motion*.8);
        });
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
