'use client';

import React, { useState } from 'react';
import { X, ShieldCheck, Key, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { PortfolioState } from '../types/trading';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolio: PortfolioState;
  onUpdateMode: (mode: 'PAPER' | 'LIVE_BINANCE', apiKey?: string, apiSecret?: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  portfolio,
  onUpdateMode,
}) => {
  const [mode, setMode] = useState<'PAPER' | 'LIVE_BINANCE'>(portfolio.mode);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onUpdateMode(mode, apiKey, apiSecret);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#121722] border border-[#1e2638] rounded-2xl w-full max-w-lg p-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1e2638] mb-4">
          <div className="flex items-center space-x-2">
            <Key className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-white">Configuración del Bot</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#1e2638] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selector de Modo */}
        <div className="space-y-4 mb-5">
          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-2">
              Modo de Operación:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('PAPER')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  mode === 'PAPER'
                    ? 'bg-blue-950/40 border-blue-500 text-blue-200 shadow-lg shadow-blue-500/10'
                    : 'bg-[#0b0e14] border-[#1e2638] text-gray-400 hover:border-gray-600'
                }`}
              >
                <div className="font-bold text-sm text-white mb-1">Paper Trading</div>
                <div className="text-[11px] text-gray-400">
                  Simulación con $50 USD virtuales y precios reales de Binance. Cero riesgo.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode('LIVE_BINANCE')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  mode === 'LIVE_BINANCE'
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200 shadow-lg shadow-emerald-500/10'
                    : 'bg-[#0b0e14] border-[#1e2638] text-gray-400 hover:border-gray-600'
                }`}
              >
                <div className="font-bold text-sm text-white mb-1">Binance Spot Real</div>
                <div className="text-[11px] text-gray-400">
                  Conexión directa vía API oficial a tu cuenta spot de Binance.
                </div>
              </button>
            </div>
          </div>

          {/* Formulario de Claves de Binance para cuando el usuario quiera ir a Real */}
          {mode === 'LIVE_BINANCE' && (
            <div className="bg-[#0b0e14] p-4 rounded-xl border border-emerald-900/50 space-y-3">
              <div className="flex items-start space-x-2 text-amber-400 text-xs">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Seguridad:</strong> Tus claves se guardan solo localmente en tu navegador. En Binance API solo habilita <em>Enable Reading</em> y <em>Enable Spot & Margin Trading</em>. <strong>NUNCA actives Retiros (Withdrawals)</strong>.
                </span>
              </div>

              <div>
                <label className="text-[11px] text-gray-400 block mb-1">Binance API Key:</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Introduce tu API Key de Binance"
                  className="w-full bg-[#121722] border border-[#1e2638] rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-gray-400 block mb-1">Binance API Secret:</label>
                <input
                  type="password"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="Introduce tu API Secret"
                  className="w-full bg-[#121722] border border-[#1e2638] rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Resumen del Perfil */}
          <div className="bg-[#0b0e14] p-3 rounded-xl border border-[#1e2638] text-xs space-y-1.5 text-gray-300">
            <div className="flex items-center space-x-2 text-emerald-400 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Reglas del Perfil Conservador HODL:</span>
            </div>
            <p className="text-gray-400 text-[11px]">
              • <strong>Venta:</strong> Solo si precio actual {'>'} precio compra + fees + margen de ganancia.
            </p>
            <p className="text-gray-400 text-[11px]">
              • <strong>Caídas:</strong> No vende en pérdida; mantiene los Satoshis (BTC) y promedia en sobreventa.
            </p>
            <p className="text-gray-400 text-[11px]">
              • <strong>Apalancamiento:</strong> 0x (Spot Puro, sin riesgo de liquidación).
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#1e2638]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#1e2638] hover:bg-[#2a344d] text-gray-300 text-xs font-semibold transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition-colors shadow-lg shadow-amber-500/20"
          >
            {savedSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-slate-950" />
                <span>Guardado</span>
              </>
            ) : (
              <span>Guardar Configuración</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
