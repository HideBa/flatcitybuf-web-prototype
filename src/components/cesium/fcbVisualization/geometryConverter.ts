import * as Cesium from "cesium";
import proj4 from "proj4";

// Define coordinate systems for conversion
proj4.defs([
	["EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs"],
	[
		"EPSG:28992",
		"+proj=sterea +lat_0=52.1561605555556 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +towgs84=593.16,26.15,478.54,-6.3239,-0.5008,-5.5487,4.0775 +units=m +no_defs +type=crs",
	],
]);

interface CityJSONGeometry {
	type: string;
	lod: string;
	boundaries: number[][][][][] | number[][][] | number[][] | number[];
	semantics?: {
		surfaces: Array<{
			type: string;
		}>;
		values: number[] | number[][];
	};
}

interface CityJSONObject {
	type: string;
	geometry: CityJSONGeometry[];
	attributes?: Record<string, unknown>;
}

interface CityJSONFeature {
	CityObjects: Record<string, CityJSONObject>;
	vertices: number[][];
	transform?: {
		scale: number[];
		translate: number[];
	};
}

interface CesiumGeometryEntity {
	id: string;
	position?: Cesium.Cartesian3;
	polygon?: Cesium.PolygonGraphics.ConstructorOptions;
	polyline?: Cesium.PolylineGraphics.ConstructorOptions;
	label?: Cesium.LabelGraphics.ConstructorOptions;
	properties?: Record<string, unknown>;
}

/**
 * Detect coordinate system and transform coordinates to WGS84 for Cesium
 */
function detectAndTransformCoordinates(
	x: number,
	y: number,
	z: number,
	transform?: { scale: number[]; translate: number[] },
): Cesium.Cartesian3 {
	// Apply CityJSON transform if present
	let transformedX = x;
	let transformedY = y;
	let transformedZ = z;

	if (transform) {
		transformedX = x * transform.scale[0] + transform.translate[0];
		transformedY = y * transform.scale[1] + transform.translate[1];
		transformedZ = z * transform.scale[2] + transform.translate[2];
	}

	console.log("Transform:", transform);
	console.log(
		"Transformed coordinates:",
		transformedX,
		transformedY,
		transformedZ,
	);
	// Detect coordinate system based on coordinate ranges
	const isDutchRD = (x: number, y: number): boolean => {
		// Dutch RD (EPSG:28992) typical ranges:
		// X: 0 to 300,000 (meters)
		// Y: 300,000 to 700,000 (meters)
		return x >= 0 && x <= 400000 && y >= 250000 && y <= 750000;
	};

	const isWGS84 = (x: number, y: number): boolean => {
		// WGS84 (EPSG:4326) ranges:
		// Longitude: -180 to 180 (degrees)
		// Latitude: -90 to 90 (degrees)
		return x >= -180 && x <= 180 && y >= -90 && y <= 90;
	};

	let lon: number, lat: number;

	if (isDutchRD(transformedX, transformedY)) {
		// Convert from Dutch RD (EPSG:28992) to WGS84 (EPSG:4326)
		console.log(
			`Converting Dutch RD coordinates: ${transformedX}, ${transformedY}`,
		);
		[lon, lat] = proj4("EPSG:28992", "EPSG:4326", [transformedX, transformedY]);
	} else if (isWGS84(transformedX, transformedY)) {
		// Already in WGS84, use as-is
		console.log(`Using WGS84 coordinates: ${transformedX}, ${transformedY}`);
		lon = transformedX;
		lat = transformedY;
	} else {
		// Default: assume Dutch RD and attempt conversion
		console.warn(
			`Uncertain coordinate system for: ${transformedX}, ${transformedY}. Assuming Dutch RD.`,
		);
		try {
			[lon, lat] = proj4("EPSG:28992", "EPSG:4326", [
				transformedX,
				transformedY,
			]);
		} catch (error) {
			console.error("Coordinate transformation failed:", error);
			// Fallback: treat as WGS84
			lon = transformedX;
			lat = transformedY;
		}
	}

	// Validate the resulting coordinates
	if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
		console.error(
			`Invalid WGS84 coordinates after transformation: ${lon}, ${lat}`,
		);
		// Use a default location (center of Netherlands)
		lon = 5.2913;
		lat = 52.1326;
	}

	// Convert to Cesium Cartesian3
	return Cesium.Cartesian3.fromDegrees(lon, lat, transformedZ);
}

/**
 * Get semantic color based on surface type
 */
function getSemanticColor(semanticType?: string): Cesium.Color {
	switch (semanticType?.toLowerCase()) {
		case "roofsurface":
			return Cesium.Color.INDIANRED;
		case "wallsurface":
			return Cesium.Color.LIGHTGRAY;
		case "groundsurface":
			return Cesium.Color.SADDLEBROWN;
		case "window":
			return Cesium.Color.LIGHTBLUE;
		case "door":
			return Cesium.Color.BROWN;
		default:
			return Cesium.Color.DARKGRAY;
	}
}

/**
 * Log coordinate information for debugging
 */
function logCoordinateInfo(vertices: number[][], sampleSize: number = 5): void {
	if (!vertices || vertices.length === 0) return;

	console.log(`Total vertices: ${vertices.length}`);

	// Sample first few vertices to understand the coordinate system
	const sampleVertices = vertices.slice(
		0,
		Math.min(sampleSize, vertices.length),
	);
	console.log(
		"Sample vertices:",
		sampleVertices.map((v) => `[${v[0]}, ${v[1]}, ${v[2] || 0}]`),
	);

	// Calculate bounding box to help identify coordinate system
	const bounds = vertices.reduce(
		(acc, vertex) => ({
			minX: Math.min(acc.minX, vertex[0]),
			maxX: Math.max(acc.maxX, vertex[0]),
			minY: Math.min(acc.minY, vertex[1]),
			maxY: Math.max(acc.maxY, vertex[1]),
			minZ: Math.min(acc.minZ, vertex[2] || 0),
			maxZ: Math.max(acc.maxZ, vertex[2] || 0),
		}),
		{
			minX: Infinity,
			maxX: -Infinity,
			minY: Infinity,
			maxY: -Infinity,
			minZ: Infinity,
			maxZ: -Infinity,
		},
	);

	console.log("Coordinate bounds:", bounds);
}

/**
 * Convert a ring of vertex indices to Cesium Cartesian3 positions
 */
function convertRingToPositions(
	ring: number[],
	vertices: number[][],
	transform?: { scale: number[]; translate: number[] },
): Cesium.Cartesian3[] {
	if (ring.length < 3) {
		console.warn(`Ring has fewer than 3 vertices: ${ring.length}`);
		throw new Error(`Ring must have at least 3 vertices, got ${ring.length}`);
	}

	return ring.map((vertexIndex, i) => {
		if (vertexIndex >= vertices.length || vertexIndex < 0) {
			throw new Error(
				`Vertex index ${vertexIndex} is out of bounds (vertices length: ${vertices.length})`,
			);
		}

		const vertex = vertices[vertexIndex];
		if (!vertex || vertex.length < 3) {
			throw new Error(
				`Invalid vertex at index ${vertexIndex}: ${JSON.stringify(vertex)}`,
			);
		}

		try {
			return detectAndTransformCoordinates(
				vertex[0],
				vertex[1],
				vertex[2],
				transform,
			);
		} catch (error) {
			console.error(
				`Error converting vertex ${i} (index ${vertexIndex}):`,
				vertex,
				error,
			);
			throw error;
		}
	});
}

/**
 * Convert CityJSON Solid geometry to Cesium polygon entities
 */
function convertSolidToCesiumEntities(
	objectId: string,
	geometry: CityJSONGeometry,
	vertices: number[][],
	transform?: { scale: number[]; translate: number[] },
	attributes?: Record<string, unknown>,
): CesiumGeometryEntity[] {
	const entities: CesiumGeometryEntity[] = [];

	if (
		!geometry.boundaries ||
		!Array.isArray(geometry.boundaries) ||
		geometry.boundaries.length === 0
	) {
		return entities;
	}

	try {
		// For a Solid, boundaries is a 4D array: [solid][shell][surface][ring]
		// We'll process each surface as a separate polygon entity
		let surfaceIndex = 0;
		const boundaries = geometry.boundaries as unknown as number[][][][];

		// Iterate through solids
		for (let solidIdx = 0; solidIdx < boundaries.length; solidIdx++) {
			const solid = boundaries[solidIdx];
			if (!Array.isArray(solid)) continue;

			// Iterate through shells in the solid
			for (let shellIdx = 0; shellIdx < solid.length; shellIdx++) {
				const shell = solid[shellIdx];
				if (!Array.isArray(shell)) continue;

				// Iterate through surfaces in the shell
				for (let surfaceIdx = 0; surfaceIdx < shell.length; surfaceIdx++) {
					const surface = shell[surfaceIdx];

					if (!surface || surface.length === 0) {
						continue;
					}

					// Get semantic information for this surface
					let semanticType: string | undefined;
					if (
						geometry.semantics &&
						geometry.semantics.values &&
						geometry.semantics.surfaces
					) {
						const semanticValues = Array.isArray(geometry.semantics.values[0])
							? (geometry.semantics.values as number[][])[surfaceIndex]
							: (geometry.semantics.values as number[])[surfaceIndex];
						const semanticIdx = Array.isArray(semanticValues)
							? semanticValues[0]
							: semanticValues;
						if (
							semanticIdx !== undefined &&
							geometry.semantics.surfaces[semanticIdx]
						) {
							semanticType = geometry.semantics.surfaces[semanticIdx].type;
						}
					}

					// Convert rings to positions
					const rings: Cesium.Cartesian3[][] = [];
					for (const ring of surface) {
						if (!Array.isArray(ring)) continue;
						try {
							const positions = convertRingToPositions(
								ring as number[],
								vertices,
								transform,
							);
							rings.push(positions);
						} catch (error) {
							console.warn(
								`Error converting ring in surface ${surfaceIndex}:`,
								error,
							);
							continue;
						}
					}

					if (rings.length > 0) {
						// Create polygon entity
						const entityId = `${objectId}_surface_${surfaceIndex}`;
						const color = getSemanticColor(semanticType);

						// The first ring is the exterior, others are holes
						const hierarchy = new Cesium.PolygonHierarchy(
							rings[0],
							rings.slice(1).map((hole) => new Cesium.PolygonHierarchy(hole)),
						);

						entities.push({
							id: entityId,
							polygon: {
								hierarchy,
								material: color.withAlpha(0.8),
								outline: true,
								outlineColor: color.withAlpha(1.0),
								extrudedHeight: 0,
								height: 0,
							},
							properties: {
								objectId,
								surfaceIndex,
								semanticType,
								geometryType: geometry.type,
								lod: geometry.lod,
								...attributes,
							},
						});
					}

					surfaceIndex++;
				}
			}
		}
	} catch (error) {
		console.error(`Error converting solid geometry for ${objectId}:`, error);
	}

	return entities;
}

/**
 * Convert CityJSON MultiSurface geometry to Cesium polygon entities
 */
function convertMultiSurfaceToCesiumEntities(
	objectId: string,
	geometry: CityJSONGeometry,
	vertices: number[][],
	transform?: { scale: number[]; translate: number[] },
	attributes?: Record<string, unknown>,
): CesiumGeometryEntity[] {
	const entities: CesiumGeometryEntity[] = [];

	if (
		!geometry.boundaries ||
		!Array.isArray(geometry.boundaries) ||
		geometry.boundaries.length === 0
	) {
		return entities;
	}

	try {
		// For MultiSurface, boundaries is a 3D array: [surface][ring]
		const boundaries = geometry.boundaries as unknown as number[][][];
		for (let surfaceIdx = 0; surfaceIdx < boundaries.length; surfaceIdx++) {
			const surface = boundaries[surfaceIdx];
			if (!Array.isArray(surface)) continue;

			if (!surface || surface.length === 0) {
				continue;
			}

			// Get semantic information for this surface
			let semanticType: string | undefined;
			if (
				geometry.semantics &&
				geometry.semantics.values &&
				geometry.semantics.surfaces
			) {
				const semanticValues = Array.isArray(geometry.semantics.values[0])
					? (geometry.semantics.values as number[][])[surfaceIdx]
					: (geometry.semantics.values as number[])[surfaceIdx];
				const semanticIdx = Array.isArray(semanticValues)
					? semanticValues[0]
					: semanticValues;
				if (
					semanticIdx !== undefined &&
					geometry.semantics.surfaces[semanticIdx]
				) {
					semanticType = geometry.semantics.surfaces[semanticIdx].type;
				}
			}

			// Convert rings to positions
			const rings: Cesium.Cartesian3[][] = [];
			for (const ring of surface) {
				if (!Array.isArray(ring)) continue;
				try {
					const positions = convertRingToPositions(
						ring as number[],
						vertices,
						transform,
					);
					rings.push(positions);
				} catch (error) {
					console.warn(
						`Error converting ring in surface ${surfaceIdx}:`,
						error,
					);
					continue;
				}
			}

			if (rings.length > 0) {
				// Create polygon entity
				const entityId = `${objectId}_surface_${surfaceIdx}`;
				const color = getSemanticColor(semanticType);

				// The first ring is the exterior, others are holes
				const hierarchy = new Cesium.PolygonHierarchy(
					rings[0],
					rings.slice(1).map((hole) => new Cesium.PolygonHierarchy(hole)),
				);

				entities.push({
					id: entityId,
					polygon: {
						hierarchy,
						material: color.withAlpha(0.8),
						outline: true,
						outlineColor: color.withAlpha(1.0),
						extrudedHeight: 0,
						height: 0,
					},
					properties: {
						objectId,
						surfaceIndex: surfaceIdx,
						semanticType,
						geometryType: geometry.type,
						lod: geometry.lod,
						...attributes,
					},
				});
			}
		}
	} catch (error) {
		console.error(
			`Error converting MultiSurface geometry for ${objectId}:`,
			error,
		);
	}

	return entities;
}

/**
 * Convert a single CityJSON geometry to Cesium entities
 */
function convertGeometryToCesiumEntities(
	objectId: string,
	geometry: CityJSONGeometry,
	vertices: number[][],
	transform?: { scale: number[]; translate: number[] },
	attributes?: Record<string, unknown>,
): CesiumGeometryEntity[] {
	switch (geometry.type) {
		case "Solid":
			return convertSolidToCesiumEntities(
				objectId,
				geometry,
				vertices,
				transform,
				attributes,
			);
		case "MultiSurface":
		case "CompositeSurface":
			return convertMultiSurfaceToCesiumEntities(
				objectId,
				geometry,
				vertices,
				transform,
				attributes,
			);
		default:
			console.warn(`Unsupported geometry type: ${geometry.type}`);
			return [];
	}
}

/**
 * Convert a CityJSON feature to Cesium entities
 */
export function convertCityJSONFeatureToCesiumEntities(
	feature: CityJSONFeature,
): CesiumGeometryEntity[] {
	const entities: CesiumGeometryEntity[] = [];

	if (!feature.CityObjects || !feature.vertices) {
		console.warn("Invalid CityJSON feature: missing CityObjects or vertices");
		return entities;
	}

	// Log coordinate information for debugging
	logCoordinateInfo(feature.vertices);

	if (feature.transform) {
		console.log("CityJSON transform:", feature.transform);
	}

	// Process each city object
	for (const [objectId, cityObject] of Object.entries(feature.CityObjects)) {
		if (!cityObject.geometry || cityObject.geometry.length === 0) {
			continue;
		}

		// Process each geometry in the city object
		for (const geometry of cityObject.geometry) {
			const geometryEntities = convertGeometryToCesiumEntities(
				objectId,
				geometry,
				feature.vertices,
				feature.transform,
				cityObject.attributes,
			);
			entities.push(...geometryEntities);
		}
	}

	return entities;
}

/**
 * Convert an array of CityJSON features to Cesium entities
 */
export function convertCityJSONFeaturesToCesiumEntities(
	features: unknown[],
): CesiumGeometryEntity[] {
	const allEntities: CesiumGeometryEntity[] = [];

	for (const feature of features) {
		try {
			const cesiumEntities = convertCityJSONFeatureToCesiumEntities(
				feature as CityJSONFeature,
			);
			allEntities.push(...cesiumEntities);
		} catch (error) {
			console.error("Error converting feature:", error);
		}
	}

	return allEntities;
}
