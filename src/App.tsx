import { useCallback, useEffect, useRef, useState } from "react";

import {
  Camera,
  CameraLookAt,
  Cesium3DTileset,
  CesiumComponentRef,
  Entity,
  useCesium,
  ImageryLayer,
  Viewer,
  Scene,
  Globe,
  ScreenSpaceEventHandler,
  ScreenSpaceEvent,
} from "resium";
import * as Cesium from "cesium";
import RectangleDrawer from "./components/cesium/drawRect";

// function App() {
//   return <ThreeRenderer />;
// }

// export default App;

function App() {
  const delftLatLng = Cesium.Cartesian3.fromDegrees(4.360011, 52.012093, 1000);
  const offset = new Cesium.Cartesian3(0, 0, 1000);
  const ref = useRef<CesiumComponentRef<Cesium.Viewer>>(null);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Viewer
        full
        ref={ref}
        timeline={false}
        animation={false}
        homeButton={false}
        baseLayerPicker={false}
        navigationHelpButton={false}
        sceneModePicker={false}
      >
        <Scene />
        {/* <Entity>
          <Cesium3DTileset url="https://data.3dbag.nl/v20241216/3dtiles/lod22/tileset.json" />
        </Entity> */}
        {/* <RectangleDrawer /> */}
        <CameraLookAt target={delftLatLng} offset={offset} once />
        <ImageryLayer
          imageryProvider={
            new Cesium.UrlTemplateImageryProvider({
              url: "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
              minimumLevel: 0,
              maximumLevel: 18,
              tileWidth: 256,
              tileHeight: 256,
            })
          }
        />
        <RectangleDrawer viewerRef={ref} />
        {/* <ScreenSpaceEventHandler>
          <ScreenSpaceEvent
            type={Cesium.ScreenSpaceEventType.LEFT_CLICK}
            action={(e) => {
              console.log("e--------", e);
            }}
          />
        </ScreenSpaceEventHandler> */}
      </Viewer>
    </div>
  );
}

export default App;
