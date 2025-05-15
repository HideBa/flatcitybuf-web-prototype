import * as Cesium from "cesium";
import type { Cartesian2 } from "cesium";
import { useState, useCallback, useRef, useMemo } from "react";
import type { CesiumComponentRef } from "resium";
import { fetchFcb, getCjSeq } from "./api/fcb/query";
import proj4 from "proj4";
import type { CjInfo } from "./components/cjpreviewer";
import type { Condition } from "./feature/attribute/hooks";
import type { AttributeQuery, FcbQuery } from "./api/fcb/types";
// Define coordinate systems
proj4.defs([
  ["EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs"],
  [
    "EPSG:28992",
    "+proj=sterea +lat_0=52.1561605555556 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +towgs84=593.16,26.15,478.54,-6.3239,-0.5008,-5.5487,4.0775 +units=m +no_defs +type=crs",
  ],
]);

// Additional helper types
type MouseEvent = {
  position?: Cartesian2;
  startPosition?: Cartesian2;
  endPosition?: Cartesian2;
  [key: string]: unknown;
};

type RectToDegrees = (rect: Cesium.Rectangle) => [number[], number[]];

export type Props = {
  fcbUrl: string;
};

// Type for the last fetched data
export type LastFetchedData = {
  type: "bbox" | "attribute";
  bbox?: number[];
  attributes?: Condition[];
  totalFeatures: number;
  currentOffset: number;
};

const useHooks = ({ fcbUrl }: Props) => {
  const [result, setResult] = useState<CjInfo | null>(null);
  const viewerRef = useRef<CesiumComponentRef<Cesium.Viewer>>(null);
  const [firstPoint, setFirstPoint] = useState<Cesium.Cartesian3 | null>(null);
  const [currentPoint, setCurrentPoint] = useState<Cesium.Cartesian3 | null>(
    null
  );
  const [isDrawMode, setIsDrawMode] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const [rectangle, setRectangle] = useState<Cesium.Rectangle | null>(null);
  const rectangleCallbackProperty = useMemo(() => {
    return new Cesium.CallbackProperty(() => {
      if (!firstPoint || !currentPoint) return undefined;

      const carto1 = Cesium.Cartographic.fromCartesian(firstPoint);
      const carto2 = Cesium.Cartographic.fromCartesian(currentPoint);

      return Cesium.Rectangle.fromCartographicArray([
        new Cesium.Cartographic(carto1.longitude, carto1.latitude),
        new Cesium.Cartographic(carto2.longitude, carto2.latitude),
      ]);
    }, false);
  }, [firstPoint, currentPoint]);
  const [isLoading, setIsLoading] = useState(false);

  // Store the last fetched data for use with pagination
  const [lastFetchedData, setLastFetchedData] =
    useState<LastFetchedData | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const toggleDrawMode = useCallback(() => {
    setIsDrawMode((prev) => {
      if (prev) {
        setCurrentPoint(null);
        setIsDrawing(false);
        setFirstPoint(null);
      }
      return !prev;
    });
  }, [setIsDrawMode]);

  const handleMouseDown = useCallback(
    (event: MouseEvent) => {
      if (!isDrawMode || !viewerRef.current?.cesiumElement) return;
      // Use position if available
      const position = event.position || event.startPosition;
      if (!position) return;

      setIsDrawing(true);
      const viewer = viewerRef.current.cesiumElement;
      const cartesian = viewer.scene.pickPosition(position);
      if (cartesian) {
        setFirstPoint(cartesian);
      }
    },
    [isDrawMode]
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!isDrawMode || !isDrawing || !viewerRef.current?.cesiumElement)
        return;
      // Use endPosition if available, fallback to position
      const position = event.endPosition || event.position;
      if (!position) return;

      const viewer = viewerRef.current.cesiumElement;
      const cartesian = viewer.scene.pickPosition(position);
      if (cartesian) {
        setCurrentPoint(cartesian);
      }
    },
    [isDrawMode, isDrawing]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDrawMode || !isDrawing) return;

    setIsDrawing(false);
    if (firstPoint && currentPoint) {
      const carto1 = Cesium.Cartographic.fromCartesian(firstPoint);
      const carto2 = Cesium.Cartographic.fromCartesian(currentPoint);

      const rectangle = Cesium.Rectangle.fromCartographicArray([
        new Cesium.Cartographic(carto1.longitude, carto1.latitude),
        new Cesium.Cartographic(carto2.longitude, carto2.latitude),
      ]);

      setRectangle(rectangle);
    }
  }, [firstPoint, currentPoint, isDrawMode, isDrawing]);

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
    async (offset = 0, limit = 10) => {
      if (!rectangle) return;
      setIsLoading(true);

      // Convert lat lng to Dutch coordinate system
      const [min, max] = rectToDegrees(rectangle);
      const minPoint = proj4("EPSG:4326", "EPSG:28992", min);
      const maxPoint = proj4("EPSG:4326", "EPSG:28992", max);

      const bbox = [minPoint[0], minPoint[1], maxPoint[0], maxPoint[1]];
      const query: FcbQuery = {
        type: "bbox",
        bbox,
      };

      // Use the updated fetchFcb with our efficient reader
      const fetchResult = await fetchFcb(fcbUrl, query, offset, limit);

      // Update state with pagination info
      setLastFetchedData({
        type: "bbox",
        bbox,
        totalFeatures: fetchResult.meta.features_count,
        currentOffset: offset + fetchResult.features.length,
      });

      const resultWithStats = {
        cj: fetchResult.cj,
        features: fetchResult.features,
        stats: {
          num_total_features: fetchResult.meta.features_count,
          num_selected_features: fetchResult.meta.fetched_features_count,
        },
      };

      setResult(resultWithStats);
      setIsLoading(false);
    },
    [fcbUrl, rectToDegrees, rectangle]
  );

  const handleFetchFcbWithAttributeConditions = useCallback(
    async (attrCond: Condition[], offset = 0, limit = 10) => {
      setIsLoading(true);

      const query: AttributeQuery = {
        type: "attr",
        conditions: attrCond,
      };

      // Use the updated attribute conditions fetch with our efficient reader
      const fetchResult = await fetchFcb(fcbUrl, query, offset, limit);

      // Update state with pagination info
      setLastFetchedData({
        type: "attribute",
        attributes: attrCond,
        totalFeatures: fetchResult.meta.features_count,
        currentOffset: offset + fetchResult.features.length,
      });

      const resultWithStats = {
        cj: fetchResult.cj,
        features: fetchResult.features,
        stats: {
          num_total_features: fetchResult.meta.features_count,
          num_selected_features: fetchResult.meta.fetched_features_count,
        },
      };

      setResult(resultWithStats);
      setIsLoading(false);
    },
    [fcbUrl]
  );

  const loadNextBatch = useCallback(
    async (offset: number, limit: number) => {
      if (!lastFetchedData) return;

      setIsLoading(true);

      if (lastFetchedData.type === "bbox" && lastFetchedData.bbox) {
        // Use the cached reader state through the closure
        const query: FcbQuery = {
          type: "bbox",
          bbox: lastFetchedData.bbox,
        };
        const fetchResult = await fetchFcb(fcbUrl, query, offset, limit);

        // Update state with new pagination info
        setLastFetchedData({
          ...lastFetchedData,
          currentOffset: offset + fetchResult.features.length,
        });

        const resultWithStats = {
          cj: fetchResult.cj,
          features: fetchResult.features,
          stats: {
            num_total_features: fetchResult.meta.features_count,
            num_selected_features: fetchResult.meta.fetched_features_count,
          },
        };
        setResult(resultWithStats);
      } else if (
        lastFetchedData.type === "attribute" &&
        lastFetchedData.attributes
      ) {
        const query: AttributeQuery = {
          type: "attr",
          conditions: lastFetchedData.attributes,
        };
        // Use the cached reader state through the closure
        const fetchResult = await fetchFcb(fcbUrl, query, offset, limit);

        // Update state with new pagination info
        setLastFetchedData({
          ...lastFetchedData,
          currentOffset: offset + fetchResult.features.length,
        });

        const resultWithStats = {
          cj: fetchResult.cj,
          features: fetchResult.features,
          stats: {
            num_total_features: fetchResult.meta.features_count,
            num_selected_features: fetchResult.meta.fetched_features_count,
          },
        };
        setResult(resultWithStats);
      }

      setIsLoading(false);
    },
    [fcbUrl, lastFetchedData]
  );

  const handleCjSeqDownload = useCallback(async () => {
    if (!rectangle) return;
    const [min, max] = rectToDegrees(rectangle);

    const minPoint = proj4("EPSG:4326", "EPSG:28992", min);
    const maxPoint = proj4("EPSG:4326", "EPSG:28992", max);
    // TODO: add flexible donwload
    const query: FcbQuery = {
      type: "bbox",
      bbox: [minPoint[0], minPoint[1], maxPoint[0], maxPoint[1]],
    };
    const cjSeq = await getCjSeq(fcbUrl, query);
    const url = URL.createObjectURL(cjSeq);
    window.open(url, "_blank");
  }, [fcbUrl, rectToDegrees, rectangle]);

  return {
    viewerRef,
    rectangle: isDrawing ? rectangleCallbackProperty : rectangle,
    isDrawing,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    toggleDrawMode,
    isDrawMode,
    handleFetchFcb,
    handleFetchFcbWithAttributeConditions,
    loadNextBatch,
    result,
    handleCjSeqDownload,
    isLoading,
    lastFetchedData,
  };
};

export default useHooks;
