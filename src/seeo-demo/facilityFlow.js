import { routes, getReplayFrame, reduceReplay } from './replay.js';

// Authored layout illustration only; these paths provide no measured outcomes.
export const FLOW_DURATION = 200;
export const pedestrianPath = [[3,3],[81,3],[81,51],[3,51],[3,3]];
export const barrierPath = [[5,5],[79,5],[79,49],[5,49],[5,5]];
export const flowObstacles = [
 ...[7,16,25,34].flatMap(x=>[28,39].map(y=>({x:x-.15,y:y-.1,w:5.3,h:7.2}))),
 {x:8,y:6.5,w:14,h:1.5},{x:28,y:6.5,w:32,h:1.5},
 ...[32,42,52].map(x=>({x,y:10,w:6,h:3})),
];
const wrap = value => Number.isFinite(value) ? ((value%FLOW_DURATION)+FLOW_DURATION)%FLOW_DURATION : 0;
const ellipses = {'FL-01':[58,30,6,5], 'FL-02':[16,18,6,3], 'FL-04':[72,43,3,3]};
export const workStations = [
 {id:'FL-01',area:'crossing',period:50,name:'Dispatch',pickup:[64,30],drop:[52,30]},
 {id:'FL-02',area:'receiving',period:50,name:'Receiving',pickup:[22,18],drop:[10,18]},
 {id:'FL-03',area:'storage',period:100,name:'Storage',pickup:[44,27],drop:[44,45]},
 {id:'FL-04',area:'dispatch',period:40,name:'Outbound',pickup:[75,43],drop:[69,43]},
];
function workPhase(seconds,period) {
 const t=wrap(seconds)%period,travel=(period-4)/2;
 if(t<2)return {angle:0,carrying:true,motion:'Pickup · 2s service dwell'};
 if(t<2+travel)return {angle:(t-2)/travel*Math.PI,carrying:true,motion:'Loaded transfer'};
 if(t<4+travel)return {angle:Math.PI,carrying:false,motion:'Drop-off · 2s service dwell'};
 return {angle:Math.PI+(t-4-travel)/travel*Math.PI,carrying:false,motion:'Empty return'};
}
function pose(route, seconds) {
 if(route.kind==='truck') return getReplayFrame(40).actors.find(a=>a.id===route.id);
 if(route.kind==='person') {
  let d=(wrap(seconds)/FLOW_DURATION*252+(Number(route.id.slice(2))-1)*36)%252;
  for(let i=1;i<pedestrianPath.length;i++) {
   const a=pedestrianPath[i-1],b=pedestrianPath[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
   if(d<=length) return {...route,x:a[0]+(b[0]-a[0])*d/length,y:a[1]+(b[1]-a[1])*d/length,heading:Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI,motion:'walking'};
   d-=length;
  }
 }
 if(route.id==='FL-03') {
  const task=workPhase(seconds,workStations.find(s=>s.id===route.id).period);
  return {...route,...task,x:44,y:36-9*Math.cos(task.angle),heading:90};
 }
 const [x,y,rx,ry]=ellipses[route.id],task=workPhase(seconds,workStations.find(s=>s.id===route.id).period),angle=task.angle;
 return {...route,...task,x:x+rx*Math.cos(angle),y:y+ry*Math.sin(angle),heading:Math.atan2(ry*Math.cos(angle),-rx*Math.sin(angle))*180/Math.PI};
}
export const facilityRoutes=routes.map(route=>({...route,points:Array.from({length:201},(_,i)=>{const a=pose(route,i);return [i,a.x,a.y];})}));
export function getFacilityFrame(seconds, mode='proposed') {
 if(mode==='original')return getReplayFrame(seconds);
 return {seconds:wrap(seconds),simulated:true,mode:'proposed',phase:'separated',actors:routes.map(route=>pose(route,wrap(seconds)))};
}
export function reduceFacilityReplay(state, action, mode='proposed') {
 if(mode==='original')return reduceReplay(state,action);
 if(action.type==='tick') return !state.playing||!Number.isFinite(action.seconds)||action.seconds<=0?state:{...state,seconds:wrap(state.seconds+action.seconds*state.speed)};
 if(action.type==='seek')return {...state,seconds:Number.isFinite(action.seconds)?Math.max(0,Math.min(FLOW_DURATION,action.seconds)):0,playing:false};
 if(action.type==='play')return {...state,playing:true,seconds:wrap(state.seconds)};
 return reduceReplay(state,action);
}
export function protectedWalkwayMarkup() {
 return `<g pointer-events="none" aria-label="Proposed protected perimeter walkway"><path d="M43 57V51" stroke="#b9e4d1" stroke-width="2"/><path d="M41 54H45" stroke="#b9e4d1" stroke-width="1.2"/><polyline points="${pedestrianPath.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#b9e4d1" stroke-width="2"/><polyline points="${barrierPath.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#138c80" stroke-width=".35"/><polyline points="${barrierPath.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#ffcc00" stroke-width=".18" stroke-dasharray=".8 .8"/><text x="42" y="52.7" text-anchor="middle" font-size="1.1" fill="#116958">PROTECTED PERIMETER · PROPOSED / UNVALIDATED</text></g>`;
}
