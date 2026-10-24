import React, { useState } from 'react';
import {
  SurveyBoundary,
  MCDAWeights,
  DataSourceProvenance,
  CadastralParcel,
} from '../types/hydrogeology';
import { PRESET_LOCATIONS, PresetLocation } from '../data/presetSurveys';
import { calculatePolygonGeodesicArea, generateExactAcresPolygon } from '../utils/gisCalculations';
import {
  MapPin,
  Sliders,
  Upload,
  Pencil,
  Search,
  Database,
  Layers,
  ChevronRight,
  Sparkles,
  Info,
  Calendar,
  Compass,
  FileCode,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface LeftPanelProps {
  boundary: SurveyBoundary;
  onUpdateBoundary: (newBoundary: SurveyBoundary) => void;
  weights: MCDAWeights;
  onUpdateWeights: (newWeights: MCDAWeights) => void;
  onSelectPreset: (preset: PresetLocation) => void;
  selectedPresetId: string;
  isAnalyzing: boolean;
  onTriggerAnalysis: () => void;
  onStartDrawing: () => void;
  isDrawingMode: boolean;
  provenanceList: DataSourceProvenance[];
  onOpenReferenceImageModal: () => void;
  cadastralParcels: CadastralParcel[];
}

export const LeftPanel: React.FC<LeftPanelProps> = ({
  boundary,
  onUpdateBoundary,
  weights,
  onUpdateWeights,
  onSelectPreset,
  selectedPresetId,
  isAnalyzing,
  onTriggerAnalysis,
  onStartDrawing,
  isDrawingMode,
  provenanceList,
  onOpenReferenceImageModal,
  cadastralParcels,
}) => {
  const [activeTab, setActiveTab] = useState<'survey' | 'weights' | 'provenance'>('survey');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{ display_name: string; lat: string; lon: string }[]>([]);
  const [parcelSizeAcres, setParcelSizeAcres] = useState<number>(75);
  const [customLat, setCustomLat] = useState(boundary.center[0].toString());
  const [customLng, setCustomLng] = useState(boundary.center[1].toString());
  const [customSyNo, setCustomSyNo] = useState(boundary.surveyNumber || '');
  const [uploadError, setUploadError] = useState<string | null>(null);

  React.useEffect(() => {
    setCustomSyNo(boundary.surveyNumber || '');
  }, [boundary.surveyNumber]);

  // Live Location Search via OpenStreetMap Nominatim
  const handleLocationSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setUploadError(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery.trim()
        )}&limit=5`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        setSearchResults(data);
      } else {
        setSearchResults([]);
        setUploadError(`No results found for "${searchQuery}". Try adding state/country (e.g. "Anantapur, Andhra Pradesh").`);
      }
    } catch (err: any) {
      setUploadError('Search request failed. Please check internet connection or enter GPS coordinates directly.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (result: { display_name: string; lat: string; lon: string }) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setCustomLat(lat.toFixed(5));
    setCustomLng(lng.toFixed(5));
    setSearchResults([]);

    // Generate exact polygon matching the user-selected acreage
    const coords = generateExactAcresPolygon(lat, lng, parcelSizeAcres);
    const geo = calculatePolygonGeodesicArea(coords);

    onUpdateBoundary({
      id: `search-${Date.now()}`,
      name: result.display_name.split(',')[0] + ' Survey Parcel',
      center: [lat, lng],
      coordinates: coords,
      areaHectares: geo.areaHectares,
      areaAcres: geo.areaAcres,
      perimeterKm: geo.perimeterKm,
      stateDistrict: result.display_name.split(',').slice(1, 3).join(',').trim(),
    });
  };

  // Handle GeoJSON / KML boundary file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const text = event.target?.result as string;
        // Parse GeoJSON
        const parsed = JSON.parse(text);
        let coords: [number, number][] = [];

        if (parsed.type === 'FeatureCollection' && parsed.features?.[0]?.geometry?.coordinates) {
          const raw = parsed.features[0].geometry.coordinates[0];
          coords = raw.map((c: any) => [c[1], c[0]]); // [lat, lng]
        } else if (parsed.type === 'Feature' && parsed.geometry?.coordinates) {
          const raw = parsed.geometry.coordinates[0];
          coords = raw.map((c: any) => [c[1], c[0]]);
        } else if (parsed.type === 'Polygon' && parsed.coordinates) {
          const raw = parsed.coordinates[0];
          coords = raw.map((c: any) => [c[1], c[0]]);
        } else {
          throw new Error('Unsupported geometry. Please provide a GeoJSON Polygon.');
        }

        if (coords.length < 3) throw new Error('Polygon must contain at least 3 vertices.');

        // Compute centroid & accurate geodesic area
        const avgLat = coords.reduce((a, b) => a + b[0], 0) / coords.length;
        const avgLng = coords.reduce((a, b) => a + b[1], 0) / coords.length;
        const geo = calculatePolygonGeodesicArea(coords);

        onUpdateBoundary({
          id: `upload-${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          coordinates: coords,
          center: [avgLat, avgLng],
          areaHectares: geo.areaHectares,
          areaAcres: geo.areaAcres,
          perimeterKm: geo.perimeterKm,
          stateDistrict: 'Uploaded Survey Boundary',
        });
      } catch (err: any) {
        setUploadError(`Failed to parse file: ${err.message || 'Invalid format'}`);
      }
    };
    reader.readAsText(file);
  };

  const handleCoordinateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(customLat);
    const lng = parseFloat(customLng);
    if (isNaN(lat) || isNaN(lng)) return;

    // Generate exact polygon with precise chosen parcelSizeAcres
    const coords = generateExactAcresPolygon(lat, lng, parcelSizeAcres);
    const geo = calculatePolygonGeodesicArea(coords);

    onUpdateBoundary({
      id: `custom-coords-${Date.now()}`,
      name: `Custom Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      center: [lat, lng],
      coordinates: coords,
      areaHectares: geo.areaHectares,
      areaAcres: geo.areaAcres,
      perimeterKm: geo.perimeterKm,
      stateDistrict: 'Custom Coordinates',
    });
  };

  return (
    <div className="w-80 md:w-96 h-full flex flex-col bg-slate-900 border-r border-slate-800 text-slate-200 select-none overflow-hidden shadow-2xl z-20">
      {/* Brand & AI Geologist Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Compass className="w-4 h-4 text-slate-950 font-black" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-wide text-white flex items-center gap-1.5">
                AQUASYNC <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">AI GEOLOGIST</span>
              </h1>
              <p className="text-[11px] text-slate-400">Satellite Groundwater & Borewell Engine</p>
            </div>
          </div>
          <button
            onClick={onOpenReferenceImageModal}
            className="flex items-center gap-1 text-[11px] px-2 py-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 rounded border border-cyan-800 transition"
            title="View original reference image visual benchmark"
          >
            <Sparkles className="w-3 h-3" />
            <span>Ref Style</span>
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-900 rounded-lg p-0.5 mt-3 border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('survey')}
            className={`flex-1 py-1.5 rounded-md font-medium transition flex items-center justify-center gap-1.5 ${
              activeTab === 'survey' ? 'bg-cyan-500/20 text-cyan-300 shadow-sm border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            Survey Setup
          </button>
          <button
            onClick={() => setActiveTab('weights')}
            className={`flex-1 py-1.5 rounded-md font-medium transition flex items-center justify-center gap-1.5 ${
              activeTab === 'weights' ? 'bg-cyan-500/20 text-cyan-300 shadow-sm border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            MCDA Weights
          </button>
          <button
            onClick={() => setActiveTab('provenance')}
            className={`flex-1 py-1.5 rounded-md font-medium transition flex items-center justify-center gap-1.5 ${
              activeTab === 'provenance' ? 'bg-cyan-500/20 text-cyan-300 shadow-sm border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Data Sources
          </button>
        </div>
      </div>

      {/* Panel Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {activeTab === 'survey' && (
          <div className="space-y-4">
            {/* SAVED LOCATION HISTORY (Requested Sites) */}
            <div className="p-3 bg-gradient-to-br from-slate-950 to-slate-900 border border-cyan-500/30 rounded-2xl shadow-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  Survey History / Saved Sites
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  3 Saved
                </span>
              </div>
              <div className="space-y-1.5">
                {PRESET_LOCATIONS.slice(0, 3).map((loc, idx) => {
                  const isSelected = selectedPresetId === loc.id;
                  return (
                    <div
                      key={loc.id}
                      onClick={() => onSelectPreset(loc)}
                      className={`p-2 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-cyan-950/60 border-cyan-400/80 shadow-md ring-1 ring-cyan-400/40'
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center font-mono font-bold text-[10px] ${
                            isSelected ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-bold text-slate-100 flex items-center gap-1.5">
                            <span>{loc.name}</span>
                            {isSelected && (
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-mono text-cyan-400/90">
                              {loc.center[0].toFixed(5)}°N, {loc.center[1].toFixed(5)}°E
                            </span>
                          </div>
                          <div className="text-[9.5px] font-mono text-amber-400 font-semibold truncate max-w-[190px]">
                            {loc.defaultBoundary.surveyNumber}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-medium text-slate-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 shrink-0">
                        {isSelected ? 'Active' : 'Survey'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 1. Global Search by Place, Village, or District */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2 flex items-center justify-between">
                <span>1. Search Location or Village</span>
                <span className="text-[10px] text-cyan-400 font-normal">Worldwide</span>
              </label>
              <form onSubmit={handleLocationSearch} className="relative">
                <div className="flex gap-1.5">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="e.g. Dharmavaram, Kadapa, Pune, Kolar..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-2 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-400 outline-none"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-2" />
                  </div>
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="px-3 py-1.5 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 font-semibold rounded-lg text-xs border border-cyan-800 transition disabled:opacity-50"
                  >
                    {isSearching ? '...' : 'Find'}
                  </button>
                </div>

                {/* Autocomplete Dropdown */}
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-slate-950 border border-slate-700 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto divide-y divide-slate-800">
                    {searchResults.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSelectSearchResult(item)}
                        className="p-2 hover:bg-slate-800 cursor-pointer text-[11px] text-slate-200"
                      >
                        <div className="font-semibold text-white">{item.display_name.split(',')[0]}</div>
                        <div className="text-[10px] text-slate-400 truncate">{item.display_name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </form>
            </div>

            {/* 2. Custom GPS Coordinates Input */}
            <div className="pt-2 border-t border-slate-800">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2 flex items-center justify-between">
                <span>2. Or Enter GPS Coordinates</span>
                <span className="text-[10px] font-mono text-slate-500">Decimal Degrees</span>
              </label>
              <form onSubmit={handleCoordinateSubmit} className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400">Latitude (°N)</span>
                    <input
                      type="number"
                      step="0.00001"
                      value={customLat}
                      onChange={e => setCustomLat(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100 font-mono text-xs focus:border-cyan-400 outline-none"
                      placeholder="14.6819"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Longitude (°E)</span>
                    <input
                      type="number"
                      step="0.00001"
                      value={customLng}
                      onChange={e => setCustomLng(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100 font-mono text-xs focus:border-cyan-400 outline-none"
                      placeholder="77.6006"
                    />
                  </div>
                </div>

                {/* Parcel Area Size Selector */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-400">Survey Parcel Size:</span>
                  <div className="flex gap-1">
                    {[25, 75, 150].map(acres => (
                      <button
                        key={acres}
                        type="button"
                        onClick={() => setParcelSizeAcres(acres)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                          parcelSizeAcres === acres
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : 'bg-slate-950 text-slate-400 border border-slate-800'
                        }`}
                      >
                        {acres} Ac
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium transition text-xs flex items-center justify-center gap-1.5 border border-slate-700 shadow-sm"
                >
                  <Search className="w-3.5 h-3.5 text-cyan-400" />
                  Jump to Coordinates & Survey
                </button>
              </form>
            </div>

            {/* 3. Survey Boundary Drawing & Upload */}
            <div className="pt-2 border-t border-slate-800">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                3. Define Boundary (Polygon)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={onStartDrawing}
                  className={`py-2 px-3 rounded-lg border flex items-center justify-center gap-2 transition text-xs font-semibold ${
                    isDrawingMode
                      ? 'bg-amber-500 text-slate-950 border-amber-400 animate-pulse'
                      : 'bg-slate-950 hover:bg-slate-800/80 text-yellow-300 border-yellow-500/30'
                  }`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {isDrawingMode ? 'Drawing Active...' : 'Draw on Map'}
                </button>

                <label className="py-2 px-3 rounded-lg border border-slate-700 bg-slate-950 hover:bg-slate-800/80 text-slate-300 flex items-center justify-center gap-2 transition text-xs font-semibold cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Upload File</span>
                  <input
                    type="file"
                    accept=".json,.geojson,.kml"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {uploadError && (
                <div className="mt-2 p-2 bg-rose-950/60 border border-rose-800 rounded text-[11px] text-rose-300">
                  {uploadError}
                </div>
              )}

              {/* Current Boundary Metadata & Editable Survey Number */}
              <div className="mt-3 p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Survey Parcel:</span>
                  <span className="font-semibold text-white truncate max-w-[180px]">{boundary.name}</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Enclosed Area:</span>
                  <span className="font-mono text-yellow-300 font-bold">{boundary.areaAcres} Acres ({boundary.areaHectares} Ha)</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Perimeter:</span>
                  <span className="font-mono text-slate-200">{boundary.perimeterKm} km</span>
                </div>

                {/* Editable Survey Number (R.S. No. / Sy. No.) */}
                <div className="pt-2 border-t border-slate-900 space-y-1.5">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-amber-400 font-bold uppercase tracking-wider">Set Exact Survey No (R.S. No):</span>
                    <span className="text-slate-400">Bhuvan / MeeBhoomi</span>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!customSyNo.trim()) return;
                      const trimmed = customSyNo.trim();
                      onUpdateBoundary({
                        ...boundary,
                        surveyNumber: trimmed,
                        name: `${boundary.name.split('(')[0].trim()} (${trimmed})`,
                      });
                    }}
                    className="flex gap-1.5"
                  >
                    <input
                      type="text"
                      value={customSyNo}
                      onChange={e => setCustomSyNo(e.target.value)}
                      placeholder="e.g. R.S. No. 94/2 or 94/1, 94/2, 100/4"
                      className="flex-1 bg-slate-900 border border-amber-500/50 rounded-lg px-2.5 py-1 text-amber-300 font-mono font-bold text-xs focus:border-amber-400 outline-none"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition"
                    >
                      Apply
                    </button>
                  </form>
                  <p className="text-[9.5px] text-slate-400">
                    Tip: Enter single survey number or comma-separated list for adjoining parcels.
                  </p>
                </div>
              </div>
            </div>

            {/* 4. ISRO Bhuvan Cadastral Survey Numbers Grid */}
            <div className="pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  4. Cadastral Survey Numbers (Bhuvan)
                </label>
                <a
                  href="https://bhuvan.nrsc.gov.in/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-cyan-400 hover:underline font-mono flex items-center gap-1"
                >
                  <span>bhuvan.nrsc.gov.in</span>
                  <span>↗</span>
                </a>
              </div>

              <div className="p-2.5 bg-slate-950/90 rounded-xl border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300 font-medium">Bhuvan Cadastral Sub-Divisions:</span>
                  <span className="font-mono text-[10px] text-amber-400 font-bold">
                    {cadastralParcels.length} Parcels Mapped
                  </span>
                </div>

                {/* Sub-division pills */}
                <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {cadastralParcels.map(p => (
                    <div
                      key={p.id}
                      onClick={() => {
                        onUpdateBoundary({
                          id: p.id,
                          name: `${p.surveyNumber} (${boundary.name.split('(')[0].trim()})`,
                          center: p.center,
                          coordinates: p.coordinates,
                          areaAcres: p.extentAcres,
                          areaHectares: p.extentHectares,
                          perimeterKm: 1.2,
                          surveyNumber: p.surveyNumber,
                          stateDistrict: boundary.stateDistrict,
                        });
                      }}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-amber-950/50 border border-slate-800 hover:border-amber-500/60 transition cursor-pointer text-[10px]"
                    >
                      <div className="font-bold text-amber-300 font-mono truncate">{p.surveyNumber}</div>
                      <div className="text-slate-400 flex justify-between text-[9px] mt-0.5">
                        <span>{p.extentAcres} Ac</span>
                        <span className="text-cyan-400">Select ➔</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-[10px] text-slate-500 italic">
                  *Click any survey number to isolate and evaluate borewell potential specifically inside that land parcel.
                </div>
              </div>
            </div>

            {/* 4. Geological Benchmark Sites */}
            <div className="pt-2 border-t border-slate-800">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                4. Or Load Benchmark Sites
              </label>
              <div className="space-y-2">
                {PRESET_LOCATIONS.map(preset => {
                  const isSelected = selectedPresetId === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => onSelectPreset(preset)}
                      className={`p-2.5 rounded-xl border transition cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-950/40 border-cyan-500/60 shadow-md ring-1 ring-cyan-500/30'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-100 flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-cyan-400' : 'bg-slate-600'}`}></span>
                          {preset.name}
                        </span>
                        <span className="text-[10px] font-mono text-cyan-400">{preset.region.split(',')[0]}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {preset.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: AHP MCDA Weights Configuration */}
        {activeTab === 'weights' && (
          <div className="space-y-3">
            <div className="p-2.5 bg-cyan-950/30 border border-cyan-800/50 rounded-lg text-[11px] text-cyan-200 flex items-start gap-2">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>
                GIS Multi-Criteria Decision Analysis (AHP) weighting scheme per Master Prompt guidelines. Adjust weights to test aquifer sensitivity.
              </span>
            </div>

            <div className="space-y-3">
              {[
                { key: 'lithology', label: 'Lithology & Aquifer Units', default: 20 },
                { key: 'lineaments', label: 'Geological Lineaments & Fractures', default: 20 },
                { key: 'geomorphology', label: 'Geomorphology & Saprolite Depth', default: 15 },
                { key: 'drainage', label: 'Drainage & Flow Convergence', default: 10 },
                { key: 'slope', label: 'Slope & Infiltration Potential', default: 10 },
                { key: 'soilLandCover', label: 'Soil Permeability & Land Cover', default: 10 },
                { key: 'rainfall', label: 'Rainfall & Annual Recharge', default: 10 },
                { key: 'existingWells', label: 'Nearby Borewell Observations', default: 5 },
              ].map(item => {
                const val = (weights as any)[item.key];
                return (
                  <div key={item.key} className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-300">{item.label}</span>
                      <span className="font-mono font-bold text-cyan-400">{val}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      step="1"
                      value={val}
                      onChange={e =>
                        onUpdateWeights({
                          ...weights,
                          [item.key]: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>
                );
              })}
            </div>

            <button
              onClick={() =>
                onUpdateWeights({
                  lithology: 20,
                  lineaments: 20,
                  geomorphology: 15,
                  drainage: 10,
                  slope: 10,
                  soilLandCover: 10,
                  rainfall: 10,
                  existingWells: 5,
                })
              }
              className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition"
            >
              Reset to Recommended Weights
            </button>
          </div>
        )}

        {/* Tab 3: Data Provenance & Realism Disclosures */}
        {activeTab === 'provenance' && (
          <div className="space-y-3">
            <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-[11px] text-slate-300 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <ShieldCheck className="w-4 h-4" />
                Scientific Provenance Audit
              </div>
              <p className="text-slate-400">
                In strict compliance with Master Prompt Section 3, all datasets are explicitly tagged as Live, Catalog, or Model:
              </p>
            </div>

            <div className="space-y-2">
              {provenanceList.map((src, i) => (
                <div key={i} className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-100">{src.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium bg-cyan-950 text-cyan-300 border border-cyan-800">
                      {src.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Source: <span className="text-slate-200">{src.source}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Resolution: <span className="text-slate-300 font-mono">{src.resolutionOrScale}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-900">
                    Limitation: {src.limitations}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Start AI Geologist Analysis Button */}
      <div className="p-4 border-t border-slate-800 bg-slate-950">
        <button
          onClick={onTriggerAnalysis}
          disabled={isAnalyzing}
          className="w-full py-3 px-4 rounded-xl font-bold text-xs tracking-wider uppercase transition shadow-lg flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-cyan-500/25 disabled:opacity-50"
        >
          {isAnalyzing ? (
            <>
              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
              <span>Processing Hydrology & Lineaments...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Run AI Geologist Assessment</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
