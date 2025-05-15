import init, { HttpFcbReader } from "flatcitybuf";
import type { FcbMeta, Column } from "./types";

// Store initialization state
let wasmInitialized = false;

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
    await initWasm();

    // Create a reader instance
    const reader = await new HttpFcbReader(fcbUrl);

    // Get the metadata directly from the reader
    const meta = await reader.meta();
    const indexableColumns = meta.columns?.filter(
      (column: Column) => column.attrIndex === true
    );
    console.log("indexableColumns", indexableColumns);
    // Filter columns with attrIndex set to true
    return {
      columns: indexableColumns,
      featureCount: meta.featureCount || 0,
    };
  } catch (error) {
    console.error("Error fetching FCB metadata:", error);
    throw error;
  }
}
