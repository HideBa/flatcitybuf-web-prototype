import * as Cesium from "cesium";
import { useAtom } from "jotai";
import { useCallback, useMemo, useRef, useState } from "react";
import type { CesiumComponentRef } from "resium";
import { rectangleAtom, pointAtom, spatialQueryTypeAtom } from "@/store";

// Additional helper types
type MouseEvent = {
  position?: Cesium.Cartesian2;
  startPosition?: Cesium.Cartesian2;
  endPosition?: Cesium.Cartesian2;
  [key: string]: unknown;
};

export const useCesiumControls = () => {
  const viewerRef = useRef<CesiumComponentRef<Cesium.Viewer>>(null);
  const [firstPoint, setFirstPoint] = useState<Cesium.Cartesian3 | null>(null);
  const [currentPoint, setCurrentPoint] = useState<Cesium.Cartesian3 | null>(
    null
  );
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [, setRectangle] = useAtom(rectangleAtom);
  const [, setPoint] = useAtom(pointAtom);
  const [spatialQueryType] = useAtom(spatialQueryTypeAtom);

  const handleToggleDrawMode = useCallback(() => {
    setIsDrawMode((prev) => !prev);
  }, []);

  // Determine if we're in point or rectangle mode
  const isPointMode =
    spatialQueryType === "pointIntersects" ||
    spatialQueryType === "pointNearest";

  // Get intermediate rectangle for drawing preview
  const intermediateRectangle = useMemo(() => {
    if (!firstPoint || !currentPoint) return undefined;

    const carto1 = Cesium.Cartographic.fromCartesian(firstPoint);
    const carto2 = Cesium.Cartographic.fromCartesian(currentPoint);

    return Cesium.Rectangle.fromCartographicArray([
      new Cesium.Cartographic(carto1.longitude, carto1.latitude),
      new Cesium.Cartographic(carto2.longitude, carto2.latitude),
    ]);
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
  }, []);

  const handleMouseDown = useCallback(
    (event: MouseEvent) => {
      if (!isDrawMode || !viewerRef.current?.cesiumElement || isPointMode)
        return;

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
    [isDrawMode, isPointMode]
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (
        !isDrawMode ||
        !isDrawing ||
        !viewerRef.current?.cesiumElement ||
        isPointMode
      )
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
    [isDrawMode, isDrawing, isPointMode]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDrawMode || !isDrawing || isPointMode) return;

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
  }, [
    firstPoint,
    currentPoint,
    isDrawMode,
    isDrawing,
    isPointMode,
    setRectangle,
  ]);

  // Handle point clicking for point-based spatial queries
  const handlePointClick = useCallback(
    (event: MouseEvent) => {
      if (!isDrawMode || !isPointMode || !viewerRef.current?.cesiumElement)
        return;

      const position = event.position;
      if (!position) return;

      const viewer = viewerRef.current.cesiumElement;
      const cartesian = viewer.scene.pickPosition(position);
      if (cartesian) {
        setPoint(cartesian);
      }
    },
    [isDrawMode, isPointMode, setPoint]
  );

  return {
    viewerRef,
    isDrawing,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,

    toggleDrawMode,
    isDrawMode,
    handleToggleDrawMode,
    intermediateRectangle,
    handlePointClick,
  };
};
