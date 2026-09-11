'use client';

import React from 'react';
import { ClosedTrade } from '../types/trading';
import { CheckCircle2, History, Clock, ArrowUpRight } from 'lucide-react';

interface TradeHistoryProps {
  trades: ClosedTrade[];
}

export const TradeHistory: React.FC<TradeHistoryProps> = ({ trades }) => {
  return (
    <div className="bg-[#121722] border border-[#1e2638] rounded-xl p-4 shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-[#1e2638] mb-3">
        <div className="flex items-center space-x-2">
          <History className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-bold text-white tracking-wide">Historial de Operaciones Cerradas</h2>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
            {trades.length} cerradas
          </span>
        </div>
        <div className="text-xs text-gray-400 hidden sm:block">
          Todas las ventas cerradas estrictamente con ganancia neta
        </div>
      </div>

      {trades.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <Clock className="w-10 h-10 mx-auto text-gray-600 mb-2" />
          <p className="text-sm font-medium text-gray-300">Aún no hay operaciones cerradas</p>
          <p className="text-xs text-gray-500 mt-1">
            Tan pronto como el precio alcance el Take Profit, la operación se liquidará aquí con su ganancia en USD.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[340px] overflow-y-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="sticky top-0 bg-[#121722]">
              <tr className="text-gray-400 border-b border-[#1e2638] uppercase text-[10px] tracking-wider">
                <th className="pb-2.5">Ticket</th>
                <th className="pb-2.5">Invertido</th>
                <th className="pb-2.5">Compra</th>
                <th className="pb-2.5">Venta</th>
                <th className="pb-2.5">Duración</th>
                <th className="pb-2.5">Régimen</th>
                <th className="pb-2.5">Comisión</th>
                <th className="pb-2.5 text-right">Ganancia Neta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2638]/40">
              {trades.map(t => (
                <tr key={t.id} className="hover:bg-[#1a2233] transition-colors">
                  <td className="py-2.5 font-bold text-gray-200">
                    <div className="flex items-center space-x-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{t.ticket}</span>
                    </div>
                  </td>
                  <td className="py-2.5 text-gray-300">${t.investedUsd.toFixed(2)}</td>
                  <td className="py-2.5 text-gray-300">${t.buyPrice.toFixed(1)}</td>
                  <td className="py-2.5 text-emerald-400 font-semibold">${t.sellPrice.toFixed(1)}</td>
                  <td className="py-2.5 text-gray-400">{t.durationMinutes} min</td>
                  <td className="py-2.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1e2638] text-gray-300">
                      {t.regime}
                    </span>
                  </td>
                  <td className="py-2.5 text-gray-400">${t.feeUsd.toFixed(3)}</td>
                  <td className="py-2.5 text-right">
                    <div className="font-bold text-emerald-400 flex items-center justify-end">
                      <ArrowUpRight className="w-3 h-3 mr-0.5" />
                      +${t.netProfitUsd.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-emerald-500">
                      +{t.netProfitPercent.toFixed(2)}%
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
