import type {
	Column,
	Condition,
	FcbMeta,
	SpatialQueryType,
} from "@/api/fcb/types";
import type * as Cesium from "cesium";
import { atom } from "jotai";

export type FetchMode = "spatial" | "attribute";

export type LastFetchedData = {
	type: FetchMode;
	bbox?: number[];
	point?: number[];
	spatialQueryType?: SpatialQueryType;
	attributes?: Condition[];
	totalFeatures: number;
	currentOffset: number;
};

// Atoms
export const rectangleAtom = atom<Cesium.Rectangle | null>(null);
export const pointAtom = atom<Cesium.Cartesian3 | null>(null);
export const fetchModeAtom = atom<FetchMode>("spatial");
export const spatialQueryTypeAtom = atom<SpatialQueryType>("bbox");
export const attributeConditionsAtom = atom<Condition[]>([
	{ attribute: "b3_h_dak_50p", operator: "Gt", value: 40.0 },
	{
		attribute: "identificatie",
		operator: "Eq",
		value: "NL.IMBAG.Pand.0273100000005183",
	},
]);
export const featureLimitAtom = atom<number>(10);
export const isLoadingAtom = atom<boolean>(false);
export const lastFetchedDataAtom = atom<LastFetchedData | null>(null);
export const fcbMetaAtom = atom<FcbMeta | null>(null);

// Derived atoms
export const canFetchDataAtom = atom((get) => {
	const fetchMode = get(fetchModeAtom);
	const rectangle = get(rectangleAtom);
	const point = get(pointAtom);
	const spatialQueryType = get(spatialQueryTypeAtom);
	const isLoading = get(isLoadingAtom);

	const hasSpatialData = spatialQueryType === "bbox" ? !!rectangle : !!point;

	return (fetchMode === "spatial" ? hasSpatialData : true) && !isLoading;
});

export const hasMoreDataAtom = atom((get) => {
	const lastFetchedData = get(lastFetchedDataAtom);
	const isLoading = get(isLoadingAtom);

	return lastFetchedData
		? lastFetchedData.currentOffset < lastFetchedData.totalFeatures &&
				!isLoading
		: false;
});

// Indexable columns atom
export const indexableColumnsAtom = atom<Column[]>((get) => {
	const fcbMeta = get(fcbMetaAtom);
	if (!fcbMeta) return [];

	return fcbMeta.columns.filter((column) => column.attrIndex === true);
});
