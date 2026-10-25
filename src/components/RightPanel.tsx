import React, { useState } from 'react';
import {
  BorewellCandidate,
  SurveyBoundary,
  MCDAWeights,
} from '../types/hydrogeology';
import { HydrologyAnalysisResult } from '../services/demHydrology';
import {
  Award,
  Droplets,
  TrendingUp,
  AlertTriangle,
  Compass,
  CheckCircle2,
  Activity,
  Layers,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldAlert,
  FileSpreadsheet,
  History,
  Zap,
  RefreshCw,
} from 'lucide-react';

interface RightPanelProps {
  candidates: BorewellCandidate[];
  selectedCandidateId: string | null;
  onSelectCandidate: (id: string) => void;
  boundary: SurveyBoundary;
  onOpenComparisonModal: () => void;
  onOpenGeophysicsModal: (candidate: BorewellCandidate) => void;
  onOpenHistoricalModal: () => void;
  onOpenReportModal: () => void;
  hydrologyResult: HydrologyAnalysisResult;
  onReanalyseSubsurfaceFlows: () => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  candidates,
  selectedCandidateId,
  onSelectCandidate,
  boundary,
  onOpenComparisonModal,
  onOpenGeophysicsModal,
  onOpenHistoricalModal,
  onOpenReportModal,
  hydrologyResult,
  onReanalyseSubsurfaceFlows,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(candidates[0]?.id || 'BW-01');

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
    onSelectCandidate(id);
  };

  return (
    <div className="w-80 md:w-96 h-full flex flex-col bg-slate-900 border-l border-slate-800 text-slate-200 select-none overflow-hidden shadow-2xl z-20">
      {/* Header with Quick Action Switchers */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <h2 className="font-bold text-sm tracking-wide text-white">
              RECOMMENDED BOREWELLS
            </h2>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
            TOP 3 IDENTIFIED
          </span>
        </div>

        {/* Action Tool Buttons */}
        <div className="grid grid-cols-3 gap-1.5 mt-3">
          <button
            onClick={onOpenComparisonModal}
            className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-700 text-[11px] font-medium flex items-center justify-center gap-1 transition"
            title="Open 3-way comparative matrix"
          >
            <FileSpreadsheet className="w-3 h-3 text-cyan-400" />
            <span>Compare</span>
          </button>

          <button
            onClick={onOpenHistoricalModal}
            className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-700 text-[11px] font-medium flex items-center justify-center gap-1 transition"
            title="Historical borewell calibration & pumping tests"
          >
            <History className="w-3 h-3 text-amber-400" />
            <span>Well Logs</span>
          </button>

          <button
            onClick={onOpenReportModal}
            className="py-1.5 px-2 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 rounded border border-cyan-800 text-[11px] font-medium flex items-center justify-center gap-1 transition"
            title="Download full hydrogeological survey report"
          >
            <ExternalLink className="w-3 h-3 text-cyan-300" />
            <span>Report</span>
          </button>
        </div>

        {/* Subsurface Groundwater Flow Status Banner */}
        <div className="mt-3 p-2.5 bg-slate-950/90 rounded-xl border border-cyan-500/40 text-[11px] space-y-1.5 shadow-md">
          <div className="flex items-center justify-between">
            <span className="font-bold text-cyan-300 flex items-center gap-1.5 text-xs">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              Subsurface Darcy Flows
            </span>
            <button
              onClick={onReanalyseSubsurfaceFlows}
              className="px-2 py-0.5 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 text-[10px] font-semibold flex items-center gap-1 transition"
              title="Recalculate 3D Darcy subsurface groundwater streamlines and hydraulic potential"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              <span>Re-analyse</span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[10.5px] text-slate-300 pt-1 border-t border-slate-900">
            <div>
              <span className="text-slate-400">Water Table Depth:</span>{' '}
              <span className="font-mono text-amber-300 font-bold">~{hydrologyResult.meanWaterTableDepthM}m bgl</span>
            </div>
            <div>
              <span className="text-slate-400">Hydraulic Grad:</span>{' '}
              <span className="font-mono text-cyan-300 font-bold">{hydrologyResult.meanHydraulicGradient} m/m</span>
            </div>
            <div>
              <span className="text-slate-400">Flow Azimuth:</span>{' '}
              <span className="font-mono text-slate-200 font-semibold">{hydrologyResult.regionalFlowDirectionDeg}°</span>
            </div>
            <div>
              <span className="text-slate-400">Conduits Mapped:</span>{' '}
              <span className="font-mono text-emerald-400 font-bold">{hydrologyResult.subsurfacePathwaysCount} active</span>
            </div>
          </div>
        </div>

        {/* Inferred Subsurface Fracture Branch Analysis Card */}
        <div className="mt-2.5 p-2.5 bg-slate-950/90 rounded-xl border border-cyan-500/50 text-[11px] space-y-1.5 shadow-md">
          <div className="flex items-center justify-between">
            <span className="font-bold text-cyan-300 flex items-center gap-1.5 text-xs">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              Inferred Subsurface Fractures
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
              {hydrologyResult.fractureAnalysis?.totalFractureBranches || 15} Branches
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[10.5px] text-slate-300 pt-1 border-t border-slate-900">
            <div>
              <span className="text-slate-400">Master Fractures:</span>{' '}
              <span className="font-mono text-cyan-300 font-bold">
                {hydrologyResult.fractureAnalysis?.totalMasterFractures || 5} Corridors
              </span>
            </div>
            <div>
              <span className="text-slate-400">Fracture Branches:</span>{' '}
              <span className="font-mono text-cyan-200 font-bold">
                {hydrologyResult.fractureAnalysis?.totalFractureBranches || 15} Splays
              </span>
            </div>
            <div>
              <span className="text-slate-400">Intersection Hubs:</span>{' '}
              <span className="font-mono text-emerald-400 font-bold">
                {hydrologyResult.fractureIntersectionNodes?.length || 0} Prime Nodes
              </span>
            </div>
            <div>
              <span className="text-slate-400">Permeability Gain:</span>{' '}
              <span className="font-mono text-amber-300 font-bold">+24x Secondary</span>
            </div>
          </div>
          <div className="pt-1 border-t border-slate-900/80 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Conjugate Trends:</span>
            <span className="text-cyan-300 font-mono font-medium">NNW-SSE & ENE-WSW</span>
          </div>
        </div>
      </div>

      {/* Candidate Cards List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
        {candidates.map(cand => {
          const isSelected = selectedCandidateId === cand.id;
          const isExpanded = expandedId === cand.id;

          let badgeColor = 'bg-amber-500 text-slate-950';
          let borderColor = 'border-amber-500/50';
          let ringColor = 'ring-amber-400';
          if (cand.rank === 2) {
            badgeColor = 'bg-blue-600 text-white';
            borderColor = 'border-blue-500/50';
            ringColor = 'ring-blue-400';
          } else if (cand.rank === 3) {
            badgeColor = 'bg-emerald-600 text-white';
            borderColor = 'border-emerald-500/50';
            ringColor = 'ring-emerald-400';
          }

          return (
            <div
              key={cand.id}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                isSelected
                  ? `bg-slate-950 ${borderColor} shadow-xl ring-1 ${ringColor}`
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Card Header */}
              <div
                onClick={() => toggleExpand(cand.id)}
                className="p-3 cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-black font-mono text-xs shadow-md ${badgeColor}`}
                  >
                    {cand.rank}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-100 text-sm">{cand.id}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Rank #{cand.rank}
                      </span>
                      <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-800/60">
                        {cand.surveyNumber}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      {cand.lat.toFixed(5)}°, {cand.lng.toFixed(5)}°
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-sm font-black font-mono text-cyan-400">
                      {cand.suitabilityScore}
                      <span className="text-[10px] text-slate-500 font-normal">/100</span>
                    </div>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                        cand.potentialClass.includes('Very High')
                          ? 'bg-emerald-950 text-emerald-300'
                          : cand.potentialClass.includes('High')
                          ? 'bg-cyan-950 text-cyan-300'
                          : 'bg-amber-950 text-amber-300'
                      }`}
                    >
                      {cand.potentialClass.split(' ')[0]}
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Collapsed Brief Metrics */}
              {!isExpanded && (
                <div className="px-3 pb-3 pt-1 border-t border-slate-900 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                  <div>
                    Depth: <span className="text-slate-200 font-semibold">{cand.indicativeDepthRange.minM}-{cand.indicativeDepthRange.maxM}m</span>
                  </div>
                  <div>
                    Yield: <span className="text-cyan-300 font-semibold">{cand.expectedYieldRange.minLph}-{cand.expectedYieldRange.maxLph} LPH</span>
                  </div>
                </div>
              )}

              {/* Expanded Full Geological Assessment Card */}
              {isExpanded && (
                <div className="px-3.5 pb-3.5 pt-2 border-t border-slate-800 space-y-3 bg-slate-900/40 text-[11px]">
                  {/* Location & Elevation */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Elevation</span>
                      <span className="font-mono text-slate-200 font-semibold">{cand.elevationM} m AMSL</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Confidence Level</span>
                      <span className={`font-semibold ${cand.confidence === 'High' ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {cand.confidence} Confidence
                      </span>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-slate-900 flex justify-between items-center text-[10px]">
                      <span className="text-slate-400">Bhuvan Cadastral Sy. No:</span>
                      <span className="font-mono font-bold text-amber-400">{cand.surveyNumber}</span>
                    </div>
                  </div>

                  {/* Aquifer & Lithology */}
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                      Target Aquifer Unit
                    </span>
                    <p className="text-slate-200 leading-snug font-medium">
                      {cand.aquiferType}
                    </p>
                  </div>

                  {/* Indicative Drilling Depth Range */}
                  <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Recommended Depth Target
                      </span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-amber-950 text-amber-300 font-mono">
                        {cand.indicativeDepthRange.defensibility}
                      </span>
                    </div>
                    <div className="text-sm font-mono font-bold text-white">
                      {cand.indicativeDepthRange.minM} - {cand.indicativeDepthRange.maxM} meters{' '}
                      <span className="text-xs text-slate-400 font-normal">
                        ({cand.indicativeDepthRange.minFt} - {cand.indicativeDepthRange.maxFt} ft)
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      {cand.indicativeDepthRange.justification}
                    </p>
                  </div>

                  {/* Expected Discharge / Yield */}
                  <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-cyan-400 flex items-center gap-1">
                        <Droplets className="w-3 h-3" />
                        Expected Yield (Discharge)
                      </span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-950 text-cyan-300 font-mono">
                        {cand.expectedYieldRange.defensibility}
                      </span>
                    </div>
                    <div className="text-sm font-mono font-bold text-cyan-300">
                      {cand.expectedYieldRange.minLph} - {cand.expectedYieldRange.maxLph} Litres/Hr
                    </div>
                    <div className="text-[11px] text-slate-300 font-medium">
                      Approx: {cand.expectedYieldRange.minLps} - {cand.expectedYieldRange.maxLps} L/s ({cand.expectedYieldRange.inchEquivalent})
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      {cand.expectedYieldRange.justification}
                    </p>
                  </div>

                  {/* Structural & Drainage Evidence */}
                  <div className="space-y-1.5 pt-1">
                    <div className="text-slate-300">
                      <span className="text-slate-400">Lineament Evidence:</span> {cand.lineamentEvidence}
                    </div>
                    <div className="text-slate-300">
                      <span className="text-slate-400">Drainage Convergence:</span> {cand.drainageConvergence}
                    </div>
                    <div className="text-slate-300">
                      <span className="text-slate-400">Seasonal Fluctuation:</span> {cand.seasonalVariability}
                    </div>
                  </div>

                  {/* Scientific Uncertainty & Pre-Drilling Checklist */}
                  <div className="p-2 bg-rose-950/20 border border-rose-900/50 rounded-lg space-y-1">
                    <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-rose-400">
                      <AlertTriangle className="w-3 h-3" />
                      Key Risk & Hydrogeological Caveat
                    </div>
                    <p className="text-[10px] text-rose-200/80 leading-tight">
                      Satellite indicators are indirect hypotheses. Never drill without Vertical Electrical Sounding (VES) or ERT resistivity verification.
                    </p>
                  </div>

                  {/* Action: Open Geophysical Sounding Simulator */}
                  <button
                    onClick={() => onOpenGeophysicsModal(cand)}
                    className="w-full py-2 px-3 bg-gradient-to-r from-cyan-950 to-blue-950 hover:from-cyan-900 hover:to-blue-900 text-cyan-300 rounded-lg border border-cyan-800 text-xs font-semibold flex items-center justify-center gap-2 transition shadow-md"
                  >
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Run VES Resistivity Sounding</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Master Hydrogeologist Disclaimer */}
        <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5 text-[10px] text-slate-400">
          <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
            <ShieldAlert className="w-3.5 h-3.5" />
            Statutory Scientific Protocol
          </div>
          <p className="leading-relaxed">
            Satellite imagery does not penetrate beneath the Earth's surface or guarantee water presence. All drilling depths and yields are preliminary model estimates subject to on-site geophysical sounding and local groundwater authority regulations.
          </p>
        </div>
      </div>
    </div>
  );
};
