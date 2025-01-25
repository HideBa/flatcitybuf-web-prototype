import * as Cesium from "cesium";
import { Cartesian2 } from "cesium";
import { useState, useCallback, useRef, useMemo } from "react";
import { CesiumComponentRef } from "resium";
import { fetchFcb, getCjSeq } from "./api/fcb";
import proj4 from "proj4";

// Define coordinate systems
proj4.defs([
  ["EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs"],
  [
    "EPSG:28992",
    "+proj=sterea +lat_0=52.1561605555556 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +towgs84=593.16,26.15,478.54,-6.3239,-0.5008,-5.5487,4.0775 +units=m +no_defs +type=crs",
  ],
]);

type EventActionParams =
  | {
      position: Cartesian2;
    }
  | {
      startPosition: Cartesian2;
      endPosition: Cartesian2;
    };

type Props = {
  fcbUrl: string;
};

type CjInfo = {
  features: unknown[];
  cj: unknown;
  stats: {
    num_total_features: number;
    num_selected_features: number;
  };
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
    (event: EventActionParams) => {
      if (!isDrawMode || !viewerRef.current?.cesiumElement) return;
      if (!("position" in event)) return;

      setIsDrawing(true);
      const viewer = viewerRef.current.cesiumElement;
      const cartesian = viewer.scene.pickPosition(event.position);
      if (cartesian) {
        setFirstPoint(cartesian);
      }
    },
    [isDrawMode]
  );

  const handleMouseMove = useCallback(
    (event: EventActionParams) => {
      if (!isDrawMode || !firstPoint || !viewerRef.current?.cesiumElement)
        return;
      if (!("endPosition" in event)) return;
      const viewer = viewerRef.current.cesiumElement;
      const cartesian = viewer.scene.pickPosition(event.endPosition);
      if (cartesian) {
        setCurrentPoint(cartesian);
      }
    },
    [isDrawMode, firstPoint]
  );

  const handleMouseUp = useCallback(
    (event: EventActionParams) => {
      if (!isDrawMode || !firstPoint || !viewerRef.current?.cesiumElement)
        return;
      if (!("position" in event)) return;
      const viewer = viewerRef.current.cesiumElement;
      const cartesian = viewer.scene.pickPosition(event.position);
      setRectangle(() => {
        const carto1 = Cesium.Cartographic.fromCartesian(firstPoint);
        const carto2 = Cesium.Cartographic.fromCartesian(cartesian);

        return Cesium.Rectangle.fromCartographicArray([
          new Cesium.Cartographic(carto1.longitude, carto1.latitude),
          new Cesium.Cartographic(carto2.longitude, carto2.latitude),
        ]);
      });
      if (cartesian) {
        setCurrentPoint(cartesian);
        setIsDrawing(false);
        setFirstPoint(null);
      }
    },
    [isDrawMode, firstPoint]
  );

  const rectToDegrees = useCallback((rect: Cesium.Rectangle) => {
    return [
      [Cesium.Math.toDegrees(rect.west), Cesium.Math.toDegrees(rect.south)],
      [Cesium.Math.toDegrees(rect.east), Cesium.Math.toDegrees(rect.north)],
    ];
  }, []);

  const handleFetchFcb = useCallback(async () => {
    if (!rectangle) return;
    //convert lat lng to dutch coordinate system
    const [min, max] = rectToDegrees(rectangle);

    const minPoint = proj4("EPSG:4326", "EPSG:28992", min);
    const maxPoint = proj4("EPSG:4326", "EPSG:28992", max);
    const result = await fetchFcb(fcbUrl, [
      minPoint[0],
      minPoint[1],
      maxPoint[0],
      maxPoint[1],
    ]);
    setResult(result);
  }, [fcbUrl, rectToDegrees, rectangle]);

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
    result,
    handleCjSeqDownload,
  };
};

export default useHooks;
