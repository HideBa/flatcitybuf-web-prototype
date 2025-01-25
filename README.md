# FlatCityBuffer Viewer

A front-end prototype implementation for visualizing FlatCityBuffer data, which is a FlatBuffer encoding of CityJSON. This viewer demonstrates efficient spatial data retrieval using HTTP range requests and WebAssembly bindings.

<video controls src="https://storage.googleapis.com/flatcitybuf/demo.mp4" title="Title"></video>

## Overview

This project showcases:
- Efficient spatial data retrieval using FlatCityBuffer's WASM bindings
- HTTP range requests to fetch only the required data extent
- Interactive map interface using CesiumJS
- Real-time visualization of CityJSON data
- Statistical analysis of building attributes

## Features

- 🗺️ Interactive map with drawing tools for area selection
- 📦 Efficient data loading using HTTP range requests
- 📊 Statistical analysis of building attributes
- 🔍 JSON viewer for detailed data inspection
- 🏗️ Download CityJSONSeq file only for selected area

## Technology Stack

- React + TypeScript
- Vite for build tooling
- CesiumJS for map rendering
- TailwindCSS + shadcn/ui for styling
- [FlatCityBuffer WASM bindings](https://github.com/flatcitybuf/flatcitybuf-wasm)
- proj4js for coordinate transformations

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm (v9 or later)
- Git

### Installation

1. Clone the repository with submodules:
```bash
git clone --recursive https://github.com/yourusername/flatcitybuffer-viewer.git
cd flatcitybuffer-viewer
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`
