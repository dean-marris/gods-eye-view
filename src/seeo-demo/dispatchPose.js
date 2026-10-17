// Stable local pose backing for the Cesium dynamic position/orientation callbacks.
export function createDispatchPose() {
  const value = {x: 0, y: 0, z: 0, heading: 0, visible: false};
  return {
    value,
    update(actor, dx = 0, dy = 0, z = 0) {
      value.x = actor.x + Math.cos(actor.heading) * dx - Math.sin(actor.heading) * dy;
      value.y = actor.y + Math.sin(actor.heading) * dx + Math.cos(actor.heading) * dy;
      value.z = z;
      value.heading = -actor.heading;
      value.visible = ['active', 'queued'].includes(actor.status);
      return value;
    },
  };
}
