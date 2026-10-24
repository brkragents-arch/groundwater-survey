import React from 'react';
import { X, Sparkles, CheckCircle2, ShieldCheck, Layers } from 'lucide-react';

interface ReferenceStyleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReferenceStyleModal: React.FC<ReferenceStyleModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Hydrogeological Visual Reference Compliance
              </h2>
              <p className="text-xs text-slate-400">
                Comparison of User-Supplied Visual Benchmark vs AQUASYNC Spatial Overlay
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Reference Image Container */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-cyan-400" />
                Supplied Visual Reference Image
              </span>
              <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                User Benchmark
              </span>
            </div>

            <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-950 flex items-center justify-center">
              <img
                src="/reference_survey_style.png"
                alt="User-Supplied Visual Reference showing cyan dendritic branching network and yellow survey boundary"
                className="w-full max-h-80 object-contain rounded-lg"
              />
            </div>
          </div>

          {/* Compliance Checklist */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
            <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5 text-cyan-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Visual Style Implementation Verification
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-300">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Radiant Cyan Branching Network (#00f3ff):</strong>
                  <p className="text-slate-400 text-[11px]">
                    Dendritic flow accumulation network derived from D8 DEM routing and structural lineament extraction with Strahler stream orders (1 to 4).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Highlighted Yellow Survey Boundary:</strong>
                  <p className="text-slate-400 text-[11px]">
                    User-defined polygon boundary rendered in vibrant yellow (#ffe600) with subtle drop-shadow glow and transparent fill.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Top 3 Ranked Borewell Locations:</strong>
                  <p className="text-slate-400 text-[11px]">
                    Point 1 (Gold/Red Pin), Point 2 (Blue Pin), Point 3 (Green Pin) plotted inside boundary with spatial clustering exclusion.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Satellite High-Resolution Basemap:</strong>
                  <p className="text-slate-400 text-[11px]">
                    High-resolution sub-meter satellite orthoimagery (Esri World Imagery & Sentinel-2) as base canvas.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end text-xs">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};
