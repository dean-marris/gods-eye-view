// Renderer geometry in local actor metres. Forks remain part of the vehicle.
export function forkliftLoadAssembly() {
 const part = (role, dx,dy,z,w,h,height,fill) => ({role,dx,dy,z,w,h,height,fill,shape:'box'});
 return [
  ...[-.43,.43].map(y=>part('fork',1.75,y,.17,1.5,.15,.12,'#66757a')),
  part('load',1.75,0,.31,1.05,1.05,.16,'#b58b57'),
  part('load',1.75,0,.47,.9,.95,.55,'#cba978'),
 ];
}
export function actorPartVisible(part,actor) {
 return !(actor.kind==='forklift' && part.role==='load' && actor.carrying===false);
}
