export function makeAudio() {
  let context:AudioContext|undefined;
  let master:GainNode|undefined;
  let enabled=false;
  const ambience: OscillatorNode[]=[];
  return {
    get enabled(){return enabled;},
    async toggle(){
      if(enabled){
        enabled=false;
        master?.gain.setTargetAtTime(0,context!.currentTime,.14);
        return false;
      }
      context??=new AudioContext();
      if(!master){
        master=context.createGain();
        master.gain.value=0;
        master.connect(context.destination);
        [110,164.81,220.18].forEach((frequency,i)=>{
          const voice=context!.createOscillator();
          const level=context!.createGain();
          voice.type='sine';
          voice.frequency.value=frequency;
          level.gain.value=[.20,.11,.045][i];
          voice.connect(level).connect(master!);
          voice.start();
          ambience.push(voice);
        });
      }
      await context.resume();
      enabled=true;
      master.gain.setTargetAtTime(.105,context.currentTime,.35);
      return true;
    },
    chime(kind:string){
      if(!enabled||!context||!master)return;
      const notes=kind==='gravity'?[261.63,329.63,392]:kind==='sneeze'?[780,520]:kind==='water'?[329.63,440]:[440,659.25];
      notes.forEach((frequency,i)=>{
        const voice=context!.createOscillator();
        const level=context!.createGain();
        const when=context!.currentTime+i*.10;
        voice.frequency.value=frequency;
        level.gain.value=.0001;
        level.gain.setValueAtTime(.0001,when);
        level.gain.exponentialRampToValueAtTime(.25,when+.075);
        level.gain.exponentialRampToValueAtTime(.0001,when+.62);
        voice.connect(level).connect(master!);
        voice.onended=()=>{voice.disconnect();level.disconnect();};
        voice.start(when);
        voice.stop(when+.65);
      });
    },
    suspend(hidden:boolean){
      if(!context)return;
      if(hidden)void context.suspend().catch(()=>{});
      else if(enabled)void context.resume().catch(()=>{});
    },
    dispose(){for(const voice of ambience)voice.stop();void context?.close().catch(()=>{});}
  };
}
