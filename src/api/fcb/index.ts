import init, { HttpFcbReader } from "flatcitybuf";

export type CjInfo = {
  features: unknown[];
  cj: unknown;
  stats: {
    num_total_features: number;
    num_selected_features: number;
  };
};
// Cache for WASM initialization
// const wasmInitialized = false;

const MAX_FEATURES = 2;

const initWasm = async () => {
  await init();
  // if (!wasmInitialized) {
  //   await init();
  //   wasmInitialized = true;
  // }
};

export const fetchFcb = async (
  url: string,
  bbox: [number, number, number, number]
) => {
  try {
    await initWasm();

    const reader = await new HttpFcbReader(url);

    const header = await reader.header();

    const debugMinX = 84227.77;
    const debugMinY = 445377.33;
    const debugMaxX = 85323.23;
    const debugMaxY = 446334.69;

    console.log("bbox", bbox);

    const debugBbox = [debugMinX, debugMinY, debugMaxX, debugMaxY];
    console.log(" debug bbox", debugBbox);
    console.log("debugBbox", debugBbox);
    const bboxIter = await reader.select_bbox(
      bbox[0],
      bbox[1],
      bbox[2],
      bbox[3]
    );

    const features = [];
    let count = 0;
    while (true) {
      const feature = await bboxIter.next();
      if (feature === undefined) {
        break;
      }
      features.push(feature);
      count++;
      if (count >= MAX_FEATURES) {
        break;
      }
    }

    const headerJson = mapToJson(header);
    console.log("features", features);

    const cjInfo = {
      cj: headerJson,
      features,
      stats: {
        num_total_features: features.length,
        num_selected_features: features.length,
      },
    };

    console.log(cjInfo);

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
    let count = 0;
    while (true) {
      const feature = await bboxIter.next();
      if (feature === undefined) {
        break;
      }
      jsonlContent += JSON.stringify(feature) + "\n";
      count++;
      if (count >= MAX_FEATURES) {
        break;
      }
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
