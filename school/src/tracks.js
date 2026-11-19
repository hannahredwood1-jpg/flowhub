/* ============================================================
   TRACKS: the Trading School is now three separate places. Each has its own page, progress, pace and certificate.
   fundamentals = the school (/school) · orderflow = /orderflow · then the strategies, each opened by the Orderflow certificate: invertix (/invertix), lumen (/lumen), exo = ECHO x ORBIT (/vault, code and mentorship)
============================================================ */
const TRACKS={
 fundamentals:{id:'fundamentals',name:'Trading Foundations',short:'Foundations',api:'/api/school',cert:'Certificate of Learning · Trading Foundations',
  certA:'has completed the FLOWMTD Trading Foundations course and passed every practice task,',certB:'and demonstrated an understanding of the fundamentals of trading NQ futures.',
  endText:'from your first chart to your Foundations certificate',doneTitle:'Foundations complete',certName:'Trading Foundations'},
 orderflow:{id:'orderflow',name:'Orderflow',short:'Orderflow',api:'/api/orderflow/progress',cert:'Certificate of understanding · Orderflow',
  certA:'has completed the FLOWMTD Orderflow course, passed every module exam,',certB:'and demonstrated an understanding of how orderflow sits beside the strategies.',
  endText:'from the tape and the footprint to your Orderflow certificate',doneTitle:'Orderflow complete',certName:'Orderflow'},
 invertix:{id:'invertix',name:'INVERTIX',short:'INVERTIX',api:'/api/invertix/progress',cert:'Certificate of understanding · INVERTIX',
  certA:'has completed the FLOWMTD INVERTIX course, passed every module exam,',certB:'and demonstrated an understanding of reading red-folder news in the order flow.',
  endText:'from the news candle to your INVERTIX certificate',doneTitle:'INVERTIX complete',certName:'INVERTIX'},
 lumen:{id:'lumen',name:'LUMEN',short:'LUMEN',api:'/api/lumen/progress',cert:'Certificate of understanding · LUMEN',
  certA:'has completed the FLOWMTD LUMEN course, passed every module exam,',certB:'and demonstrated an understanding of reading the order flow with LUMEN.',
  endText:'from the zone tap to your LUMEN certificate',doneTitle:'LUMEN complete',certName:'LUMEN'},
 exo:{id:'exo',name:'ECHO x ORBIT',short:'ECHO x ORBIT',api:'/api/vault/progress',cert:'Certificate of understanding · ECHO x ORBIT',
  certA:'has completed the FLOWMTD ECHO x ORBIT course, passed every module exam,',certB:'and demonstrated an understanding of reading the order flow with both strategies.',
  endText:'from the rejection wick to your ECHO x ORBIT certificate',doneTitle:'ECHO x ORBIT complete',certName:'ECHO x ORBIT'}};
const TRACK=window.PRACTICE?null:window.LUMEN?TRACKS.lumen:window.OFL?TRACKS.orderflow:window.INV?TRACKS.invertix:window.VAULT?TRACKS.exo:TRACKS.fundamentals;
/* SIDE: one of the separate pages (INVERTIX or the vault), not the fundamentals school */
/* NOEX: the fundamentals have no exams. A module is finished by Learn, See it and Mark it (three chart tasks, each right the first time). */
const NOEX=!!TRACK&&TRACK.id==='fundamentals';
const SIDE=!!(window.VAULT||window.INV||window.LUMEN);
/* LITE: concept lessons with nothing to mark on a chart. One card at a time, one easy check, done. The chart-skill modules keep See it and Mark it. Saved progress is not touched. */
const LITE=['m37','m38','m19','m20','m39','m41','m42','m01','m15','m25','m12','m14','m24','m50'];
if(NOEX)MODS.forEach(m=>{if(LITE.includes(m.id))m.lite=1});
/* The modules that count toward a track's certificate and pace (the vault's sealed Orderflow room is not part of the course). */
/* The learning path: after the Foundations a student picks the Orderflow path (the full course) or the Basic path (strategy rules and sizing only, no order-flow reading).
   On the Basic path the lessons that read the order flow are hidden here (the server also opens the strategy doors after the Foundations). A test keeps this list in step with src/lib/tracks.ts. */
const BASIC_IDS={invertix:['n01','bn1','bn2'],lumen:['l01','bl1','bl2'],exo:['e01','be1','be2','be3']};
const BASIC_ONLY=['bl1','bl2','bn1','bn2','be1','be2','be3'];
const BASIC_ON=window.LEARN_PATH==='basic'&&SIDE&&!!TRACK&&!!BASIC_IDS[TRACK.id];
if(BASIC_ON){MODS.forEach(m=>{if(!BASIC_IDS[TRACK.id].includes(m.id))m.hid=1});let k=0;MODS.forEach(m=>{if(!m.hid)m.n=++k});
  TRACK.certA=TRACK.certA.replace('passed every module exam,','passed every Basic path exam,');TRACK.certB='and demonstrated an understanding of the strategy rules: the entry, the stop, the target and the size.'}
if(SIDE&&TRACK&&!BASIC_ON)MODS.forEach(m=>{if(BASIC_ONLY.includes(m.id))m.hid=1});   /* the Basic-only lessons belong to the Basic Path */
const COURSE=()=>MODS.filter(m=>!m.hid&&!optSkip(m));
/* The vault is one course now (ECHO x ORBIT), so there are no separate strategy sections. */
const STRATS=[];
const stratOf=m=>STRATS.find(s=>s.ids(m));
const stratMods=s=>MODS.filter(m=>s.ids(m));

/* Course path strip: the order the school is taken in, with the page you are on marked. */
(()=>{if(window.PRACTICE)document.body.classList.add('prac');const bar=document.getElementById('coursebar');if(bar&&TRACK){
 const C=[['fundamentals','Foundations','/school'],['orderflow','Orderflow','/orderflow'],['invertix','INVERTIX','/invertix'],['lumen','LUMEN','/lumen'],['exo','ECHO x ORBIT','/vault']].filter(c=>!(window.LEARN_PATH==='basic'&&c[0]==='orderflow'));
 bar.innerHTML=C.map((c,i)=>`<a href="${c[2]}"${c[0]===TRACK.id?' class="on" aria-current="page"':''}><i>${i+1}</i>${c[1]}</a>`).join('');bar.hidden=false}
 const tb=document.getElementById('themeBtn');if(tb)tb.addEventListener('click',()=>{const n=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=n;try{localStorage.setItem('fh-theme',n)}catch(e){}})})();
