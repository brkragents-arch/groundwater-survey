# AQUASYNC AI Geologist Agent
### Satellite-Based Groundwater Potential Assessment & Borewell Siting Engine

[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9-199900?logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.0-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🌊 Overview

**AQUASYNC AI Geologist** is an advanced, evidence-supported hydrogeological assessment application designed to analyze satellite imagery, digital elevation models (DEM), geological structures, drainage convergence, and land records to identify optimal borewell drilling sites.

The engine produces a visual interface modeled after satellite-derived hydrogeological surveys—featuring radiant cyan (`#00f3ff`) dendritic drainage and subsurface fracture networks, yellow survey parcel boundaries, and ranked candidate borewell pins (**Point 1: Gold**, **Point 2: Blue**, **Point 3: Green**).

---

## ⚡ Key Capabilities

### 1. Multi-Spectral & Terrain Analysis Pipeline
- **Copernicus DEM (GLO-30) & SRTM**: Slope, aspect, curvature, depression analysis, and D8 flow routing.
- **Radiant Cyan Branching Overlays (`#00f3ff`)**: Stream order hierarchy (Orders 1–4) representing surface drainage and convergent runoff swales.
- **Tectonic Lineaments & Fracture Corridors**: Multidirectional edge-detection capturing conjugate shear joints that convey secondary aquifer permeability.

### 2. 3D Dupuit-Darcy Subsurface Groundwater Flow Simulation
- **Saturated Hydraulic Head ($H$)**: Modeled as a damped topographic replica ($H = Z - D_{\text{wt}}$), incorporating alluvial saprolite storage and structural valley depressions.
- **2D Darcy Hydraulic Gradient Vector Field ($\vec{i} = -\nabla H$)**: Computes regional hydraulic gradient ($0.008 - 0.016\text{ m/m}$) and Darcy pore velocities ($0.25 - 1.85\text{ m/day}$).
- **Preferential Subsurface Conduits**: Traces deep groundwater streamlines through palaeochannels and fracture corridors to locate recharge convergence zones.
- **Interactive Re-Analysis**: On-demand $32\times 32$ hydrodynamic simulation with instant metric feedback.

### 3. ISRO Bhuvan Cadastral Land Records Integration
- Links directly with **[ISRO Bhuvan](https://bhuvan.nrsc.gov.in/)** and **Andhra Pradesh MeeBhoomi / Revenue** cadastral data.
- Maps official **Revenue Survey Numbers (R.S. Nos.)** and land parcels.
- Configured with ground-truth survey records for:
  - **SRKREC Campus (Chinna Amiram)**: `R.S. No. 67, 68, 69`
  - **Rk residency (Sriramapuram, Chinna Amiram)**: `R.S. No. 111, 115, 119, 120`
  - **Put (T. Narasapuram)**: `R.S. No. 533/7`

### 4. Analytic Hierarchy Process (AHP) Multi-Criteria Decision Model
Weighted decision matrix balancing 8 normalized geo-environmental parameters:
- **Lithology & Aquifer Characteristics (20%)**
- **Geological Lineaments & Fracture Evidence (20%)**
- **Geomorphology & Weathered Saprolite Zone (15%)**
- **Drainage & Terrain Convergence (10%)**
- **Slope & Infiltration Potential (10%)**
- **Soil Permeability & Land Cover (10%)**
- **Rainfall & Seasonal Recharge (10%)**
- **Historical Borewell Observations (5%)**

### 5. Geophysical Verification (1D VES Resistivity Sounding)
- **Schlumberger Array Simulation**: Forward curve modeling and 4-layer stratigraphy inversion ($AB/2 = 1.5\text{m}$ to $180\text{m}$).
- Real-time comparison between apparent resistivity and theoretical layer curves to verify saturated fractured rock ($40 - 150\ \Omega\cdot\text{m}$).

### 6. Borewell Siting & Technical Reporting
- Spatial clustering constraint enforcing **$\ge 140\text{m}$ separation** between recommended drilling points.
- Comprehensive technical report generation with PDF print formatting and GeoJSON boundary export.

---

## 🚀 Quickstart

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm` or `pnpm`

### Installation
```bash
git clone https://github.com/<your-username>/groundwater-survey-agent.git
cd groundwater-survey-agent
npm install
```

### Development Server
```bash
npm run dev
```
Open [http://localhost:5174](http://localhost:5174) in your browser.

### Production Build
```bash
npm run build
npm run preview
```

---

## 🌐 Production Deployment

### Option A: Deploy to Vercel (Recommended)
1. Push this repository to GitHub.
2. Sign in to [Vercel](https://vercel.com/) and click **"Add New Project"**.
3. Import this repository.
4. Framework Preset: **Vite**
5. Build Command: `npm run build`
6. Output Directory: `dist`
7. Click **Deploy**.

### Option B: Deploy to Netlify
1. Create a `netlify.toml` file in root:
   ```toml
   [build]
     command = "npm run build"
     publish = "dist"
   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```
2. Connect the repository in [Netlify](https://www.netlify.com/) and deploy.

### Option C: Deploy to GitHub Pages
1. Install `gh-pages`:
   ```bash
   npm install -D gh-pages
   ```
2. In `vite.config.ts`, set `base: '/<repository-name>/'`.
3. Add deployment scripts in `package.json`:
   ```json
   "scripts": {
     "predeploy": "npm run build",
     "deploy": "gh-pages -d dist"
   }
   ```
4. Run `npm run deploy`.

---

## 📜 Mandatory Pre-Drilling Field Verification Protocol

> **Hydrogeological Advisory**: Satellite imagery and remote sensing algorithms evaluate surface and structural indicators of groundwater potential. Prior to drilling rig mobilization or capital expenditure:
> 1. Conduct on-site geological ground truthing.
> 2. Perform 1D Vertical Electrical Sounding (VES) or 2D Electrical Resistivity Tomography (ERT).
> 3. Verify sanitary buffer distance ($\ge 30\text{m}$) from soak pits or contaminant sources.
> 4. Consult a certified hydrogeologist and local master driller.

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
