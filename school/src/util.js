/* ============================================================
   helpers
============================================================ */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const el=h=>{const t=document.createElement('template');t.innerHTML=h.trim();return t.content.firstElementChild};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const mulberry=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const shuf=(a,r=Math.random)=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const pick=(r,a)=>a[Math.floor(r()*a.length)];
const q4=x=>Math.round(x*4)/4;
const fm=(p,d=2)=>Number(p).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
const usd=(v,d=0)=>(v<0?'−':'')+'$'+Math.abs(v).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
const words=s=>(s.trim().match(/\S+/g)||[]).length;
const rgba=(hex,a)=>{const n=parseInt(hex.slice(1),16);return `rgba(${n>>16},${n>>8&255},${n&255},${a})`};
const hhmm=m=>{m=((Math.round(m)%1440)+1440)%1440;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0')};
const ampm=m=>{m=((Math.round(m)%1440)+1440)%1440;let h=Math.floor(m/60);const mm=m%60,ap=h>=12?'PM':'AM';h=h%12||12;return h+':'+String(mm).padStart(2,'0')+' '+ap};
let toastT;function toast(m){const t=$('#toast');if(!t)return;t.textContent=m;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),2300)}
