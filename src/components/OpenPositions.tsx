'use client';

import React from 'react';
import { Position } from '../types/trading';
import { ArrowUpCircle, Target, Clock, ShieldCheck, Zap } from 'lucide-react';

interface OpenPositionsProps {
  positions: Position[];
  currentPrice: number;
}

export const OpenPositions: React.FC<OpenPositionsProps> = ({ positions, currentPrice }) => {
  return (
    <div className="bg-[#121722] border border-[#1e2638] rounded-xl p-4 shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-[#1e2638] mb-3">
        <div className="flex items-center space-x-2">
          <ArrowUpCircle className="w-5 h-5 text-emerald-400" />
          <h2 className="text-base font-bold text-white tracking-wide">Operativas Abiertas (Estilo MT5)</h2>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            {positions.length} en curso
          </span>
        </div>
        <div className="text-xs text-gray-400 hidden sm:block">
          Actualización en tiempo real con WebSocket
        </div>
      </div>

      {positions.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <ShieldCheck className="w-10 h-10 mx-auto text-gray-600 mb-2" />
          <p className="text-sm font-medium text-gray-300">Sin operativas abiertas en este momento</p>
          <p className="text-xs text-gray-500 mt-1">
            El bot está analizando el mercado para entrar en el nivel óptimo de rango o descuento.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="text-gray-400 border-b border-[#1e2638] uppercase text-[10px] tracking-wider">
                <th className="pb-2.5">Ticket</th>
                <th className="pb-2.5">Tipo</th>
                <th className="pb-2.5">Invertido ($)</th>
                <th className="pb-2.5">Volumen BTC</th>
                <th className="pb-2.5">Precio Entrada</th>
                <th className="pb-2.5">Precio Actual</th>
                <th className="pb-2.5">Take Profit (TP)</th>
                <th className="pb-2.5">Progreso TP</th>
                <th className="pb-2.5 text-right">Beneficio Flotante (PnL)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2638]/50">
              {positions.map(p => {
                const isProfitable = p.unrealizedPnlUsd >= 0;
                const distanceTotal = p.targetSellPrice - p.buyPrice;
                const distanceCovered = currentPrice - p.buyPrice;
                const progressPercent = Math.min(100, Math.max(0, (distanceCovered / (distanceTotal || 1)) * 100));
                const elapsedMin = Math.max(1, Math.round((Date.now() - p.timestamp) / 60000));

                return (
                  <tr key={p.id} className="hover:bg-[#1a2233] transition-colors">
                    {/* Ticket */}
                    <td className="py-3 font-bold text-gray-200">
                      <div className="flex items-center space-x-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>{p.id}</span>
                      </div>
                    </td>

                    {/* Tipo */}
                    <td className="py-3">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold text-[10px]">
                        BUY SPOT
                      </span>
                    </td>

                    {/* Capital Invertido */}
                    <td className="py-3 font-bold text-white">
                      ${p.investedUsd.toFixed(2)}
                    </td>

                    {/* Volumen en BTC */}
                    <td className="py-3 text-amber-300">
                      {p.amountBtc.toFixed(6)}
                    </td>

                    {/* Precio de Entrada */}
                    <td className="py-3 text-gray-300">
                      ${p.buyPrice.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                    </td>

                    {/* Precio Actual */}
                    <td className="py-3 text-sky-400 font-bold">
                      ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                    </td>

                    {/* Take Profit Proyectado */}
                    <td className="py-3 text-amber-400">
                      <div className="flex items-center space-x-1">
                        <Target className="w-3 h-3 text-amber-500" />
                        <span>${p.targetSellPrice.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                      </div>
                    </td>

                    {/* Barra de Progreso hacia TP */}
                    <td className="py-3 min-w-[120px]">
                      <div className="flex items-center space-x-2">
                        <div className="w-full bg-[#0b0e14] h-2 rounded-full overflow-hidden border border-[#1e2638]">
                          <div
                            className={`h-full transition-all duration-300 ${
                              progressPercent >= 90 ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400">{progressPercent.toFixed(0)}%</span>
                      </div>
                    </td>

                    {/* PnL Flotante */}
                    <td className="py-3 text-right">
                      <div className={`font-bold text-sm ${isProfitable ? 'text-emerald-400' : 'text-orange-400'}`}>
                        {isProfitable ? '+' : ''}${p.unrealizedPnlUsd.toFixed(2)}
                      </div>
                      <div className={`text-[10px] ${isProfitable ? 'text-emerald-500' : 'text-orange-500'}`}>
                        {isProfitable ? '+' : ''}{p.unrealizedPnlPercent.toFixed(2)}%
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
