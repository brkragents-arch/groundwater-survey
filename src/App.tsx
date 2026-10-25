import React, { useState, useMemo, useEffect } from 'react';
import {
  BorewellCandidate,
  BranchingPathway,
  SurveyBoundary,
  MCDAWeights,
  HistoricalWellRecord,
  CadastralParcel,
} from './types/hydrogeology';
import { PRESET_LOCATIONS, PresetLocation } from './data/presetSurveys';
import { generateHydrologyAndDrainage, HydrologyAnalysisResult } from './services/demHydrology';
import { rankTop3BorewellPoints } from './services/borewellRanker';
import { generateBhuvanCadastralParcels } from './services/cadastralBhuvanService';
import { DEFAULT_MCDA_WEIGHTS } from './services/mcdaEngine';
import { MapView } from './components/MapView';
import { LeftPanel } from './components/LeftPanel';
import { RightPanel } from './components/RightPanel';
import { ComparisonModal } from './components/ComparisonModal';
import { GeophysicsModal } from './components/GeophysicsModal';
import { HistoricalWellsModal } from './components/HistoricalWellsModal';
import { ReportModal } from './components/ReportModal';
import { ReferenceStyleModal } from './components/ReferenceStyleModal';
import { calculatePolygonGeodesicArea } from './utils/gisCalculations';
import { Compass, Sparkles, Layers, ShieldCheck, Download, AlertCircle, RefreshCw, Waves } from 'lucide-react';

export function App() {
  // Active Preset Site
  const [selectedPreset, setSelectedPreset] = useState<PresetLocation>(PRESET_LOCATIONS[0]);

  // Current Survey Boundary
  const [boundary, setBoundary] = useState<SurveyBoundary>(PRESET_LOCATIONS[0].defaultBoundary);

  // AHP Criteria Weights
  const [weights, setWeights] = useState<MCDAWeights>(DEFAULT_MCDA_WEIGHTS);

  // Historical Field Wells
  const [historicalWells, setHistoricalWells] = useState<HistoricalWellRecord[]>(
    PRESET_LOCATIONS[0].historicalWells
  );

  // Bhuvan Cadastral Parcels & Survey Numbers (ISRO/NRSC)
  const [cadastralParcels, setCadastralParcels] = useState<CadastralParcel[]>(() =>
    generateBhuvanCadastralParcels(PRESET_LOCATIONS[0].defaultBoundary, PRESET_LOCATIONS[0].name)
  );

  // Hydrology Analysis and Candidate State
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [hydrologyResult, setHydrologyResult] = useState<HydrologyAnalysisResult>(() =>
    generateHydrologyAndDrainage(
      PRESET_LOCATIONS[0].defaultBoundary.center[0],
      PRESET_LOCATIONS[0].defaultBoundary.center[1],
      PRESET_LOCATIONS[0].defaultBoundary.coordinates
    )
  );

  const [candidates, setCandidates] = useState<BorewellCandidate[]>(() => {
    const hydro = generateHydrologyAndDrainage(
      PRESET_LOCATIONS[0].defaultBoundary.center[0],
      PRESET_LOCATIONS[0].defaultBoundary.center[1],
      PRESET_LOCATIONS[0].defaultBoundary.coordinates
    );
    const parcels = generateBhuvanCadastralParcels(
      PRESET_LOCATIONS[0].defaultBoundary,
      PRESET_LOCATIONS[0].name
    );
    return rankTop3BorewellPoints(
      PRESET_LOCATIONS[0].defaultBoundary.coordinates,
      PRESET_LOCATIONS[0].defaultBoundary.center,
      hydro,
      DEFAULT_MCDA_WEIGHTS,
      PRESET_LOCATIONS[0].referenceLithology,
      PRESET_LOCATIONS[0].historicalWells,
      PRESET_LOCATIONS[0].rainfallAnnualMm,
      parcels
    );
  });

  // Selected candidate for detailed focus
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>('BW-01');

  // Interactive Drawing Mode
  const [isDrawingMode, setIsDrawingMode] = useState<boolean>(false);

  // Modals state
  const [isComparisonOpen, setIsComparisonOpen] = useState<boolean>(false);
  const [isGeophysicsOpen, setIsGeophysicsOpen] = useState<boolean>(false);
  const [geophysicsCandidate, setGeophysicsCandidate] = useState<BorewellCandidate | null>(null);
  const [isHistoricalOpen, setIsHistoricalOpen] = useState<boolean>(false);
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);
  const [isReferenceStyleOpen, setIsReferenceStyleOpen] = useState<boolean>(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(
    'AQUASYNC AI Geologist loaded. Inferred subsurface fracture branches and prime drilling hubs active.'
  );

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Handle Preset Selection
  const handleSelectPreset = (preset: PresetLocation) => {
    setSelectedPreset(preset);
    setBoundary(preset.defaultBoundary);
    setHistoricalWells(preset.historicalWells);

    setIsAnalyzing(true);
    setTimeout(() => {
      const hydro = generateHydrologyAndDrainage(
        preset.defaultBoundary.center[0],
        preset.defaultBoundary.center[1],
        preset.defaultBoundary.coordinates
      );
      setHydrologyResult(hydro);

      const parcels = generateBhuvanCadastralParcels(preset.defaultBoundary, preset.name);
      setCadastralParcels(parcels);

      const top3 = rankTop3BorewellPoints(
        preset.defaultBoundary.coordinates,
        preset.defaultBoundary.center,
        hydro,
        weights,
        preset.referenceLithology,
        preset.historicalWells,
        preset.rainfallAnnualMm,
        parcels
      );
      setCandidates(top3);
      setSelectedCandidateId(top3[0]?.id || null);
      setIsAnalyzing(false);
      setToastMessage(`Switched to ${preset.name}. Bhuvan cadastral parcels and candidate points loaded.`);
    }, 400);
  };

  // Re-run Analysis triggered manually or on weight / boundary updates
  const handleTriggerAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      const hydro = generateHydrologyAndDrainage(
        boundary.center[0],
        boundary.center[1],
        boundary.coordinates
      );
      setHydrologyResult(hydro);

      const parcels = generateBhuvanCadastralParcels(boundary, selectedPreset.name);
      setCadastralParcels(parcels);

      const top3 = rankTop3BorewellPoints(
        boundary.coordinates,
        boundary.center,
        hydro,
        weights,
        selectedPreset.referenceLithology,
        historicalWells,
        selectedPreset.rainfallAnnualMm,
        parcels
      );
      setCandidates(top3);
      setSelectedCandidateId(top3[0]?.id || null);
      setIsAnalyzing(false);
      setToastMessage('AI Geologist Analysis complete. Top 3 candidate points updated.');
    }, 500);
  };

  // Re-analyse Subsurface Groundwater Flows with High-Resolution Dupuit-Darcy Model
  const handleReanalyseSubsurfaceFlows = () => {
    setIsAnalyzing(true);
    setToastMessage('Re-analysing 3D subsurface groundwater flows, Darcy flux & hydraulic gradient...');
    setTimeout(() => {
      // Run high-resolution 32x32 Dupuit-Darcy hydrodynamic simulation
      const hydro = generateHydrologyAndDrainage(
        boundary.center[0],
        boundary.center[1],
        boundary.coordinates,
        32
      );
      setHydrologyResult(hydro);

      const parcels = generateBhuvanCadastralParcels(boundary, selectedPreset.name);
      setCadastralParcels(parcels);

      const top3 = rankTop3BorewellPoints(
        boundary.coordinates,
        boundary.center,
        hydro,
        weights,
        selectedPreset.referenceLithology,
        historicalWells,
        selectedPreset.rainfallAnnualMm,
        parcels
      );
      setCandidates(top3);
      setSelectedCandidateId(top3[0]?.id || null);
      setIsAnalyzing(false);
      setToastMessage(
        `Subsurface fractures & flows re-analysed: ${hydro.fractureAnalysis?.totalMasterFractures || 5} master corridors, ${hydro.fractureAnalysis?.totalFractureBranches || 15} branches & ${hydro.fractureIntersectionNodes?.length || 0} high-yield drilling hubs mapped.`
      );
    }, 600);
  };

  // Update boundary from upload or coordinates
  const handleUpdateBoundary = (newBoundary: SurveyBoundary) => {
    // Recalculate true geodesic area and perimeter from coordinates
    const geo = calculatePolygonGeodesicArea(newBoundary.coordinates);
    const calibratedBoundary: SurveyBoundary = {
      ...newBoundary,
      areaAcres: geo.areaAcres,
      areaHectares: geo.areaHectares,
      perimeterKm: geo.perimeterKm,
    };

    setBoundary(calibratedBoundary);
    setIsAnalyzing(true);
    setTimeout(() => {
      const hydro = generateHydrologyAndDrainage(
        calibratedBoundary.center[0],
        calibratedBoundary.center[1],
        calibratedBoundary.coordinates
      );
      setHydrologyResult(hydro);

      const parcels = generateBhuvanCadastralParcels(calibratedBoundary, selectedPreset.name);
      setCadastralParcels(parcels);

      const top3 = rankTop3BorewellPoints(
        calibratedBoundary.coordinates,
        calibratedBoundary.center,
        hydro,
        weights,
        selectedPreset.referenceLithology,
        historicalWells,
        selectedPreset.rainfallAnnualMm,
        parcels
      );
      setCandidates(top3);
      setSelectedCandidateId(top3[0]?.id || null);
      setIsAnalyzing(false);
      setToastMessage(`Survey parcel updated: ${calibratedBoundary.name} (${calibratedBoundary.areaAcres} Acres)`);
    }, 500);
  };

  // Finished polygon drawing directly on map
  const handlePolygonDrawn = (coords: [number, number][]) => {
    setIsDrawingMode(false);
    const avgLat = coords.reduce((a, b) => a + b[0], 0) / coords.length;
    const avgLng = coords.reduce((a, b) => a + b[1], 0) / coords.length;

    // Calculate exact geodetic area from drawn coordinates
    const geo = calculatePolygonGeodesicArea(coords);

    const drawnBoundary: SurveyBoundary = {
      id: `drawn-${Date.now()}`,
      name: `User Drawn Parcel (${coords.length} Vertices)`,
      center: [avgLat, avgLng],
      coordinates: coords,
      areaHectares: geo.areaHectares,
      areaAcres: geo.areaAcres,
      perimeterKm: geo.perimeterKm,
      stateDistrict: selectedPreset.region,
    };

    handleUpdateBoundary(drawnBoundary);
  };

  const handleOpenGeophysics = (candidate: BorewellCandidate) => {
    setGeophysicsCandidate(candidate);
    setIsGeophysicsOpen(true);
  };

  const handleAddHistoricalWell = (newWell: HistoricalWellRecord) => {
    setHistoricalWells(prev => [newWell, ...prev]);
    setToastMessage(`Logged borewell ${newWell.id}. Calibrating model...`);
    handleTriggerAnalysis();
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Main Navigation Bar */}
      <header className="h-14 bg-slate-950 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 z-30 select-none">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Compass className="w-5 h-5 text-slate-950 font-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm tracking-wide text-white">AQUASYNC</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold border border-cyan-500/30">
                SATELLITE GROUNDWATER SURVEY SYSTEM
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-2">
              <span>Active Site: <strong className="text-slate-200">{selectedPreset.name}</strong></span>
              <span className="text-slate-600">•</span>
              <span>Lithology: <strong className="text-cyan-400">{selectedPreset.referenceLithology.split('(')[0]}</strong></span>
            </div>
          </div>
        </div>

        {/* Center Quick Switch for User History Locations */}
        <div className="hidden md:flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 p-1 rounded-xl text-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider px-2">History:</span>
          {PRESET_LOCATIONS.slice(0, 3).map(loc => {
            const isSelected = selectedPreset.id === loc.id;
            return (
              <button
                key={loc.id}
                onClick={() => handleSelectPreset(loc)}
                className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-cyan-400' : 'bg-slate-600'}`}></span>
                <span>{loc.name}</span>
              </button>
            );
          })}
        </div>

        {/* Right Tools */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleReanalyseSubsurfaceFlows}
            disabled={isAnalyzing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/50 hover:border-cyan-400 transition shadow-sm disabled:opacity-50"
            title="Re-analyse 3D Dupuit-Darcy subsurface groundwater flows and hydraulic potential"
          >
            <Waves className={`w-3.5 h-3.5 text-cyan-400 ${isAnalyzing ? 'animate-pulse' : ''}`} />
            <span className="hidden sm:inline">Re-analyse Subsurface Flows</span>
            <span className="sm:hidden">Subsurface</span>
          </button>

          <button
            onClick={() => setIsReferenceStyleOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 transition shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reference Style</span>
          </button>

          <button
            onClick={() => setIsReportOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-md shadow-cyan-500/20 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Survey Report</span>
          </button>
        </div>
      </header>

      {/* Main 3-Panel GIS Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Panel: Survey Setup & Controls */}
        <LeftPanel
          boundary={boundary}
          onUpdateBoundary={handleUpdateBoundary}
          weights={weights}
          onUpdateWeights={newW => {
            setWeights(newW);
            handleTriggerAnalysis();
          }}
          onSelectPreset={handleSelectPreset}
          selectedPresetId={selectedPreset.id}
          isAnalyzing={isAnalyzing}
          onTriggerAnalysis={handleTriggerAnalysis}
          onStartDrawing={() => setIsDrawingMode(true)}
          isDrawingMode={isDrawingMode}
          provenanceList={selectedPreset.provenance}
          onOpenReferenceImageModal={() => setIsReferenceStyleOpen(true)}
          cadastralParcels={cadastralParcels}
        />

        {/* Center Panel: Interactive Satellite GIS Map */}
        <div className="flex-1 h-full relative">
          <MapView
            boundary={boundary}
            candidates={candidates}
            pathways={hydrologyResult.pathways}
            cadastralParcels={cadastralParcels}
            selectedCandidateId={selectedCandidateId}
            onSelectCandidate={id => setSelectedCandidateId(id)}
            historicalWells={historicalWells}
            isDrawingMode={isDrawingMode}
            onPolygonDrawn={handlePolygonDrawn}
            onCancelDraw={() => setIsDrawingMode(false)}
            fractureIntersectionNodes={hydrologyResult.fractureIntersectionNodes}
            fractureAnalysis={hydrologyResult.fractureAnalysis}
          />

          {/* Toast Notification Banner */}
          {toastMessage && (
            <div className="absolute top-4 right-16 z-30 bg-slate-900/95 text-slate-100 px-4 py-2 rounded-xl border border-cyan-500/40 shadow-2xl backdrop-blur-md text-xs flex items-center gap-2 animate-fade-in">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>{toastMessage}</span>
            </div>
          )}
        </div>

        {/* Right Panel: Top 3 Candidate Assessment Cards */}
        <RightPanel
          candidates={candidates}
          selectedCandidateId={selectedCandidateId}
          onSelectCandidate={id => setSelectedCandidateId(id)}
          boundary={boundary}
          onOpenComparisonModal={() => setIsComparisonOpen(true)}
          onOpenGeophysicsModal={handleOpenGeophysics}
          onOpenHistoricalModal={() => setIsHistoricalOpen(true)}
          onOpenReportModal={() => setIsReportOpen(true)}
          hydrologyResult={hydrologyResult}
          onReanalyseSubsurfaceFlows={handleReanalyseSubsurfaceFlows}
        />
      </div>

      {/* Modals */}
      <ComparisonModal
        isOpen={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
        candidates={candidates}
      />

      <GeophysicsModal
        isOpen={isGeophysicsOpen}
        onClose={() => setIsGeophysicsOpen(false)}
        candidate={geophysicsCandidate}
      />

      <HistoricalWellsModal
        isOpen={isHistoricalOpen}
        onClose={() => setIsHistoricalOpen(false)}
        wells={historicalWells}
        onAddWell={handleAddHistoricalWell}
      />

      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        boundary={boundary}
        candidates={candidates}
        pathways={hydrologyResult.pathways}
        weights={weights}
        provenanceList={selectedPreset.provenance}
        historicalWells={historicalWells}
      />

      <ReferenceStyleModal
        isOpen={isReferenceStyleOpen}
        onClose={() => setIsReferenceStyleOpen(false)}
      />
    </div>
  );
}

export default App;
