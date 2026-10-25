import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  BorewellCandidate,
  BranchingPathway,
  SurveyBoundary,
  HistoricalWellRecord,
  CadastralParcel,
  SubsurfaceFlowContour,
} from '../types/hydrogeology';
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
  contours?: SubsurfaceFlowContour[];
  cadastralParcels: CadastralParcel[];
  selectedCandidateId: string | null;
  onSelectCandidate: (id: string) => void;
  historicalWells: HistoricalWellRecord[];
  isDrawingMode: boolean;
  onPolygonDrawn: (coords: [number, number][]) => void;
  onCancelDraw: () => void;
}

export const MapView: React.FC<MapViewProps> = ({
  boundary,
  candidates,
  pathways,
  contours = [],
  cadastralParcels,
  selectedCandidateId,
  onSelectCandidate,
  historicalWells,
  isDrawingMode,
  onPolygonDrawn,
  onCancelDraw,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Layer groups refs
  const boundaryLayerRef = useRef<L.LayerGroup | null>(null);
  const cadastralLayerRef = useRef<L.LayerGroup | null>(null);
  const pathwaysLayerRef = useRef<L.LayerGroup | null>(null);
  const contoursLayerRef = useRef<L.LayerGroup | null>(null);
  const candidatesLayerRef = useRef<L.LayerGroup | null>(null);
  const wellsLayerRef = useRef<L.LayerGroup | null>(null);
  const drawLayerRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Layer visibility toggles
  const [showSatellite, setShowSatellite] = useState(true);
  const [showCyanNetwork, setShowCyanNetwork] = useState(true);
  const [showContours, setShowContours] = useState(true);
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
    contoursLayerRef.current = L.layerGroup().addTo(map);
    pathwaysLayerRef.current = L.layerGroup().addTo(map);
    candidatesLayerRef.current = L.layerGroup().addTo(map);
    wellsLayerRef.current = L.layerGroup().addTo(map);
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

  // Render Cyan Branching Network (Drainage & Lineament Pathways matching reference image)
  useEffect(() => {
    if (!pathwaysLayerRef.current) return;
    pathwaysLayerRef.current.clearLayers();
    if (!showCyanNetwork) return;

    pathways.forEach(pw => {
      const isSubsurface = pw.type === 'inferred_fracture' || pw.type === 'palaeochannel' || pw.type === 'subsurface_flow' || pw.type === 'sub_pathway' || pw.type === 'recharge_zone';

      // Stream order thickness hierarchy matching reference image:
      // Order 1 (major trunk): 3.8px
      // Order 2 (secondary branch): 2.6px
      // Order 3 (tertiary sub-pathway): 1.8px
      // Order 4 (micro-feeder twig): 1.3px
      let weight = 2.4;
      if (pw.streamOrder === 1) weight = 3.8;
      else if (pw.streamOrder === 2) weight = 2.6;
      else if (pw.streamOrder === 3) weight = 1.8;
      else weight = 1.3;

      const polyline = L.polyline(pw.coordinates, {
        color: '#00f3ff', // Radiant solid cyan matching reference image
        weight,
        opacity: 0.96,
        className: 'cyan-network-glow',
      });

      const title = pw.type === 'subsurface_flow'
        ? 'Subsurface Groundwater Flow Pathway (Darcy Flow)'
        : pw.type === 'sub_pathway'
        ? `Tributary Sub-Pathway Branch (Order ${pw.streamOrder})`
        : pw.type === 'recharge_zone'
        ? 'Recharge Zone Infiltration Swale'
        : pw.type === 'palaeochannel'
        ? 'Buried Palaeochannel Aquifer Corridor'
        : pw.type === 'inferred_fracture'
        ? 'Tectonic Structural Fracture Corridor'
        : `Primary Drainage Pathway (Order ${pw.streamOrder})`;

      polyline.bindPopup(`
        <div class="p-3 text-xs font-sans text-slate-100 bg-slate-950 border border-cyan-500/40 rounded-xl shadow-2xl min-w-[240px]">
          <div class="flex items-center gap-1.5 font-bold text-cyan-400 mb-1.5 border-b border-slate-800 pb-1">
            <span class="inline-block w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>${title}</span>
          </div>
          <div class="text-slate-300 text-[11px] mb-2 leading-relaxed">${pw.description}</div>
          <div class="grid grid-cols-2 gap-1.5 text-[10.5px] pt-1.5 border-t border-slate-800/80">
            <div>Confidence: <span class="text-slate-200 font-semibold">${pw.confidence}</span></div>
            <div>Flow Score: <span class="text-cyan-300 font-mono font-bold">${pw.flowAccumulationScore}</span></div>
            ${pw.flowVelocityMPerDay !== undefined ? `<div>Darcy Velocity: <span class="text-emerald-300 font-mono font-bold">${pw.flowVelocityMPerDay} m/day</span></div>` : ''}
            ${pw.hydraulicGradient !== undefined ? `<div>Hydraulic Grad: <span class="text-cyan-200 font-mono">${pw.hydraulicGradient} m/m</span></div>` : ''}
            ${pw.depthToWaterM !== undefined ? `<div>Water Table Depth: <span class="text-amber-300 font-mono font-bold">~${pw.depthToWaterM} m bgl</span></div>` : ''}
            ${pw.darcyFluxM3PerDay !== undefined ? `<div>Darcy Flux: <span class="text-blue-300 font-mono font-bold">${pw.darcyFluxM3PerDay} m³/day</span></div>` : ''}
          </div>
        </div>
      `);

      polyline.addTo(pathwaysLayerRef.current!);
    });
  }, [pathways, showCyanNetwork]);

  // Render Subsurface Groundwater Flow & Hydraulic Head Contours
  // Clearly visible contours matching the perspective satellite reference image!
  useEffect(() => {
    if (!contoursLayerRef.current) return;
    contoursLayerRef.current.clearLayers();
    if (!showContours || !contours || contours.length === 0) return;

    contours.forEach(contour => {
      const isIndex = contour.isIndexContour;

      // Subtle, elegant sky blue/cyan contour styling
      const polyline = L.polyline(contour.coordinates, {
        color: isIndex ? '#38bdf8' : '#0ea5e9', // Sky blue for index, cyan for intermediate
        weight: isIndex ? 1.8 : 1.1,
        opacity: isIndex ? 0.75 : 0.45,
        dashArray: isIndex ? undefined : '5, 4',
      });

      polyline.bindTooltip(
        `<div class="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-slate-950 text-cyan-300 border border-cyan-500/50 rounded shadow-md">
          Head Equipotential: ${contour.elevationM}m AMSL | Depth: ~${contour.depthBglM}m bgl
        </div>`,
        { sticky: true, className: 'contour-tooltip' }
      );

      polyline.addTo(contoursLayerRef.current!);

      // Small elevation badge on index contours
      if (isIndex && contour.coordinates.length >= 4) {
        const midIdx = Math.floor(contour.coordinates.length / 2);
        const midPt = contour.coordinates[midIdx];

        const labelIcon = L.divIcon({
          className: 'contour-label-marker',
          html: `
            <div class="bg-slate-950/90 text-sky-300 border border-sky-400/50 font-mono font-bold text-[8.5px] px-1.5 py-0.2 rounded shadow whitespace-nowrap -translate-x-1/2 -translate-y-1/2">
              ${contour.elevationM}m
            </div>
          `,
          iconSize: [0, 0],
        });

        const labelMarker = L.marker(midPt, { icon: labelIcon, interactive: false });
        labelMarker.addTo(contoursLayerRef.current!);
      }
    });
  }, [contours, showContours]);

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
              {/* Cyan Branching Network */}
              <label className="flex items-center justify-between gap-3 px-1.5 py-1 rounded hover:bg-slate-800/60 cursor-pointer">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-0.5 bg-cyan-400 shadow-[0_0_6px_#00f3ff]"></span>
                  <span>Cyan Drainage & Lineaments</span>
                </span>
                <input
                  type="checkbox"
                  checked={showCyanNetwork}
                  onChange={e => setShowCyanNetwork(e.target.checked)}
                  className="accent-cyan-400 rounded"
                />
              </label>

              {/* Subsurface Flow & Hydraulic Head Contours */}
              <label className="flex items-center justify-between gap-3 px-1.5 py-1 rounded hover:bg-slate-800/60 cursor-pointer">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-0.5 bg-sky-400 shadow-[0_0_4px_#38bdf8]"></span>
                  <span className="text-sky-300 font-medium">Subsurface Flow Contours</span>
                </span>
                <input
                  type="checkbox"
                  checked={showContours}
                  onChange={e => setShowContours(e.target.checked)}
                  className="accent-sky-400 rounded"
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
            {/* Solid Cyan Line */}
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-0.5 bg-cyan-400 shadow-[0_0_8px_#00f3ff] rounded-full shrink-0"></div>
              <div>
                <span className="text-cyan-300 font-semibold">Solid Cyan:</span>{' '}
                <span className="text-slate-300">Surface Drainage & Flow Pathways</span>
                <p className="text-[10px] text-slate-400 leading-tight">Terrain convergence channels, nullahs & runoff gullies (D8 flow routing)</p>
              </div>
            </div>

            {/* Dashed Cyan Line */}
            <div className="flex items-center gap-2.5">
              <div className="w-7 border-b-2 border-dashed border-cyan-400 shadow-[0_0_8px_#00f3ff] shrink-0"></div>
              <div>
                <span className="text-cyan-300 font-semibold">Dashed Cyan:</span>{' '}
                <span className="text-slate-300">Inferred Subsurface Fractures</span>
                <p className="text-[10px] text-slate-400 leading-tight">Tectonic shear corridors, lineaments & palaeochannels (requires VES confirmation)</p>
              </div>
            </div>

            {/* Subsurface Flow & Hydraulic Head Contours */}
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-0.5 bg-sky-400 shadow-[0_0_6px_#38bdf8] rounded-full shrink-0"></div>
              <div>
                <span className="text-sky-300 font-semibold">Sky Blue Contours:</span>{' '}
                <span className="text-slate-300">Subsurface Hydraulic Head Equipotentials</span>
                <p className="text-[10px] text-slate-400 leading-tight">Groundwater table elevation contours (H = Z - Dwt); flow is perpendicular to lines</p>
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
          <span>AQUASYNC REFERENCE OVERLAY ACTIVE</span>
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
