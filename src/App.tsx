import {
  CameraLookAt,
  ImageryLayer,
  Viewer,
  Scene,
  ScreenSpaceEventHandler,
  ScreenSpaceEvent,
  ScreenSpaceCameraController,
  Entity,
  PointGraphics,
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
import {
  isLoadingAtom,
  rectangleAtom,
  pointAtom,
  spatialQueryTypeAtom,
} from "./store";
import InfoPopup from "./components/InfoPopup";

function App() {
  const {
    viewerRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    isDrawMode,
    handleToggleDrawMode,
    intermediateRectangle,
    handlePointClick,
  } = useCesiumControls();

  // Get atoms for display and control
  const [rectangle] = useAtom(rectangleAtom);
  const [point] = useAtom(pointAtom);
  const [spatialQueryType] = useAtom(spatialQueryTypeAtom);
  const [isLoading] = useAtom(isLoadingAtom);

  // Data URL
  const fcbUrl =
    "https://storage.googleapis.com/flatcitybuf/3dbag_subset_all_index.fcb";

  // FCB data handler
  const {
    result,
    handleFetchFcb,
    handleFetchFcbWithPoint,
    handleFetchFcbWithAttributeConditions,
    loadNextBatch,
    handleCjSeqDownload,
  } = useFcbData({
    fcbUrl,
  });

  // Is point or rectangle selection active
  const isPointMode =
    spatialQueryType === "pointIntersects" ||
    spatialQueryType === "pointNearest";

  return (
    <div className="h-screen w-screen">
      <Allotment vertical>
        <Allotment.Pane className="h-full">
          <div className="relative h-full">
            <Viewer
              ref={viewerRef}
              resolutionScale={window.devicePixelRatio}
              timeline={false}
              animation={false}
              baseLayerPicker={false}
              geocoder={true}
              // homeButton={false}
              // sceneModePicker={false}
              // For high-DPI displays
              // requestRenderMode={true}
              // projectionPicker={false}/
              // vrButton={false}
              // fullscreenButton={false}
              // infoBox={false}
              // navigationHelpButton={false}
              // selectionIndicator={false}
              // navigationInstructionsInitiallyVisible={false}
            >
              <Scene />

              <CameraLookAt
                // Center of the netherlands
                offset={new Cesium.Cartesian3(0, 0, 1000)}
                once
                target={Cesium.Cartesian3.fromDegrees(5.1, 52.1, 0)}
              />

              <ScreenSpaceCameraController
                enableRotate={!isDrawMode}
                enableTranslate={true}
                enableZoom={true}
                enableTilt={true}
                enableLook={true}
              />

              <ImageryLayer
                imageryProvider={
                  new Cesium.OpenStreetMapImageryProvider({
                    url: "https://tile.openstreetmap.org/",
                  })
                }
                alpha={0.7}
              />

              <ScreenSpaceEventHandler>
                <ScreenSpaceEvent
                  action={handleMouseDown}
                  type={Cesium.ScreenSpaceEventType.LEFT_DOWN}
                />
                <ScreenSpaceEvent
                  action={handleMouseMove}
                  type={Cesium.ScreenSpaceEventType.MOUSE_MOVE}
                />
                <ScreenSpaceEvent
                  action={handleMouseUp}
                  type={Cesium.ScreenSpaceEventType.LEFT_UP}
                />
                <ScreenSpaceEvent
                  action={handlePointClick}
                  type={Cesium.ScreenSpaceEventType.LEFT_CLICK}
                />
              </ScreenSpaceEventHandler>

              {/* Display the intermediateRectangle */}
              {intermediateRectangle && !isPointMode && (
                <Entity
                  rectangle={{
                    coordinates: intermediateRectangle,
                    material: Cesium.Color.BLUE.withAlpha(0.2),
                    outline: true,
                    outlineColor: Cesium.Color.BLUE,
                  }}
                />
              )}

              {/* Display the completed rectangle */}
              {rectangle && !isPointMode && (
                <Entity
                  rectangle={{
                    coordinates: rectangle,
                    material: Cesium.Color.RED.withAlpha(0.3),
                    outline: true,
                    outlineColor: Cesium.Color.RED,
                  }}
                />
              )}

              {/* Display the point for point-based spatial queries */}
              {point && isPointMode && (
                <Entity position={point}>
                  <PointGraphics
                    pixelSize={10}
                    color={Cesium.Color.RED}
                    outlineColor={Cesium.Color.WHITE}
                    outlineWidth={2}
                  />
                </Entity>
              )}
            </Viewer>
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 w-80">
              <DataFetchControls
                handleFetchFcb={handleFetchFcb}
                handleToggleDrawMode={handleToggleDrawMode}
                isDrawMode={isDrawMode}
                handleFetchFcbWithPoint={handleFetchFcbWithPoint}
                handleFetchFcbWithAttributeConditions={
                  handleFetchFcbWithAttributeConditions
                }
                loadNextBatch={loadNextBatch}
                handleCjSeqDownload={handleCjSeqDownload}
                hasRectangle={!!rectangle}
                hasPoint={!!point}
              />

              {/* Info Popup */}
              <div className="absolute top-12 right-4 z-10">
                <InfoPopup
                  title="FlatCityBuf Prototype"
                  description="This application is a prototype for FlatCityBuf, a cloud-optimized CityJSON format for efficient city data streaming."
                  description2="The data is derived from the 3DBAG dataset, the subset of 3DBAG data. (approx 3GB, 529480 CityJSON features)"
                />
              </div>

              {isLoading && (
                <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
                  <div className="p-4 bg-white/50 rounded-md backdrop-blur-md border border-neutral-200 shadow-md">
                    <Spinner />
                  </div>
                </div>
              )}
            </div>
          </div>
        </Allotment.Pane>
        <Allotment.Pane className="h-full">
          {/* isLoading ? (
          <div className="flex justify-center items-center h-full">
            <Spinner />
          </div>
          ) */}
          <CjPreviewer result={result} />
        </Allotment.Pane>
      </Allotment>
    </div>
  );
}

export default App;
