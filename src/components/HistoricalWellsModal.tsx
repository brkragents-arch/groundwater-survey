import React, { useState } from 'react';
import { HistoricalWellRecord } from '../types/hydrogeology';
import { computeHistoricalCalibration } from '../services/historicalLearningEngine';
import { History, X, Plus, CheckCircle2, XCircle, Droplets, ArrowDown, Database } from 'lucide-react';

interface HistoricalWellsModalProps {
  isOpen: boolean;
  onClose: () => void;
  wells: HistoricalWellRecord[];
  onAddWell: (newWell: HistoricalWellRecord) => void;
}

export const HistoricalWellsModal: React.FC<HistoricalWellsModalProps> = ({
  isOpen,
  onClose,
  wells,
  onAddWell,
}) => {
  if (!isOpen) return null;

  const [showAddForm, setShowAddForm] = useState(false);
  const [newTotalDepth, setNewTotalDepth] = useState('120');
  const [newYield, setNewYield] = useState('8000');
  const [newStatus, setNewStatus] = useState<'Productive' | 'Moderate' | 'Failed / Dry'>('Productive');
  const [newLithology, setNewLithology] = useState('Weathered granite saprolite & deep jointed bedrock');

  const metrics = computeHistoricalCalibration(wells);

  const handleCreateWell = (e: React.FormEvent) => {
    e.preventDefault();
    const depth = parseFloat(newTotalDepth) || 100;
    const yieldLph = parseFloat(newYield) || 0;

    const newRecord: HistoricalWellRecord = {
      id: `HW-USER-${wells.length + 1}`,
      lat: 14.682 + (Math.random() - 0.5) * 0.005,
      lng: 77.600 + (Math.random() - 0.5) * 0.005,
      totalDepthM: depth,
      waterStrikeDepthM: [Math.round(depth * 0.3), Math.round(depth * 0.7)],
      yieldLph,
      status: newStatus,
      casingDepthM: 18,
      drillingYear: 2025,
      lithologyEncountered: newLithology,
    };

    onAddWell(newRecord);
    setShowAddForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-950 text-amber-400 border border-amber-800">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Historical Borewell Learning & Calibration
              </h2>
              <p className="text-xs text-slate-400">
                Ground-truth field well records to calibrate AI geologist predictive accuracy
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Aggregated Statistical Calibration Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                Watershed Success Rate
              </span>
              <div className="text-lg font-black font-mono text-emerald-400">
                {metrics.successRatePercent}%
              </div>
              <span className="text-[10px] text-slate-500">
                {metrics.productiveCount} productive / {metrics.totalWellsSampled} total wells
              </span>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                Mean Productive Depth
              </span>
              <div className="text-lg font-black font-mono text-white">
                {metrics.meanProductiveDepthM} m
              </div>
              <span className="text-[10px] text-slate-500">
                (~{Math.round(metrics.meanProductiveDepthM * 3.28)} ft)
              </span>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                Mean Yield (Discharge)
              </span>
              <div className="text-lg font-black font-mono text-cyan-400">
                {metrics.meanYieldLph} LPH
              </div>
              <span className="text-[10px] text-slate-500">
                (~{(metrics.meanYieldLph / 3600).toFixed(1)} L/s)
              </span>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                Recommended Casing
              </span>
              <div className="text-lg font-black font-mono text-amber-400">
                {metrics.recommendedCasingDepthM} m
              </div>
              <span className="text-[10px] text-slate-500">
                Protects saprolite zone
              </span>
            </div>
          </div>

          {/* Add Well Form Toggle */}
          <div className="flex items-center justify-between pt-2">
            <span className="font-bold text-slate-200 text-xs">
              Field Borewell Records in this Quadrangle ({wells.length})
            </span>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="py-1.5 px-3 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 rounded-lg border border-cyan-800 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddForm ? 'Cancel Form' : 'Log New Borewell'}</span>
            </button>
          </div>

          {/* Add Well Form */}
          {showAddForm && (
            <form onSubmit={handleCreateWell} className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">Total Drilled Depth (m)</span>
                  <input
                    type="number"
                    value={newTotalDepth}
                    onChange={e => setNewTotalDepth(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-100 font-mono text-xs focus:border-cyan-400 outline-none"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">Measured Yield (LPH)</span>
                  <input
                    type="number"
                    value={newYield}
                    onChange={e => setNewYield(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-100 font-mono text-xs focus:border-cyan-400 outline-none"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">Outcome Status</span>
                  <select
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-100 text-xs focus:border-cyan-400 outline-none"
                  >
                    <option value="Productive">Productive</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Failed / Dry">Failed / Dry</option>
                  </select>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block mb-1">Lithology Encountered</span>
                <input
                  type="text"
                  value={newLithology}
                  onChange={e => setNewLithology(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-100 text-xs focus:border-cyan-400 outline-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="py-1.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs transition"
                >
                  Save & Calibrate Model
                </button>
              </div>
            </form>
          )}

          {/* Historical Wells Table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <th className="p-2.5 text-left font-semibold">Well ID</th>
                  <th className="p-2.5 text-left font-semibold">Status</th>
                  <th className="p-2.5 text-left font-semibold">Depth (m)</th>
                  <th className="p-2.5 text-left font-semibold">Water Strikes (m)</th>
                  <th className="p-2.5 text-left font-semibold">Yield (LPH)</th>
                  <th className="p-2.5 text-left font-semibold">Drilling Year</th>
                  <th className="p-2.5 text-left font-semibold">Lithology Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                {wells.map(well => {
                  const isProductive = well.status === 'Productive';
                  const isFailed = well.status === 'Failed / Dry';
                  return (
                    <tr key={well.id} className="hover:bg-slate-800/40">
                      <td className="p-2.5 font-mono font-bold text-white">{well.id}</td>
                      <td className="p-2.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                            isProductive
                              ? 'bg-emerald-950 text-emerald-300'
                              : isFailed
                              ? 'bg-rose-950 text-rose-300'
                              : 'bg-amber-950 text-amber-300'
                          }`}
                        >
                          {isProductive ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : isFailed ? (
                            <XCircle className="w-3 h-3" />
                          ) : null}
                          {well.status}
                        </span>
                      </td>
                      <td className="p-2.5 font-mono text-slate-200">{well.totalDepthM}m</td>
                      <td className="p-2.5 font-mono text-cyan-300">
                        {well.waterStrikeDepthM.length > 0
                          ? well.waterStrikeDepthM.map(d => `${d}m`).join(', ')
                          : 'None (Dry)'}
                      </td>
                      <td className="p-2.5 font-mono font-semibold text-cyan-400">{well.yieldLph}</td>
                      <td className="p-2.5 text-slate-400">{well.drillingYear}</td>
                      <td className="p-2.5 text-slate-400 text-[11px] max-w-xs truncate" title={well.lithologyEncountered}>
                        {well.lithologyEncountered}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-between items-center text-xs">
          <span className="text-slate-400 italic">
            {metrics.calibrationNotes}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
