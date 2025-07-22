import type { CjInfo } from "@/components/cjpreviewer";
import * as Cesium from "cesium";
import { useEffect, useMemo, useRef } from "react";
import { Entity } from "resium";
import { convertCityJSONFeaturesToCesiumEntities } from "./geometryConverter";

interface FCBVisualizationProps {
	data?: CjInfo;
	visible?: boolean;
	heightMultiplier?: number;
}

export const FCBVisualization = ({
	data,
	visible = true,
	heightMultiplier = 1.0,
}: FCBVisualizationProps) => {
	const entitiesRef = useRef<Cesium.Entity[]>([]);

	// Convert CityJSON features to Cesium entities
	const cesiumEntities = useMemo(() => {
		if (!data?.features || data.features.length === 0) {
			return [];
		}

		console.log(
			"Converting features to Cesium entities:",
			data.features.length,
		);

		try {
			const entities = convertCityJSONFeaturesToCesiumEntities(data.features);
			console.log("Entities:", entities);
			// Apply height multiplier if specified
			if (heightMultiplier !== 1.0) {
				entities.forEach((entity) => {
					if (entity.polygon?.hierarchy) {
						// Scale Z coordinates by height multiplier
						const hierarchy = entity.polygon
							.hierarchy as Cesium.PolygonHierarchy;
						if (hierarchy.positions) {
							hierarchy.positions = hierarchy.positions.map((position) => {
								const cartographic =
									Cesium.Cartographic.fromCartesian(position);
								const scaledHeight = cartographic.height * heightMultiplier;
								return Cesium.Cartesian3.fromRadians(
									cartographic.longitude,
									cartographic.latitude,
									scaledHeight,
								);
							});
						}
					}
				});
			}

			console.log("Converted to Cesium entities:", entities.length);
			return entities;
		} catch (error) {
			console.error("Error converting features to Cesium entities:", error);
			return [];
		}
	}, [data?.features, heightMultiplier]);

	// Store entities reference for cleanup
	useEffect(() => {
		entitiesRef.current = cesiumEntities.map((entityData) => {
			const entity = new Cesium.Entity({
				id: entityData.id,
				position: entityData.position,
				polygon: entityData.polygon,
				polyline: entityData.polyline,
				label: entityData.label,
			});

			// Add properties for selection/info display
			if (entityData.properties) {
				entity.properties = new Cesium.PropertyBag(entityData.properties);
			}

			return entity;
		});

		// Cleanup function
		return () => {
			entitiesRef.current = [];
		};
	}, [cesiumEntities]);

	if (!visible || cesiumEntities.length === 0) {
		return null;
	}

	// Render each entity using resium's Entity component
	return (
		<>
			{cesiumEntities.map((entityData) => {
				const key = entityData.id;

				return (
					<Entity
						key={key}
						id={entityData.id}
						position={entityData.position}
						polygon={entityData.polygon}
						polyline={entityData.polyline}
						label={entityData.label}
						properties={entityData.properties}
					/>
				);
			})}
		</>
	);
};

export default FCBVisualization;
