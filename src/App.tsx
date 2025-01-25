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
import { Allotment } from "allotment";
import "allotment/dist/style.css";

import { Button } from "@/components/ui/button";
import useHooks from "./hooks";

import CjPreviewer from "./components/cjpreviewer";

import { Spinner } from "./components/spinner";

function App() {
  const delftLatLng = Cesium.Cartesian3.fromDegrees(
    4.369802767481661,
    52.00151347611216,
    1000
  );
  const offset = new Cesium.Cartesian3(0, 0, 1000);
  const delftExtent = Cesium.Rectangle.fromDegrees(
    4.361377972223209,
    51.996144417611504,
    4.378227562740112,
    52.00688253461282
  );

  const fcbUrl = "https://storage.googleapis.com/flatcitybuf/delft_bbox.fcb";
  const {
    viewerRef,
    rectangle,
    isDrawing,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    result,
    toggleDrawMode,
    isDrawMode,
    handleFetchFcb,
    handleCjSeqDownload,
    isLoading,
  } = useHooks({ fcbUrl });
  return (
    <div className="h-screen w-screen">
      <Allotment vertical className="h-full">
        {/* Map Container */}
        <Allotment.Pane minSize={200} preferredSize={300}>
          <div className="relative h-full">
            <div className="absolute top-4 left-4 z-10 flex gap-2">
              <Button
                onClick={toggleDrawMode}
                variant={isDrawMode ? "secondary" : "default"}
              >
                Draw Rectangle ({isDrawMode ? "on" : "off"})
              </Button>
              <Button onClick={handleFetchFcb} disabled={!rectangle}>
                Fetch FCB
              </Button>
              <Button onClick={handleCjSeqDownload} disabled={!rectangle}>
                Download CJSeq
              </Button>
            </div>
            <Viewer
              ref={viewerRef}
              timeline={false}
              animation={false}
              infoBox={false}
              homeButton={false}
              baseLayerPicker={false}
              navigationHelpButton={false}
              sceneModePicker={false}
              full
            >
              <Scene />

              {/* Show extent of data for Delft */}
              <Entity>
                <RectangleGraphics
                  coordinates={delftExtent}
                  material={Cesium.Color.GRAY.withAlpha(0.3)}
                  outline
                  outlineColor={Cesium.Color.GRAY}
                  outlineWidth={2}
                />
              </Entity>

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
                    material={
                      isDrawing
                        ? Cesium.Color.GRAY.withAlpha(0.4)
                        : Cesium.Color.GRAY.withAlpha(0.8)
                    }
                    outline
                    outlineColor={Cesium.Color.WHITE}
                  />
                </Entity>
              )}
            </Viewer>
          </div>
        </Allotment.Pane>

        {/* Result Container */}
        <Allotment.Pane minSize={200} preferredSize={300}>
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <Spinner />
            </div>
          ) : (
            <CjPreviewer result={result ?? undefined} />
          )}
        </Allotment.Pane>
      </Allotment>
    </div>
  );
}

export default App;
