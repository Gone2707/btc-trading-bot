'use client';

import React from 'react';
import { MarketIntelligence, SelfTunerState } from '../types/trading';
import { Brain, Cpu, Sparkles, Gauge, Compass, Sliders, ShieldAlert } from 'lucide-react';

interface AiIntelligencePanelProps {
  market: MarketIntelligence;
  tuner: SelfTunerState;
}

export const AiIntelligencePanel: React.FC<AiIntelligencePanelProps> = ({ market, tuner }) => {
  const getRegimeColor = (regime: string) => {
    switch (regime) {
      case 'RANGING':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'TRENDING_UP':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'DOWNTREND_DEFENSIVE':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'VOLATILE_TRANSITION':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  };

  const getRegimeLabel = (regime: string) => {
    switch (regime) {
      case 'RANGING':
        return '🔄 Rango Lateral (Micro-Grid)';
      case 'TRENDING_UP':
        return '🚀 Tendencia Alcista (Infinity Run)';
      case 'DOWNTREND_DEFENSIVE':
        return '🛡️ Descuento / DCA Defensivo';
      case 'VOLATILE_TRANSITION':
        return '⚡ Alta Volatilidad (Cuadrícula Amplia)';
      default:
        return regime;
    }
  };

  return (
    <div className="bg-[#121722] border border-[#1e2638] rounded-xl p-4 shadow-xl flex flex-col justify-between">
      {/* Encabezado con estado del modelo de IA */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-[#1e2638] mb-3">
          <div className="flex items-center space-x-2">
            <Brain className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-bold text-white tracking-wide">Panel de IA & Autoaprendizaje</h2>
          </div>
          <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30 text-xs font-mono">
            <Sparkles className="w-3 h-3 animate-spin" />
            <span>Gen {tuner.generation}</span>
          </div>
        </div>

        {/* Badge de Régimen de Mercado Actual */}
        <div className="mb-4">
          <span className="text-xs text-gray-400 block mb-1">Régimen de Mercado Detectado:</span>
          <div className={`px-3 py-2 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-between ${getRegimeColor(market.regime)}`}>
            <span>{getRegimeLabel(market.regime)}</span>
            <span className="text-[11px] font-mono opacity-80">Confianza: {market.aiConfidence}%</span>
          </div>
        </div>

        {/* Indicadores Técnicos en Tiempo Real */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 font-mono text-xs">
          <div className="bg-[#0b0e14] p-2 rounded-lg border border-[#1e2638]">
            <span className="text-[10px] text-gray-400 block">RSI (14)</span>
            <span className={`font-bold ${
              market.rsi < 35 ? 'text-amber-400' : market.rsi > 70 ? 'text-rose-400' : 'text-emerald-400'
            }`}>
              {market.rsi}
            </span>
          </div>
          <div className="bg-[#0b0e14] p-2 rounded-lg border border-[#1e2638]">
            <span className="text-[10px] text-gray-400 block">Volatilidad (ATR)</span>
            <span className="font-bold text-sky-400">{market.atrPercent}%</span>
          </div>
          <div className="bg-[#0b0e14] p-2 rounded-lg border border-[#1e2638]">
            <span className="text-[10px] text-gray-400 block">Fuerza Trend (ADX)</span>
            <span className="font-bold text-gray-200">{market.adx}</span>
          </div>
          <div className="bg-[#0b0e14] p-2 rounded-lg border border-[#1e2638]">
            <span className="text-[10px] text-gray-400 block">Sesgo Tendencia</span>
            <span className={`font-bold ${
              market.trendDirection === 'BULLISH' ? 'text-emerald-400' : market.trendDirection === 'BEARISH' ? 'text-rose-400' : 'text-gray-400'
            }`}>
              {market.trendDirection}
            </span>
          </div>
        </div>

        {/* Parámetros Dinámicos Auto-ajustados */}
        <div className="bg-[#0b0e14] p-3 rounded-xl border border-[#1e2638] mb-4">
          <div className="flex items-center space-x-1.5 text-xs text-gray-300 font-semibold mb-2">
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Parámetros Optimizados por Auto-Mejora</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
            <div>
              <span className="text-[10px] text-gray-500 block">Espaciado Grid</span>
              <span className="font-bold text-amber-400">+{market.suggestedGridSpacingPercent}%</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 block">Objetivo TP</span>
              <span className="font-bold text-emerald-400">+{market.suggestedTakeProfitPercent}%</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 block">Tramos DCA</span>
              <span className="font-bold text-sky-400">{tuner.maxTranches} max</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bitácora de Decisiones de la IA */}
      <div>
        <span className="text-xs text-gray-400 block mb-1">Registro de Autoaprendizaje en Vivo:</span>
        <div className="bg-[#0b0e14] p-2.5 rounded-xl border border-[#1e2638] max-h-[110px] overflow-y-auto font-mono text-[11px] text-gray-400 space-y-1.5">
          {tuner.learningLog.slice(0, 4).map((log, idx) => (
            <div key={idx} className="flex items-start space-x-1.5">
              <span className="text-sky-400 select-none">›</span>
              <span className="leading-tight">{log}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
