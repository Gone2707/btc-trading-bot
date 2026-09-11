'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from '../components/Header';
import { PortfolioSummary } from '../components/PortfolioSummary';
import { Mt5Chart } from '../components/Mt5Chart';
import { OpenPositions } from '../components/OpenPositions';
import { TradeHistory } from '../components/TradeHistory';
import { AiIntelligencePanel } from '../components/AiIntelligencePanel';
import { BotControls } from '../components/BotControls';
import { SettingsModal } from '../components/SettingsModal';
import { binanceFeed } from '../engine/binanceWs';
import { analyzeMarketRegime } from '../engine/regimeClassifier';
import { evaluateStrategy } from '../engine/adaptiveGridStrategy';
import {
  loadPortfolioState,
  savePortfolioState,
  resetPortfolioState,
} from '../engine/paperTradingEngine';
import {
  loadSelfTunerState,
  saveSelfTunerState,
} from '../engine/selfTuner';
import { Candle, MarketIntelligence, PortfolioState, SelfTunerState } from '../types/trading';

export default function Dashboard() {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceChange24h, setPriceChange24h] = useState<number>(0);
  const [portfolio, setPortfolio] = useState<PortfolioState>(loadPortfolioState);
  const [tuner, setTuner] = useState<SelfTunerState>(loadSelfTunerState);
  const [market, setMarket] = useState<MarketIntelligence>(() =>
    analyzeMarketRegime([], 65000)
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [lastNotification, setLastNotification] = useState<string | null>(null);

  const portfolioRef = useRef(portfolio);
  portfolioRef.current = portfolio;

  const tunerRef = useRef(tuner);
  tunerRef.current = tuner;

  const candlesRef = useRef(candles);
  candlesRef.current = candles;

  // 1. CARGA INICIAL DE VELAS HISTÓRICAS DE BINANCE
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      const initialKlines = await binanceFeed.fetchHistoricalKlines('BTCUSDT', '1m', 80);
      if (isMounted && initialKlines.length > 0) {
        setCandles(initialKlines);
        const latestPrice = initialKlines[initialKlines.length - 1].close;
        setCurrentPrice(latestPrice);
        const initialMarket = analyzeMarketRegime(initialKlines, latestPrice);
        setMarket(initialMarket);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. CONEXIÓN A WEBSOCKETS DE BINANCE EN TIEMPO REAL
  useEffect(() => {
    binanceFeed.connect();

    // Ticker en vivo (precios submilisegundo)
    const unsubTicker = binanceFeed.subscribeTicker((price, change) => {
      setCurrentPrice(price);
      setPriceChange24h(change);

      // Evaluar estrategia con cada tick de precio en vivo
      const currentPort = portfolioRef.current;
      const currentTuner = tunerRef.current;
      const currentCandles = candlesRef.current;

      const currentMarket = analyzeMarketRegime(currentCandles, price);
      setMarket(currentMarket);

      const { decision, updatedPortfolio, updatedTuner } = evaluateStrategy(
        currentPort,
        currentMarket,
        currentTuner,
        price
      );

      setPortfolio(updatedPortfolio);
      savePortfolioState(updatedPortfolio);

      if (updatedTuner !== currentTuner) {
        setTuner(updatedTuner);
        saveSelfTunerState(updatedTuner);
      }

      if (decision.action !== 'HOLD') {
        setLastNotification(decision.reason);
      }
    });

    // Velas de 1 minuto en vivo
    const unsubCandle = binanceFeed.subscribeCandle((candle) => {
      setCandles((prev) => {
        if (prev.length === 0) return [candle];
        const last = prev[prev.length - 1];

        if (last.time === candle.time) {
          // Actualizar vela actual
          const updated = [...prev];
          updated[updated.length - 1] = candle;
          return updated;
        } else {
          // Nueva vela completada
          return [...prev.slice(-120), candle];
        }
      });
    });

    return () => {
      unsubTicker();
      unsubCandle();
      binanceFeed.disconnect();
    };
  }, []);

  // Control: Iniciar / Pausar Bot
  const handleToggleBot = useCallback(() => {
    setPortfolio((prev) => {
      const next = { ...prev, isBotRunning: !prev.isBotRunning };
      savePortfolioState(next);
      return next;
    });
  }, []);

  // Control: Resetear a $50 USD
  const handleResetAccount = useCallback(() => {
    if (window.confirm('¿Reiniciar saldo virtual a $50 USD? Se borrarán las órdenes abiertas y el historial.')) {
      const fresh = resetPortfolioState(50.0);
      setPortfolio(fresh);
      setLastNotification('Saldo reiniciado a $50.00 USD con éxito.');
    }
  }, []);

  // Control: Compra manual de tramo
  const handleManualTranche = useCallback(() => {
    if (portfolio.availableUsdt < 5) {
      alert('No tienes saldo USDT suficiente para comprar un tramo (Mínimo $5 USD).');
      return;
    }
    const trancheUsd = Math.min(portfolio.availableUsdt, 15);
    const fee = trancheUsd * 0.001;
    const amountBtc = Number(((trancheUsd - fee) / currentPrice).toFixed(6));
    const targetSellPrice = Number((currentPrice * 1.018).toFixed(2));

    const newPos = {
      id: `TK-${Math.floor(1000 + Math.random() * 9000)}`,
      trancheIndex: portfolio.openPositions.length,
      buyPrice: currentPrice,
      targetSellPrice,
      amountBtc,
      investedUsd: trancheUsd,
      timestamp: Date.now(),
      status: 'OPEN' as const,
      currentPrice,
      unrealizedPnlUsd: 0,
      unrealizedPnlPercent: 0,
      trailingMaxPrice: currentPrice,
      notes: 'Compra manual de prueba',
    };

    const nextPort: PortfolioState = {
      ...portfolio,
      availableUsdt: Number((portfolio.availableUsdt - trancheUsd).toFixed(2)),
      heldBtc: Number((portfolio.heldBtc + amountBtc).toFixed(6)),
      openPositions: [...portfolio.openPositions, newPos],
    };

    setPortfolio(nextPort);
    savePortfolioState(nextPort);
    setLastNotification(`Tramo manual ejecutado: Comprados ${amountBtc} BTC a $${currentPrice.toFixed(1)}`);
  }, [portfolio, currentPrice]);

  // Exportar estado a JSON
  const handleExportState = useCallback(() => {
    const data = {
      exportedAt: new Date().toISOString(),
      portfolio,
      tuner,
      market,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `btc_bot_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [portfolio, tuner, market]);

  // Actualizar modo (Paper / Binance Real)
  const handleUpdateMode = useCallback((mode: 'PAPER' | 'LIVE_BINANCE') => {
    setPortfolio((prev) => {
      const next: PortfolioState = { ...prev, mode };
      savePortfolioState(next);
      return next;
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0e14] text-slate-100 flex flex-col">
      {/* Header Principal */}
      <Header
        portfolio={portfolio}
        currentPrice={currentPrice}
        priceChange24h={priceChange24h}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Notificación de evento del bot */}
      {lastNotification && (
        <div className="bg-gradient-to-r from-amber-950/60 to-emerald-950/60 border-b border-[#1e2638] px-4 py-2 text-xs font-mono text-amber-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>{lastNotification}</span>
          </div>
          <button
            onClick={() => setLastNotification(null)}
            className="text-gray-400 hover:text-white text-[10px]"
          >
            ✕ Cerrar
          </button>
        </div>
      )}

      {/* Contenido Principal */}
      <main className="max-w-7xl mx-auto w-full p-3 sm:p-4 space-y-4 flex-1">
        {/* 1. Tarjetas de Resumen del Portafolio ($50 inicial, BTC acumulado, PnL flotante) */}
        <PortfolioSummary portfolio={portfolio} />

        {/* 2. Cuadrícula Principal: Gráfico MT5 y Panel de IA */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Gráfico MT5 Interactivo en tiempo real */}
          <div className="lg:col-span-2">
            <Mt5Chart
              candles={candles}
              currentPrice={currentPrice}
              openPositions={portfolio.openPositions}
              closedTrades={portfolio.closedTrades}
              symbol="BTC/USDT"
            />
          </div>

          {/* Panel de Inteligencia Artificial y Autoaprendizaje */}
          <div className="lg:col-span-1 flex flex-col">
            <AiIntelligencePanel market={market} tuner={tuner} />
          </div>
        </div>

        {/* 3. Barra de Controles Rápidos del Bot */}
        <BotControls
          portfolio={portfolio}
          onToggleBot={handleToggleBot}
          onResetAccount={handleResetAccount}
          onManualTranche={handleManualTranche}
          onExportState={handleExportState}
        />

        {/* 4. Operativas Abiertas Estilo MT5 (Ticket, Invertido, Progreso TP, PnL Flotante) */}
        <OpenPositions
          positions={portfolio.openPositions}
          currentPrice={currentPrice}
        />

        {/* 5. Historial de Operaciones Cerradas */}
        <TradeHistory trades={portfolio.closedTrades} />
      </main>

      {/* Modal de Configuración */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        portfolio={portfolio}
        onUpdateMode={handleUpdateMode}
      />

      {/* Footer */}
      <footer className="border-t border-[#1e2638] py-4 px-4 text-center text-xs text-gray-500">
        <p>BTC HODL Grid AI Bot • Cero Costo • Desplegable en Vercel • Conexión Pública Binance WebSockets</p>
      </footer>
    </div>
  );
}
