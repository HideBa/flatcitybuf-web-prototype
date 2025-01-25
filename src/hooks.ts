import * as Cesium from "cesium";
import { Cartesian2 } from "cesium";
import { useState, useCallback, useRef, useMemo } from "react";
import { CesiumComponentRef } from "resium";

type EventActionParams =
  | {
      position: Cartesian2;
    }
  | {
      startPosition: Cartesian2;
      endPosition: Cartesian2;
    };

const useHooks = () => {
  const viewerRef = useRef<CesiumComponentRef<Cesium.Viewer>>(null);
  const [firstPoint, setFirstPoint] = useState<Cesium.Cartesian3 | null>(null);
  const [currentPoint, setCurrentPoint] = useState<Cesium.Cartesian3 | null>(
    null
  );
  const [isDrawMode, setIsDrawMode] = useState(false);
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

  return {
    viewerRef,
    rectangle: isDrawing ? rectangleCallbackProperty : rectangle,
    isDrawing,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    toggleDrawMode,
    isDrawMode,
  };
};

export default useHooks;
