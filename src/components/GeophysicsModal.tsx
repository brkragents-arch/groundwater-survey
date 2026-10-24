import React, { useState } from 'react';
import { BorewellCandidate, VESSoundingData } from '../types/hydrogeology';
import { simulateVESSoundingForCandidate } from '../services/geophysicsEngine';
import { Zap, X, CheckCircle2, AlertTriangle, Layers, Activity, RefreshCw } from 'lucide-react';

interface GeophysicsModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: BorewellCandidate | null;
}

export const GeophysicsModal: React.FC<GeophysicsModalProps> = ({
  isOpen,
  onClose,
  candidate,
}) => {
  if (!isOpen || !candidate) return null;

  const [soundingData, setSoundingData] = useState<VESSoundingData>(() =>
    simulateVESSoundingForCandidate(candidate)
  );

  const [noiseLevel, setNoiseLevel] = useState<number>(2);

  const recomputeSounding = () => {
    setSoundingData(simulateVESSoundingForCandidate(candidate));
  };

  // Find max apparent resistivity for chart scaling
  const maxRho = Math.max(...soundingData.apparentResistivity, 500);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  1D Vertical Electrical Sounding (VES) Verification
                </h2>
                <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-mono border border-cyan-800">
                  {candidate.id} (Rank #{candidate.rank})
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Schlumberger Array Resistivity Inversion & Subsurface Stratigraphy
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
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {/* Status & Confirmation Banner */}
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-3.5 h-3.5 rounded-full ${
                  soundingData.aquiferConfirmation.includes('Confirmed')
                    ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]'
                    : 'bg-amber-400 shadow-[0_0_10px_#f59e0b]'
                }`}
              ></div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Geophysical Field Inversion Result
                </span>
                <span className="text-sm font-bold text-white">
                  {soundingData.aquiferConfirmation}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">RMS Inversion Error</span>
              <span className="font-mono text-cyan-400 font-bold">
                {soundingData.fitErrorRmsPercent}% (Calibrated)
              </span>
            </div>
          </div>

          {/* Sounding Curve Visualizer (Log-Log SVG Chart) */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-cyan-400" />
                Apparent Resistivity Sounding Curve ($\rho_a$ vs $AB/2$)
              </span>
              <span className="text-[11px] font-mono text-slate-400">Schlumberger Array (H-Type Curve)</span>
            </div>

            {/* Custom SVG Log-Log Plot */}
            <div className="w-full h-52 bg-slate-900/80 rounded-lg p-2 relative flex flex-col justify-end border border-slate-800">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 700 180">
                {/* Horizontal grid lines */}
                {[30, 70, 110, 150].map((y, idx) => (
                  <line
                    key={idx}
                    x1="40"
                    y1={y}
                    x2="680"
                    y2={y}
                    stroke="#1e293b"
                    strokeWidth="1"
                    strokeDasharray="3, 3"
                  />
                ))}

                {/* Vertical grid lines */}
                {[100, 200, 300, 400, 500, 600].map((x, idx) => (
                  <line
                    key={idx}
                    x1={x}
                    y1="10"
                    x2={x}
                    y2="160"
                    stroke="#1e293b"
                    strokeWidth="1"
                    strokeDasharray="3, 3"
                  />
                ))}

                {/* Connect points into curve */}
                {(() => {
                  const points = soundingData.spacingAB2.map((ab2, idx) => {
                    const x = 50 + (idx / (soundingData.spacingAB2.length - 1)) * 620;
                    const rho = soundingData.apparentResistivity[idx];
                    // Inverted Y: higher rho = higher up (lower Y coordinate)
                    const normalizedRho = Math.min(1.0, Math.max(0.05, Math.log10(rho) / Math.log10(maxRho * 1.5)));
                    const y = 160 - normalizedRho * 140;
                    return { x, y, ab2, rho };
                  });

                  const pathD = points.reduce(
                    (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
                    ''
                  );

                  return (
                    <>
                      {/* Curve Line */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke="#00f3ff"
                        strokeWidth="2.5"
                        className="drop-shadow-[0_0_8px_rgba(0,243,255,0.7)]"
                      />
                      {/* Points */}
                      {points.map((p, i) => (
                        <g key={i}>
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r="4"
                            fill="#0b0f19"
                            stroke="#00f3ff"
                            strokeWidth="2"
                          />
                          {/* Label every 3rd point */}
                          {i % 2 === 0 && (
                            <text
                              x={p.x}
                              y={p.y - 8}
                              fill="#94a3b8"
                              fontSize="9"
                              fontFamily="monospace"
                              textAnchor="middle"
                            >
                              {p.rho} Ωm
                            </text>
                          )}
                        </g>
                      ))}
                    </>
                  );
                })()}
              </svg>
              <div className="flex justify-between px-6 text-[10px] font-mono text-slate-500 pt-1">
                <span>AB/2 = 1.5m</span>
                <span>AB/2 = 12m</span>
                <span>AB/2 = 50m</span>
                <span>AB/2 = 180m</span>
              </div>
            </div>
          </div>

          {/* Inverted Subsurface Stratigraphy Layers */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-cyan-400" />
                Inverted 4-Layer Geoelectrical Model
              </span>
              <span className="text-[11px] text-slate-400">Based on standard hard-rock geoelectrical signatures</span>
            </div>

            <div className="space-y-2">
              {soundingData.inversionModel.map(layer => {
                const isAquifer = layer.layerNumber === 3;
                return (
                  <div
                    key={layer.layerNumber}
                    className={`p-3 rounded-xl border transition ${
                      isAquifer
                        ? 'bg-cyan-950/30 border-cyan-500/50 shadow-md ring-1 ring-cyan-500/30'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center font-mono font-bold text-[10px] ${
                            isAquifer
                              ? 'bg-cyan-400 text-slate-950'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          L{layer.layerNumber}
                        </span>
                        <span className="font-bold text-slate-100">{layer.lithology}</span>
                      </div>
                      <div className="flex items-center gap-3 font-mono text-[11px]">
                        <span className="text-slate-400">
                          Thick: <strong className="text-white">{layer.thicknessM}m</strong>
                        </span>
                        <span className="text-slate-400">
                          Depth: <strong className="text-white">0-{layer.depthToBottomM}m</strong>
                        </span>
                        <span className="text-cyan-400 font-bold px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                          ρ = {layer.trueResistivityOhmM} Ω·m
                        </span>
                      </div>
                    </div>
                    <p className={`text-[11px] ${isAquifer ? 'text-cyan-200 font-medium' : 'text-slate-400'}`}>
                      {layer.hydrogeologicalInterpretation}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-between items-center text-xs">
          <button
            onClick={recomputeSounding}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white px-3 py-1.5 rounded bg-slate-900 border border-slate-800 transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Resimulate Sounding Curve</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
