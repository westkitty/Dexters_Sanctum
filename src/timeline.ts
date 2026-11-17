export const incidents = [
  {kind:'sneeze',duration:6.8,notice:'That star was not authorized.'},
  {kind:'parade',duration:7.6,notice:'A procession was apparently necessary.'},
  {kind:'gravity',duration:8.2,notice:'Gravity has been warned.'},
  {kind:'comet',duration:7.3,notice:'OFFICIAL NOTICE · Local grumpiness exceeds permitted levels.'},
] as const;

export function smooth(start:number,end:number,value:number) {
  const x=Math.max(0,Math.min(1,(value-start)/(end-start)));
  return x*x*(3-2*x);
}

export function incidentFrame(index:number,age:number) {
  const item=incidents[index];
  const active=!!item&&age>=0&&age<item.duration;
  const envelope=(a:number,b:number,c:number,d:number)=>active?smooth(a,b,age)*(1-smooth(c,d,age)):0;
  return {
    active,
    sneeze:index===0?envelope(.12,.85,1.04,1.58):0,
    shower:index===0?envelope(1.05,1.60,4.7,6.65):0,
    parade:index===1?envelope(.2,2.0,5.25,7.48):0,
    gravity:index===2?envelope(.2,2.45,4.8,8):0,
    comet:index===3?envelope(.2,1.5,5.65,7.25):0,
  };
}

export function cueAt(time:number) {
  if(time>=21&&time<27) return 'The moon can be moved. It insists otherwise.';
  return '';
}
