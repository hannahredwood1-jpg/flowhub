/* ============================================================
   TRACKS: the Trading School is now three separate places. Each has its own page, progress, pace and certificate.
   fundamentals = the school (/school) · invertix = /invertix (opens with the fundamentals certificate) · exo = the vault (ECHO and ORBIT) (/vault, code and mentorship)
============================================================ */
const TRACKS={
 fundamentals:{id:'fundamentals',name:'Trading Fundamentals',short:'Fundamentals',api:'/api/school',cert:'Certificate of Learning · Trading Fundamentals',
  certA:'has completed the FLOWMTD Trading Fundamentals course and passed every practice task,',certB:'and demonstrated an understanding of the fundamentals of trading NQ futures.',
  endText:'from your first chart to your Fundamentals certificate',doneTitle:'Fundamentals complete',certName:'Trading Fundamentals'},
 invertix:{id:'invertix',name:'INVERTIX',short:'INVERTIX',api:'/api/invertix/progress',cert:'Certificate of understanding · INVERTIX',
  certA:'has completed the FLOWMTD INVERTIX course, passed every module exam,',certB:'and demonstrated an understanding of the INVERTIX model.',
  endText:'from the key level to your INVERTIX certificate',doneTitle:'INVERTIX complete',certName:'INVERTIX'},
 exo:{id:'exo',name:'ECHO and ORBIT',short:'ECHO and ORBIT',api:'/api/vault/progress',cert:'Certificate of understanding · ECHO and ORBIT',
  certA:'has completed the FLOWMTD ECHO and ORBIT courses, passed every module exam,',certB:'and demonstrated an understanding of both methods.',
  endText:'across ECHO and ORBIT, from the idea to your two certificates',doneTitle:'ECHO and ORBIT complete',certName:'ECHO and ORBIT'}};
const TRACK=window.PRACTICE?null:window.INV?TRACKS.invertix:window.VAULT?TRACKS.exo:TRACKS.fundamentals;
/* SIDE: one of the separate pages (INVERTIX or the vault), not the fundamentals school */
/* NOEX: the fundamentals have no exams. A module is finished by Learn, See it and Mark it (three chart tasks, each right the first time). */
const NOEX=!!TRACK&&TRACK.id==='fundamentals';
const SIDE=!!(window.VAULT||window.INV);
/* The modules that count toward a track's certificate and pace (the vault's sealed Orderflow room is not part of the course). */
const COURSE=()=>TRACK&&TRACK.id==='exo'?MODS.filter(m=>m.id[0]==='x'||m.id[0]==='b'):MODS;
/* The vault holds two separate strategies, each with its own course, progress and certificate. */
const STRATS=window.VAULT?[
 {id:'echo',name:'ECHO',tag:'Rejection blocks on NQ / MNQ: three entry models, one checklist.',ids:m=>m.id[0]==='x',cert:'Certificate of understanding · ECHO',certA:'has completed the FLOWMTD ECHO course, passed every module exam,',certB:'and demonstrated an understanding of the ECHO method.'},
 {id:'orbit',name:'ORBIT',tag:'A 3-minute OTE model with a 5-minute inversion and a limit entry.',ids:m=>m.id[0]==='b',cert:'Certificate of understanding · ORBIT',certA:'has completed the FLOWMTD ORBIT course, passed every module exam,',certB:'and demonstrated an understanding of the ORBIT method.'}]:[];
const stratOf=m=>STRATS.find(s=>s.ids(m));
const stratMods=s=>MODS.filter(m=>s.ids(m));
