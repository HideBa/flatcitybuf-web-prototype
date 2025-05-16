import {
	type AsyncFeatureIter,
	HttpFcbReader,
	WasmAttrQuery,
	WasmSpatialQuery,
} from "flatcitybuf";
import { initWasm } from "./meta";
import type { CjInfo, FcbQuery, ReaderState } from "./types";

// Default value for maximum features to fetch
const DEFAULT_LIMIT = 10;

// Cache to store active reader states
const readerStates: Map<string, ReaderState> = new Map();

/**
 * Create a cache key for a query
 */
const createCacheKey = (url: string, query: FcbQuery): string => {
	if (query.type === "bbox") {
		return `${url}-spatial-${query.type}-${query.bbox?.join("-")}}`;
	}
	if (query.type === "pointIntersects") {
		return `${url}-spatial-${query.type}-pi-${query.point?.join("-")}`;
	}
	if (query.type === "pointNearest") {
		return `${url}-spatial-${query.type}-pn-${query.point?.join("-")}`;
	}
	// For attribute queries, create a deterministic string
	if (query.type === "attr") {
		const condStr = JSON.stringify(
			query.conditions
				.map((c) => `${c.attribute}-${c.operator}-${c.value}`)
				.sort(),
		);
		return `${url}-attr-${condStr}`;
	}
	return `${url}-unknown`;
};

/**
 * Initialize or retrieve a reader state for a query
 */
const getReaderState = async (
	url: string,
	query: FcbQuery,
): Promise<ReaderState> => {
	await initWasm();

	const cacheKey = createCacheKey(url, query);

	// Check if we already have a reader for this query
	if (readerStates.has(cacheKey)) {
		const state = readerStates.get(cacheKey);
		if (state) {
			return state;
		}
	}

	try {
		// Create a new reader
		const reader = await new HttpFcbReader(url);
		const header = await reader.cityjson();
		const meta = await reader.meta();

		// Count total features (this will consume an iterator)
		const totalCount = meta.featureCount;

		// Create a fresh iterator for future use
		let iterator: AsyncFeatureIter | undefined;

		if (
			query.type === "bbox" ||
			query.type === "pointIntersects" ||
			query.type === "pointNearest"
		) {
			const queryObj = {
				type: query.type,
				minX: query.bbox?.[0],
				minY: query.bbox?.[1],
				maxX: query.bbox?.[2],
				maxY: query.bbox?.[3],
				x: query.point?.[0],
				y: query.point?.[1],
			};
			const spatialQuery = new WasmSpatialQuery(queryObj);
			console.log("spatialQuery", spatialQuery);
			iterator = await reader.select_spatial(spatialQuery);
		} else if (query.type === "attr") {
			const attrParams = query.conditions.map((cond) => {
				return [cond.attribute, cond.operator, cond.value];
			});
			const attrQuery = new WasmAttrQuery(attrParams);
			iterator = await reader.select_attr_query(attrQuery);
		}

		// Create and store the reader state
		const state: ReaderState = {
			reader,
			iterator,
			header,
			totalCount,
			currentPosition: 0,
			query,
		};

		readerStates.set(cacheKey, state);
		return state;
	} catch (error) {
		console.error("Error creating reader state:", error);
		throw new Error(
			`Failed to create reader: ${(error as Error).message || "Unknown error"}`,
		);
	}
};

/**
 * Fetch features using an existing iterator or create a new one
 */
const fetchFeatures = async (
	url: string,
	query: FcbQuery,
	offset = 0,
	limit = DEFAULT_LIMIT,
): Promise<{
	features: unknown[];
	header: Map<string, unknown>;
	totalCount: number;
	currentPosition: number;
}> => {
	// Get the reader state (creates a new one if needed)
	const state = await getReaderState(url, query);

	try {
		// Skip features until we reach the desired offset
		while (state.currentPosition < offset) {
			if (!state.iterator) {
				break;
			}

			try {
				const feature = await state.iterator.next();
				console.log("feature --", feature);
				if (feature === undefined) {
					break;
				}
				state.currentPosition++;
			} catch (error) {
				console.error("Error skipping features:", error);

				// Clean up and recreate the reader state to avoid memory issues
				readerStates.delete(createCacheKey(url, query));

				// Create a new state and position it at the current offset
				const newState = await getReaderState(url, query);
				// Skip over as many as possible (may not reach the desired offset)
				for (let i = 0; i < state.currentPosition; i++) {
					if (!newState.iterator) break;
					await newState.iterator.next();
				}

				throw new Error("Error while skipping features");
			}
		}

		// Collect features up to the limit
		const features = [];
		let collected = 0;
		console.log("limit --", limit);
		while (collected < limit) {
			console.log("collected --", collected);
			if (!state.iterator) {
				console.log("no iterator");
				break;
			}

			try {
				const feature = await state.iterator.next();
				console.log("feature --", feature);
				if (feature === undefined) {
					break;
				}
				features.push(feature);
				collected++;
				state.currentPosition++;
			} catch (error) {
				console.error("Error collecting features:", error);
				break;
			}
		}

		// Update the cache with the new position
		const cacheKey = createCacheKey(url, query);
		readerStates.set(cacheKey, state);

		return {
			features,
			header: state.header,
			totalCount: state.totalCount,
			currentPosition: state.currentPosition,
		};
	} catch (error) {
		console.error("Error in fetchFeatures:", error);
		throw error;
	}
};

/**
 * Fetch FCB data using a bbox query
 */
export const fetchFcb = async (
	url: string,
	query: FcbQuery,
	offset = 0,
	limit = DEFAULT_LIMIT,
) => {
	try {
		console.log("fetch num---: ", limit);
		const result = await fetchFeatures(url, query, offset, limit);

		const headerJson = mapToJson(result.header);

		const cjInfo: CjInfo = {
			cj: headerJson,
			features: result.features,
			meta: {
				features_count: result.totalCount,
				fetched_features_count: result.currentPosition,
			},
		};

		return cjInfo;
	} catch (error) {
		console.error("Error fetching FCB data:", error);
		// Return an empty result set instead of crashing the UI
		return {
			cj: {},
			features: [],
			meta: {
				features_count: 0,
				fetched_features_count: 0,
			},
		};
	}
};

/**
 * Download data as CJSeq format
 */
export const getCjSeq = async (url: string, query: FcbQuery): Promise<File> => {
	try {
		await initWasm();
		const reader = await new HttpFcbReader(url);
		const header = await reader.cityjson();

		// Create JSONL content starting with header
		let jsonlContent = `${JSON.stringify(header)}\n`;

		try {
			// Instead of reusing state, create a dedicated iterator for the export
			let iterator: AsyncFeatureIter | undefined;

			if (
				query.type === "bbox" ||
				query.type === "pointIntersects" ||
				query.type === "pointNearest"
			) {
				const queryObj = {
					type: query.type,
					minX: query.bbox?.[0],
					minY: query.bbox?.[1],
					maxX: query.bbox?.[2],
					maxY: query.bbox?.[3],
				};
				const spatialQuery = new WasmSpatialQuery(queryObj);
				iterator = await reader.select_spatial(spatialQuery);
			} else if (query.type === "attr") {
				const attrParams = query.conditions.map((cond) => {
					return [cond.attribute, cond.operator, cond.value];
				});
				const attrQuery = new WasmAttrQuery(attrParams);
				iterator = await reader.select_attr_query(attrQuery);
			}

			if (iterator) {
				// Add features
				while (true) {
					const feature = await iterator.next();
					if (feature === undefined) {
						break;
					}
					jsonlContent += `${JSON.stringify(feature)}\n`;
				}

				// Clean up WASM resources
			}
		} finally {
			console.log("finally");
		}
		// Create and return file object
		const blob = new Blob([jsonlContent], { type: "application/x-jsonlines" });
		return new File([blob], "features.jsonl", {
			type: "application/x-jsonlines",
		});
	} catch (error) {
		console.error("Error fetching FCB data:", error);
		throw error;
	}
};

/**
 * Convert Map to JSON object
 */
const mapToJson = (map: Map<string, unknown>) => {
	const obj: { [key: string]: unknown } = {};
	for (const [key, value] of map.entries()) {
		obj[key] = value instanceof Map ? mapToJson(value) : value;
	}
	return obj;
};
