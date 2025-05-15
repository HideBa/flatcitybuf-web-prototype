import { Environment, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
// import Tileset from "../tileset";

const ThreeRenderer = () => {
	// const tilesetUrl =
	//   "https://data.3dbag.nl/v20241216/3dtiles/lod22/tileset.json";
	const cameraPosition = new THREE.Vector3(-85475.666, 5467.51, 8.244);
	return (
		<div id="canvas-container">
			<Canvas
				camera={{ position: cameraPosition, fov: 60, near: 0.1, far: 1000000 }}
				style={{
					width: "100vw",
					height: "100vh",
					backgroundColor: "gray",
				}}
			>
				{/* Lights */}
				<ambientLight intensity={0.8} />
				<directionalLight
					position={[1000, 1000, 1000]}
					intensity={0.5}
					castShadow
				/>

				{/* Debug Cube */}
				<mesh position={[0, 0, 0]}>
					<boxGeometry args={[100, 100, 100]} />
					<meshStandardMaterial color="hotpink" />
				</mesh>

				<Environment preset="city" />
				<ambientLight intensity={0.5} />
				<directionalLight position={[10, 10, 5]} intensity={1} />

				{/* Controls for orbiting */}
				<OrbitControls />

				{/* Our 3D Tiles component */}
				{/* <Tileset url={tilesetUrl} /> */}
			</Canvas>
		</div>
	);
};

export default ThreeRenderer;
