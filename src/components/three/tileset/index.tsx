import React, { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

import * as THREE from "three";
import {
  TilesRenderer,
  GlobeControls,
  TilesAttributionOverlay,
} from "3d-tiles-renderer/r3f";
// import { DebugTilesPlugin } from "3d-tiles-renderer";

type Props = {
  url: string;
};

const Tileset = ({ url }: Props) => {
  // Return an empty group that holds the tileset
  return (
    <TilesRenderer url={url}>
      {/* <TilesPlugin plugin={DebugTilesPlugin} displayBoxBounds={true} /> */}
      <GlobeControls />
      <TilesAttributionOverlay />
    </TilesRenderer>
  );
};

export default Tileset;
