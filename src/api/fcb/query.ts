import type { AsyncFeatureIter } from "flatcitybuf";
import {
	HttpFcbReader,
	WasmAttrQuery,
	WasmSpatialQuery,
	cjToObj,
	cjseqToCj,
} from "flatcitybuf";
import initWasm from "flatcitybuf";
import { mapToJson } from "./meta";
import type { CjInfo, ExportFormat, FcbQuery, ReaderState } from "./types";

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
		const result = await fetchFeatures(url, query, offset, limit);

		const headerJson = mapToJson(result.header);

		const cjInfo: CjInfo = {
			cj: headerJson,
			features: result.features.map((feature) => mapToJson(feature)),
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
 * Export data in various formats
 */
export const exportData = async (
	url: string,
	query: FcbQuery,
	format: ExportFormat = "cjseq",
): Promise<File> => {
	try {
		// Use the existing fetchFeatures logic to get all features efficiently
		// We'll collect all features by fetching in batches
		const allFeatures: unknown[] = [];
		let offset = 0;
		const batchSize = 1000; // Reasonable batch size for memory management
		const maxFeatures = 100000; // Safety limit to prevent memory issues

		// Get the first batch to get header and total count
		const firstBatch = await fetchFeatures(url, query, offset, batchSize);
		const headerJson = mapToJson(firstBatch.header);
		console.log("first batch --", firstBatch);

		// Check if dataset is too large
		if (firstBatch.totalCount > maxFeatures) {
			console.warn(
				`Dataset has ${firstBatch.totalCount} features, limiting export to ${maxFeatures} for memory safety`,
			);
		}

		allFeatures.push(
			...firstBatch.features.map((feature) => mapToJson(feature)),
		);

		console.log("allFeatures --", allFeatures);

		// Continue fetching until we have all features (or hit the safety limit)
		offset += firstBatch.features.length;
		while (
			allFeatures.length < firstBatch.totalCount &&
			allFeatures.length < maxFeatures &&
			firstBatch.features.length === batchSize
		) {
			const batch = await fetchFeatures(url, query, offset, batchSize);
			allFeatures.push(...batch.features.map((feature) => mapToJson(feature)));
			offset += batch.features.length;

			// Break if we got fewer features than requested (end of data)
			if (batch.features.length < batchSize) {
				break;
			}
		}

		// Generate content based on format
		let content: string;
		let filename: string;
		let mimeType: string;

		switch (format) {
			case "cjseq": {
				// CityJSONSeq format (JSONL)
				const jsonlLines = [JSON.stringify(headerJson)];
				console.log("allFeatures --", allFeatures);
				for (const feature of allFeatures) {
					jsonlLines.push(JSON.stringify(feature));
				}
				content = jsonlLines.join("\n");
				filename = "data.city.jsonl";
				mimeType = "application/x-jsonlines";
				break;
			}

			case "cityjson": {
				// CityJSON format (single JSON object)
				const oneCityJson = cjseqToCj(headerJson, allFeatures);
				const cityJson = mapToJson(oneCityJson);
				content = JSON.stringify(cityJson, null, 2);
				filename = "data.city.json";
				mimeType = "application/json";
				break;
			}

			case "obj": {
				// OBJ format
				// Create array with header as first element, features as rest
				const dataArray = [headerJson, ...allFeatures];
				content = cjToObj(dataArray);
				filename = "data.obj";
				mimeType = "text/plain";
				break;
			}

			default:
				throw new Error(`Unsupported export format: ${format}`);
		}

		// Create and return file object
		const blob = new Blob([content], { type: mimeType });
		return new File([blob], filename, { type: mimeType });
	} catch (error) {
		console.error("Error exporting data:", error);
		throw error;
	}
};

/**
 * Download data as CJSeq format (legacy function - will be deprecated)
 */
export const getCjSeq = async (url: string, query: FcbQuery): Promise<File> => {
	try {
		await initWasm();
		const reader = await new HttpFcbReader(url);
		const header = await reader.cityjson();
		const headerJson = mapToJson(header);

		// Create JSONL content starting with header
		const jsonlLines = [JSON.stringify(headerJson)];

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
					x: query.point?.[0],
					y: query.point?.[1],
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

			let counter = 0;
			if (iterator) {
				while (true) {
					const feature = await iterator.next();
					counter++;
					if (feature === undefined) break;
					const featureJson = mapToJson(feature);
					jsonlLines.push(JSON.stringify(featureJson));
				}
			}
			console.log("counter --", counter);
		} finally {
			console.log("finally");
		}

		const jsonlContent = jsonlLines.join("\n");
		// Create and return file object
		const blob = new Blob([jsonlContent], { type: "application/x-jsonlines" });
		return new File([blob], "data.city.jsonl", {
			type: "application/x-jsonlines",
		});
	} catch (error) {
		console.error("Error fetching FCB data:", error);
		throw error;
	}
};
