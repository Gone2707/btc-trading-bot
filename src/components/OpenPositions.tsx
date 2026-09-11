'use client';

import React from 'react';
import { Position } from '../types/trading';
import { Layers, Target, ShieldCheck } from 'lucide-react';

interface OpenPositionsProps {
  positions: Position[];
  currentPrice: number;
  availableUsdt: number;
  totalEquityUsd: number;
}

export const OpenPositions: React.FC<OpenPositionsProps> = ({
  positions,
  currentPrice,
  availableUsdt,
  totalEquityUsd,
}) => {
  return (
    <div className="bg-[#131722] border border-[#1e2638] rounded-xl overflow-hidden shadow-2xl">
      {/* Encabezado MT5 Trading */}
      <div className="bg-[#181c27] px-4 py-3 border-b border-[#1e2638] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold text-white tracking-wide uppercase font-mono">
            Trading — Operativas Abiertas
          </h2>
        </div>
        <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#0b0e14] text-emerald-400 border border-[#1e2638]">
          {positions.length} activas
        </span>
      </div>

      {/* Barra de Resumen de Cuenta MT5 (Balance, Equidad, Margen) */}
      <div className="bg-[#0e121a] px-4 py-2.5 border-b border-[#1e2638] grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
        <div>
          <span className="text-[10px] text-gray-500 uppercase block">Balance:</span>
          <strong className="text-white">${totalEquityUsd.toFixed(2)}</strong>
        </div>
        <div>
          <span className="text-[10px] text-gray-500 uppercase block">Equidad:</span>
          <strong className="text-sky-400">${totalEquityUsd.toFixed(2)}</strong>
        </div>
        <div>
          <span className="text-[10px] text-gray-500 uppercase block">Margen Libre (USDT):</span>
          <strong className="text-emerald-400">${availableUsdt.toFixed(2)}</strong>
        </div>
        <div>
          <span className="text-[10px] text-gray-500 uppercase block">Nivel de Margen:</span>
          <strong className="text-amber-400">100% (Spot 0x)</strong>
        </div>
      </div>

      {/* Lista de Posiciones Abiertas en Formato MT5 Mobile / Desktop */}
      {positions.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <ShieldCheck className="w-9 h-9 mx-auto text-gray-600 mb-2" />
          <p className="text-xs font-mono">No hay posiciones abiertas en este momento</p>
          <p className="text-[11px] text-gray-600 mt-0.5">
            El bot abrirá órdenes automáticamente en zonas de descuento o rango.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#1e2638]">
          {positions.map((p) => {
            const isProfitable = p.unrealizedPnlUsd >= 0;
            const distanceTotal = p.targetSellPrice - p.buyPrice;
            const distanceCovered = currentPrice - p.buyPrice;
            const progressPercent = Math.min(100, Math.max(0, (distanceCovered / (distanceTotal || 1)) * 100));
            const pnlSign = isProfitable ? '+' : '';

            return (
              <div key={p.id} className="p-3.5 hover:bg-[#181c27] transition-colors font-mono">
                {/* Fila 1: Símbolo, Tipo/Volumen | Beneficio Flotante MT5 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-white">BTCUSDT</span>
                    <span className="text-xs font-bold text-sky-400 uppercase">
                      buy {p.amountBtc.toFixed(6)}
                    </span>
                  </div>
                  <div className={`text-base font-bold tracking-tight ${
                    isProfitable ? 'text-[#26a69a]' : 'text-[#ef5350]'
                  }`}>
                    {pnlSign}${p.unrealizedPnlUsd.toFixed(2)}
                  </div>
                </div>

                {/* Fila 2: Precio de Entrada -> Precio Actual */}
                <div className="flex items-center justify-between text-xs mt-1 text-gray-300">
                  <div>
                    <span>{p.buyPrice.toFixed(2)}</span>
                    <span className="text-gray-500 mx-1.5">→</span>
                    <span className="text-sky-400 font-semibold">{currentPrice.toFixed(2)}</span>
                  </div>
                  <div className={`text-[11px] font-semibold ${
                    isProfitable ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {pnlSign}{p.unrealizedPnlPercent.toFixed(2)}%
                  </div>
                </div>

                {/* Fila 3: S/L, T/P y Ticket MT5 */}
                <div className="flex flex-wrap items-center justify-between text-[11px] text-gray-500 mt-1">
                  <div className="flex items-center space-x-3">
                    <span>S/L: <strong className="text-gray-400">0.00 (HODL)</strong></span>
                    <span>T/P: <strong className="text-amber-400">${p.targetSellPrice.toFixed(2)}</strong></span>
                  </div>
                  <div>
                    Invertido: <strong className="text-gray-300">${p.investedUsd.toFixed(2)}</strong> ({p.id})
                  </div>
                </div>

                {/* Barra de Progreso hacia Take Profit */}
                <div className="mt-2 flex items-center space-x-2">
                  <div className="flex-1 bg-[#0b0e14] h-1.5 rounded-full overflow-hidden border border-[#1e2638]">
                    <div
                      className={`h-full transition-all duration-300 ${
                        progressPercent >= 85 ? 'bg-amber-400' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400">{progressPercent.toFixed(0)}% a TP</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
