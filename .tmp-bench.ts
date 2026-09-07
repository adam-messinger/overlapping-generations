import { runSimulation } from './src/simulation.js';
function time(label:string, fn:()=>void, n=3){
  fn();
  const t0=process.hrtime.bigint();
  for(let i=0;i<n;i++) fn();
  const t1=process.hrtime.bigint();
  console.log(label, (Number(t1-t0)/1e6/n).toFixed(1)+'ms');
}
time('full run', ()=>{ runSimulation(); });
time('macro run', ()=>{ runSimulation(undefined,{diagnostics:false}); });
