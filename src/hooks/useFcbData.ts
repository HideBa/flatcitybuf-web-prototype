import { useCallback, useState } from "react";
import { useAtom } from "jotai";
import * as Cesium from "cesium";
import proj4 from "proj4";
import {
  fetchFcb,
  fetchFcbWithAttributeConditions,
  getCjSeq,
  type CjInfo,
} from "../api/fcb";
import {
  attributeConditionsAtom,
  featureLimitAtom,
  isLoadingAtom,
  lastFetchedDataAtom,
  rectangleAtom,
} from "@/store";
import { Condition } from "@/feature/attribute/hooks";

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

// Extended CjInfo with stats for UI display
interface ExtendedCjInfo extends CjInfo {
  stats: {
    num_total_features: number;
    num_selected_features: number;
  };
}

export const useFcbData = ({ fcbUrl }: Props) => {
  const [rectangle] = useAtom(rectangleAtom);
  const [, setIsLoading] = useAtom(isLoadingAtom);
  const [lastFetchedData, setLastFetchedData] = useAtom(lastFetchedDataAtom);
  const [featureLimit] = useAtom(featureLimitAtom);
  const [attributeConditions] = useAtom(attributeConditionsAtom);
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

  const handleFetchFcb = useCallback(
    async (offset = 0, limit = featureLimit) => {
      if (!rectangle) return;
      setIsLoading(true);

      // Convert lat lng to Dutch coordinate system
      const [min, max] = rectToDegrees(rectangle);
      const minPoint = proj4("EPSG:4326", "EPSG:28992", min);
      const maxPoint = proj4("EPSG:4326", "EPSG:28992", max);

      const bbox = [minPoint[0], minPoint[1], maxPoint[0], maxPoint[1]];

      // Use the updated fetchFcb with our efficient reader
      const fetchResult = await fetchFcb(fcbUrl, bbox, offset, limit);

      // Update state with pagination info
      setLastFetchedData({
        type: "bbox",
        bbox,
        totalFeatures: fetchResult.meta.features_count,
        currentOffset: offset + fetchResult.features.length,
      });

      const resultWithStats: ExtendedCjInfo = {
        ...fetchResult,
        stats: {
          num_total_features: 1115,
          num_selected_features: fetchResult.meta.features_count,
        },
      };

      setResult(resultWithStats);
      setIsLoading(false);
    },
    [
      fcbUrl,
      rectangle,
      rectToDegrees,
      setIsLoading,
      setLastFetchedData,
      featureLimit,
    ]
  );

  const handleFetchFcbWithAttributeConditions = useCallback(
    async (
      attrCond: Condition[] = attributeConditions,
      offset = 0,
      limit = featureLimit
    ) => {
      setIsLoading(true);

      // Use the updated attribute conditions fetch with our efficient reader
      const fetchResult = await fetchFcbWithAttributeConditions(
        fcbUrl,
        attrCond,
        offset,
        limit
      );

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
          num_total_features: 1115,
          num_selected_features: fetchResult.meta.features_count,
        },
      };

      setResult(resultWithStats);
      setIsLoading(false);
    },
    [
      fcbUrl,
      setIsLoading,
      setLastFetchedData,
      attributeConditions,
      featureLimit,
    ]
  );

  const loadNextBatch = useCallback(
    async (offset: number, limit = featureLimit) => {
      if (!lastFetchedData) return;

      setIsLoading(true);

      if (lastFetchedData.type === "bbox" && lastFetchedData.bbox) {
        // Use the cached reader state through the closure
        const fetchResult = await fetchFcb(
          fcbUrl,
          lastFetchedData.bbox,
          offset,
          limit
        );

        // Update state with new pagination info
        setLastFetchedData({
          ...lastFetchedData,
          currentOffset: offset + fetchResult.features.length,
        });

        const resultWithStats: ExtendedCjInfo = {
          ...fetchResult,
          stats: {
            num_total_features: 1115,
            num_selected_features: lastFetchedData.totalFeatures,
          },
        };
        setResult(resultWithStats);
      } else if (
        lastFetchedData.type === "attribute" &&
        lastFetchedData.attributes
      ) {
        // Use the cached reader state through the closure
        const fetchResult = await fetchFcbWithAttributeConditions(
          fcbUrl,
          lastFetchedData.attributes,
          offset,
          limit
        );

        // Update state with new pagination info
        setLastFetchedData({
          ...lastFetchedData,
          currentOffset: offset + fetchResult.features.length,
        });

        const resultWithStats: ExtendedCjInfo = {
          ...fetchResult,
          stats: {
            num_total_features: 1115,
            num_selected_features: lastFetchedData.totalFeatures,
          },
        };
        setResult(resultWithStats);
      }

      setIsLoading(false);
    },
    [fcbUrl, lastFetchedData, setIsLoading, setLastFetchedData, featureLimit]
  );

  const handleCjSeqDownload = useCallback(async () => {
    if (!rectangle) return;
    const [min, max] = rectToDegrees(rectangle);

    const minPoint = proj4("EPSG:4326", "EPSG:28992", min);
    const maxPoint = proj4("EPSG:4326", "EPSG:28992", max);
    const cjSeq = await getCjSeq(fcbUrl, [
      minPoint[0],
      minPoint[1],
      maxPoint[0],
      maxPoint[1],
    ]);
    const url = URL.createObjectURL(cjSeq);
    window.open(url, "_blank");
  }, [fcbUrl, rectangle, rectToDegrees]);

  return {
    result,
    handleFetchFcb,
    handleFetchFcbWithAttributeConditions,
    loadNextBatch,
    handleCjSeqDownload,
  };
};
