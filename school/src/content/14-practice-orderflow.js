/* ============================================================
   PRACTICE (practice page only): footprint reading scenes from all three strategies. Each task shows a generated footprint (DeepCharts-style cells, delta and
   cumulative delta) and asks for the call: take it at your planned size, take half size, or skip it; or what the flow says. Endless, fresh numbers every time.
============================================================ */
(()=>{
const NEWS=['n_exhaust','n_absorb','n_diverge','n_fed','n_slow'],ZONE=['z_absorb','z_slice'],BRK=['b_good','b_weak','b_absorbed'],AFT=['a_fed','a_div','a_opp'],WICK=['e_failed','e_absorb','e_notrej','e_div'],ORB=['o_tap','o_through','o_inv','o_invweak'];
MODS.push({id:'px1',n:MODS.length+1,ph:0,t:'Footprint scenes: green, yellow or red',out:'Read a footprint and make the call.',learn:[],bank:[],
 drills:[
  ofSceneQ('INVERTIX news',NEWS,'A news spike has just printed and the indicator wants to fade it. Below is the footprint of the candles after it. What is your move?','trade'),
  ofSceneQ('INVERTIX news',NEWS,'Read the footprint of the candles after a news spike.','read'),
  ofSceneQ('LUMEN: the tap',ZONE,'Price has just tapped a LUMEN zone and you are watching for a long. What is your move?','trade'),
  ofSceneQ('LUMEN: the break',BRK,'LUMEN has marked a break away from the zone (the big candle is the third column). What is your move?','trade'),
  ofSceneQ('LUMEN: after entry',AFT,'You are in a LUMEN long. Read the footprint since you entered.','read'),
  ofSceneQ('Echo: the wick',WICK,'Price swept a high and left a wick. Read the footprint around the sweep.','read'),
  ofSceneQ('Echo: keep or cancel',WICK,'Echo has marked a limit at the middle of a wick. What do you do?','trade'),
  ofSceneQ('Orbit',ORB,'Orbit has reached one of its three moments (the tap, the inversion or the limit). What do you do?','trade'),
  ofSceneQ('Your limit order',['l_slow','l_surge'],'Price is coming back to your limit order. What do you do?','limit')]});
})();
