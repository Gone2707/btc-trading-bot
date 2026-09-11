'use client';

import React from 'react';
import { PortfolioState } from '../types/trading';
import { DollarSign, TrendingUp, Bitcoin, Wallet, Award, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface PortfolioSummaryProps {
  portfolio: PortfolioState;
}

export const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({ portfolio }) => {
  const isTotalPnlPositive = portfolio.totalPnlPercent >= 0;
  const isFloatingPnlPositive = portfolio.unrealizedPnlUsd >= 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {/* 1. Valor Total del Portafolio */}
      <div className="bg-[#121722] border border-[#1e2638] rounded-xl p-3.5 shadow-md flex flex-col justify-between">
        <div className="flex items-center justify-between text-gray-400 mb-1">
          <span className="text-xs">Balance Total</span>
          <Wallet className="w-4 h-4 text-amber-500" />
        </div>
        <div>
          <div className="text-xl font-bold font-mono text-white tracking-tight">
            ${portfolio.totalEquityUsd.toFixed(2)}
          </div>
          <div className={`text-xs font-semibold flex items-center mt-0.5 ${
            isTotalPnlPositive ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {isTotalPnlPositive ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
            {isTotalPnlPositive ? '+' : ''}{portfolio.totalPnlPercent.toFixed(2)}% (Inicial: ${portfolio.initialCapitalUsd.toFixed(0)})
          </div>
        </div>
      </div>

      {/* 2. USDT Disponible (Pólvora para Dips) */}
      <div className="bg-[#121722] border border-[#1e2638] rounded-xl p-3.5 shadow-md flex flex-col justify-between">
        <div className="flex items-center justify-between text-gray-400 mb-1">
          <span className="text-xs">USDT Disponible</span>
          <DollarSign className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <div className="text-xl font-bold font-mono text-white tracking-tight">
            ${portfolio.availableUsdt.toFixed(2)}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">
            Reservas para compras en dip
          </div>
        </div>
      </div>

      {/* 3. BTC Acumulado en HODL */}
      <div className="bg-[#121722] border border-[#1e2638] rounded-xl p-3.5 shadow-md flex flex-col justify-between">
        <div className="flex items-center justify-between text-gray-400 mb-1">
          <span className="text-xs">BTC en Custodia</span>
          <Bitcoin className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <div className="text-xl font-bold font-mono text-white tracking-tight">
            {portfolio.heldBtc.toFixed(6)}
          </div>
          <div className="text-[11px] text-amber-400/90 font-mono mt-0.5">
            ≈ ${(portfolio.heldBtc * portfolio.currentBtcPrice).toFixed(2)} USD
          </div>
        </div>
      </div>

      {/* 4. Ganancia Realizada (Cerrada en bolsillo) */}
      <div className="bg-[#121722] border border-[#1e2638] rounded-xl p-3.5 shadow-md flex flex-col justify-between">
        <div className="flex items-center justify-between text-gray-400 mb-1">
          <span className="text-xs">Ganancia Realizada</span>
          <TrendingUp className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <div className="text-xl font-bold font-mono text-emerald-400 tracking-tight">
            +${portfolio.realizedProfitUsd.toFixed(2)}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">
            {portfolio.totalTradesCount} operaciones cerradas
          </div>
        </div>
      </div>

      {/* 5. PnL Flotante (Operativas Abiertas estilo MT5) */}
      <div className="bg-[#121722] border border-[#1e2638] rounded-xl p-3.5 shadow-md flex flex-col justify-between">
        <div className="flex items-center justify-between text-gray-400 mb-1">
          <span className="text-xs">PnL Flotante</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1e2638] text-gray-300">
            {portfolio.openPositions.length} abiertas
          </span>
        </div>
        <div>
          <div className={`text-xl font-bold font-mono tracking-tight ${
            isFloatingPnlPositive ? 'text-emerald-400' : 'text-orange-400'
          }`}>
            {isFloatingPnlPositive ? '+' : ''}${portfolio.unrealizedPnlUsd.toFixed(2)}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">
            {isFloatingPnlPositive ? 'Ganancia sin cerrar' : 'Hold temporal (0 pérdida)'}
          </div>
        </div>
      </div>

      {/* 6. Win Rate / Tasa de Éxito */}
      <div className="bg-[#121722] border border-[#1e2638] rounded-xl p-3.5 shadow-md flex flex-col justify-between">
        <div className="flex items-center justify-between text-gray-400 mb-1">
          <span className="text-xs">Efectividad Venta</span>
          <Award className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <div className="text-xl font-bold font-mono text-emerald-400 tracking-tight">
            {portfolio.winRatePercent}%
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">
            Regla: 0% ventas en negativo
          </div>
        </div>
      </div>
    </div>
  );
};
