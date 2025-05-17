import type {
	Column,
	Condition,
	FcbMeta,
	SpatialQueryType,
} from "@/api/fcb/types";
import * as Cesium from "cesium";
import { atom } from "jotai";
import proj4 from "proj4";

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
export const dataExtentAtom = atom<Cesium.Rectangle | null>((get) => {
	const fcbMeta = get(fcbMetaAtom);
	if (!fcbMeta) return null;

	// Define coordinate systems
	proj4.defs([
		["EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs"],
		[
			"EPSG:28992",
			"+proj=sterea +lat_0=52.1561605555556 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +towgs84=593.16,26.15,478.54,-6.3239,-0.5008,-5.5487,4.0775 +units=m +no_defs +type=crs",
		],
	]);
	const min = proj4("EPSG:28992", "EPSG:4326", [
		fcbMeta.dataExtent.minX,
		fcbMeta.dataExtent.minY,
	]);
	const max = proj4("EPSG:28992", "EPSG:4326", [
		fcbMeta.dataExtent.maxX,
		fcbMeta.dataExtent.maxY,
	]);

	return Cesium.Rectangle.fromDegrees(min[0], min[1], max[0], max[1]);
});

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
