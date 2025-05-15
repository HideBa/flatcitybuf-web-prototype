/* eslint-disable @typescript-eslint/no-unused-vars */
// import {
//   TilesRenderer,
//   GlobeControls,
//   TilesAttributionOverlay,
// } from "3d-tiles-renderer/r3f";
// import { DebugTilesPlugin } from "3d-tiles-renderer";

type Props = {
	url: string;
};

const Tileset = ({ url: _ }: Props) => {
	// Return an empty group that holds the tileset
	return <></>;
	// return (
	//   <TilesRenderer url={url}>
	//     {/* <TilesPlugin plugin={DebugTilesPlugin} displayBoxBounds={true} /> */}
	//     <GlobeControls />
	//     <TilesAttributionOverlay />
	//   </TilesRenderer>
	// );
};

export default Tileset;
