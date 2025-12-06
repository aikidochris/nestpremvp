import { useState } from 'react'
import { Map as MapIcon } from 'lucide-react'

export default function MapLegend() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="absolute bottom-8 right-4 z-[40] flex flex-col items-end gap-2">
      {isOpen && (
        <div className="bg-white/95 backdrop-blur-xl shadow-2xl rounded-2xl p-4 min-w-[180px] border border-white/20 animate-in fade-in slide-in-from-bottom-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-3">Signal Guide</p>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 text-xs font-medium text-slate-700">
              <span className="h-3 w-3 rounded-full bg-[#007C7C]" aria-hidden="true" />
              <span>Open</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium text-slate-700">
              <span className="h-3 w-3 rounded-full bg-[#E65F52]" aria-hidden="true" />
              <span>For Sale</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium text-slate-700">
              <span className="h-3 w-3 rounded-full bg-[#6366F1]" aria-hidden="true" />
              <span>For Rent</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium text-slate-700">
              <span className="h-3 w-3 rounded-full bg-slate-600" aria-hidden="true" />
              <span>Claimed</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium text-slate-700">
              <span className="h-3 w-3 rounded-full border-2 border-slate-300" aria-hidden="true" />
              <span>Unclaimed</span>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="bg-white/90 backdrop-blur-md shadow-lg border border-white/20 px-4 py-2 rounded-full text-xs font-bold text-slate-600 uppercase tracking-wider hover:bg-white transition-all flex items-center gap-2"
      >
        <MapIcon className="h-4 w-4" />
        Map Key
      </button>
    </div>
  )
}
