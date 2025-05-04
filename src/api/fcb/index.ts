import { type Condition } from "@/feature/attribute/hooks";
import init, {
  AsyncFeatureIter,
  HttpFcbReader,
  WasmAttrQuery,
} from "flatcitybuf";

export type CjInfo = {
  features: unknown[];
  cj: unknown;
  meta: {
    features_count: number;
    fetched_features_count: number;
  };
};

// Cache for WASM initialization
let wasmInitialized = false;

// Default value for maximum features to fetch
const DEFAULT_LIMIT = 10;

// Store readers and iterators for reuse
type FcbQuery =
  | {
      type: "bbox";
      bbox: number[];
    }
  | {
      type: "attr";
      conditions: Condition[];
    };

type ReaderState = {
  reader: HttpFcbReader;
  iterator: AsyncFeatureIter;
  header: Map<string, unknown>;
  totalCount: number;
  currentPosition: number;
  query: FcbQuery;
};

// Cache to store active reader states
const readerStates: Map<string, ReaderState> = new Map();

/**
 * Initialize WASM
 */
const initWasm = async () => {
  if (!wasmInitialized) {
    await init();
    wasmInitialized = true;
  }
};

/**
 * Create a cache key for a query
 */
const createCacheKey = (url: string, query: FcbQuery): string => {
  if (query.type === "bbox") {
    return `${url}-bbox-${query.bbox.join("-")}`;
  } else {
    // For attribute queries, create a deterministic string
    const condStr = JSON.stringify(
      query.conditions
        .map((c) => `${c.attribute}-${c.operator}-${c.value}`)
        .sort()
    );
    return `${url}-attr-${condStr}`;
  }
};

/**
 * Initialize or retrieve a reader state for a query
 */
const getReaderState = async (
  url: string,
  query: FcbQuery
): Promise<ReaderState> => {
  await initWasm();

  const cacheKey = createCacheKey(url, query);

  // Check if we already have a reader for this query
  if (readerStates.has(cacheKey)) {
    return readerStates.get(cacheKey)!;
  }

  // Create a new reader
  const reader = await new HttpFcbReader(url);
  const header = await reader.cityjson();
  const meta = await reader.meta();
  console.log("meta----", meta);

  // Count total features (this will consume an iterator)
  const totalCount = meta.featureCount;

  // Create a fresh iterator for future use
  let iterator;
  if (query.type === "bbox") {
    iterator = await reader.select_bbox(
      query.bbox[0],
      query.bbox[1],
      query.bbox[2],
      query.bbox[3]
    );
  } else {
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
};

/**
 * Fetch features using an existing iterator or create a new one
 */
const fetchFeatures = async (
  url: string,
  query: FcbQuery,
  offset = 0,
  limit = DEFAULT_LIMIT
): Promise<{
  features: unknown[];
  header: Map<string, unknown>;
  totalCount: number;
  currentPosition: number;
}> => {
  // Get the reader state (creates a new one if needed)
  const state = await getReaderState(url, query);

  // Skip features until we reach the desired offset
  while (state.currentPosition < offset) {
    const feature = await state.iterator.next();
    if (feature === undefined) {
      break;
    }
    state.currentPosition++;
  }

  // Collect features up to the limit
  const features = [];
  let collected = 0;
  while (collected < limit) {
    const feature = await state.iterator.next();
    if (feature === undefined) {
      break;
    }
    features.push(feature);
    collected++;
    state.currentPosition++;
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
};

/**
 * Fetch FCB data using a bbox query
 */
export const fetchFcb = async (
  url: string,
  bbox: number[],
  offset = 0,
  limit = DEFAULT_LIMIT
) => {
  try {
    const query: FcbQuery = { type: "bbox", bbox };

    const result = await fetchFeatures(url, query, offset, limit);

    const headerJson = mapToJson(result.header);

    console.log("result.totalCount----", result.totalCount);

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
    throw error;
  }
};

/**
 * Fetch FCB data using attribute conditions
 */
export const fetchFcbWithAttributeConditions = async (
  url: string,
  conditions: Condition[],
  offset = 0,
  limit = DEFAULT_LIMIT
) => {
  try {
    const query: FcbQuery = { type: "attr", conditions };

    const result = await fetchFeatures(url, query, offset, limit);

    const headerJson = mapToJson(result.header);

    console.log("result.totalCount----", result.totalCount);

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
    throw error;
  }
};

/**
 * Download data as CJSeq format
 */
export const getCjSeq = async (
  url: string,
  bbox: [number, number, number, number]
): Promise<File> => {
  try {
    await initWasm();
    const reader = await new HttpFcbReader(url);
    const header = await reader.cityjson();

    // Create JSONL content starting with header
    let jsonlContent = JSON.stringify(header) + "\n";

    const bboxIter = await reader.select_bbox(
      bbox[0],
      bbox[1],
      bbox[2],
      bbox[3]
    );

    // Add features
    while (true) {
      const feature = await bboxIter.next();
      if (feature === undefined) {
        break;
      }
      jsonlContent += JSON.stringify(feature) + "\n";
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
