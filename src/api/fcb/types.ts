import type { AsyncFeatureIter, HttpFcbReader } from "flatcitybuf";

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
	dataExtent: DataExtent;
}

export interface DataExtent {
	minX: number;
	minY: number;
	minZ: number;
	maxX: number;
	maxY: number;
	maxZ: number;
}

export interface CjInfo {
	cj: unknown;
	features: unknown[];
	meta: {
		features_count: number;
		fetched_features_count: number;
	};
}

export const validOperators = ["Gt", "Ge", "Eq", "Lt", "Le"] as const;
// Types for attribute conditions
export interface Condition {
	attribute: string;
	operator: (typeof validOperators)[number];
	value: string | number;
}

export type SpatialQueryType = "bbox" | "pointIntersects" | "pointNearest";
export type AttributeQueryType = "attr";

export interface SpatialQuery {
	type: SpatialQueryType;
	bbox?: number[];
	point?: number[];
}

export interface AttributeQuery {
	type: AttributeQueryType;
	conditions: Condition[];
}

// Store readers and iterators for reuse
export type FcbQuery = SpatialQuery | AttributeQuery;

export type ReaderState = {
	reader: HttpFcbReader;
	iterator: AsyncFeatureIter | undefined;
	header: Map<string, unknown>;
	totalCount: number;
	currentPosition: number;
	query: FcbQuery;
};

// Export format types
export type ExportFormat = "cjseq" | "cityjson" | "obj";

export interface ExportFormatOption {
	value: ExportFormat;
	label: string;
	extension: string;
	mimeType: string;
}
