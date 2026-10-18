import * as C from 'cesium';

// Fixed architecture is independent of Cesium's asynchronous Entity batches.
// Selecting overlay devices cannot remove or rebuild this owned solid batch.
export function createFacilitySolids(primitives) {
  let fills = [], outlines = [], mounted = [];
  return {
    box(id, position, orientation, dimensions, color) {
      const modelMatrix = C.Matrix4.fromRotationTranslation(C.Matrix3.fromQuaternion(orientation), position);
      const pick = new C.Entity({id});
      const attributes = {color: C.ColorGeometryInstanceAttribute.fromColor(color)};
      fills.push(new C.GeometryInstance({id: pick, modelMatrix, attributes,
        geometry: C.BoxGeometry.fromDimensions({dimensions, vertexFormat: C.PerInstanceColorAppearance.VERTEX_FORMAT})}));
      outlines.push(new C.GeometryInstance({id: pick, modelMatrix,
        attributes: {color: C.ColorGeometryInstanceAttribute.fromColor(C.Color.fromCssColorString('#8ca2ae').withAlpha(.45))},
        geometry: C.BoxOutlineGeometry.fromDimensions({dimensions})}));
    },
    commit() {
      if (!fills.length) return;
      mounted.push(primitives.add(new C.Primitive({geometryInstances: fills, asynchronous: false,
        appearance: new C.PerInstanceColorAppearance({translucent:false, closed:true})})));
      mounted.push(primitives.add(new C.Primitive({geometryInstances: outlines, asynchronous:false,
        appearance: new C.PerInstanceColorAppearance({flat:true, translucent:true, renderState:{depthTest:{enabled:true}}})})));
      fills = []; outlines = [];
    },
    clear() {
      for(const primitive of mounted) primitives.remove(primitive);
      mounted = []; fills = []; outlines = [];
    },
  };
}
