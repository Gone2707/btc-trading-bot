'use client';

import React from 'react';
import { ClosedTrade } from '../types/trading';
import { History, CheckCircle, Clock } from 'lucide-react';

interface TradeHistoryProps {
  trades: ClosedTrade[];
  initialCapital: number;
}

export const TradeHistory: React.FC<TradeHistoryProps> = ({ trades, initialCapital }) => {
  const totalProfit = trades.reduce((sum, t) => sum + t.netProfitUsd, 0);

  return (
    <div className="bg-[#131722] border border-[#1e2638] rounded-xl overflow-hidden shadow-2xl">
      {/* Encabezado MT5 Historial */}
      <div className="bg-[#181c27] px-4 py-3 border-b border-[#1e2638] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <History className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-bold text-white tracking-wide uppercase font-mono">
            Historial — Operaciones Cerradas
          </h2>
        </div>
        <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#0b0e14] text-amber-400 border border-[#1e2638]">
          {trades.length} cerradas
        </span>
      </div>

      {/* Resumen Superior de Historial MT5 */}
      <div className="bg-[#0e121a] px-4 py-2.5 border-b border-[#1e2638] grid grid-cols-3 gap-2 text-xs font-mono">
        <div>
          <span className="text-[10px] text-gray-500 uppercase block">Depósito Inicial:</span>
          <strong className="text-white">${initialCapital.toFixed(2)}</strong>
        </div>
        <div>
          <span className="text-[10px] text-gray-500 uppercase block">Beneficio Cerrado:</span>
          <strong className="text-emerald-400">+${totalProfit.toFixed(2)}</strong>
        </div>
        <div>
          <span className="text-[10px] text-gray-500 uppercase block">Efectividad:</span>
          <strong className="text-amber-400">100% (0 pérdidas)</strong>
        </div>
      </div>

      {/* Lista de Operaciones Cerradas MT5 */}
      {trades.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <Clock className="w-9 h-9 mx-auto text-gray-600 mb-2" />
          <p className="text-xs font-mono">No hay operaciones cerradas aún</p>
          <p className="text-[11px] text-gray-600 mt-0.5">
            Las ganancias se registrarán aquí con su beneficio neto y comisión descontada.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#1e2638] max-h-[380px] overflow-y-auto">
          {trades.map((t) => {
            const openD = new Date(t.openTime);
            const closeD = new Date(t.closeTime);
            const formatTime = (d: Date) =>
              `${d.getFullYear()}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

            return (
              <div key={t.id} className="p-3.5 hover:bg-[#181c27] transition-colors font-mono">
                {/* Fila 1: Símbolo, buy volumen | Ganancia Neta MT5 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-white">BTCUSDT</span>
                    <span className="text-xs font-bold text-sky-400 uppercase">
                      buy {t.amountBtc.toFixed(6)}
                    </span>
                  </div>
                  <div className="text-base font-bold text-[#26a69a] tracking-tight">
                    +${t.netProfitUsd.toFixed(2)}
                  </div>
                </div>

                {/* Fila 2: Precio Entrada -> Precio Salida */}
                <div className="flex items-center justify-between text-xs mt-1 text-gray-300">
                  <div>
                    <span>{t.buyPrice.toFixed(2)}</span>
                    <span className="text-gray-500 mx-1.5">→</span>
                    <span className="text-emerald-400 font-semibold">{t.sellPrice.toFixed(2)}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-400">
                    +{t.netProfitPercent.toFixed(2)}%
                  </span>
                </div>

                {/* Fila 3: Horarios, Comisión y Ticket MT5 */}
                <div className="flex flex-wrap items-center justify-between text-[11px] text-gray-500 mt-1">
                  <div>
                    {formatTime(openD)} → {formatTime(closeD)} ({t.durationMinutes}m)
                  </div>
                  <div>
                    Fee: <strong className="text-gray-400">${t.feeUsd.toFixed(3)}</strong> | Invertido: <strong className="text-gray-300">${t.investedUsd.toFixed(2)}</strong> ({t.ticket})
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
