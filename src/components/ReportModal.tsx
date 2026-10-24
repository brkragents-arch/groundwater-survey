import React, { useRef } from 'react';
import {
  BorewellCandidate,
  BranchingPathway,
  SurveyBoundary,
  MCDAWeights,
  DataSourceProvenance,
  HistoricalWellRecord,
} from '../types/hydrogeology';
import { exportSurveyToGeoJSON, triggerDownload } from '../services/reportGenerator';
import {
  FileText,
  X,
  Printer,
  Download,
  ShieldCheck,
  CheckSquare,
  AlertTriangle,
  Award,
  Layers,
  Compass,
} from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  boundary: SurveyBoundary;
  candidates: BorewellCandidate[];
  pathways: BranchingPathway[];
  weights: MCDAWeights;
  provenanceList: DataSourceProvenance[];
  historicalWells: HistoricalWellRecord[];
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  boundary,
  candidates,
  pathways,
  weights,
  provenanceList,
  historicalWells,
}) => {
  const printableRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadGeoJSON = () => {
    const geojsonStr = exportSurveyToGeoJSON(boundary, candidates, pathways);
    const filename = `AQUASYNC_Groundwater_Survey_${boundary.name.replace(/\s+/g, '_')}.geojson`;
    triggerDownload(geojsonStr, filename, 'application/geo+json');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-sm select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Hydrogeological Groundwater Potential & Borewell Siting Report
              </h2>
              <p className="text-xs text-slate-400">
                Official AI Geologist Assessment & Pre-Drilling Field Technical Specification
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadGeoJSON}
              className="px-3 py-1.5 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 rounded-lg border border-cyan-800 text-xs font-semibold flex items-center gap-1.5 transition"
              title="Download spatial GeoJSON layers"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export GeoJSON</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
              title="Print or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5 text-cyan-400" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Report Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 text-xs text-slate-200 bg-slate-900/60 font-sans" ref={printableRef}>
          {/* Document Header Banner */}
          <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-widest mb-1">
                <Compass className="w-4 h-4" />
                AQUASYNC AI GEOLOGIST SYSTEM
              </div>
              <h1 className="text-xl font-black text-white">
                SATELLITE GROUNDWATER SURVEY & DRILLING POINT RECOMMENDATION
              </h1>
              <p className="text-slate-400 text-xs mt-1">
                Target Survey Parcel: <strong className="text-slate-100">{boundary.name}</strong> | Region: <strong className="text-slate-100">{boundary.stateDistrict || 'Regional Survey'}</strong>
              </p>
            </div>
            <div className="text-left md:text-right font-mono text-xs text-slate-400 border-t md:border-t-0 md:border-l border-slate-800 pt-2 md:pt-0 md:pl-4">
              <div>Survey ID: <span className="text-white">AQ-{Date.now().toString().slice(-6)}</span></div>
              <div>Center Lat/Lng: <span className="text-cyan-300">{boundary.center[0].toFixed(5)}°, {boundary.center[1].toFixed(5)}°</span></div>
              <div>Survey Area: <span className="text-yellow-300">{boundary.areaAcres} Acres ({boundary.areaHectares} Ha)</span></div>
              <div>Report Date: <span className="text-white">October 2026</span></div>
            </div>
          </div>

          {/* Section 1: Executive Summary */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              1. Executive Summary & Geological Context
            </h3>
            <p className="text-slate-300 leading-relaxed text-xs">
              A comprehensive multi-criteria hydrogeological assessment was conducted for the designated <strong>{boundary.areaAcres}-acre</strong> survey boundary utilizing Copernicus GLO-30 DEM, high-resolution satellite imagery (Sentinel-2 multispectral), D8 drainage flow routing, and structural lineament extraction. Topographic convergent corridors and tectonic fracture intersections were modeled to determine groundwater storage and recharge capacity. Within the survey parcel, <strong>three spatially isolated candidate drilling sites</strong> have been identified and ranked.
            </p>
          </div>

          {/* Section 2: Top 3 Candidate Summary Table */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              2. Candidate Borewell Siting Recommendations (Ranked Top 3)
            </h3>
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-300 border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">Rank</th>
                    <th className="p-2.5">Candidate ID</th>
                    <th className="p-2.5">Survey Number (Bhuvan)</th>
                    <th className="p-2.5">Coordinates (WGS84)</th>
                    <th className="p-2.5">Elevation</th>
                    <th className="p-2.5">Score / 100</th>
                    <th className="p-2.5">Indicative Depth</th>
                    <th className="p-2.5">Expected Yield</th>
                    <th className="p-2.5">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 bg-slate-950/40">
                  {candidates.map(c => (
                    <tr key={c.id} className="hover:bg-slate-800/30">
                      <td className="p-2.5">
                        <span
                          className={`inline-flex items-center justify-center w-5 h-5 rounded-full font-bold font-mono text-[11px] ${
                            c.rank === 1
                              ? 'bg-amber-500 text-slate-950'
                              : c.rank === 2
                              ? 'bg-blue-600 text-white'
                              : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {c.rank}
                        </span>
                      </td>
                      <td className="p-2.5 font-bold font-mono text-white">{c.id}</td>
                      <td className="p-2.5 font-mono font-bold text-amber-400">{c.surveyNumber}</td>
                      <td className="p-2.5 font-mono text-cyan-300">
                        {c.lat.toFixed(5)}°, {c.lng.toFixed(5)}°
                      </td>
                      <td className="p-2.5 font-mono text-slate-300">{c.elevationM} m</td>
                      <td className="p-2.5 font-mono font-bold text-cyan-400">{c.suitabilityScore}</td>
                      <td className="p-2.5 font-mono text-amber-300">
                        {c.indicativeDepthRange.minM} - {c.indicativeDepthRange.maxM} m
                      </td>
                      <td className="p-2.5 font-mono text-cyan-300">
                        {c.expectedYieldRange.minLph} - {c.expectedYieldRange.maxLph} LPH
                      </td>
                      <td className="p-2.5">
                        <span className="font-semibold text-emerald-400">{c.confidence}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Detailed Hydrogeological Profiles for Candidate Points */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              3. Geological Evidence & Aquifer Target Breakdown
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {candidates.map(c => (
                <div key={c.id} className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                    <span className="font-bold text-white text-xs">{c.id} (Point #{c.rank})</span>
                    <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                      {c.potentialClass.split(' ')[0]}
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px] text-slate-300">
                    <div><strong>Target:</strong> {c.aquiferType}</div>
                    <div><strong>Lineament:</strong> {c.lineamentEvidence}</div>
                    <div><strong>Drainage:</strong> {c.drainageConvergence}</div>
                    <div><strong>Saprolite Thickness:</strong> ~{c.weatheredZoneDepthM}m</div>
                    <div><strong>Seasonal Drop:</strong> {c.seasonalVariability}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: AHP Multi-Criteria Decision Weights */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              4. Analytical Hierarchy Process (AHP) Scoring Weights
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-400 block">Lithology & Aquifer</span>
                <span className="font-mono font-bold text-cyan-400">{weights.lithology}%</span>
              </div>
              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-400 block">Lineaments & Fractures</span>
                <span className="font-mono font-bold text-cyan-400">{weights.lineaments}%</span>
              </div>
              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-400 block">Geomorphology & Saprolite</span>
                <span className="font-mono font-bold text-cyan-400">{weights.geomorphology}%</span>
              </div>
              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-400 block">Drainage Convergence</span>
                <span className="font-mono font-bold text-cyan-400">{weights.drainage}%</span>
              </div>
              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-400 block">Slope & Infiltration</span>
                <span className="font-mono font-bold text-cyan-400">{weights.slope}%</span>
              </div>
              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-400 block">Soil & Permeability</span>
                <span className="font-mono font-bold text-cyan-400">{weights.soilLandCover}%</span>
              </div>
              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-400 block">Rainfall & Recharge</span>
                <span className="font-mono font-bold text-cyan-400">{weights.rainfall}%</span>
              </div>
              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-400 block">Existing Well Observations</span>
                <span className="font-mono font-bold text-cyan-400">{weights.existingWells}%</span>
              </div>
            </div>
          </div>

          {/* Section 5: Field Validation Checklist (Section 11) */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 text-cyan-300">
              <CheckSquare className="w-4 h-4 text-emerald-400" />
              5. Mandatory Pre-Drilling Field Verification Protocol (Master Prompt Section 11)
            </h3>
            <p className="text-slate-400 text-[11px]">
              Prior to rig mobilization and drilling expenditures, the user must execute the following field inspection steps:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-300 text-[11px]">
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-slate-800 text-cyan-400 font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
                <span>Inspect geological outcrops, terrain slope, soil profiles, and surface fracture traces on-site.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-slate-800 text-cyan-400 font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
                <span>Review nearby successful and dry borewell drilling logs within a 500m radius.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-slate-800 text-cyan-400 font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
                <span>Execute 1D Vertical Electrical Sounding (VES) or 2D ERT resistivity profiling crossing the candidate coordinate.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-slate-800 text-cyan-400 font-bold flex items-center justify-center shrink-0 text-[10px]">4</span>
                <span>Confirm resistivity layer signature: saturated fracture zone must fall within 40-150 Ω·m (exclude clay / saline pockets &lt; 15 Ω·m).</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-slate-800 text-cyan-400 font-bold flex items-center justify-center shrink-0 text-[10px]">5</span>
                <span>Verify sanitary offset: enforce &gt; 30m distance from soak pits, septic tanks, and chemical fertilizer dumps.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-slate-800 text-cyan-400 font-bold flex items-center justify-center shrink-0 text-[10px]">6</span>
                <span>Finalize pinpoint drilling spot with a licensed certified hydrogeologist.</span>
              </div>
            </div>
          </div>

          {/* Section 6: Scientific Uncertainty & Legal Disclaimer */}
          <div className="p-4 bg-rose-950/20 border border-rose-900/40 rounded-xl space-y-1.5 text-[11px] text-rose-200/90">
            <div className="flex items-center gap-1.5 font-bold text-rose-400 uppercase tracking-wider text-xs">
              <AlertTriangle className="w-4 h-4" />
              6. Critical Scientific & Legal Limitations
            </div>
            <p className="leading-relaxed">
              Satellite imagery and remote sensing models do not penetrate the subsurface or guarantee borewell water yield. Groundwater occurrence is governed by micro-fracture aperture, interconnected permeability, and dynamic monsoon recharge. This report represents a preliminary reconnaissance tool to guide geophysical field surveys, not an absolute guarantee of water strike.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-between items-center text-xs">
          <span className="text-slate-400 italic">
            AQUASYNC AI Geologist Agent • Standard Hydrogeological Protocol
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};
