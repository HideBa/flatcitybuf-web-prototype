import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import * as Cesium from "cesium";
import {
  useCesium,
  Entity,
  RectangleGraphics,
  ScreenSpaceEventHandler,
  ScreenSpaceEvent,
  CesiumComponentRef,
} from "resium";
import { Cartesian2 } from "cesium";

type EventActionParams =
  | {
      position: Cartesian2;
    }
  | {
      startPosition: Cartesian2;
      endPosition: Cartesian2;
    };

type RectangleDrawerProps = {
  viewerRef: React.RefObject<CesiumComponentRef<Cesium.Viewer>>;
};

export const RectangleDrawer = ({ viewerRef }: RectangleDrawerProps) => {
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [firstPoint, setFirstPoint] = useState<Cesium.Cartesian3 | null>(null);
  const [rectangle, setRectangle] = useState<Cesium.Rectangle | null>(null);
  const [isDrawingComplete, setIsDrawingComplete] = useState(false);

  const createRectangleFromPoints = useCallback(
    (point1: Cesium.Cartesian3, point2: Cesium.Cartesian3) => {
      const carto1 = Cesium.Cartographic.fromCartesian(point1);
      const carto2 = Cesium.Cartographic.fromCartesian(point2);

      const west = Math.min(carto1.longitude, carto2.longitude);
      const east = Math.max(carto1.longitude, carto2.longitude);
      const south = Math.min(carto1.latitude, carto2.latitude);
      const north = Math.max(carto1.latitude, carto2.latitude);

      return new Cesium.Rectangle(west, south, east, north);
    },
    []
  );

  const handleMouseDown = useCallback(
    (event: { position: Cartesian2 }) => {
      // console.log("down event--------", event);
      if (!isDrawMode || !viewerRef.current?.cesiumElement) return;
      console.log("down event--------", event);

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
      if (!firstPoint || !isDrawMode || !viewerRef.current?.cesiumElement)
        return;

      console.log("move event--------", event);

      console.log("first point--------", firstPoint);
      const viewer = viewerRef.current.cesiumElement;
      const cartesian = viewer.scene.pickPosition(event.endPosition);
      if (cartesian) {
        const tempRectangle = createRectangleFromPoints(firstPoint, cartesian);
        setRectangle(tempRectangle);
      }
    },
    [firstPoint, isDrawMode, createRectangleFromPoints]
  );

  const handleMouseUp = useCallback(
    (event: EventActionParams) => {
      console.log("up event--------", event);
      if (!firstPoint || !isDrawMode || !viewerRef.current?.cesiumElement)
        return;

      const viewer = viewerRef.current.cesiumElement;
      const cartesian = viewer.scene.pickPosition(event.position);
      if (cartesian) {
        const finalRectangle = createRectangleFromPoints(firstPoint, cartesian);
        setRectangle(finalRectangle);
        setIsDrawingComplete(true);
        setIsDrawMode(false);
        setFirstPoint(null);
      }
    },
    [firstPoint, isDrawMode, createRectangleFromPoints]
  );

  return (
    <>
      <Button
        className="absolute top-4 left-4 z-10"
        onClick={() => {
          setIsDrawMode(true);
          setIsDrawingComplete(false);
        }}
        variant={isDrawMode ? "secondary" : "default"}
      >
        Draw Rectangle ({isDrawMode ? "on" : "off"})
      </Button>

      <ScreenSpaceEventHandler>
        <ScreenSpaceEvent
          type={Cesium.ScreenSpaceEventType.LEFT_DOWN}
          action={handleMouseDown}
        />
        <ScreenSpaceEvent
          type={Cesium.ScreenSpaceEventType.MOUSE_MOVE}
          action={handleMouseMove}
        />
        <ScreenSpaceEvent
          type={Cesium.ScreenSpaceEventType.LEFT_UP}
          action={handleMouseUp}
        />
      </ScreenSpaceEventHandler>

      {rectangle && (
        <Entity>
          <RectangleGraphics
            coordinates={rectangle}
            material={
              isDrawingComplete
                ? Cesium.Color.BLUE
                : Cesium.Color.BLUE.withAlpha(0.5)
            }
            outline
            outlineColor={Cesium.Color.WHITE}
          />
        </Entity>
      )}
    </>
  );
};

export default RectangleDrawer;
