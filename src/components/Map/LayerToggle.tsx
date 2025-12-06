'use client'

import React from 'react'
import { Home, Flame, GraduationCap, TrainFront } from 'lucide-react'

// Defined types for our "Life Layers"
export interface LayerState {
  homes: boolean
  heat: boolean
  schools: boolean
  transport: boolean
}

interface LayerToggleProps {
  layers: LayerState
  onLayerChange: (layers: LayerState) => void
}

export default function LayerToggle({ layers, onLayerChange }: LayerToggleProps) {

  const toggle = (key: keyof LayerState) => {
    onLayerChange({ ...layers, [key]: !layers[key] })
  }

  return (
    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-[1000]">
      <div className="flex items-center gap-1 p-1.5 bg-white/90 backdrop-blur-md rounded-full border border-white/20 shadow-xl ring-1 ring-black/5">

        {/* Homes Switch */}
        <button
          onClick={() => toggle('homes')}
          className={`
            relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all
            ${layers.homes
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
            }
          `}
        >
          <Home size={16} className={layers.homes ? 'text-teal-400' : 'text-slate-400'} />
          Homes
        </button>

        <div className="w-px h-6 bg-slate-200 mx-1" />

        {/* Heat Switch */}
        <button
          onClick={() => toggle('heat')}
          className={`
             relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all
             ${layers.heat
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
            }
          `}
        >
          <Flame size={16} className={layers.heat ? 'text-orange-500' : 'text-slate-400'} />
          Heat
        </button>

        <div className="w-px h-6 bg-slate-200 mx-1" />

        {/* Schools Switch */}
        <button
          onClick={() => toggle('schools')}
          className={`
             relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all
             ${layers.schools
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
            }
          `}
        >
          <GraduationCap size={16} className={layers.schools ? 'text-blue-400' : 'text-slate-400'} />
          Schools
        </button>

        {/* Transport Switch */}
        <button
          onClick={() => toggle('transport')}
          className={`
             relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all
             ${layers.transport
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
            }
          `}
        >
          <TrainFront size={16} className={layers.transport ? 'text-emerald-400' : 'text-slate-400'} />
          Transport
        </button>

      </div>
    </div>
  )
}
