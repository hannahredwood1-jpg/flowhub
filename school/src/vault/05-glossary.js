/* vault terms, added to the shared glossary. The older model's entries are replaced by the ECHO X ORBIT playbook's. */
['ECHO','ORBIT','ES CONF','OTE','RB','DRAW','CISD','SCRATCH','SD TARGET','RECLAIM','WATCHING','FAST REACTION','DELIVERY RUN'].forEach(k=>{for(let i=GLOSS.length-1;i>=0;i--)if(GLOSS[i][0]===k)GLOSS.splice(i,1)});
GLOSS.push(
 ["RB","Rejection Block","A candle wick that goes past a level holding liquidity, but the candle does not close beyond that level. The wick is the block, and the entry is its midpoint.",6,["CE","CISD","FVG"]],
 ["CE","CE (midpoint)","The 50% point of a wick, gap or candle. This is where the limit order goes.",6,["RB","FVG"]],
 ["CISD","Change in State of Delivery","A candle closes beyond the open of the last candle or candles of the opposite colour that drove the move. It signals that the direction has flipped. It needs a retest.",6,["RB","HARD EXIT"]],
 ["DRAW","Draw on Liquidity","The price pulling the market: an unfilled 1-hour or 4-hour gap, a prominent high or low, or a key open. It is your target and tells you which direction you may trade. No draw, no trade.",6,["LIQUIDITY","FVG"]],
 ["MODEL 1","Model 1 (ECHO X ORBIT)","The external rejection block: a sweep of external liquidity, rejected out of a higher-timeframe gap, entered at the midpoint of the most rejected wick.",6,["MODEL 2","MODEL 3","RB"]],
 ["MODEL 2","Model 2 (ECHO X ORBIT)","The CISD rejection block: a CISD is retested with a wick and no close through it. Entry at that wick's midpoint, with a hard exit.",6,["MODEL 1","CISD","HARD EXIT"]],
 ["MODEL 3","Model 3 (ECHO X ORBIT)","The 1-minute continuation: a quick trend-following scalp used only when no draw is nearby. Price must reject out of both a 1-minute gap and a 1-minute CISD.",6,["MODEL 1","MODEL 2"]],
 ["HARD EXIT","Hard exit","In Model 2, if the next candle closes back through the CISD level, you close the trade immediately, wherever price is.",6,["CISD","MODEL 2"]],
 ["EDGED","Edged","Price comes within a few points of your entry or target, turns, and never fills it.",6,["MODEL 1"]],
 ["EXTERNAL","External level","At or near the prominent high or low of the range, within roughly 50 to 100 points. Stronger than internal.",6,["INTERNAL","PREMIUM"]],
 ["INTERNAL","Internal level","Deeper inside the range, away from the prominent high or low. Weaker than external.",6,["EXTERNAL"]],
 ["UNFILLED GAP","Unfilled gap","A fair value gap price has not traded back into or closed through. These are the main targets and the narrative.",6,["FVG","DRAW"]]
);
GLOSS.sort((a,b)=>a[0]<b[0]?-1:1);
