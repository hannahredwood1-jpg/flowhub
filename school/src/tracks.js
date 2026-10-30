/* ============================================================
   TRACKS: the Trading School is now three separate places. Each has its own page, progress, pace and certificate.
   fundamentals = the school (/school) · invertix = /invertix (opens with the fundamentals certificate) · exo = the ECHO X ORBIT vault (/vault, code and mentorship)
============================================================ */
const TRACKS={
 fundamentals:{id:'fundamentals',name:'Trading Fundamentals',short:'Fundamentals',api:'/api/school',cert:'Certificate of Learning · Trading Fundamentals',
  certA:'has completed the FLOWMTD Trading Fundamentals course, passed every module exam,',certB:'and demonstrated an understanding of the fundamentals of trading NQ futures.',
  endText:'from your first chart to your Fundamentals certificate',doneTitle:'Fundamentals complete',certName:'Trading Fundamentals'},
 invertix:{id:'invertix',name:'INVERTIX',short:'INVERTIX',api:'/api/invertix/progress',cert:'Certificate of understanding · INVERTIX',
  certA:'has completed the FLOWMTD INVERTIX course, passed every module exam,',certB:'and demonstrated an understanding of the INVERTIX model.',
  endText:'from the key level to your INVERTIX certificate',doneTitle:'INVERTIX complete',certName:'INVERTIX'},
 exo:{id:'exo',name:'ECHO X ORBIT',short:'ECHO X ORBIT',api:'/api/vault/progress',cert:'Certificate of understanding · ECHO X ORBIT',
  certA:'has completed the FLOWMTD ECHO X ORBIT course, passed every module exam,',certB:'and demonstrated an understanding of the ECHO X ORBIT method.',
  endText:'from the idea to your ECHO X ORBIT certificate',doneTitle:'ECHO X ORBIT complete',certName:'ECHO X ORBIT'}};
const TRACK=window.PRACTICE?null:window.INV?TRACKS.invertix:window.VAULT?TRACKS.exo:TRACKS.fundamentals;
/* SIDE: one of the separate pages (INVERTIX or the vault), not the fundamentals school */
const SIDE=!!(window.VAULT||window.INV);
