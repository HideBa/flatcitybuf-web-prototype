import { type Condition } from "@/feature/attribute/hooks";
import init, { HttpFcbReader, WasmAttrQuery } from "flatcitybuf";

export type CjInfo = {
  features: unknown[];
  cj: unknown;
  meta: {
    features_count: number;
  };
};
// Cache for WASM initialization
let wasmInitialized = false;

// Default value for maximum features to fetch
const DEFAULT_LIMIT = 10;

const initWasm = async () => {
  await init();
  if (!wasmInitialized) {
    await init();
    wasmInitialized = true;
  }
};

export const fetchFcb = async (
  url: string,
  bbox: number[],
  offset = 0,
  limit = DEFAULT_LIMIT
) => {
  try {
    await initWasm();

    const reader = await new HttpFcbReader(url);

    const header = await reader.header();
    const bboxIter = await reader.select_bbox(
      bbox[0],
      bbox[1],
      bbox[2],
      bbox[3]
    );

    const features = [];
    let count = 0;
    let skipped = 0;

    // Skip features until we reach the offset
    while (skipped < offset) {
      const feature = await bboxIter.next();
      if (feature === undefined) {
        break;
      }
      skipped++;
      count++;
    }

    // Collect features up to the limit
    while (features.length < limit) {
      const feature = await bboxIter.next();
      if (feature === undefined) {
        break;
      }
      features.push(feature);
      count++;
    }

    // Count remaining features without loading them
    while (true) {
      const feature = await bboxIter.next();
      if (feature === undefined) {
        break;
      }
      count++;
    }

    const headerJson = mapToJson(header);

    const cjInfo = {
      cj: headerJson,
      features,
      meta: {
        features_count: count,
      },
    };

    return cjInfo;
  } catch (error) {
    console.error("Error fetching FCB data:", error);
    throw error;
  }
};

export const fetchFcbWithAttributeConditions = async (
  url: string,
  conditions: Condition[],
  offset = 0,
  limit = DEFAULT_LIMIT
) => {
  try {
    await initWasm();

    const query = conditions.map((cond) => {
      return [cond.attribute, cond.operator, cond.value];
    });

    console.log("conditions: ", conditions);
    console.log("query: ", query);
    const attrQuery = new WasmAttrQuery(query);

    const reader = await new HttpFcbReader(url);

    const header = await reader.header();
    const bboxIter = await reader.select_attr_query(attrQuery);

    const features = [];
    let count = 0;
    let skipped = 0;

    // Skip features until we reach the offset
    while (skipped < offset) {
      const feature = await bboxIter.next();
      if (feature === undefined) {
        break;
      }
      skipped++;
      count++;
    }

    // Collect features up to the limit
    while (features.length < limit) {
      const feature = await bboxIter.next();
      if (feature === undefined) {
        break;
      }
      features.push(feature);
      count++;
    }

    // Count remaining features without loading them
    while (true) {
      const feature = await bboxIter.next();
      if (feature === undefined) {
        break;
      }
      count++;
    }

    const headerJson = mapToJson(header);

    const cjInfo = {
      cj: headerJson,
      features,
      meta: {
        features_count: count,
      },
    };

    return cjInfo;
  } catch (error) {
    console.error("Error fetching FCB data:", error);
    throw error;
  }
};

export const getCjSeq = async (
  url: string,
  bbox: [number, number, number, number]
): Promise<File> => {
  try {
    await initWasm();
    const reader = await new HttpFcbReader(url);
    const header = await reader.header();
    const headerJson = mapToJson(header);

    // Create JSONL content starting with header
    let jsonlContent = JSON.stringify(headerJson) + "\n";

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

const mapToJson = (map: Map<string, unknown>) => {
  const obj: { [key: string]: unknown } = {};
  for (const [key, value] of map.entries()) {
    obj[key] = value instanceof Map ? mapToJson(value) : value;
  }
  return obj;
};
