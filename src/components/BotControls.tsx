'use client';

import React from 'react';
import { Play, Pause, RotateCcw, PlusCircle, Download } from 'lucide-react';
import { PortfolioState } from '../types/trading';

interface BotControlsProps {
  portfolio: PortfolioState;
  onToggleBot: () => void;
  onResetAccount: () => void;
  onManualTranche: () => void;
  onExportState: () => void;
}

export const BotControls: React.FC<BotControlsProps> = ({
  portfolio,
  onToggleBot,
  onResetAccount,
  onManualTranche,
  onExportState,
}) => {
  return (
    <div className="bg-[#121722] border border-[#1e2638] rounded-xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
      {/* Estado del Bot */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleBot}
          className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all shadow-md ${
            portfolio.isBotRunning
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
              : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
          }`}
        >
          {portfolio.isBotRunning ? (
            <>
              <Pause className="w-4 h-4" />
              <span>Bot Activo (Pausar)</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>Bot Pausado (Iniciar)</span>
            </>
          )}
        </button>

        <span className="text-xs text-gray-400 font-mono hidden md:inline">
          {portfolio.isBotRunning ? '🟢 Ejecutando órdenes automáticas' : '⏸️ Modo observación pasivo'}
        </span>
      </div>

      {/* Botones de Acción */}
      <div className="flex items-center space-x-2">
        {/* Forzar compra manual de prueba */}
        <button
          onClick={onManualTranche}
          disabled={!portfolio.isBotRunning || portfolio.availableUsdt < 5}
          className="px-3 py-2 rounded-xl bg-[#1e2638] hover:bg-[#2a344d] disabled:opacity-40 text-gray-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          title="Ejecutar una compra inmediata de prueba con capital de simulación"
        >
          <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span>Comprar Tramo</span>
        </button>

        {/* Reiniciar a $50 USD */}
        <button
          onClick={onResetAccount}
          className="px-3 py-2 rounded-xl bg-[#1e2638] hover:bg-[#2a344d] text-gray-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          title="Reiniciar saldo virtual a los $50 USD originales"
        >
          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
          <span>Reset a $50</span>
        </button>

        {/* Exportar datos a JSON */}
        <button
          onClick={onExportState}
          className="p-2 rounded-xl bg-[#1e2638] hover:bg-[#2a344d] text-gray-300 hover:text-white transition-colors"
          title="Descargar respaldo de operaciones y autoaprendizaje"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
