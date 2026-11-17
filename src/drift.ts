import * as T from 'three';
import { batches, group, matte, randomFrom, TAU } from './model';
import { sprite } from './sky';

export function makeDrift(scene:T.Scene, haze:T.Texture) {
  const root=group(scene);
  const rand=randomFrom(32063);
  const spots=[
    {x:-10.1,y:-3.32,z:-6.8,span:1.10},
    {x:11.8,y:-4.80,z:-9.0,span:.91},
    {x:-11.3,y:-6.9,z:2.5,span:.43},
  ];
  const strata:Parameters<typeof batches>[3]=[];
  for(const {x,y,z,span} of spots){
    for(let i=0;i<5;i++){
      const taper=(1-i*.145)*span;
      strata.push({x:x+i*.106*span,y:y-i*.225*span,z:z+i*.075*span,
        sx:taper,sy:.20*span+rand()*.12,sz:taper*.69,yaw:rand()*TAU,lean:rand()*.25,
        color:new T.Color(i===0?'#647362':'#4d5263').multiplyScalar(.81+i*.038)});
    }
  }
  const stacks=batches(root,new T.IcosahedronGeometry(1,0),matte('#789692'),strata);
  const clouds=spots.map(({x,y,z,span})=>{
    const blur=sprite(root,haze,1,.11);
    blur.position.set(x,y-.66*span,z+.15);
    blur.scale.set(3.8*span,.48*span,1);
    return blur;
  });
  return {update(time:number,motion:number){
    stacks.position.y=Math.sin(time*.20)*.11*motion;
    clouds.forEach((blur,i)=>{
      blur.position.x=spots[i].x+Math.sin(time*.14+i)*.43*motion;
      blur.material.opacity=.10+Math.cos(time*.20+i)*.032*motion;
    });
  }};
}
