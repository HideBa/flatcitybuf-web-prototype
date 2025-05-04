# FlatCityBuf Web Prototype

A web application for visualizing and querying 3D building data using FlatCityBuf (FCB) format.

## Overview

This application uses:

- React with TypeScript
- Cesium for 3D visualization (via resium)
- Jotai for state management
- Flatcitybuf for data processing

## Recent Updates

### Global State Management with Jotai

The application has been refactored to use Jotai for global state management:

1. **Centralized State**:
   - All relevant state (rectangle, fetch mode, attribute conditions, etc.) are now managed in Jotai atoms
   - Better state synchronization between components
   - Cleaner code with fewer prop drilling

2. **Modular Code Structure**:
   - Split into focused hooks: `useCesiumControls` and `useFcbData`
   - Clear separation of concerns

3. **Fixed Issues**:
   - Attribute conditions are properly passed to the FCB API
   - Improved data fetching with proper pagination tracking
   - Reusable components with consistent state access

## Core Files

- `/src/store/index.ts` - Jotai atoms for global state
- `/src/hooks/useCesiumControls.ts` - Cesium map interaction
- `/src/hooks/useFcbData.ts` - FCB data fetching
- `/src/feature/data-fetch-controls` - UI for data fetching
- `/src/feature/attribute` - Attribute condition management

## Usage

1. Draw a rectangle on the map
2. Choose between BBox or Attribute Condition mode
3. Set feature limit for pagination
4. Use "Fetch FCB" to get data
5. Use "Load Next Batch" for pagination

## API Integration

The app uses an optimized caching system for FCB requests to avoid redundant initializations and improve performance when fetching data.
