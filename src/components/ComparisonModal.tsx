import React from 'react';
import { BorewellCandidate } from '../types/hydrogeology';
import { X, Check, AlertTriangle, FileSpreadsheet, Download } from 'lucide-react';

interface ComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: BorewellCandidate[];
}

export const ComparisonModal: React.FC<ComparisonModalProps> = ({
  isOpen,
  onClose,
  candidates,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Candidate Borewell Comparison Matrix (Top 3)
              </h2>
              <p className="text-xs text-slate-400">
                Multi-criteria comparative ranking per Master Prompt Section 10
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Table */}
        <div className="flex-1 overflow-x-auto overflow-y-auto p-4">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60">
                <th className="p-3 text-left font-semibold text-slate-400 w-1/4">Parameter</th>
                {candidates.map(c => (
                  <th
                    key={c.id}
                    className="p-3 text-left font-bold text-slate-100 w-1/4 border-l border-slate-800"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
                          c.rank === 1
                            ? 'bg-amber-500 text-slate-950'
                            : c.rank === 2
                            ? 'bg-blue-600 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {c.rank}
                      </span>
                      <span>{c.id} (Rank #{c.rank})</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {/* Bhuvan Cadastral Survey Number */}
              <tr className="hover:bg-slate-800/30 bg-amber-950/20">
                <td className="p-3 font-bold text-amber-300">Bhuvan Survey Number (Sy. No.)</td>
                {candidates.map(c => (
                  <td key={c.id} className="p-3 font-mono font-bold text-amber-400 border-l border-slate-800">
                    {c.surveyNumber}
                  </td>
                ))}
              </tr>

              {/* Latitude */}
              <tr className="hover:bg-slate-800/30">
                <td className="p-3 font-medium text-slate-300">Latitude</td>
                {candidates.map(c => (
                  <td key={c.id} className="p-3 font-mono text-cyan-400 border-l border-slate-800">
                    {c.lat.toFixed(6)}° N
                  </td>
                ))}
              </tr>

              {/* Longitude */}
              <tr className="hover:bg-slate-800/30">
                <td className="p-3 font-medium text-slate-300">Longitude</td>
                {candidates.map(c => (
                  <td key={c.id} className="p-3 font-mono text-cyan-400 border-l border-slate-800">
                    {c.lng.toFixed(6)}° E
                  </td>
                ))}
              </tr>

              {/* Elevation */}
              <tr className="hover:bg-slate-800/30">
                <td className="p-3 font-medium text-slate-300">Elevation (AMSL)</td>
                {candidates.map(c => (
                  <td key={c.id} className="p-3 font-mono text-slate-200 border-l border-slate-800">
                    {c.elevationM} meters
                  </td>
                ))}
              </tr>

              {/* Suitability Score */}
              <tr className="hover:bg-slate-800/30 bg-cyan-950/20">
                <td className="p-3 font-bold text-white">Suitability Score / 100</td>
                {candidates.map(c => (
                  <td key={c.id} className="p-3 font-mono font-bold text-base text-cyan-300 border-l border-slate-800">
                    {c.suitabilityScore} / 100
                  </td>
                ))}
              </tr>

              {/* Potential Class */}
              <tr className="hover:bg-slate-800/30">
                <td className="p-3 font-medium text-slate-300">Potential Class</td>
                {candidates.map(c => (
                  <td key={c.id} className="p-3 font-semibold text-emerald-400 border-l border-slate-800">
                    {c.potentialClass}
                  </td>
                ))}
              </tr>

              {/* Aquifer Interpretation */}
              <tr className="hover:bg-slate-800/30">
                <td className="p-3 font-medium text-slate-300">Aquifer Interpretation</td>
                {candidates.map(c => (
                  <td key={c.id} className="p-3 text-slate-200 border-l border-slate-800 leading-relaxed">
                    {c.aquiferType}
                  </td>
                ))}
              </tr>

              {/* Indicative Depth Range */}
              <tr className="hover:bg-slate-800/30">
                <td className="p-3 font-medium text-slate-300">Indicative Depth Range</td>
                {candidates.map(c => (
                  <td key={c.id} className="p-3 border-l border-slate-800">
                    <span className="font-mono font-bold text-amber-300">
                      {c.indicativeDepthRange.minM} - {c.indicativeDepthRange.maxM} m
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      ({c.indicativeDepthRange.minFt} - {c.indicativeDepthRange.maxFt} ft)
                    </span>
                  </td>
                ))}
              </tr>

              {/* Expected Discharge */}
              <tr className="hover:bg-slate-800/30">
                <td className="p-3 font-medium text-slate-300">Expected Discharge</td>
                {candidates.map(c => (
                  <td key={c.id} className="p-3 border-l border-slate-800">
                    <span className="font-mono font-bold text-cyan-300">
                      {c.expectedYieldRange.minLph} - {c.expectedYieldRange.maxLph} LPH
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      ({c.expectedYieldRange.inchEquivalent})
                    </span>
                  </td>
                ))}
              </tr>

              {/* Confidence Category */}
              <tr className="hover:bg-slate-800/30">
                <td className="p-3 font-medium text-slate-300">Confidence Level</td>
                {candidates.map(c => (
                  <td key={c.id} className="p-3 border-l border-slate-800">
                    <span
                      className={`inline-block px-2 py-0.5 rounded font-bold text-[10px] ${
                        c.confidence === 'High' ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300'
                      }`}
                    >
                      {c.confidence} Confidence
                    </span>
                    <span className="block text-[10px] text-slate-400 mt-1">{c.confidenceReason}</span>
                  </td>
                ))}
              </tr>

              {/* Key Supporting Evidence */}
              <tr className="hover:bg-slate-800/30">
                <td className="p-3 font-medium text-slate-300">Key Supporting Evidence</td>
                {candidates.map(c => (
                  <td key={c.id} className="p-3 text-[11px] text-slate-300 border-l border-slate-800 space-y-1">
                    <div>• {c.lineamentEvidence}</div>
                    <div>• {c.drainageConvergence}</div>
                    <div>• Weathered mantle: ~{c.weatheredZoneDepthM}m</div>
                  </td>
                ))}
              </tr>

              {/* Main Risks */}
              <tr className="hover:bg-slate-800/30">
                <td className="p-3 font-medium text-slate-300">Main Hydrogeological Risks</td>
                {candidates.map(c => (
                  <td key={c.id} className="p-3 text-[11px] text-rose-300/90 border-l border-slate-800 space-y-1">
                    {c.potentialRisks.map((risk, i) => (
                      <div key={i}>• {risk}</div>
                    ))}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-between items-center text-xs">
          <span className="text-slate-400 italic">
            *All values computed via Multi-Criteria Decision Analysis (AHP) and terrain flow routing.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition"
          >
            Close Matrix
          </button>
        </div>
      </div>
    </div>
  );
};
