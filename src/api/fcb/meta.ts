import init, { HttpFcbReader } from "flatcitybuf";
import type { Column, DataExtent, FcbMeta } from "./types";

// Store initialization state
let wasmInitialized = false;

// Track ongoing metadata requests to avoid duplicate calls
const metadataRequests = new Map<string, Promise<FcbMeta>>();

// Initialize WASM
export const initWasm = async () => {
  if (!wasmInitialized) {
    await init();
    wasmInitialized = true;
  }
};

// Function to fetch FCB metadata using the reader's meta function
export async function fetchFcbMeta(fcbUrl: string): Promise<FcbMeta> {
  try {
    // Check if we already have an ongoing request for this URL
    if (metadataRequests.has(fcbUrl)) {
      const existingRequest = metadataRequests.get(fcbUrl);
      if (existingRequest) {
        return existingRequest;
      }
    }

    // Create a new request promise
    const requestPromise = (async () => {
      await initWasm();

      // Create a reader instance
      const reader = await new HttpFcbReader(fcbUrl);

      try {
        // Get the metadata directly from the reader
        const meta = await reader.meta();
        const cj_map = await reader.cityjson();
        const cj = mapToJson(cj_map);
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        const geographicalExtent = (cj.metadata as any).geographicalExtent; // TODO: add zod to validate
        const dataExtent: DataExtent = {
          minX: geographicalExtent[0],
          minY: geographicalExtent[1],
          minZ: geographicalExtent[2],
          maxX: geographicalExtent[3],
          maxY: geographicalExtent[4],
          maxZ: geographicalExtent[5],
        };
        const indexableColumns = meta.columns?.filter(
          (column: Column) => column.attrIndex === true
        );

        return {
          columns: indexableColumns,
          featureCount: meta.featureCount || 0,
          dataExtent,
        };
      } finally {
        // Clean up WASM resources
        if (reader && typeof reader.free === "function") {
          try {
            reader.free();
          } catch (e) {
            console.warn("Error freeing reader resource:", e);
          }
        }
      }
    })();

    // Store the promise in our map
    metadataRequests.set(fcbUrl, requestPromise);

    // Once the request is complete (success or failure), remove it from the map
    requestPromise.finally(() => {
      metadataRequests.delete(fcbUrl);
    });

    return requestPromise;
  } catch (error) {
    console.error("Error fetching FCB metadata:", error);
    throw error;
  }
}

/**
 * Convert Map to JSON object
 */
export const mapToJson = (map: Map<string, unknown>) => {
  const obj: { [key: string]: unknown } = {};
  for (const [key, value] of map.entries()) {
    obj[key] = value instanceof Map ? mapToJson(value) : value;
  }
  return obj;
};
