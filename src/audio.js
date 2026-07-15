const AUDIO_KEY = 'rain-alley-13-audio-v1'
const defaults = { ambient:true, effects:true, volume:0.68 }

function loadSettings(){
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(AUDIO_KEY) || '{}') } }
  catch { return defaults }
}

class RainAlleyAudio {
  constructor(){
    this.settings=loadSettings()
    this.ctx=null
    this.master=null
    this.ambientGain=null
    this.effectsGain=null
    this.droneGain=null
    this.rainGain=null
    this.chimeTimer=null
  }

  getSettings(){ return { ...this.settings } }

  async start(){
    if(!this.ctx) this.build()
    if(this.ctx?.state==='suspended') await this.ctx.resume()
    this.applySettings()
  }

  build(){
    const AudioContext=window.AudioContext||window.webkitAudioContext
    if(!AudioContext) return
    const ctx=this.ctx=new AudioContext()
    this.master=ctx.createGain();this.master.gain.value=.72;this.master.connect(ctx.destination)
    this.ambientGain=ctx.createGain();this.ambientGain.connect(this.master)
    this.effectsGain=ctx.createGain();this.effectsGain.connect(this.master)

    const rainBuffer=ctx.createBuffer(1,ctx.sampleRate*4,ctx.sampleRate)
    const data=rainBuffer.getChannelData(0)
    let last=0
    for(let i=0;i<data.length;i++){
      const white=Math.random()*2-1
      last=.985*last+.015*white
      data[i]=last*2.4
    }
    const rain=ctx.createBufferSource();rain.buffer=rainBuffer;rain.loop=true
    const rainFilter=ctx.createBiquadFilter();rainFilter.type='bandpass';rainFilter.frequency.value=1450;rainFilter.Q.value=.42
    this.rainGain=ctx.createGain();this.rainGain.gain.value=.36
    rain.connect(rainFilter).connect(this.rainGain).connect(this.ambientGain);rain.start()

    this.droneGain=ctx.createGain();this.droneGain.gain.value=.11;this.droneGain.connect(this.ambientGain)
    ;[55,82.41,110].forEach((frequency,index)=>{
      const osc=ctx.createOscillator();osc.type=index===1?'triangle':'sine';osc.frequency.value=frequency
      const gain=ctx.createGain();gain.gain.value=index===1 ? .035 : .05
      osc.connect(gain).connect(this.droneGain);osc.start()
    })
    const lfo=ctx.createOscillator(),lfoGain=ctx.createGain();lfo.frequency.value=.07;lfoGain.gain.value=.035
    lfo.connect(lfoGain).connect(this.droneGain.gain);lfo.start()
    this.chimeTimer=window.setInterval(()=>this.ambientChime(),9000+Math.random()*5000)
    this.applySettings()
  }

  update(next){
    this.settings={...this.settings,...next}
    localStorage.setItem(AUDIO_KEY,JSON.stringify(this.settings))
    this.start()
    this.applySettings()
    return this.getSettings()
  }

  applySettings(){
    if(!this.ctx) return
    const now=this.ctx.currentTime,volume=Math.max(0,Math.min(1,this.settings.volume))
    this.master.gain.setTargetAtTime(.22+volume*.78,now,.08)
    this.ambientGain.gain.setTargetAtTime(this.settings.ambient?1:0,now,.25)
    this.effectsGain.gain.setTargetAtTime(this.settings.effects?1:0,now,.04)
  }

  setMood(scene){
    if(!this.ctx||!this.droneGain||!this.rainGain) return
    const moods={auction:[.17,.2],archive:[.13,.28],fate:[.2,.14],ending:[.24,.1],counter:[.11,.36],inspect:[.12,.3],question:[.14,.26],solve:[.16,.22]}
    const [drone,rain]=moods[scene]||moods.counter,now=this.ctx.currentTime
    this.droneGain.gain.setTargetAtTime(drone,now,1.2)
    this.rainGain.gain.setTargetAtTime(rain,now,1.2)
  }

  tone(frequency,duration=.14,type='sine',gain=.12,delay=0){
    if(!this.ctx||!this.effectsGain||!this.settings.effects) return
    const now=this.ctx.currentTime+delay,osc=this.ctx.createOscillator(),amp=this.ctx.createGain()
    osc.type=type;osc.frequency.setValueAtTime(frequency,now)
    amp.gain.setValueAtTime(.0001,now);amp.gain.exponentialRampToValueAtTime(gain,now+.012);amp.gain.exponentialRampToValueAtTime(.0001,now+duration)
    osc.connect(amp).connect(this.effectsGain);osc.start(now);osc.stop(now+duration+.03)
  }

  play(name='tap'){
    if(!this.ctx||!this.settings.effects) return
    const sounds={
      tap:()=>this.tone(480,.07,'triangle',.045),
      page:()=>{this.tone(290,.09,'triangle',.04);this.tone(410,.12,'sine',.035,.04)},
      clue:()=>{this.tone(523,.23,'sine',.09);this.tone(784,.3,'sine',.065,.1)},
      question:()=>{this.tone(330,.11,'triangle',.055);this.tone(392,.16,'sine',.04,.06)},
      hint:()=>{this.tone(659,.18,'sine',.055);this.tone(587,.24,'sine',.04,.09)},
      success:()=>{[392,523,659].forEach((n,i)=>this.tone(n,.42,'sine',.08,i*.1))},
      wrong:()=>{this.tone(146,.32,'sawtooth',.045);this.tone(130,.4,'sine',.055,.08)},
      decision:()=>{this.tone(196,.42,'triangle',.09);this.tone(392,.5,'sine',.06,.12)},
      auction:()=>{this.tone(118,.12,'square',.09);this.tone(88,.24,'triangle',.08,.1)},
      door:()=>{this.tone(98,.55,'triangle',.075);this.tone(196,.65,'sine',.055,.18)},
    }
    ;(sounds[name]||sounds.tap)()
  }

  ambientChime(){
    if(!this.ctx||!this.settings.ambient||this.ctx.state!=='running') return
    const notes=[261.63,293.66,392,440],base=notes[Math.floor(Math.random()*notes.length)]
    const now=this.ctx.currentTime,osc=this.ctx.createOscillator(),gain=this.ctx.createGain()
    osc.type='sine';osc.frequency.value=base
    gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.025,now+.15);gain.gain.exponentialRampToValueAtTime(.0001,now+2.8)
    osc.connect(gain).connect(this.ambientGain);osc.start(now);osc.stop(now+3)
  }
}

export const audio=new RainAlleyAudio()
