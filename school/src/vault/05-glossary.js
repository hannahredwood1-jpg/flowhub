/* vault terms, added to the shared glossary */
GLOSS.push(
 ["SWEEP","Sweep (ExO)","A candle trades beyond a level by at least one tick. A swept high sets up a short; a swept low sets up a long.",6,["CISD","WATCHING"]],
 ["DELIVERY RUN","Delivery run","The run of same-direction candles that pushed price into the level. Its opening price is the CISD line.",6,["CISD","SWEEP"]],
 ["WATCHING","WATCHING tab (ExO)","A grey tab on the wick of the sweep, counting 1/3, 2/3, 3/3 candles. It means a level was just swept: do nothing yet.",6,["SWEEP","CISD"]],
 ["RECLAIM","Reclaim / close back inside","The confirmation candle closes back on the original side of the swept level with its body, not just a wick.",6,["SWEEP","CISD"]],
 ["FAST REACTION","Fast reaction","Confirmation arrives within 3 candles of the sweep candle.",6,["SWEEP"]],
 ["SCRATCH","Scratch","A trade that reaches +0.25R, has its stop moved to the entry, and is then stopped there. It costs only the trading costs, and it is not a win.",6,["R","BE"]],
 ["SD TARGET","Standard deviation target","The size of the range the swept level came from, projected beyond that range's far end. ExO targets half of that size beyond.",6,["SWEEP"]]
);
GLOSS.sort((a,b)=>a[0]<b[0]?-1:1);
