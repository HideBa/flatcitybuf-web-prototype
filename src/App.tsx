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
import { useAtom } from "jotai";

import { Button } from "@/components/ui/button";
import { useCesiumControls } from "./hooks/useCesiumControls";
import { useFcbData } from "./hooks/useFcbData";

import CjPreviewer from "./components/cjpreviewer";
import { Spinner } from "./components/spinner";
import DataFetchControls from "./feature/data-fetch-controls";
import { isLoadingAtom, rectangleAtom } from "./store";
import InfoPopup from "./components/InfoPopup";

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
  // const fcbUrl = "https://storage.googleapis.com/flatcitybuf/3dbag_subset.fcb";
  const fcbUrl =
    "https://storage.googleapis.com/flatcitybuf/3dbag_subset_all_index.fcb";
  // const fcbUrl = "http://127.0.0.1:5501/src/rust/temp/3dbag_subset.fcb";
  // const fcbUrl = "http://127.0.0.1:5501/src/rust/temp/3dbag_partial.fcb";

  // Get the rectangle atom from store
  const [rectangle] = useAtom(rectangleAtom);
  const [isLoading] = useAtom(isLoadingAtom);

  // Use custom hooks for cesium controls and FCB data
  const {
    viewerRef,
    isDrawing,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    toggleDrawMode,
    isDrawMode,
    rectangleCallbackProperty,
  } = useCesiumControls();

  const {
    result,
    handleFetchFcb,
    handleFetchFcbWithAttributeConditions,
    loadNextBatch,
    handleCjSeqDownload,
  } = useFcbData({ fcbUrl });

  return (
    <div className="h-screen w-screen">
      <Allotment vertical className="h-full">
        {/* Map Container */}
        <Allotment.Pane minSize={200} preferredSize={300}>
          <div className="relative h-full">
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 w-80">
              <div className="bg-white rounded-md shadow-sm border border-neutral-200 p-2">
                <Button
                  onClick={toggleDrawMode}
                  variant={isDrawMode ? "secondary" : "default"}
                  className="w-full"
                >
                  Draw Rectangle ({isDrawMode ? "on" : "off"})
                </Button>
              </div>

              <DataFetchControls
                handleFetchFcb={handleFetchFcb}
                handleFetchFcbWithAttributeConditions={
                  handleFetchFcbWithAttributeConditions
                }
                loadNextBatch={loadNextBatch}
                handleCjSeqDownload={handleCjSeqDownload}
                hasRectangle={!!rectangle}
              />
            </div>

            {/* Info Popup */}
            <div className="absolute top-12 right-4 z-10">
              <InfoPopup
                title="FlatCityBuf Prototype"
                description="This application is a prototype for FlatCityBuf, a cloud-optimized CityJSON format for efficient city data streaming."
                description2="The data is derived from the 3DBAG dataset, the subset of 3DBAG data. (approx 3GB, 529480 CityJSON features)"
              />
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
                    coordinates={
                      isDrawing ? rectangleCallbackProperty : rectangle
                    }
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
