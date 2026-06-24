'use strict';

// Logica de audio extraida desde main.js. Mantiene playTone como funcion global clasica.

function playTone(kind, opts={}){
  try{
    const AudioContext=window.AudioContext||window.webkitAudioContext;
    if(!AudioContext) return;
    const ac=new AudioContext();
    const now=ac.currentTime;
    const master=ac.createGain();
    master.gain.setValueAtTime(.92, now);
    master.connect(ac.destination);

    function envGain(t, dur, gain=.08, attack=.004, curve=2.4){
      const g=ac.createGain();
      g.gain.setValueAtTime(.0001, now+t);
      g.gain.exponentialRampToValueAtTime(Math.max(.0002,gain), now+t+attack);
      g.gain.exponentialRampToValueAtTime(.0001, now+t+dur);
      return g;
    }

    function tone(freq, t, dur, type='triangle', gain=.08, attack=.004, dest=master){
      const o=ac.createOscillator(), g=envGain(t,dur,gain,attack);
      o.type=type;
      o.frequency.setValueAtTime(freq, now+t);
      o.connect(g).connect(dest);
      o.start(now+t);
      o.stop(now+t+dur+.03);
    }

    function bendTone(freq0, freq1, t, dur, type='sine', gain=.08, attack=.004, dest=master){
      const o=ac.createOscillator(), g=envGain(t,dur,gain,attack);
      o.type=type;
      o.frequency.setValueAtTime(freq0, now+t);
      o.frequency.exponentialRampToValueAtTime(Math.max(1,freq1), now+t+dur);
      o.connect(g).connect(dest);
      o.start(now+t);
      o.stop(now+t+dur+.03);
    }

    function clickBuffer(t, dur, gain=.05, filterType='bandpass', freq=1400, q=8, decayPow=2.8, dest=master){
      const n=Math.max(1, Math.floor(ac.sampleRate*dur));
      const b=ac.createBuffer(1,n,ac.sampleRate);
      const data=b.getChannelData(0);
      for(let i=0;i<n;i++){
        const x=i/n;
        const decay=Math.pow(1-x,decayPow);
        // mezcla ruido + pequeños impulsos irregulares para evitar sonido electrónico puro
        data[i]=(Math.random()*2-1)*decay;
        if(i<Math.min(16,n)) data[i]+= (Math.random()>.5?1:-1)*(1-i/16)*0.65;
      }
      const s=ac.createBufferSource();
      s.buffer=b;
      const f=ac.createBiquadFilter();
      f.type=filterType;
      f.frequency.setValueAtTime(freq, now+t);
      f.Q.setValueAtTime(q, now+t);
      const g=envGain(t,dur,gain,.002);
      s.connect(f).connect(g).connect(dest);
      s.start(now+t);
      s.stop(now+t+dur+.02);
    }

    function resonator(freq, t, dur, gain=.035, q=18, dest=master){
      const n=Math.max(1, Math.floor(ac.sampleRate*dur));
      const b=ac.createBuffer(1,n,ac.sampleRate);
      const data=b.getChannelData(0);
      for(let i=0;i<n;i++){
        const x=i/n;
        const decay=Math.exp(-x*8.5);
        data[i]=(Math.random()*2-1)*decay;
      }
      const s=ac.createBufferSource();
      s.buffer=b;
      const f=ac.createBiquadFilter();
      f.type='bandpass';
      f.frequency.setValueAtTime(freq, now+t);
      f.Q.setValueAtTime(q, now+t);
      const g=envGain(t,dur,gain,.003);
      s.connect(f).connect(g).connect(dest);
      s.start(now+t);
      s.stop(now+t+dur+.02);
    }

    function shortRoom(dest=master, wet=.08){
      // reverberación mínima mediante delay corto; da cuerpo sin parecer eco.
      const delay=ac.createDelay(.08);
      const fb=ac.createGain();
      const wetGain=ac.createGain();
      delay.delayTime.setValueAtTime(.026, now);
      fb.gain.setValueAtTime(.18, now);
      wetGain.gain.setValueAtTime(wet, now);
      delay.connect(fb).connect(delay);
      delay.connect(wetGain).connect(dest);
      return delay;
    }

    if(kind==='collision'){
      // v15.7: clack de ficha/puck: impacto transitorio + dos resonancias materiales.
      const s=Math.max(.45, Math.min(1.35, opts.strength || 1));
      const room=shortRoom(master,.035);
      clickBuffer(0.000,.030,.070*s,'bandpass',1650,11,3.2,master);
      clickBuffer(0.004,.026,.026*s,'highpass',2400,4,3.8,master);
      resonator(520,0.000,.070,.036*s,16,room);
      resonator(1160,0.004,.055,.026*s,22,master);
      tone(290,0.002,.040,'triangle',.010*s,.002,master);
    } else if(kind==='pass'){
      // Pase válido v15.8: acompañamiento mínimo.
      // Un "tink" leve después del clack físico; no debe sonar a notificación.
      resonator(1180,0.000,.055,.012,24,master);
      tone(1680,0.030,.055,'sine',.010,.004,master);
      clickBuffer(0.002,.018,.010,'bandpass',2100,10,3.6,master);
    } else if(kind==='restart'){
      // Saque inicial: tres fichas acomodándose rápidamente.
      clickBuffer(0.000,.032,.045,'bandpass',1300,9,3.0,master);
      resonator(510,0.000,.065,.024,15,master);
      clickBuffer(0.060,.034,.040,'bandpass',1550,9,3.0,master);
      resonator(670,0.060,.062,.022,15,master);
      clickBuffer(0.123,.030,.030,'bandpass',1180,8,3.1,master);
      clickBuffer(0.160,.080,.012,'highpass',700,2,2.2,master);
    } else if(kind==='goal'){
      // Gol se mantiene casi igual: es el sonido que ya funcionaba mejor.
      clickBuffer(0.000,.090,.020,'bandpass',900,5,2.6,master);
      tone(196, 0.00, .16, 'sine', .13);
      tone(523, 0.12, .18, 'triangle', .11);
      tone(784, 0.24, .24, 'triangle', .12);
      tone(1046, 0.36, .34, 'triangle', .08);
      tone(1318, 0.39, .30, 'sine', .045);
    } else if(kind==='foul'){
      // Silbato corto de árbitro: tono agudo con vibrato y caída final.
      const g=envGain(0,.245,.105,.010);
      const o=ac.createOscillator();
      const lfo=ac.createOscillator();
      const lfoGain=ac.createGain();
      o.type='sine';
      o.frequency.setValueAtTime(1960, now);
      o.frequency.linearRampToValueAtTime(2140, now+.075);
      o.frequency.linearRampToValueAtTime(1860, now+.205);
      lfo.type='sine';
      lfo.frequency.setValueAtTime(28, now);
      lfoGain.gain.setValueAtTime(34, now);
      lfo.connect(lfoGain).connect(o.frequency);
      const hp=ac.createBiquadFilter();
      hp.type='highpass';
      hp.frequency.setValueAtTime(900, now);
      o.connect(hp).connect(g).connect(master);
      o.start(now);
      lfo.start(now);
      o.stop(now+.255);
      lfo.stop(now+.255);
      tone(3920,0.012,.060,'sine',.014,.004,master);
      clickBuffer(0.000,.120,.010,'bandpass',2600,14,2.4,master);
    } else {
      tone(440,0,.10,'triangle',.04);
    }

    setTimeout(()=>ac.close(),1500);
  }catch(e){}
}

