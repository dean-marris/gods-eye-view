import { cameras } from './data.js';
import { getReplayFrame } from './replay.js';
export const fusionHub = { id:'hub', name:'seeo Fusion', position:[57,15,12], type:'hub', color:'#057f79' };
export const fusionNetworks = [
 {id:'AP-W',name:'Wi-Fi / West AP',position:[24,20,6],type:'network',color:'#7560ba'},
 {id:'AP-E',name:'Site gateway / East AP',position:[77,18,6],type:'network',color:'#7560ba'},
];
export const fusionSources = [
 ...cameras.map(c=>({id:c.id,name:`${c.id} camera`,type:'camera',area:c.name,position:[c.x+2.5,c.y+2.7,4.5],available:c.active,network:c.x<50?'AP-W':'AP-E',interface:'Example camera metadata',color:'#208ba7'})),
 {id:'PLC-R',name:'Receiving PLC',type:'plc',area:'Receiving conveyor',position:[16,7.2,1.8],network:'AP-W',interface:'OPC UA → gateway · illustrative',color:'#bd7925'},
 {id:'PLC-P',name:'Packing PLC',type:'plc',area:'Packing conveyor',position:[43,7.2,1.8],network:'AP-W',interface:'OPC UA → gateway · illustrative',color:'#bd7925'},
 {id:'DOOR',name:'Bay 1 door PLC',type:'plc',area:'Dispatch Bay 1',position:[82,25,2],network:'AP-E',interface:'OPC UA → gateway · illustrative',color:'#bd7925'},
 {id:'BAY',name:'Bay presence sensor',type:'sensor',area:'Dispatch Bay 1',position:[94,29,1.2],network:'AP-E',interface:'MQTT · illustrative',color:'#c25787'},
 {id:'EYE',name:'Packing photoeye',type:'sensor',area:'Packing conveyor',position:[57,7.2,1.7],network:'AP-W',interface:'Digital I/O → gateway · illustrative',color:'#c25787'},
].map(s=>({...s,available:s.available??true}));
export function resolveFusionPick(value) {
 if(value==='fusion-core:hub') return {type:'fusion',id:'hub'};
 if(typeof value!=='string'||!value.startsWith('fusion:')) return null;
 const id=value.slice(7);
 return [...fusionSources,...fusionNetworks,fusionHub].some(s=>s.id===id)?{type:'fusion',id}:null;
}
export function fusionPathPoint(id, phase) {
 const source=fusionSources.find(s=>s.id===id);
 if(!source||!Number.isFinite(phase)||phase<0||phase>1) throw new RangeError('Valid source and phase 0…1 required');
 const network=fusionNetworks.find(n=>n.id===source.network);
 const t=phase<=.5?phase*2:(phase-.5)*2;
 const start=phase<=.5?source.position:network.position,end=phase<=.5?network.position:fusionHub.position;
 return start.map((v,i)=>v+(end[i]-v)*t+(i===2?Math.sin(Math.PI*t)*3:0));
}
export function fusionSnapshot(seconds, excluded=[], mode="original") {
 const time=Number.isFinite(seconds)?Math.max(0,Math.min(mode==="proposed"?200:40,seconds)):0;
 const truck=getReplayFrame(mode==="proposed"?40:time).actors.find(a=>a.id==='TR-01');
 const available=fusionSources.filter(s=>s.available&&!excluded.includes(s.id));
 const readings={C05:`Truck ${truck.motion}`, DOOR:mode==='proposed'||time>=20?'Door open':'Door closed',BAY:mode==='proposed'||time>=20?'Bay occupied':'Bay clear', 'PLC-R':'Conveyor running · 0.6 m/s','PLC-P':time<30?'Conveyor running · 0.4 m/s':'Conveyor idle',EYE:Math.floor(time)%4<2?'Carton present':'Beam clear'};
 const required=['C05','DOOR','BAY'];
 const missing=required.filter(id=>!available.some(s=>s.id===id));
 return {time, active:available.length, unavailable:fusionSources.filter(s=>!s.available).length, excluded:fusionSources.filter(s=>s.available&&excluded.includes(s.id)).length,
 sources:fusionSources.map(s=>({...s,included:s.available&&!excluded.includes(s.id),signal:!s.available?'Monitoring unavailable':excluded.includes(s.id)?'Excluded from demo':readings[s.id]??'Authored scene metadata'})),
 contributions:required.map(id=>({id,type:fusionSources.find(s=>s.id===id).type,signal:readings[id],included:!missing.includes(id)})),missing,
 context:missing.length?`Incomplete context · missing ${missing.join(', ')}`:`${readings.C05} + ${readings.DOOR.toLowerCase()} + ${readings.BAY.toLowerCase()}`,complete:missing.length===0};
}
export function fusionFrame(seconds, flowSeconds, excluded=[], mode="original") {
 if(!Number.isFinite(flowSeconds)||flowSeconds<0) throw new RangeError('Finite nonnegative flow time required');
 const snapshot=fusionSnapshot(seconds,excluded,mode);
 return {...snapshot, packets:snapshot.sources.filter(s=>s.included).flatMap((s,i)=>[0,.5].map((offset,j)=>({source:s.id,id:`${s.id}-${j}`,position:fusionPathPoint(s.id,((flowSeconds/4+i*.137+offset)%1))}))) };
}
