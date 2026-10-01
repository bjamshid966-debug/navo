const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const SCALE=[293.66,311.13,369.99,392,440,466.16,523.25,587.33];
const NAMES=['Re','Mi♭','Fa♯','Sol','Lya','Si♭','Do','Re²'];
const TRACKS=[
 {n:'Tong navosi',bpm:84,mel:[0,-1,2,-1,3,-1,4,3,2,-1,1,-1,0,-1,-1,-1],dum:[1,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0],tak:[0,0,1,0,1,0,0,1,0,0,1,0,1,0,0,0]},
 {n:'Samarqand kechasi',bpm:72,mel:[4,-1,5,4,3,-1,2,-1,3,-1,4,-1,5,6,5,-1],dum:[1,0,0,1,0,0,1,0,1,0,0,0,1,0,0,0],tak:[0,0,1,0,0,1,0,0,0,1,0,1,0,0,1,0]},
 {n:"Karvon yo'li",bpm:100,mel:[0,2,3,2,0,-1,7,-1,6,5,3,5,6,-1,3,-1],dum:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,1,0],tak:[0,0,1,0,0,0,1,1,0,0,1,0,0,0,1,0]}
];
let ctx,master,analyser,data,noise,pulse=0;
let cur=0,mel=[],pat={dum:[],tak:[]},bpm=84,playing=false,step=0,nextT=0,timer;

function init(){
 if(ctx){if(ctx.state!=='running')ctx.resume();return}
 ctx=new(window.AudioContext||window.webkitAudioContext)();
 master=ctx.createGain();master.gain.value=.8;
 analyser=ctx.createAnalyser();analyser.fftSize=512;data=new Uint8Array(analyser.frequencyBinCount);
 const d=ctx.createDelay(),fb=ctx.createGain();d.delayTime.value=.3;fb.gain.value=.32;
 master.connect(analyser);master.connect(d);d.connect(fb);fb.connect(d);d.connect(analyser);
 analyser.connect(ctx.destination);
 const n=ctx.sampleRate*.1;noise=ctx.createBuffer(1,n,ctx.sampleRate);
 const c=noise.getChannelData(0);for(let i=0;i<n;i++)c[i]=Math.random()*2-1;
}
function pluck(f,t=ctx.currentTime,v=1){
 const a=ctx.createOscillator(),b=ctx.createOscillator(),g=ctx.createGain(),lp=ctx.createBiquadFilter();
 a.type='triangle';b.type='sawtooth';a.frequency.value=f;b.frequency.value=f*1.004;
 lp.type='lowpass';lp.frequency.setValueAtTime(3200,t);lp.frequency.exponentialRampToValueAtTime(500,t+.6);
 g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.2*v,t+.01);g.gain.exponentialRampToValueAtTime(.001,t+1.6);
 a.connect(lp);b.connect(lp);lp.connect(g);g.connect(master);
 a.start(t);b.start(t);a.stop(t+1.7);b.stop(t+1.7);
 setTimeout(()=>pulse=1,Math.max(0,(t-ctx.currentTime)*1000));
}
function dum(t=ctx.currentTime){
 const o=ctx.createOscillator(),g=ctx.createGain();
 o.frequency.setValueAtTime(160,t);o.frequency.exponentialRampToValueAtTime(55,t+.25);
 g.gain.setValueAtTime(.9,t);g.gain.exponentialRampToValueAtTime(.001,t+.35);
 o.connect(g);g.connect(master);o.start(t);o.stop(t+.4);
}
function tak(t=ctx.currentTime){
 const s=ctx.createBufferSource(),h=ctx.createBiquadFilter(),g=ctx.createGain();
 s.buffer=noise;h.type='highpass';h.frequency.value=2500;
 g.gain.setValueAtTime(.45,t);g.gain.exponentialRampToValueAtTime(.001,t+.09);
 s.connect(h);h.connect(g);g.connect(master);s.start(t);
}

/* Torlar */
const strings=$('.strings');
SCALE.forEach((f,i)=>{
 const b=document.createElement('button');b.className='string';
 b.setAttribute('aria-label',`${NAMES[i]} tori`);b.innerHTML=`<b>${NAMES[i]}</b>${i+1}`;
 b.onpointerdown=()=>playString(i);b.onkeydown=e=>{if(e.key===' '||e.key==='Enter')e.preventDefault()};
 b.onkeyup=e=>{if(e.key===' '||e.key==='Enter')playString(i)};
 b.onanimationend=()=>b.classList.remove('on');strings.append(b);
});
function playString(i){
 init();pluck(SCALE[i]);const b=strings.children[i];
 b.classList.remove('on');void b.offsetWidth;b.classList.add('on');
}
addEventListener('keydown',e=>{
 if(e.repeat||e.target.matches('input,button'))return;
 const i=+e.key-1;if(i>=0&&i<8)playString(i);
});

/* Ritm */
const grid=$('#grid');
[['dum','dum'],['tak','tak']].forEach(([r,label])=>{
 const s=document.createElement('span');s.textContent=label;grid.append(s);
 for(let k=0;k<16;k++){
  const c=document.createElement('button');c.className='cell';c.dataset.r=r;c.dataset.s=k;
  c.setAttribute('aria-label',`${label}, ${k+1}-qadam`);
  c.onclick=()=>{pat[r][k]^=1;sync();if(!playing){init();(r==='dum'?dum:tak)()}};
  grid.append(c);
 }
});
function sync(){$$('.cell').forEach(c=>c.setAttribute('aria-pressed',!!pat[c.dataset.r][c.dataset.s]))}
function setTrack(i){
 cur=i;const t=TRACKS[i];mel=t.mel.slice();pat={dum:t.dum.slice(),tak:t.tak.slice()};
 bpm=t.bpm;$('#bpm').value=bpm;$('#bpmv').textContent=bpm;$('#now').textContent=t.n;
 $$('.track').forEach((b,j)=>b.setAttribute('aria-current',j===i));sync();
}
TRACKS.forEach((t,i)=>{
 const b=document.createElement('button');b.className='track';b.textContent=t.n;
 b.onclick=()=>{setTrack(i);play()};$('#tracks').append(b);
});
function sched(){
 while(nextT<ctx.currentTime+.12){
  const s=step,t=nextT;
  if(pat.dum[s])dum(t);if(pat.tak[s])tak(t);
  if(mel[s]>=0)pluck(SCALE[mel[s]],t,.9);
  setTimeout(()=>{if(!playing)return;$$('.cell.now').forEach(c=>c.classList.remove('now'));
   $$(`.cell[data-s="${s}"]`).forEach(c=>c.classList.add('now'))},Math.max(0,(t-ctx.currentTime)*1000));
  nextT+=60/bpm/2;step=(step+1)%16;
 }
}
function play(){
 init();if(playing)return;playing=true;step=0;nextT=ctx.currentTime+.05;
 timer=setInterval(sched,25);$('#play').textContent="To'xtatish";$('#start').textContent="To'xtatish";
}
function stop(){
 clearInterval(timer);playing=false;$$('.cell.now').forEach(c=>c.classList.remove('now'));
 $('#play').textContent='Ijro etish';$('#start').textContent='Kuyni boshlash';
}
const toggle=()=>playing?stop():play();
$('#play').onclick=toggle;$('#start').onclick=toggle;
$('#bpm').oninput=e=>{bpm=+e.target.value;$('#bpmv').textContent=bpm};
setTrack(0);

/* Namunalar */
$$('[data-demo]').forEach(b=>b.onclick=()=>{
 init();const t=ctx.currentTime+.05;
 if(b.dataset.demo==='dutor')[0,2,3,4,3,2].forEach((n,i)=>pluck(SCALE[n],t+i*.28));
 else[[dum,0],[tak,.25],[tak,.5],[dum,.75],[tak,1]].forEach(([f,d])=>f(t+d));
});

/* Vizualizator */
const cv=$('#viz'),g=cv.getContext('2d'),calm=matchMedia('(prefers-reduced-motion:reduce)').matches;
let W,H;
function size(){const r=cv.getBoundingClientRect(),d=devicePixelRatio||1;W=r.width;H=r.height;cv.width=W*d;cv.height=H*d;g.setTransform(d,0,0,d,0,0)}
addEventListener('resize',size);size();
function star(R,rot){for(let k=0;k<2;k++){g.beginPath();for(let i=0;i<4;i++){const a=rot+k*Math.PI/4+i*Math.PI/2;g[i?'lineTo':'moveTo'](Math.cos(a)*R,Math.sin(a)*R)}g.closePath();g.stroke()}}
function draw(ts){
 g.clearRect(0,0,W,H);
 const wide=W>760,cx=wide?W*.7:W*.5,cy=wide?H*.45:H*.3,R=Math.min(W,H)*(wide?.2:.17),N=64,k=calm?0:1;
 g.save();g.translate(cx,cy);
 if(analyser)analyser.getByteFrequencyData(data);
 g.lineCap='round';g.lineWidth=Math.max(2,R*.045);
 for(let i=0;i<N;i++){
  const v=analyser?data[i<32?i:63-i]/255:.18+.12*Math.sin(ts/700+i*.5);
  const a=i/N*Math.PI*2-Math.PI/2,r0=R*1.05,r1=r0+R*.12+v*R*.9;
  g.strokeStyle=i%2?'#22b8b0':'#e2a93b';g.globalAlpha=.35+v*.65;
  g.beginPath();g.moveTo(Math.cos(a)*r0,Math.sin(a)*r0);g.lineTo(Math.cos(a)*r1,Math.sin(a)*r1);g.stroke();
 }
 g.lineWidth=1.5;g.globalAlpha=1;g.strokeStyle='#e2a93b';star(R*(1+pulse*.08),k*ts/9000);
 g.globalAlpha=.5;g.strokeStyle='#22b8b0';star(R*.7,-k*ts/12000);
 g.restore();pulse*=.92;requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
