// Types for the FCB API
export interface Column {
  index: number;
  name: string;
  type: string;
  title?: string;
  description?: string;
  attrIndex?: boolean;
}

export interface FcbMeta {
  columns: Column[];
  featureCount: number;
}

// GeoJSON Geometry Types
export type GeometryType =
  | { type: "Point"; coordinates: number[] }
  | { type: "LineString"; coordinates: number[][] }
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPoint"; coordinates: number[][] }
  | { type: "MultiLineString"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] }
  | { type: "GeometryCollection"; geometries: GeometryType[] };

export interface CjFeature {
  type: string;
  id?: string;
  geometry: GeometryType;
  properties: Record<string, unknown>;
}

export interface CjInfo {
  type: string;
  features: CjFeature[];
  meta: {
    features_count: number;
    fetched_features_count: number;
  };
}

// Types for attribute conditions
export interface Condition {
  attribute: string;
  operator: "Gt" | "Ge" | "Eq" | "Lt" | "Le";
  value: string | number;
}

// Import WASM initialization from flatcitybuf
import init, { HttpFcbReader } from "flatcitybuf";

// Re-export functions from the implementation
export {
  fetchFcb,
  fetchFcbWithAttributeConditions,
  getCjSeq,
} from "./fcb/index";

// Store initialization state
let wasmInitialized = false;

// Initialize WASM
const initWasm = async () => {
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (column: any) => column.attrIndex === true
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
