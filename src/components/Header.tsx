'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Bot, Wifi, ShieldCheck, Settings, Zap } from 'lucide-react';
import { PortfolioState } from '../types/trading';

interface HeaderProps {
  portfolio: PortfolioState;
  currentPrice: number;
  priceChange24h: number;
  latencyMs?: number;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  portfolio,
  currentPrice,
  priceChange24h,
  latencyMs = 45,
  onOpenSettings,
}) => {
  const isPositive = priceChange24h >= 0;
  const [flashDirection, setFlashDirection] = useState<'UP' | 'DOWN' | null>(null);
  const prevPriceRef = useRef(currentPrice);

  useEffect(() => {
    if (prevPriceRef.current > 0 && currentPrice !== prevPriceRef.current) {
      setFlashDirection(currentPrice > prevPriceRef.current ? 'UP' : 'DOWN');
      const timer = setTimeout(() => setFlashDirection(null), 400);
      prevPriceRef.current = currentPrice;
      return () => clearTimeout(timer);
    }
    prevPriceRef.current = currentPrice;
  }, [currentPrice]);

  return (
    <header className="bg-[#121722] border-b border-[#1e2638] px-3.5 py-2.5 sticky top-0 z-30 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
        {/* Logo y Nombre del Bot */}
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-wide">BTC HODL Grid AI</h1>
              <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                Spot 0x
              </span>
            </div>
            <p className="text-[11px] text-gray-400 hidden sm:block">
              MT5 Terminal • Actualizaciones en Tiempo Real (sub-100ms)
            </p>
          </div>
        </div>

        {/* Ticker en Vivo con Animación de Flash de Precio */}
        <div className={`flex items-center space-x-3 bg-[#0b0e14] px-3 py-1 rounded-xl border transition-colors duration-200 ${
          flashDirection === 'UP'
            ? 'border-emerald-500/80 bg-emerald-950/20'
            : flashDirection === 'DOWN'
            ? 'border-rose-500/80 bg-rose-950/20'
            : 'border-[#1e2638]'
        }`}>
          <div className="text-right">
            <span className="text-[9px] text-gray-500 font-mono block">BTC/USDT Binance</span>
            <span className={`text-sm sm:text-base font-bold font-mono tracking-tight transition-colors ${
              flashDirection === 'UP' ? 'text-emerald-400' : flashDirection === 'DOWN' ? 'text-rose-400' : 'text-white'
            }`}>
              ${currentPrice > 0 ? currentPrice.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '---'}
            </span>
          </div>
          <div className={`text-[11px] font-bold font-mono px-1.5 py-0.5 rounded ${
            isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
          }`}>
            {isPositive ? '+' : ''}{priceChange24h.toFixed(2)}%
          </div>
        </div>

        {/* Badges de Latencia, Modo y Ajustes */}
        <div className="flex items-center space-x-2">
          {/* Badge de Latencia en Vivo (Ping) */}
          <div className="flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-950/50 border border-emerald-700/50 text-emerald-400 text-[10px] font-mono">
            <Zap className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>{latencyMs}ms</span>
          </div>

          {/* Modo de Trading */}
          <div className={`px-2 py-0.5 rounded-md text-[11px] font-semibold flex items-center space-x-1 border ${
            portfolio.mode === 'PAPER'
              ? 'bg-blue-950/40 border-blue-800/50 text-blue-300'
              : 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
          }`}>
            <ShieldCheck className="w-3 h-3" />
            <span>{portfolio.mode === 'PAPER' ? '$50 Demo' : 'Binance Real'}</span>
          </div>

          {/* Botón de Configuración */}
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-lg bg-[#1e2638] hover:bg-[#2a344d] text-gray-300 hover:text-white transition-colors"
            title="Configuración"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
