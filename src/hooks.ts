import * as Cesium from "cesium";
import { Cartesian2 } from "cesium";
import { useState, useCallback, useRef, useMemo } from "react";
import { CesiumComponentRef } from "resium";
import { fetchFcb, getCjSeq } from "./api/fcb";
import proj4 from "proj4";
import { CjInfo } from "./components/cjpreviewer";

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

export type Props = {
  fcbUrl: string;
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

  // const calculateStats = (features: any[]) => {
  //   const roofHeights: number[] = [];
  //   let greenHouseCount = 0;
  //   let ahn3Ahn4ChangeCount = 0;
  //   let unsuccessCount = 0;
  //   let volumeSum = 0;
  //   let volumeCount = 0;
  //   let yearSum = 0;
  //   let yearCount = 0;

  //   let count = 0;
  //   features.forEach((feature) => {
  //     count++;
  //     if (count > 2) return;
  //     const cityObjects =
  //       feature.CityObjects instanceof Map
  //         ? Array.from(feature.CityObjects.values())
  //         : [];

  //     cityObjects.forEach((cityObject: any) => {
  //       console.log("cityObject", cityObject);
  //       // Convert Map to object if needed
  //       const attributes =
  //         cityObject.attributes instanceof Map
  //           ? Object.fromEntries(cityObject.attributes.values())
  //           : cityObject.attributes || {};

  //       console.log("attributes", attributes);

  //       // Roof height
  //       if ("b3_h_dak_50p" in attributes && attributes.b3_h_dak_50p !== null) {
  //         roofHeights.push(Number(attributes.b3_h_dak_50p));
  //       }

  //       // Green house/warehouse
  //       if (
  //         "b3_kas_warenhuis" in attributes &&
  //         Number(attributes.b3_kas_warenhuis) === 1
  //       ) {
  //         greenHouseCount++;
  //       }

  //       // AHN3/AHN4 change
  //       if (
  //         "b3_mutatie_ahn3_ahn4" in attributes &&
  //         Number(attributes.b3_mutatie_ahn3_ahn4) === 1
  //       ) {
  //         ahn3Ahn4ChangeCount++;
  //       }

  //       // Unsuccessful cases
  //       if ("b3_succes" in attributes && Number(attributes.b3_succes) === 0) {
  //         unsuccessCount++;
  //       }

  //       // Volume LOD2
  //       if (
  //         "b3_volume_lod22" in attributes &&
  //         attributes.b3_volume_lod22 !== null
  //       ) {
  //         volumeSum += Number(attributes.b3_volume_lod22);
  //         volumeCount++;
  //       }

  //       // Construction year
  //       if (
  //         "oorspronkelijkbouwjaar" in attributes &&
  //         attributes.oorspronkelijkbouwjaar !== null
  //       ) {
  //         yearSum += Number(attributes.oorspronkelijkbouwjaar);
  //         yearCount++;
  //       }
  //     });
  //   });

  //   // Calculate statistics
  //   return {
  //     num_total_features: 1115,
  //     num_selected_features: features.length,
  //     median_roof_height:
  //       roofHeights.length > 0
  //         ? roofHeights.sort((a, b) => a - b)[
  //             Math.floor(roofHeights.length / 2)
  //           ]
  //         : undefined,
  //     ratio_of_green_house_warehouse:
  //       features.length > 0 ? greenHouseCount / features.length : undefined,
  //     num_ahn3_ahn4_change: ahn3Ahn4ChangeCount,
  //     unsuccess_num: unsuccessCount,
  //     ave_volume_lod2: volumeCount > 0 ? volumeSum / volumeCount : undefined,
  //     ave_construction_year: yearCount > 0 ? yearSum / yearCount : undefined,
  //   };
  // };

  const handleFetchFcb = useCallback(async () => {
    if (!rectangle) return;
    setIsLoading(true);
    //convert lat lng to dutch coordinate system
    const [min, max] = rectToDegrees(rectangle);

    const minPoint = proj4("EPSG:4326", "EPSG:28992", min);
    const maxPoint = proj4("EPSG:4326", "EPSG:28992", max);
    const fetchResult = await fetchFcb(fcbUrl, [
      minPoint[0],
      minPoint[1],
      maxPoint[0],
      maxPoint[1],
    ]);
    const resultWithStats = {
      cj: fetchResult.cj,
      features: fetchResult.features.slice(0, 10),
      stats: {
        num_total_features: 1115,
        num_selected_features: fetchResult.meta.features_count,
      },
      // stats: calculateStats(fetchResult.features),
    };
    setResult(resultWithStats);
    setIsLoading(false);
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
    isLoading,
  };
};

export default useHooks;
