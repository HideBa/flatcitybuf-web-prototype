import {
  CameraLookAt,
  ImageryLayer,
  Viewer,
  Scene,
  ScreenSpaceEventHandler,
  ScreenSpaceEvent,
  ScreenSpaceCameraController,
  Entity,
  RectangleGraphics,
} from "resium";
import * as Cesium from "cesium";

import { Button } from "@/components/ui/button";
import useHooks from "./hooks";

function App() {
  const delftLatLng = Cesium.Cartesian3.fromDegrees(4.360011, 52.012093, 1000);
  const offset = new Cesium.Cartesian3(0, 0, 1000);

  const {
    viewerRef,
    rectangle,
    isDrawing,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    toggleDrawMode,
    isDrawMode,
  } = useHooks();
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Button
        className="absolute top-4 left-4 z-10"
        onClick={toggleDrawMode}
        variant={isDrawMode ? "secondary" : "default"}
      >
        Draw Rectangle ({isDrawMode ? "on" : "off"})
      </Button>
      <Viewer
        full
        ref={viewerRef}
        timeline={false}
        animation={false}
        homeButton={false}
        baseLayerPicker={false}
        navigationHelpButton={false}
        sceneModePicker={false}
      >
        <Scene />

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
        <ScreenSpaceCameraController
          enableLook={!isDrawMode}
          enableRotate={!isDrawMode}
          enableTilt={!isDrawMode}
        />
        <ScreenSpaceEventHandler>
          <ScreenSpaceEvent
            type={Cesium.ScreenSpaceEventType.LEFT_DOWN}
            action={handleMouseDown}
          />
          <ScreenSpaceEvent
            type={Cesium.ScreenSpaceEventType.MOUSE_MOVE}
            action={handleMouseMove}
          />
          <ScreenSpaceEvent
            type={Cesium.ScreenSpaceEventType.LEFT_UP}
            action={handleMouseUp}
          />
        </ScreenSpaceEventHandler>

        {rectangle && (
          <Entity>
            <RectangleGraphics
              coordinates={rectangle}
              material={isDrawing ? Cesium.Color.GRAY : Cesium.Color.SKYBLUE}
              outline
              outlineColor={Cesium.Color.WHITE}
            />
          </Entity>
        )}
      </Viewer>
    </div>
  );
}

export default App;
