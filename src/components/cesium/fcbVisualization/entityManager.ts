import * as Cesium from "cesium";

interface CesiumGeometryEntity {
	id: string;
	position?: Cesium.Cartesian3;
	polygon?: Cesium.PolygonGraphics.ConstructorOptions;
	polyline?: Cesium.PolylineGraphics.ConstructorOptions;
	label?: Cesium.LabelGraphics.ConstructorOptions;
	properties?: Record<string, unknown>;
}

/**
 * Manages Cesium entities for efficient rendering and memory usage
 */
export class EntityManager {
	private viewer: Cesium.Viewer | null = null;
	private entities: Map<string, Cesium.Entity> = new Map();
	private maxEntities = 5000; // Maximum entities to render simultaneously

	constructor(viewer?: Cesium.Viewer) {
		if (viewer) {
			this.viewer = viewer;
		}
	}

	/**
	 * Set the Cesium viewer instance
	 */
	setViewer(viewer: Cesium.Viewer) {
		this.viewer = viewer;
	}

	/**
	 * Add entities to the scene
	 */
	addEntities(entityData: CesiumGeometryEntity[]): void {
		if (!this.viewer) {
			console.warn("EntityManager: No viewer instance available");
			return;
		}

		// Remove existing entities if we exceed the limit
		if (this.entities.size + entityData.length > this.maxEntities) {
			this.clearEntities();
		}

		// Add new entities
		for (const data of entityData) {
			try {
				const entity = new Cesium.Entity({
					id: data.id,
					position: data.position,
					polygon: data.polygon,
					polyline: data.polyline,
					label: data.label,
				});

				// Add properties for interaction
				if (data.properties) {
					entity.properties = new Cesium.PropertyBag(data.properties);
				}

				this.viewer.entities.add(entity);
				this.entities.set(data.id, entity);
			} catch (error) {
				console.error(`Error adding entity ${data.id}:`, error);
			}
		}

		console.log(
			`EntityManager: Added ${entityData.length} entities (total: ${this.entities.size})`,
		);
	}

	/**
	 * Remove entities by IDs
	 */
	removeEntities(entityIds: string[]): void {
		if (!this.viewer) return;

		for (const id of entityIds) {
			const entity = this.entities.get(id);
			if (entity) {
				this.viewer.entities.remove(entity);
				this.entities.delete(id);
			}
		}

		console.log(`EntityManager: Removed ${entityIds.length} entities`);
	}

	/**
	 * Clear all managed entities
	 */
	clearEntities(): void {
		if (!this.viewer) return;

		for (const entity of this.entities.values()) {
			this.viewer.entities.remove(entity);
		}

		this.entities.clear();
		console.log("EntityManager: Cleared all entities");
	}

	/**
	 * Update entities based on viewport bounds for culling
	 */
	updateEntitiesForViewport(bounds: Cesium.Rectangle): void {
		// TODO: Implement spatial culling based on viewport bounds
		// This would hide entities outside the current view to improve performance
		console.log("Updating entities for viewport:", bounds);
	}

	/**
	 * Get statistics about managed entities
	 */
	getStats(): {
		totalEntities: number;
		maxEntities: number;
		memoryUsagePercent: number;
	} {
		return {
			totalEntities: this.entities.size,
			maxEntities: this.maxEntities,
			memoryUsagePercent: (this.entities.size / this.maxEntities) * 100,
		};
	}

	/**
	 * Set maximum number of entities
	 */
	setMaxEntities(maxEntities: number): void {
		this.maxEntities = maxEntities;

		// If current entities exceed the new limit, remove excess
		if (this.entities.size > this.maxEntities) {
			const excessIds = Array.from(this.entities.keys()).slice(
				this.maxEntities,
			);
			this.removeEntities(excessIds);
		}
	}

	/**
	 * Find entities by property value
	 */
	findEntitiesByProperty(
		propertyName: string,
		value: unknown,
	): Cesium.Entity[] {
		const results: Cesium.Entity[] = [];

		for (const entity of this.entities.values()) {
			if (
				entity.properties &&
				entity.properties[propertyName]?.getValue() === value
			) {
				results.push(entity);
			}
		}

		return results;
	}

	/**
	 * Highlight entities by changing their appearance
	 */
	highlightEntities(entityIds: string[], highlighted = true): void {
		for (const id of entityIds) {
			const entity = this.entities.get(id);
			if (entity?.polygon) {
				if (highlighted) {
					entity.polygon.material = new Cesium.ColorMaterialProperty(
						Cesium.Color.YELLOW.withAlpha(0.8),
					);
					entity.polygon.outlineColor = new Cesium.ConstantProperty(
						Cesium.Color.YELLOW,
					);
				} else {
					// Reset to original colors - this would need to be stored/calculated
					entity.polygon.material = new Cesium.ColorMaterialProperty(
						Cesium.Color.DARKGRAY.withAlpha(0.8),
					);
					entity.polygon.outlineColor = new Cesium.ConstantProperty(
						Cesium.Color.DARKGRAY,
					);
				}
			}
		}
	}

	/**
	 * Dispose of the entity manager and clean up resources
	 */
	dispose(): void {
		this.clearEntities();
		this.viewer = null;
		this.entities.clear();
	}
}
