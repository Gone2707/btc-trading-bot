'use client';

import React from 'react';
import { Bot, Activity, Wifi, ShieldCheck, Settings } from 'lucide-react';
import { PortfolioState } from '../types/trading';

interface HeaderProps {
  portfolio: PortfolioState;
  currentPrice: number;
  priceChange24h: number;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  portfolio,
  currentPrice,
  priceChange24h,
  onOpenSettings,
}) => {
  const isPositive = priceChange24h >= 0;

  return (
    <header className="bg-[#121722] border-b border-[#1e2638] px-4 py-3 sticky top-0 z-30 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Logo y Nombre del Bot */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-white tracking-wide">BTC HODL Grid AI</h1>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                Spot Only • 0% Liquidación
              </span>
            </div>
            <p className="text-xs text-gray-400 hidden sm:block">
              Autoaprendizaje Adaptativo • Regla estricta: Jamás vende a pérdida
            </p>
          </div>
        </div>

        {/* Ticker en Vivo de Bitcoin (Directo de Binance) */}
        <div className="flex items-center space-x-4 bg-[#0b0e14] px-3.5 py-1.5 rounded-xl border border-[#1e2638]">
          <div className="text-right">
            <span className="text-[10px] text-gray-400 font-mono block">BTC/USDT Binance</span>
            <span className="text-base sm:text-lg font-bold font-mono text-white tracking-tight">
              ${currentPrice > 0 ? currentPrice.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '---'}
            </span>
          </div>
          <div className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
            isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
          }`}>
            {isPositive ? '+' : ''}{priceChange24h.toFixed(2)}%
          </div>
        </div>

        {/* Badges de Estado y Botón de Ajustes */}
        <div className="flex items-center space-x-2.5">
          {/* Badge de Conexión en Vivo */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 text-xs">
            <Wifi className="w-3.5 h-3.5 animate-pulse" />
            <span className="hidden md:inline font-mono">Binance Live</span>
          </div>

          {/* Modo de Trading */}
          <div className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 border ${
            portfolio.mode === 'PAPER'
              ? 'bg-blue-950/40 border-blue-800/50 text-blue-300'
              : 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
          }`}>
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{portfolio.mode === 'PAPER' ? 'Paper Trading ($50)' : 'Binance Real'}</span>
          </div>

          {/* Botón de Configuración */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl bg-[#1e2638] hover:bg-[#2a344d] text-gray-300 hover:text-white transition-colors"
            title="Configuración del Bot"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
