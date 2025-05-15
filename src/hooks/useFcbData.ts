import { fetchFcbMeta } from "@/api/fcb/meta";
import { fetchFcb, getCjSeq } from "@/api/fcb/query";
import type { AttributeQuery, Condition, SpatialQuery } from "@/api/fcb/types";
import type { CjInfo } from "@/components/cjpreviewer";
import {
	attributeConditionsAtom,
	fcbMetaAtom,
	featureLimitAtom,
	isLoadingAtom,
	lastFetchedDataAtom,
	pointAtom,
	rectangleAtom,
	spatialQueryTypeAtom,
} from "@/store";
import * as Cesium from "cesium";
import { useAtom } from "jotai";
import proj4 from "proj4";
import { useCallback, useEffect, useMemo, useState } from "react";

// Define coordinate systems
proj4.defs([
	["EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs"],
	[
		"EPSG:28992",
		"+proj=sterea +lat_0=52.1561605555556 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +towgs84=593.16,26.15,478.54,-6.3239,-0.5008,-5.5487,4.0775 +units=m +no_defs +type=crs",
	],
]);

type Props = {
	fcbUrl: string;
};

type RectToDegrees = (rect: Cesium.Rectangle) => [number[], number[]];
type PointToDegrees = (point: Cesium.Cartesian3) => number[];

// Extended CjInfo with stats for UI display
type ExtendedCjInfo = {
	type?: string;
	features: unknown[];
	cj?: unknown;
	meta: {
		features_count: number;
		fetched_features_count: number;
	};
	stats: {
		num_total_features: number;
		num_selected_features: number;
	};
};

export const useFcbData = ({ fcbUrl }: Props) => {
	const [rectangle] = useAtom(rectangleAtom);
	const [point] = useAtom(pointAtom);
	const [spatialQueryType] = useAtom(spatialQueryTypeAtom);
	const [, setIsLoading] = useAtom(isLoadingAtom);
	const [lastFetchedData, setLastFetchedData] = useAtom(lastFetchedDataAtom);
	const [featureLimit] = useAtom(featureLimitAtom);
	const [attributeConditions] = useAtom(attributeConditionsAtom);
	const [, setFcbMeta] = useAtom(fcbMetaAtom);
	const [result, setResult] = useState<ExtendedCjInfo | null>(null);

	const rectToDegrees = useCallback<RectToDegrees>((rect) => {
		const west = Cesium.Math.toDegrees(rect.west);
		const south = Cesium.Math.toDegrees(rect.south);
		const east = Cesium.Math.toDegrees(rect.east);
		const north = Cesium.Math.toDegrees(rect.north);

		return [
			[west, south],
			[east, north],
		];
	}, []);

	const pointToDegrees = useCallback<PointToDegrees>((cartesian) => {
		const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
		const lon = Cesium.Math.toDegrees(cartographic.longitude);
		const lat = Cesium.Math.toDegrees(cartographic.latitude);

		// Convert to Dutch coordinate system
		return proj4("EPSG:4326", "EPSG:28992", [lon, lat]);
	}, []);

	const handleFetchFcb = useCallback(
		async (offset = 0, limit = featureLimit) => {
			if (!rectangle) return;
			setIsLoading(true);

			// Convert lat lng to Dutch coordinate system
			const [min, max] = rectToDegrees(rectangle);
			const minPoint = proj4("EPSG:4326", "EPSG:28992", min);
			const maxPoint = proj4("EPSG:4326", "EPSG:28992", max);

			const bbox = [minPoint[0], minPoint[1], maxPoint[0], maxPoint[1]];
			const query: SpatialQuery = {
				type: "bbox",
				bbox,
			};
			console.log("query", query);
			// Use the updated fetchFcb with our efficient reader
			const fetchResult = await fetchFcb(fcbUrl, query, offset, limit);

			// Update state with pagination info
			setLastFetchedData({
				type: "spatial",
				spatialQueryType: "bbox",
				bbox,
				totalFeatures: fetchResult.meta.features_count,
				currentOffset: offset + fetchResult.features.length,
			});

			const resultWithStats: ExtendedCjInfo = {
				...fetchResult,
				stats: {
					num_total_features: result?.meta.features_count ?? 0,
					num_selected_features: result?.features.length ?? 0,
				},
			};

			setResult(resultWithStats);
			setIsLoading(false);
		},
		[
			featureLimit,
			rectangle,
			setIsLoading,
			rectToDegrees,
			fcbUrl,
			setLastFetchedData,
			result?.meta.features_count,
			result?.features.length,
		],
	);

	const handleFetchFcbWithPoint = useCallback(
		async (offset = 0, limit = featureLimit) => {
			console.log("point --", point);
			if (!point) return;
			setIsLoading(true);

			// Convert Cartesian3 point to the Dutch coordinate system
			const dutchCoords = pointToDegrees(point);

			console.log("dutchCoords --", dutchCoords);

			// Use the fetchFcbWithPoint with our efficient reader
			const query: SpatialQuery = {
				type: spatialQueryType,
				point: dutchCoords,
			};
			console.log("fetch num---: ", featureLimit);
			const fetchResult = await fetchFcb(fcbUrl, query, offset, limit);

			// Update state with pagination info
			setLastFetchedData({
				type: "spatial",
				spatialQueryType,
				point: dutchCoords,
				totalFeatures: fetchResult.meta.features_count,
				currentOffset: offset + fetchResult.features.length,
			});

			const resultWithStats: ExtendedCjInfo = {
				...fetchResult,
				stats: {
					num_total_features: result?.meta.features_count ?? 0,
					num_selected_features: result?.features.length ?? 0,
				},
			};

			setResult(resultWithStats);
			setIsLoading(false);
		},
		[
			featureLimit,
			point,
			spatialQueryType,
			setIsLoading,
			pointToDegrees,
			fcbUrl,
			setLastFetchedData,
			result?.meta.features_count,
			result?.features.length,
		],
	);

	const handleFetchFcbWithAttributeConditions = useCallback(
		async (
			attrCond: Condition[] = attributeConditions,
			offset = 0,
			limit = featureLimit,
		) => {
			setIsLoading(true);

			// Use the updated attribute conditions fetch with our efficient reader
			const query: AttributeQuery = {
				type: "attr",
				conditions: attrCond,
			};
			const fetchResult = await fetchFcb(fcbUrl, query, offset, limit);

			// Update state with pagination info
			setLastFetchedData({
				type: "attribute",
				attributes: attrCond,
				totalFeatures: fetchResult.meta.features_count,
				currentOffset: offset + fetchResult.features.length,
			});

			const resultWithStats: ExtendedCjInfo = {
				...fetchResult,
				stats: {
					num_total_features: result?.meta.features_count ?? 0,
					num_selected_features: result?.meta.fetched_features_count ?? 0,
				},
			};

			setResult(resultWithStats);
			setIsLoading(false);
		},
		[
			attributeConditions,
			featureLimit,
			setIsLoading,
			fcbUrl,
			setLastFetchedData,
			result?.meta.features_count,
			result?.meta.fetched_features_count,
		],
	);

	const loadNextBatch = useCallback(
		async (offset: number, limit = featureLimit) => {
			if (!lastFetchedData) return;

			setIsLoading(true);

			if (lastFetchedData.type === "spatial") {
				if (!lastFetchedData.spatialQueryType) return;
				const query: SpatialQuery = {
					type: lastFetchedData.spatialQueryType,
					bbox: lastFetchedData.bbox,
					point: lastFetchedData.point,
				};
				// Use the cached reader state through the closure
				const fetchResult = await fetchFcb(fcbUrl, query, offset, limit);

				// Update state with new pagination info
				setLastFetchedData({
					...lastFetchedData,
					currentOffset: offset + fetchResult.features.length,
				});

				const resultWithStats: ExtendedCjInfo = {
					...fetchResult,
					stats: {
						num_total_features: fetchResult.meta.features_count,
						num_selected_features: fetchResult.meta.fetched_features_count,
					},
				};
				setResult(resultWithStats);
			} else if (lastFetchedData.type === "attribute") {
				if (!lastFetchedData.attributes) return;
				// Use the cached reader state through the closure
				const query: AttributeQuery = {
					type: "attr",
					conditions: lastFetchedData.attributes,
				};
				const fetchResult = await fetchFcb(fcbUrl, query, offset, limit);

				// Update state with new pagination info
				setLastFetchedData({
					...lastFetchedData,
					currentOffset: offset + fetchResult.features.length,
				});

				const resultWithStats: ExtendedCjInfo = {
					...fetchResult,
					stats: {
						num_total_features: result?.meta.features_count ?? 0,
						num_selected_features: result?.meta.fetched_features_count ?? 0,
					},
				};
				setResult(resultWithStats);
			}

			setIsLoading(false);
		},
		[
			featureLimit,
			lastFetchedData,
			setIsLoading,
			fcbUrl,
			setLastFetchedData,
			result?.meta.features_count,
			result?.meta.fetched_features_count,
		],
	);

	const handleCjSeqDownload = useCallback(async () => {
		if (!rectangle) return;
		if (lastFetchedData?.type === "spatial") {
			if (!lastFetchedData.spatialQueryType) return;
			const query = {
				type: lastFetchedData.spatialQueryType,
				bbox: lastFetchedData.bbox,
				point: lastFetchedData.point,
			};
			const cjSeq = await getCjSeq(fcbUrl, query);
			const url = URL.createObjectURL(cjSeq);
			window.open(url, "_blank");
		} else if (lastFetchedData?.type === "attribute") {
			if (!lastFetchedData.attributes) return;
			const query: AttributeQuery = {
				type: "attr",
				conditions: lastFetchedData.attributes,
			};
			const cjSeq = await getCjSeq(fcbUrl, query);
			const url = URL.createObjectURL(cjSeq);
			window.open(url, "_blank");
		}
	}, [
		fcbUrl,
		lastFetchedData?.attributes,
		lastFetchedData?.bbox,
		lastFetchedData?.point,
		lastFetchedData?.spatialQueryType,
		lastFetchedData?.type,
		rectangle,
	]);

	// Fetch metadata on mount
	useEffect(() => {
		const fetchMetadata = async () => {
			try {
				const meta = await fetchFcbMeta(fcbUrl);
				setFcbMeta(meta);
			} catch (error) {
				console.error("Error fetching FCB metadata:", error);
			}
		};

		fetchMetadata();
	}, [fcbUrl, setFcbMeta]);

	const cj_result: CjInfo = useMemo(() => {
		return {
			features: result?.features ?? [],
			cj: result?.cj ?? {},
			stats: {
				num_total_features: result?.meta.features_count ?? 0,
				num_selected_features: result?.meta.fetched_features_count ?? 0,
				median_roof_height: 0, //TODO: Add this later
				ratio_of_green_house_warehouse: 0,
				num_ahn3_ahn4_change: 0,
				unsuccess_num: 0,
				ave_volume_lod2: 0,
				ave_construction_year: 0,
			},
		};
	}, [result]);

	return {
		result: cj_result,
		handleFetchFcb,
		handleFetchFcbWithPoint,
		handleFetchFcbWithAttributeConditions,
		loadNextBatch,
		handleCjSeqDownload,
	};
};
