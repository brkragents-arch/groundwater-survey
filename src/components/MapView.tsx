import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  BorewellCandidate,
  BranchingPathway,
  SurveyBoundary,
  HistoricalWellRecord,
  CadastralParcel,
  FractureIntersectionNode,
} from '../types/hydrogeology';
import { FractureBranchAnalysis } from '../services/demHydrology';
import {
  Layers,
  Crosshair,
  Compass,
  Eye,
  ShieldAlert,
  Sparkles,
  Navigation,
  CheckCircle2,
  Minimize2,
  Maximize2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface MapViewProps {
  boundary: SurveyBoundary;
  candidates: BorewellCandidate[];
  pathways: BranchingPathway[];
  cadastralParcels: CadastralParcel[];
  selectedCandidateId: string | null;
  onSelectCandidate: (id: string) => void;
  historicalWells: HistoricalWellRecord[];
  isDrawingMode: boolean;
  onPolygonDrawn: (coords: [number, number][]) => void;
  onCancelDraw: () => void;
  fractureIntersectionNodes?: FractureIntersectionNode[];
  fractureAnalysis?: FractureBranchAnalysis;
}

export const MapView: React.FC<MapViewProps> = ({
  boundary,
  candidates,
  pathways,
  cadastralParcels,
  selectedCandidateId,
  onSelectCandidate,
  historicalWells,
  isDrawingMode,
  onPolygonDrawn,
  onCancelDraw,
  fractureIntersectionNodes = [],
  fractureAnalysis,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Layer groups refs
  const boundaryLayerRef = useRef<L.LayerGroup | null>(null);
  const cadastralLayerRef = useRef<L.LayerGroup | null>(null);
  const pathwaysLayerRef = useRef<L.LayerGroup | null>(null);
  const candidatesLayerRef = useRef<L.LayerGroup | null>(null);
  const wellsLayerRef = useRef<L.LayerGroup | null>(null);
  const drawLayerRef = useRef<L.LayerGroup | null>(null);
  const fractureHubsLayerRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Layer visibility toggles
  const [showSatellite, setShowSatellite] = useState(true);
  const [showInferredFractures, setShowInferredFractures] = useState(true);
  const [showFractureHubs, setShowFractureHubs] = useState(true);
  const [showDrainagePathways, setShowDrainagePathways] = useState(true);
  const [showSubsurfaceFlows, setShowSubsurfaceFlows] = useState(true);
  const [showBoundary, setShowBoundary] = useState(true);
  const [showCadastral, setShowCadastral] = useState(true);
  const [showPotentialHeatmap, setShowPotentialHeatmap] = useState(true);
  const [showCandidates, setShowCandidates] = useState(true);
  const [showHistoricalWells, setShowHistoricalWells] = useState(true);
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [basemapType, setBasemapType] = useState<'satellite' | 'street' | 'topo'>('satellite');

  // Panel Minimization states
  const [isOverlaysMinimized, setIsOverlaysMinimized] = useState(false);
  const [isLegendMinimized, setIsLegendMinimized] = useState(false);

  // Drawing mode points buffer
  const [drawnPoints, setDrawnPoints] = useState<[number, number][]>([]);

  // Inferred Subsurface Fracture Analysis statistics
  const masterFractures = pathways.filter(p => p.type === 'inferred_fracture' && !p.isFractureBranch);
  const fractureBranches = pathways.filter(p => p.type === 'inferred_fracture' && p.isFractureBranch);
  const drainagePathways = pathways.filter(p => p.type === 'surface_drainage');
  const subsurfaceFlowPathways = pathways.filter(p => p.type === 'subsurface_flow');
  const palaeochannels = pathways.filter(p => p.type === 'palaeochannel');

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: boundary.center,
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    });

    // Add zoom control top right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Initial tile layer - Esri World Imagery (high-resolution satellite)
    const esriSatellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        attribution: 'Esri, Maxar, Earthstar Geographics',
      }
    ).addTo(map);
    tileLayerRef.current = esriSatellite;

    // Create layer groups
    boundaryLayerRef.current = L.layerGroup().addTo(map);
    cadastralLayerRef.current = L.layerGroup().addTo(map);
    pathwaysLayerRef.current = L.layerGroup().addTo(map);
    candidatesLayerRef.current = L.layerGroup().addTo(map);
    wellsLayerRef.current = L.layerGroup().addTo(map);
    fractureHubsLayerRef.current = L.layerGroup().addTo(map);
    drawLayerRef.current = L.layerGroup().addTo(map);

    // Track mouse coordinate inspection
    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      setCursorCoords({
        lat: Math.round(e.latlng.lat * 100000) / 100000,
        lng: Math.round(e.latlng.lng * 100000) / 100000,
      });
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Basemap Type
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    let url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    let maxZoom = 19;

    if (basemapType === 'street') {
      url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      maxZoom = 19;
    } else if (basemapType === 'topo') {
      url = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
      maxZoom = 17;
    }

    const newLayer = L.tileLayer(url, { maxZoom }).addTo(mapInstanceRef.current);
    tileLayerRef.current = newLayer;
  }, [basemapType]);

  // Handle Map Drawing Clicks
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (!isDrawingMode) return;
      const newPt: [number, number] = [e.latlng.lat, e.latlng.lng];
      setDrawnPoints(prev => [...prev, newPt]);
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [isDrawingMode]);

  // Render Drawing in progress
  useEffect(() => {
    if (!drawLayerRef.current) return;
    drawLayerRef.current.clearLayers();

    if (drawnPoints.length > 0) {
      // Draw vertices
      drawnPoints.forEach(pt => {
        const marker = L.circleMarker(pt, {
          radius: 5,
          color: '#facc15',
          fillColor: '#ffffff',
          fillOpacity: 1,
          weight: 2,
        });
        marker.addTo(drawLayerRef.current!);
      });

      // Draw polyline / polygon
      if (drawnPoints.length >= 2) {
        const line = L.polyline(drawnPoints, {
          color: '#facc15',
          weight: 3,
          dashArray: '5, 5',
        });
        line.addTo(drawLayerRef.current);
      }
    }
  }, [drawnPoints]);

  // Render Survey Boundary (Yellow Polygon with styling matching reference image)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !boundaryLayerRef.current) return;

    boundaryLayerRef.current.clearLayers();
    if (!showBoundary || boundary.coordinates.length < 3) return;

    // Glowing vibrant yellow polygon boundary
    const polygon = L.polygon(boundary.coordinates, {
      color: '#ffe600', // Bright saturated yellow
      weight: 3.5,
      opacity: 0.95,
      fillColor: '#facc15',
      fillOpacity: 0.12,
      className: 'yellow-boundary-glow',
    });

    polygon.bindTooltip(
      `<div class="text-xs font-semibold px-1 py-0.5">${boundary.name} (${boundary.areaAcres} acres)</div>`,
      { sticky: true, className: 'bg-slate-900 text-yellow-400 border border-yellow-500/50 rounded shadow-lg' }
    );

    polygon.addTo(boundaryLayerRef.current);

    // Auto-fit bounds on boundary update
    map.fitBounds(polygon.getBounds(), { padding: [50, 50], maxZoom: 16 });
  }, [boundary, showBoundary]);

  // Render Bhuvan Cadastral Land Parcels & Survey Numbers (ISRO Bhuvan NRSC)
  useEffect(() => {
    if (!cadastralLayerRef.current) return;
    cadastralLayerRef.current.clearLayers();
    if (!showCadastral || !cadastralParcels || cadastralParcels.length === 0) return;

    cadastralParcels.forEach(parcel => {
      // Cadastral subdivision polygon
      const poly = L.polygon(parcel.coordinates, {
        color: '#f59e0b', // Amber / Gold cadastral line
        weight: 1.8,
        dashArray: '4, 4',
        opacity: 0.85,
        fillColor: '#f59e0b',
        fillOpacity: 0.05,
      });

      poly.bindPopup(`
        <div class="p-3 text-xs font-sans text-slate-100 bg-slate-950 border border-amber-500/50 rounded-xl shadow-2xl min-w-[220px]">
          <div class="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
            <span class="font-mono font-bold text-amber-400 text-sm">${parcel.surveyNumber}</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 font-semibold border border-amber-800">
              Bhuvan Cadastral
            </span>
          </div>
          <div class="space-y-1 text-[11px] text-slate-300">
            <div>Village: <span class="text-white font-medium">${parcel.revenueVillage}</span></div>
            <div>Extent: <span class="font-mono text-cyan-300 font-bold">${parcel.extentAcres} Acres</span> (${parcel.extentHectares} Ha)</div>
            <div>Land Classification: <span class="text-slate-300 font-medium">${parcel.landUse}</span></div>
            <div class="pt-1.5 mt-1 border-t border-slate-800 flex items-center justify-between text-[10px]">
              <span class="text-slate-400">Source: ISRO / NRSC</span>
              <a href="${parcel.bhuvanSourceUrl}" target="_blank" rel="noopener noreferrer" class="text-cyan-400 hover:underline">
                bhuvan.nrsc.gov.in ↗
              </a>
            </div>
          </div>
        </div>
      `);

      poly.addTo(cadastralLayerRef.current!);

      // Centered Survey Number Label Badge
      const labelIcon = L.divIcon({
        className: 'cadastral-label-marker',
        html: `
          <div class="bg-slate-950/90 text-amber-300 border border-amber-500/60 font-mono font-extrabold text-[9px] px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap cursor-pointer hover:bg-amber-500 hover:text-slate-950 transition -translate-x-1/2 -translate-y-1/2">
            ${parcel.surveyNumber}
          </div>
        `,
        iconSize: [0, 0],
      });

      const labelMarker = L.marker(parcel.center, { icon: labelIcon, interactive: false });
      labelMarker.addTo(cadastralLayerRef.current!);
    });
  }, [cadastralParcels, showCadastral]);

  // Render Inferred Subsurface Fractures, Fracture Branches & Drainage Pathways
  useEffect(() => {
    if (!pathwaysLayerRef.current) return;
    pathwaysLayerRef.current.clearLayers();

        pathways.forEach(pw => {
      const isFracture = pw.type === 'inferred_fracture';
      const isPalaeo = pw.type === 'palaeochannel';
      const isDrainage = pw.type === 'surface_drainage';
      const isSubsurfaceFlow = pw.type === 'subsurface_flow';

      if (isFracture && !showInferredFractures) return;
      if (isDrainage && !showDrainagePathways) return;
      if (isSubsurfaceFlow && !showSubsurfaceFlows) return;

      const isBranch = pw.isFractureBranch;

      // Surface Drainage & Subsurface Fractures Visual Hierarchy
      let weight = 2.4;
      let color = '#00f3ff';
      let dashArray: string | undefined = undefined;
      let cssClass = 'cyan-network-glow';
      let title = `Surface Drainage Channel (Order ${pw.streamOrder})`;

      if (isDrainage) {
        // Hydrographically accurate surface drainage styling
        if (pw.streamOrder === 1) {
          // Master Valley Drainage Thalweg / Irrigation Canal
          weight = 4.4;
          color = '#0284c7'; // Deep electric blue
          cssClass = 'surface-drainage-thalweg';
          title = pw.drainageType === 'master_irrigation_canal'
            ? 'Master Surface Canal (Order 1 - Irrigation Corridor)'
            : 'Master Surface Drainage Channel (Order 1 - Valley Thalweg)';

          // Add radiant sky-blue core highlight for the master thalweg
          const core = L.polyline(pw.coordinates, {
            color: '#38bdf8',
            weight: 2.0,
            opacity: 1.0,
            interactive: false,
          });
          core.addTo(pathwaysLayerRef.current!);
        } else if (pw.streamOrder === 2) {
          // Secondary Collector Tributary
          weight = 3.0;
          color = '#06b6d4'; // Bright cyan-blue
          cssClass = 'surface-drainage-glow';
          const matchName = pw.description.match(/\(Order 2 - ([^)]+)\)/);
          title = matchName ? `Surface Drainage Tributary (Order 2 - ${matchName[1]})` : 'Surface Drainage Tributary (Order 2 - Collector Stream)';
        } else if (pw.streamOrder === 3) {
          // Tertiary Feeder Nullah
          weight = 2.0;
          color = '#0284c7';
          cssClass = 'surface-drainage-glow';
          title = 'Surface Drainage Gully (Order 3 - Feeder Nullah)';
        } else {
          // Order 4 Headwater Colluvial Swale Rill
          weight = 1.3;
          color = '#7dd3fc';
          title = 'Headwater Surface Rill (Order 4 - Colluvial Swale)';
        }
      } else if (isFracture) {
        if (isBranch) {
          if (pw.streamOrder === 4) {
            // Tertiary micro-splay
            weight = 1.6;
            color = '#38bdf8';
            dashArray = '4, 3';
            cssClass = 'cyan-subsurface-glow';
            title = 'Inferred Fracture Branch (Tertiary Dilated Joint Splay)';
          } else {
            // Secondary conjugate Riedel splay branch
            weight = 2.4;
            color = '#00f3ff';
            dashArray = '6, 4';
            cssClass = 'cyan-subsurface-glow';
            title = `Inferred Subsurface Fracture Branch (${
              pw.fractureBranchType === 'conjugate_shear_splay' ? 'Conjugate Riedel Splay' : 'Extensional Wing Splay'
            })`;
          }
        } else {
          // Master fracture corridor
          weight = 3.8;
          color = '#00f3ff';
          dashArray = '9, 5';
          cssClass = 'cyan-subsurface-glow pulse-subsurface';
          title = 'Master Inferred Subsurface Fracture Corridor (Primary Shear Zone)';
        }
      } else if (isPalaeo) {
        weight = 3.0;
        dashArray = '8, 4';
        title = 'Buried Palaeochannel Aquifer Corridor';

        const ribbon = L.polyline(pw.coordinates, {
          color: '#0284c7',
          weight: 8,
          opacity: 0.35,
          interactive: false,
        });
        ribbon.addTo(pathwaysLayerRef.current!);
      } else if (isSubsurfaceFlow) {
        // Subsurface Groundwater Flows (Dupuit-Darcy Hydrodynamic Streamlines)
        const isArtery = pw.streamOrder === 1;
        weight = isArtery ? 3.6 : 2.6;
        color = isArtery ? '#10b981' : '#14b8a6'; // Vivid emerald / turquoise
        dashArray = isArtery ? '9, 5' : '6, 4';
        cssClass = isArtery ? 'subsurface-flow-artery' : 'subsurface-flow-glow';
        title = isArtery
          ? 'Regional Subsurface Groundwater Artery (Tier 1 Darcy Flow)'
          : pw.streamOrder === 2
          ? 'Lateral Groundwater Recharge Conduit (Tier 2 Seepage)'
          : 'Deep Fracture-Fed Percolation Conduit (Tier 3 Flow)';

        // Underlay hydrodynamic ribbon
        const ribbon = L.polyline(pw.coordinates, {
          color: '#059669',
          weight: isArtery ? 7 : 5,
          opacity: 0.35,
          interactive: false,
        });
        ribbon.addTo(pathwaysLayerRef.current!);
      }

      const polyline = L.polyline(pw.coordinates, {
        color,
        weight,
        opacity: isBranch ? 0.92 : 0.98,
        dashArray,
        className: cssClass,
      });

      // Tailored Popup for Surface Drainage vs Subsurface Flows vs Subsurface Fractures
      if (isDrainage) {
        polyline.bindPopup(`
          <div class="p-3 text-xs font-sans text-slate-100 bg-slate-950 border border-sky-500/60 rounded-xl shadow-2xl min-w-[260px]">
            <div class="flex items-center gap-1.5 font-bold text-sky-400 mb-1.5 border-b border-slate-800 pb-1">
              <span class="inline-block w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse"></span>
              <span>${title}</span>
            </div>
            <div class="text-slate-300 text-[11px] mb-2 leading-relaxed">${pw.description}</div>
            <div class="grid grid-cols-2 gap-1.5 text-[10.5px] pt-1.5 border-t border-slate-800/80">
              <div>Stream Order: <span class="text-sky-300 font-mono font-bold">Strahler Order ${pw.streamOrder}</span></div>
              <div>Flow Accumulation: <span class="text-cyan-300 font-mono font-bold">${pw.flowAccumulationScore} cells</span></div>
              ${pw.catchmentAreaAcres !== undefined ? `<div>Catchment Drained: <span class="text-emerald-300 font-mono font-bold">${pw.catchmentAreaAcres} Acres</span></div>` : ''}
              ${pw.surfaceDischargeM3PerSec !== undefined ? `<div>Peak Runoff (Q): <span class="text-blue-300 font-mono font-bold">${pw.surfaceDischargeM3PerSec} m³/s</span></div>` : ''}
              ${pw.manningVelocityMPerSec !== undefined ? `<div>Manning Velocity: <span class="text-cyan-200 font-mono font-bold">${pw.manningVelocityMPerSec} m/s</span></div>` : ''}
              ${pw.channelGradient !== undefined ? `<div>Bed Gradient: <span class="text-amber-300 font-mono font-bold">${pw.channelGradient} m/m</span></div>` : ''}
            </div>
            <div class="mt-2 pt-1 border-t border-slate-900 text-[10px] text-sky-300/80 flex items-center gap-1">
              <span>🌊</span>
              <span>D8 Watershed Flow Conduit conveying storm runoff & valley infiltration.</span>
            </div>
          </div>
        `);
      } else if (isSubsurfaceFlow) {
        polyline.bindPopup(`
          <div class="p-3 text-xs font-sans text-slate-100 bg-slate-950 border border-emerald-500/60 rounded-xl shadow-2xl min-w-[270px]">
            <div class="flex items-center gap-1.5 font-bold text-emerald-400 mb-1.5 border-b border-slate-800 pb-1">
              <span class="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>${title}</span>
            </div>
            <div class="text-slate-300 text-[11px] mb-2 leading-relaxed">${pw.description}</div>
            <div class="grid grid-cols-2 gap-1.5 text-[10.5px] pt-1.5 border-t border-slate-800/80">
              <div>Pore Seepage Velocity: <span class="text-emerald-300 font-mono font-bold">${pw.flowVelocityMPerDay} m/day</span></div>
              <div>Darcy Specific Flux: <span class="text-cyan-300 font-mono font-bold">${pw.darcyFluxM3PerDay} m³/day</span></div>
              <div>Hydraulic Gradient: <span class="text-amber-300 font-mono font-bold">${pw.hydraulicGradient} m/m</span></div>
              <div>Water Table Depth: <span class="text-amber-200 font-mono font-bold">~${pw.depthToWaterM} m bgl</span></div>
              <div>Local Transmissivity: <span class="text-emerald-300 font-mono font-bold">${pw.transmissivityM2PerDay || 280} m²/day</span></div>
              <div>Flow Direction: <span class="text-slate-200 font-mono font-bold">${pw.flowDirectionDeg}°</span></div>
            </div>
            ${pw.aquiferZone ? `<div class="mt-1.5 text-[10px] text-slate-400 border-t border-slate-900 pt-1">Aquifer: <span class="text-slate-200 font-medium">${pw.aquiferZone}</span></div>` : ''}
            <div class="mt-1.5 text-[10px] text-emerald-400/90 flex items-center gap-1">
              <span>💧</span>
              <span>Dupuit-Darcy hydrodynamic streamline simulated along hydraulic potential gradient.</span>
            </div>
          </div>
        `);
      } else {
        polyline.bindPopup(`
          <div class="p-3 text-xs font-sans text-slate-100 bg-slate-950 border border-cyan-500/40 rounded-xl shadow-2xl min-w-[250px]">
            <div class="flex items-center gap-1.5 font-bold text-cyan-400 mb-1.5 border-b border-slate-800 pb-1">
              <span class="inline-block w-2.5 h-2.5 rounded-full ${isFracture ? 'bg-cyan-400 animate-pulse' : 'bg-cyan-300'}"></span>
              <span>${title}</span>
            </div>
            <div class="text-slate-300 text-[11px] mb-2 leading-relaxed">${pw.description}</div>
            <div class="grid grid-cols-2 gap-1.5 text-[10.5px] pt-1.5 border-t border-slate-800/80">
              <div>Confidence: <span class="text-slate-200 font-semibold">${pw.confidence}</span></div>
              <div>Flow Score: <span class="text-cyan-300 font-mono font-bold">${pw.flowAccumulationScore}</span></div>
              ${isBranch ? `<div>Parent Conduit: <span class="text-cyan-200 font-mono font-bold">${pw.parentBranchId}</span></div>` : ''}
              ${pw.junctionAngleDeg !== undefined ? `<div>Junction Angle: <span class="text-amber-300 font-mono font-bold">${pw.junctionAngleDeg}°</span></div>` : ''}
              ${pw.fractureApertureMm !== undefined ? `<div>Dilated Aperture: <span class="text-emerald-300 font-mono font-bold">${pw.fractureApertureMm} mm</span></div>` : ''}
              ${pw.flowVelocityMPerDay !== undefined ? `<div>Darcy Velocity: <span class="text-emerald-300 font-mono font-bold">${pw.flowVelocityMPerDay} m/day</span></div>` : ''}
              ${pw.hydraulicGradient !== undefined ? `<div>Hydraulic Grad: <span class="text-cyan-200 font-mono">${pw.hydraulicGradient} m/m</span></div>` : ''}
              ${pw.depthToWaterM !== undefined ? `<div>Water Table Depth: <span class="text-amber-300 font-mono font-bold">~${pw.depthToWaterM} m bgl</span></div>` : ''}
              ${pw.darcyFluxM3PerDay !== undefined ? `<div>Darcy Flux: <span class="text-blue-300 font-mono font-bold">${pw.darcyFluxM3PerDay} m³/day</span></div>` : ''}
            </div>
          </div>
        `);
      }

      polyline.addTo(pathwaysLayerRef.current!);
    });
  }, [pathways, showInferredFractures, showDrainagePathways, showSubsurfaceFlows]);

  // Render Fracture Branch Intersection Hubs (Prime Borewell Targets)
  useEffect(() => {
    if (!fractureHubsLayerRef.current) return;
    fractureHubsLayerRef.current.clearLayers();
    if (!showFractureHubs || !fractureIntersectionNodes || fractureIntersectionNodes.length === 0) return;

    fractureIntersectionNodes.forEach(node => {
      const hubIcon = L.divIcon({
        className: 'fracture-hub-marker',
        html: `
          <div class="relative flex items-center justify-center cursor-pointer -translate-x-1/2 -translate-y-1/2 group">
            <div class="w-5 h-5 rounded-full bg-cyan-400/25 animate-ping absolute"></div>
            <div class="w-3.5 h-3.5 rotate-45 bg-slate-950 border-2 border-cyan-400 group-hover:scale-125 transition-transform shadow-[0_0_10px_#00f3ff] flex items-center justify-center">
              <div class="w-1 h-1 bg-cyan-300"></div>
            </div>
          </div>
        `,
        iconSize: [0, 0],
      });

      const marker = L.marker([node.lat, node.lng], { icon: hubIcon });

      marker.bindPopup(`
        <div class="p-3 text-xs font-sans text-slate-100 bg-slate-950 border border-cyan-400/60 rounded-xl shadow-2xl min-w-[240px]">
          <div class="flex items-center gap-1.5 font-bold text-cyan-400 mb-1 border-b border-slate-800 pb-1">
            <span class="w-2.5 h-2.5 rotate-45 bg-cyan-400 inline-block"></span>
            <span>Fracture Branch Intersection Hub</span>
          </div>
          <div class="text-[11px] text-slate-300 mb-2 leading-relaxed">${node.description}</div>
          <div class="space-y-1 text-[10.5px] border-t border-slate-800 pt-1.5 text-slate-300">
            <div>Conjugate Angle: <span class="font-mono text-cyan-300 font-bold">${node.intersectionAngleDeg}°</span></div>
            <div>Secondary Permeability: <span class="font-mono text-emerald-300 font-bold">+${node.transmissivityEnhancementFactor}x Enhancement</span></div>
            <div>Convergence Index: <span class="font-mono text-cyan-200 font-bold">${node.flowConvergenceScore}/100</span></div>
            <div>Target Depth to Water: <span class="font-mono text-amber-300 font-bold">~${node.depthToWaterTableM} m bgl</span></div>
            <div class="pt-1 text-[10px] text-emerald-400 font-medium">★ Prime Recommended Siting Node for Deep Crystalline Borewell</div>
          </div>
        </div>
      `);

      marker.addTo(fractureHubsLayerRef.current!);
    });
  }, [fractureIntersectionNodes, showFractureHubs]);

    // Render Top 3 Borewell Candidate Pins (Point 1: Gold/Red, Point 2: Blue, Point 3: Green)
  useEffect(() => {
    if (!candidatesLayerRef.current) return;
    candidatesLayerRef.current.clearLayers();
    if (!showCandidates) return;

    candidates.forEach(cand => {
      const isSelected = selectedCandidateId === cand.id;

      // Color scheme according to Master Prompt Section 6:
      // Point 1: Gold / Red pin
      // Point 2: Blue pin
      // Point 3: Green pin
      let pinHex = '#eab308'; // Point 1 Gold
      let bgBadge = 'bg-amber-500';
      let ringColor = 'ring-amber-400';
      if (cand.rank === 1) {
        pinHex = '#f59e0b';
        bgBadge = 'bg-amber-500 text-slate-950 font-black';
        ringColor = 'ring-amber-300';
      } else if (cand.rank === 2) {
        pinHex = '#3b82f6';
        bgBadge = 'bg-blue-600 text-white font-black';
        ringColor = 'ring-blue-400';
      } else if (cand.rank === 3) {
        pinHex = '#10b981';
        bgBadge = 'bg-emerald-600 text-white font-black';
        ringColor = 'ring-emerald-400';
      }

      // Custom HTML Marker Icon
      const customIcon = L.divIcon({
        className: 'custom-borewell-pin',
        html: `
          <div class="relative flex flex-col items-center cursor-pointer transition-transform duration-200 ${
            isSelected ? 'scale-125 z-50' : 'hover:scale-110'
          }">
            <div class="flex items-center justify-center w-8 h-8 rounded-full shadow-2xl ring-2 ${ringColor} ${bgBadge} text-xs font-mono font-extrabold shadow-black">
              ${cand.rank}
            </div>
            <div class="w-0.5 h-3.5 bg-white shadow"></div>
            <div class="w-2.5 h-1 bg-black/60 rounded-full blur-[1px]"></div>
            ${
              isSelected
                ? `<div class="absolute -top-6 whitespace-nowrap bg-slate-900 text-cyan-300 text-[10px] font-bold px-2 py-0.5 rounded border border-cyan-400/50 shadow-lg">
                    ${cand.id} (${cand.suitabilityScore}/100)
                  </div>`
                : ''
            }
          </div>
        `,
        iconSize: [32, 44],
        iconAnchor: [16, 42],
        popupAnchor: [0, -42],
      });

      const marker = L.marker([cand.lat, cand.lng], { icon: customIcon });

      marker.bindPopup(`
        <div class="p-3 text-xs font-sans text-slate-100 bg-slate-950 border border-slate-800 rounded-lg shadow-2xl min-w-[240px]">
          <div class="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <div class="flex items-center gap-2">
              <span class="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${bgBadge}">${cand.rank}</span>
              <span class="font-bold text-sm text-white">${cand.id} - Rank #${cand.rank}</span>
            </div>
            <span class="text-[11px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
              ${cand.suitabilityScore}/100
            </span>
          </div>
          <div class="space-y-1.5 text-[11px]">
            <div class="flex justify-between text-slate-300">
              <span>Bhuvan Cadastral:</span>
              <span class="font-bold font-mono text-amber-400">${cand.surveyNumber}</span>
            </div>
            <div class="flex justify-between text-slate-300">
              <span>Potential Class:</span>
              <span class="font-semibold text-emerald-400">${cand.potentialClass}</span>
            </div>
            <div class="flex justify-between text-slate-300">
              <span>Coordinates:</span>
              <span class="font-mono text-slate-100">${cand.lat.toFixed(5)}°, ${cand.lng.toFixed(5)}°</span>
            </div>
            <div class="flex justify-between text-slate-300">
              <span>Elevation:</span>
              <span class="font-mono text-slate-100">${cand.elevationM} m AMSL</span>
            </div>
            <div class="flex justify-between text-slate-300">
              <span>Depth Target:</span>
              <span class="font-semibold text-amber-300">${cand.indicativeDepthRange.minM} - ${cand.indicativeDepthRange.maxM} m (${cand.indicativeDepthRange.minFt}-${cand.indicativeDepthRange.maxFt} ft)</span>
            </div>
            <div class="flex justify-between text-slate-300">
              <span>Expected Yield:</span>
              <span class="font-semibold text-cyan-300">${cand.expectedYieldRange.minLph} - ${cand.expectedYieldRange.maxLph} LPH</span>
            </div>
          </div>
          <div class="mt-2.5 pt-2 border-t border-slate-800 flex justify-end">
            <span class="text-[10px] text-cyan-400 font-medium hover:underline">Click card in right panel for VES Sounding</span>
          </div>
        </div>
      `);

      marker.on('click', () => {
        onSelectCandidate(cand.id);
      });

      marker.addTo(candidatesLayerRef.current!);
    });
  }, [candidates, selectedCandidateId, showCandidates]);

  // Render Historical Verified Wells
  useEffect(() => {
    if (!wellsLayerRef.current) return;
    wellsLayerRef.current.clearLayers();
    if (!showHistoricalWells) return;

    historicalWells.forEach(well => {
      const isProductive = well.status === 'Productive';
      const isFailed = well.status === 'Failed / Dry';
      const color = isProductive ? '#22c55e' : isFailed ? '#ef4444' : '#eab308';

      const circle = L.circleMarker([well.lat, well.lng], {
        radius: 6,
        color: '#ffffff',
        weight: 1.5,
        fillColor: color,
        fillOpacity: 0.9,
      });

      circle.bindPopup(`
        <div class="p-2 text-xs font-sans text-slate-100 bg-slate-900 rounded">
          <div class="font-bold flex items-center justify-between mb-1">
            <span>Historical Well: ${well.id}</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded font-semibold ${isProductive ? 'bg-emerald-950 text-emerald-300' : isFailed ? 'bg-rose-950 text-rose-300' : 'bg-amber-950 text-amber-300'}">
              ${well.status}
            </span>
          </div>
          <div class="text-[11px] space-y-1 text-slate-300">
            <div>Depth: <span class="font-mono text-white">${well.totalDepthM} m</span></div>
            <div>Measured Yield: <span class="font-mono text-cyan-300">${well.yieldLph} LPH</span></div>
            <div>Drilled: <span class="text-slate-400">${well.drillingYear}</span></div>
            <div class="text-[10px] text-slate-400 mt-1 border-t border-slate-800 pt-1">${well.lithologyEncountered}</div>
          </div>
        </div>
      `);

      circle.addTo(wellsLayerRef.current!);
    });
  }, [historicalWells, showHistoricalWells]);

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 overflow-hidden select-none">
      {/* Map DOM Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Banner: Drawing Mode Alert */}
      {isDrawingMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-amber-500/95 text-slate-950 px-4 py-2 rounded-xl shadow-2xl flex items-center gap-3 backdrop-blur-md border border-amber-300">
          <Crosshair className="w-5 h-5 animate-spin" />
          <div className="text-xs font-semibold">
            Click on map to add boundary polygon vertices ({drawnPoints.length} points placed).
          </div>
          <button
            onClick={() => {
              if (drawnPoints.length >= 3) {
                onPolygonDrawn(drawnPoints);
                setDrawnPoints([]);
              } else {
                alert('Please place at least 3 points to form a closed survey boundary.');
              }
            }}
            disabled={drawnPoints.length < 3}
            className="px-3 py-1 bg-slate-950 text-amber-300 rounded-lg text-xs font-bold hover:bg-slate-900 disabled:opacity-50"
          >
            Complete Boundary
          </button>
          <button
            onClick={() => {
              setDrawnPoints([]);
              onCancelDraw();
            }}
            className="px-2 py-1 bg-transparent hover:bg-amber-600 rounded text-xs font-medium"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Floating Layer Controls (Top Left) */}
      <div className="absolute top-4 left-4 z-10 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl p-2.5 shadow-2xl text-xs space-y-2 transition-all duration-200">
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-slate-300 font-semibold gap-3">
          <span
            className="flex items-center gap-1.5 text-cyan-400 cursor-pointer select-none"
            onClick={() => setIsOverlaysMinimized(!isOverlaysMinimized)}
          >
            <Layers className="w-3.5 h-3.5" />
            GIS Overlays
            {isOverlaysMinimized && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 font-normal border border-cyan-800 ml-1">
                Active
              </span>
            )}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 font-mono">WGS84</span>
            <button
              onClick={() => setIsOverlaysMinimized(!isOverlaysMinimized)}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition"
              title={isOverlaysMinimized ? "Maximize GIS Overlays" : "Minimize GIS Overlays"}
              aria-label={isOverlaysMinimized ? "Maximize GIS Overlays" : "Minimize GIS Overlays"}
            >
              {isOverlaysMinimized ? (
                <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
              ) : (
                <Minimize2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Expandable Content Body */}
        {!isOverlaysMinimized && (
          <>
            <div className="space-y-1 text-slate-200">
                            {/* Inferred Subsurface Fractures with Branches */}
              <label className="flex items-center justify-between gap-3 px-1.5 py-1 rounded hover:bg-slate-800/60 cursor-pointer">
                <span className="flex items-center gap-2">
                  <span className="w-3 border-b-2 border-dashed border-cyan-400 shadow-[0_0_6px_#00f3ff]"></span>
                  <span className="text-cyan-300 font-medium">Inferred Subsurface Fractures & Branches</span>
                  <span className="text-[9px] font-mono px-1 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                    {masterFractures.length}M / {fractureBranches.length}B
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={showInferredFractures}
                  onChange={e => setShowInferredFractures(e.target.checked)}
                  className="accent-cyan-400 rounded"
                />
              </label>

              {/* Fracture Branch Intersection Hubs */}
              <label className="flex items-center justify-between gap-3 px-1.5 py-1 rounded hover:bg-slate-800/60 cursor-pointer">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rotate-45 border border-cyan-400 bg-cyan-400/30"></span>
                  <span className="text-cyan-200 font-medium">Fracture Intersection Hubs</span>
                  <span className="text-[9px] font-mono px-1 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                    {(fractureIntersectionNodes || []).length} Nodes
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={showFractureHubs}
                  onChange={e => setShowFractureHubs(e.target.checked)}
                  className="accent-cyan-400 rounded"
                />
              </label>

              {/* Surface Drainage Pathways */}
              <label className="flex items-center justify-between gap-3 px-1.5 py-1 rounded hover:bg-slate-800/60 cursor-pointer">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-0.5 bg-sky-400 shadow-[0_0_4px_#38bdf8]"></span>
                  <span className="text-sky-300 font-medium">Surface Drainage Channels (D8 Catchment)</span>
                  <span className="text-[9px] font-mono px-1 rounded bg-slate-800 text-slate-300">
                    {drainagePathways.length} Streams
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={showDrainagePathways}
                  onChange={e => setShowDrainagePathways(e.target.checked)}
                  className="accent-cyan-400 rounded"
                />
              </label>

              {/* Subsurface Darcy Flows & Saturated Streamlines */}
              <label className="flex items-center justify-between gap-3 px-1.5 py-1 rounded hover:bg-slate-800/60 cursor-pointer">
                <span className="flex items-center gap-2">
                  <span className="w-3 border-b-2 border-dashed border-emerald-400 shadow-[0_0_6px_#10b981]"></span>
                  <span className="text-emerald-300 font-medium">Subsurface Darcy Flows & Streamlines</span>
                  <span className="text-[9px] font-mono px-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                    {subsurfaceFlowPathways.length} Conduits
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={showSubsurfaceFlows}
                  onChange={e => setShowSubsurfaceFlows(e.target.checked)}
                  className="accent-emerald-400 rounded"
                />
              </label>

              {/* Yellow Boundary */}
              <label className="flex items-center justify-between gap-3 px-1.5 py-1 rounded hover:bg-slate-800/60 cursor-pointer">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 border-2 border-yellow-400 bg-yellow-400/20 rounded-sm"></span>
                  <span>Survey Boundary (Yellow)</span>
                </span>
                <input
                  type="checkbox"
                  checked={showBoundary}
                  onChange={e => setShowBoundary(e.target.checked)}
                  className="accent-yellow-400 rounded"
                />
              </label>

              {/* Bhuvan Cadastral Survey Numbers */}
              <label className="flex items-center justify-between gap-3 px-1.5 py-1 rounded hover:bg-slate-800/60 cursor-pointer">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 border border-dashed border-amber-400 bg-amber-400/20 rounded-sm"></span>
                  <span className="text-amber-300 font-medium">Bhuvan Survey Numbers (ISRO)</span>
                </span>
                <input
                  type="checkbox"
                  checked={showCadastral}
                  onChange={e => setShowCadastral(e.target.checked)}
                  className="accent-amber-400 rounded"
                />
              </label>

              {/* Top 3 Borewell Pins */}
              <label className="flex items-center justify-between gap-3 px-1.5 py-1 rounded hover:bg-slate-800/60 cursor-pointer">
                <span className="flex items-center gap-2">
                  <span className="flex gap-0.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  </span>
                  <span>Top 3 Candidate Pins</span>
                </span>
                <input
                  type="checkbox"
                  checked={showCandidates}
                  onChange={e => setShowCandidates(e.target.checked)}
                  className="accent-amber-400 rounded"
                />
              </label>

              {/* Historical Wells */}
              <label className="flex items-center justify-between gap-3 px-1.5 py-1 rounded hover:bg-slate-800/60 cursor-pointer">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-white"></span>
                  <span>Historical Borewells</span>
                </span>
                <input
                  type="checkbox"
                  checked={showHistoricalWells}
                  onChange={e => setShowHistoricalWells(e.target.checked)}
                  className="accent-emerald-400 rounded"
                />
              </label>
            </div>

            {/* Basemap Switcher */}
            <div className="pt-1.5 border-t border-slate-800 flex items-center gap-1">
              <button
                onClick={() => setBasemapType('satellite')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                  basemapType === 'satellite'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Satellite
              </button>
              <button
                onClick={() => setBasemapType('topo')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                  basemapType === 'topo'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                DEM Topo
              </button>
              <button
                onClick={() => setBasemapType('street')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                  basemapType === 'street'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Streets
              </button>
            </div>
          </>
        )}
      </div>

      {/* Map Legend (Bottom Right) */}
      <div className="absolute bottom-6 right-4 z-10 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl p-3 shadow-2xl text-xs space-y-2 max-w-xs transition-all duration-200">
        <div className="flex items-center justify-between pb-1 border-b border-slate-800 text-slate-300 font-semibold text-[11px] gap-4">
          <span
            className="text-cyan-400 font-bold uppercase tracking-wider cursor-pointer select-none flex items-center gap-1.5"
            onClick={() => setIsLegendMinimized(!isLegendMinimized)}
          >
            GIS Map Legend
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400">Symbology</span>
            <button
              onClick={() => setIsLegendMinimized(!isLegendMinimized)}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition"
              title={isLegendMinimized ? "Maximize Legend" : "Minimize Legend"}
              aria-label={isLegendMinimized ? "Maximize Legend" : "Minimize Legend"}
            >
              {isLegendMinimized ? (
                <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
              ) : (
                <Minimize2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Expandable Legend Content Body */}
        {!isLegendMinimized && (
          <div className="space-y-1.5 text-[11px] text-slate-300 pt-1">
                        {/* Master Inferred Subsurface Fracture Corridors */}
            <div className="flex items-center gap-2.5">
              <div className="w-7 border-b-2 border-dashed border-cyan-400 shadow-[0_0_8px_#00f3ff] shrink-0"></div>
              <div>
                <span className="text-cyan-300 font-semibold">Thick Dashed Cyan:</span>{' '}
                <span className="text-slate-200 font-medium">Master Inferred Subsurface Fractures</span>
                <p className="text-[10px] text-slate-400 leading-tight">Primary regional tectonic shear corridors & fault damage zones</p>
              </div>
            </div>

            {/* Inferred Subsurface Fracture Branches */}
            <div className="flex items-center gap-2.5">
              <div className="w-7 border-b border-dashed border-cyan-400 shadow-[0_0_5px_#00f3ff] shrink-0"></div>
              <div>
                <span className="text-cyan-300 font-semibold">Medium Dashed Cyan:</span>{' '}
                <span className="text-slate-200 font-medium">Inferred Fracture Branches</span>
                <p className="text-[10px] text-slate-400 leading-tight">Conjugate Riedel shear splays & secondary dilated joint conduits</p>
              </div>
            </div>

            {/* Tertiary Micro-Splays */}
            <div className="flex items-center gap-2.5">
              <div className="w-7 border-b border-dotted border-sky-400 shadow-[0_0_4px_#38bdf8] shrink-0"></div>
              <div>
                <span className="text-sky-300 font-semibold">Fine Dashed Sky-Blue:</span>{' '}
                <span className="text-slate-200 font-medium">Tertiary Joint Splays</span>
                <p className="text-[10px] text-slate-400 leading-tight">En-echelon micro-cracks & local extensional bedrock fractures</p>
              </div>
            </div>

            {/* Fracture Branch Intersection Hubs */}
            <div className="flex items-center gap-2.5">
              <div className="w-3.5 h-3.5 rotate-45 border-2 border-cyan-400 bg-slate-950 shadow-[0_0_8px_#00f3ff] shrink-0 flex items-center justify-center">
                <div className="w-1 h-1 bg-cyan-300"></div>
              </div>
              <div>
                <span className="text-cyan-300 font-semibold">Cyan Diamond Hub:</span>{' '}
                <span className="text-slate-200 font-medium">Fracture Intersection Nodes</span>
                <p className="text-[10px] text-slate-400 leading-tight">High-yield conjugate branch convergence hubs (+24x permeability)</p>
              </div>
            </div>

            {/* Surface Drainage Network Hierarchy */}
            <div className="pt-1 border-t border-slate-800/80">
              <span className="text-sky-400 font-bold text-[10.5px] block mb-1">Surface Drainage Channels (D8 Watershed Routing):</span>
              <div className="space-y-1 pl-0.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-1.5 bg-sky-500 shadow-[0_0_8px_#0284c7] rounded-full shrink-0 flex items-center justify-center">
                    <div className="w-5 h-0.5 bg-sky-200"></div>
                  </div>
                  <div>
                    <span className="text-sky-300 font-semibold">Thick Deep-Azure / Sky:</span>{' '}
                    <span className="text-slate-200">Order 1 Master Valley Thalweg</span>
                    <p className="text-[10px] text-slate-400 leading-tight">Perennial main nullah conveying regional storm runoff</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-1 bg-cyan-400 shadow-[0_0_5px_#06b6d4] rounded-full shrink-0"></div>
                  <div>
                    <span className="text-cyan-300 font-semibold">Solid Cyan:</span>{' '}
                    <span className="text-slate-200">Order 2 Tributary Streams</span>
                    <p className="text-[10px] text-slate-400 leading-tight">Collector creeks draining lateral valley sub-catchments</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-0.5 bg-sky-300 shrink-0"></div>
                  <div>
                    <span className="text-sky-200 font-semibold">Thin Sky-Blue:</span>{' '}
                    <span className="text-slate-200">Order 3 & 4 Feeder Gullies / Swale Rills</span>
                    <p className="text-[10px] text-slate-400 leading-tight">Colluvial rills capturing initial hillslope storm sheetwash</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Yellow Boundary */}
            <div className="flex items-center gap-2.5 pt-1 border-t border-slate-800/60">
              <div className="w-4 h-3 border-2 border-yellow-400 bg-yellow-400/20 rounded-sm shrink-0"></div>
              <div>
                <span className="text-yellow-300 font-semibold">Yellow Outline:</span>{' '}
                <span className="text-slate-300">Survey Parcel Boundary</span>
              </div>
            </div>

            {/* Bhuvan Cadastral */}
            <div className="flex items-center gap-2.5">
              <div className="w-4 h-3 border border-dashed border-amber-400 bg-amber-400/20 rounded-sm shrink-0 flex items-center justify-center text-[7px] font-mono text-amber-300 font-bold">Sy</div>
              <div>
                <span className="text-amber-400 font-semibold">Amber Dashed / Label:</span>{' '}
                <span className="text-slate-300">Bhuvan Cadastral Survey No.</span>
                <p className="text-[10px] text-slate-400 leading-tight">Land records & Sy. Nos from bhuvan.nrsc.gov.in</p>
              </div>
            </div>

            {/* Ranked Pins */}
            <div className="flex items-center gap-2.5">
              <div className="flex gap-1 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-1 ring-white"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-1 ring-white"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-1 ring-white"></span>
              </div>
              <div>
                <span className="text-white font-semibold">Pins (1, 2, 3):</span>{' '}
                <span className="text-slate-300">Ranked Borewell Drilling Sites</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Reference Style Banner Indicator (Bottom Left) */}
      <div className="absolute bottom-6 left-4 z-10 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-2 shadow-2xl flex items-center gap-3 text-xs">
        <div className="flex items-center gap-2 text-cyan-400 font-mono text-[11px]">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
          <span>WATERSHED DRAINAGE & FRACTURE NETWORKS ACTIVE</span>
        </div>
        <div className="h-3 w-px bg-slate-700"></div>
        {cursorCoords && (
          <div className="text-[11px] font-mono text-slate-300">
            LAT: <span className="text-white">{cursorCoords.lat}°</span> | LNG: <span className="text-white">{cursorCoords.lng}°</span>
          </div>
        )}
      </div>

      {/* Compass / North Arrow Indicator (Top Right below zoom) */}
      <div className="absolute top-24 right-4 z-10 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-full w-9 h-9 flex items-center justify-center shadow-xl text-slate-200">
        <div className="flex flex-col items-center">
          <span className="text-[9px] font-black text-rose-500 leading-none">N</span>
          <Compass className="w-4 h-4 text-slate-300" />
        </div>
      </div>
    </div>
  );
};
