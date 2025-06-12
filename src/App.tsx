import { Allotment } from "allotment";
import * as Cesium from "cesium";
import {
	CameraFlyTo,
	Entity,
	ImageryLayer,
	PointGraphics,
	RectangleGraphics,
	Scene,
	ScreenSpaceCameraController,
	ScreenSpaceEvent,
	ScreenSpaceEventHandler,
	Viewer,
} from "resium";
import "allotment/dist/style.css";
import { useAtom } from "jotai";

import { useCesiumControls } from "./hooks/useCesiumControls";
import { useFcbData } from "./hooks/useFcbData";

import InfoPopup from "./components/InfoPopup";
import CjPreviewer from "./components/cjpreviewer";
import { Spinner } from "./components/spinner";
import DataFetchControls from "./feature/data-fetch-controls";
import {
	dataExtentAtom,
	isLoadingAtom,
	pointAtom,
	rectangleAtom,
	spatialQueryTypeAtom,
} from "./store";

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
	const [dataExtent] = useAtom(dataExtentAtom);

	const delftLatLng = Cesium.Cartesian3.fromDegrees(
		4.369802767481661,
		52.00151347611216,
		1000,
	);

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

	const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY;
	const mapUrl = `https://maps.geoapify.com/v1/tile/toner-grey/{z}/{x}/{y}.png?&apiKey=${apiKey}`;
	const imageryProvider = new Cesium.UrlTemplateImageryProvider({
		url: mapUrl,
		credit: "© Geoapify, © OpenStreetMap contributors",
	});

	// Is point or rectangle selection active
	const isPointMode =
		spatialQueryType === "pointIntersects" ||
		spatialQueryType === "pointNearest";

	return (
		<div className="h-screen w-screen">
			<Allotment vertical>
				<Allotment.Pane>
					<div className="relative h-full">
						<Viewer
							ref={viewerRef}
							infoBox={false}
							homeButton={false}
							baseLayerPicker={false}
							navigationHelpButton={false}
							timeline={false}
							animation={false}
							fullscreenButton={false}
							geocoder={false}
							full
							sceneModePicker={false}
						>
							<Scene />

							<CameraFlyTo
								// Center of the netherlands
								destination={delftLatLng}
								duration={0}
								once
							/>

							<ScreenSpaceCameraController
								enableRotate={!isDrawMode}
								enableTranslate={!isDrawMode}
								enableTilt={!isDrawMode}
								enableLook={!isDrawMode}
							/>

							<ImageryLayer imageryProvider={imageryProvider} />
							{/* <ImageryLayer
                imageryProvider={
                  new Cesium.OpenStreetMapImageryProvider({
                    url: "https://a.tile.openstreetmap.org/",
                    credit: "© OpenStreetMap contributors",
                  })
                }
              /> */}
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

							{/* Display the data extent */}
							{dataExtent && (
								<Entity>
									<RectangleGraphics
										coordinates={dataExtent}
										material={Cesium.Color.GRAY.withAlpha(0.2)}
										outline={true}
										outlineColor={Cesium.Color.GRAY}
									/>
								</Entity>
							)}
							{/* Display the intermediateRectangle */}
							{intermediateRectangle && !isPointMode && (
								<Entity
									rectangle={{
										coordinates: intermediateRectangle,
										material: Cesium.Color.GRAY.withAlpha(0.5),
										outline: true,
										outlineColor: Cesium.Color.GRAY,
									}}
								/>
							)}

							{/* Display the completed rectangle */}
							{rectangle && !isPointMode && (
								<Entity
									rectangle={{
										coordinates: rectangle,
										material: Cesium.Color.GRAY.withAlpha(0.7),
										outline: true,
										outlineColor: Cesium.Color.GRAY,
									}}
								/>
							)}

							{/* Display the point for point-based spatial queries */}
							{point && isPointMode && (
								<Entity position={point}>
									<PointGraphics
										pixelSize={10}
										color={Cesium.Color.GRAY}
										outlineColor={Cesium.Color.WHITE}
										outlineWidth={2}
									/>
								</Entity>
							)}
						</Viewer>
						{/* Info Popup */}
						<div className="absolute top-4 right-4 z-10">
							<InfoPopup
								title="FlatCityBuf Prototype"
								description="This application is a prototype for FlatCityBuf, a cloud-optimized CityJSON format for efficient city data streaming."
								description2="The data is derived from the 3DBAG dataset, the subset of 3DBAG data. (approx 3GB, 529480 CityJSON features)"
							/>
						</div>

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

							{isLoading && (
								<div className="absolute inset-0 flex justify-center items-center pointer-events-none">
									<div className="p-4 bg-white/50 rounded-md backdrop-blur-md border border-neutral-200 shadow-md">
										<Spinner />
									</div>
								</div>
							)}
						</div>

						{/* Data Attribution */}
						<div className="absolute bottom-2 right-2 z-10 text-xs text-neutral-600 bg-white/70 px-2 py-1 rounded-sm">
							Data: ©{" "}
							<a
								href="https://3dbag.nl"
								className="underline"
								target="_blank"
								rel="noopener noreferrer"
							>
								3DBAG
							</a>{" "}
							| Map: © Powered by{" "}
							<a
								href="https://www.geoapify.com/"
								target="_blank"
								rel="noopener noreferrer"
							>
								Geoapify
							</a>{" "}
							|{" "}
							<a
								href="https://openmaptiles.org/"
								target="_blank"
								rel="noopener noreferrer"
							>
								OpenMapTiles
							</a>{" "}
							|{" "}
							<a
								href="https://www.openstreetmap.org/copyright"
								target="_blank"
								rel="noopener noreferrer"
							>
								© OpenStreetMap
							</a>{" "}
							contributors
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
