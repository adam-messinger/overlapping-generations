import { runSimulation } from './src/simulation.js';
import { DIAGNOSTIC_FIELDS } from './src/standard-collectors.js';
function numericLeaves(value: unknown, path: string, into: Map<string, number>): void {
  if (typeof value === 'number') { into.set(path, value); return; }
  if (value === null || typeof value !== 'object') return;
  if (Array.isArray(value)) { value.forEach((c,i)=>numericLeaves(c,`${path}[${i}]`,into)); return; }
  for (const [k,c] of Object.entries(value)) numericLeaves(c, `${path}.${k}`, into);
}
let t=process.hrtime.bigint();
const withDiag = runSimulation();
const without = runSimulation(undefined,{diagnostics:false});
console.log('two runs ms', Number(process.hrtime.bigint()-t)/1e6);
t=process.hrtime.bigint();
const diagnostic=new Set<string>(DIAGNOSTIC_FIELDS);
const full=new Map<string,number>(); const macro=new Map<string,number>();
withDiag.results.forEach((row,i)=>{for(const [k,v] of Object.entries(row)) if(!diagnostic.has(k)) numericLeaves(v,`${i}.${k}`,full);});
without.results.forEach((row,i)=>{for(const [k,v] of Object.entries(row)) numericLeaves(v,`${i}.${k}`,macro);});
numericLeaves(withDiag.metrics,'metrics',full);
numericLeaves(without.metrics,'metrics',macro);
console.log('leaf maps ms', Number(process.hrtime.bigint()-t)/1e6, 'size', full.size, macro.size);
