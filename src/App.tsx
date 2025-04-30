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
import AttributeConditionForm from "./feature/attribute";

function App() {
  const delftLatLng = Cesium.Cartesian3.fromDegrees(
    4.369802767481661,
    52.00151347611216,
    1000
  );
  const offset = new Cesium.Cartesian3(0, 0, 1000);

  const dataExtent = Cesium.Rectangle.fromDegrees(
    4.293270749721231,
    51.819302473968676,
    4.610321175379964,
    52.06078090037606
  );

  // const fcbUrl = "https://storage.googleapis.com/flatcitybuf/delft_attr.fcb";
  // const fcbUrl = "https://storage.googleapis.com/flatcitybuf/3dbag_100k.fcb";
  const fcbUrl = "https://storage.googleapis.com/flatcitybuf/3dbag_partial.fcb";
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
    handleFetchFcbWithAttributeConditions,
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
                Fetch FCB within rectangle
              </Button>
              <AttributeConditionForm
                handleFetchFcbWithAttributeConditions={
                  handleFetchFcbWithAttributeConditions
                }
              />
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
                  coordinates={dataExtent}
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
                enableTranslate={true}
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
