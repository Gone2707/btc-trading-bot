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
import { CandlestickChart, Layers, History, Brain, SlidersHorizontal, Play, Pause } from 'lucide-react';

type MobileTab = 'CHART' | 'TRADE' | 'HISTORY' | 'AI';

export default function Dashboard() {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceChange24h, setPriceChange24h] = useState<number>(0);
  const [portfolio, setPortfolio] = useState<PortfolioState>(loadPortfolioState);
  const [tuner, setTuner] = useState<SelfTunerState>(loadSelfTunerState);
  const [market, setMarket] = useState<MarketIntelligence>(() =>
    analyzeMarketRegime([], 65000)
  );
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('M1');
  const [activeTab, setActiveTab] = useState<MobileTab>('CHART');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [lastNotification, setLastNotification] = useState<string | null>(null);

  const portfolioRef = useRef(portfolio);
  portfolioRef.current = portfolio;

  const tunerRef = useRef(tuner);
  tunerRef.current = tuner;

  const candlesRef = useRef(candles);
  candlesRef.current = candles;

  // Carga de Velas según la temporalidad
  const loadKlines = useCallback(async (interval: string) => {
    const rawInterval = interval === 'M1' ? '1m' : interval === 'M5' ? '5m' : interval === 'M15' ? '15m' : '1h';
    const initialKlines = await binanceFeed.fetchHistoricalKlines('BTCUSDT', rawInterval, 85);
    if (initialKlines.length > 0) {
      setCandles(initialKlines);
      const latestPrice = initialKlines[initialKlines.length - 1].close;
      setCurrentPrice(latestPrice);
      const initialMarket = analyzeMarketRegime(initialKlines, latestPrice);
      setMarket(initialMarket);
    }
  }, []);

  // Temporalidad cambiada por el usuario
  const handleTimeframeChange = (tf: string) => {
    setSelectedTimeframe(tf);
    const rawInterval = tf === 'M1' ? '1m' : tf === 'M5' ? '5m' : tf === 'M15' ? '15m' : '1h';
    binanceFeed.switchInterval(rawInterval);
    loadKlines(tf);
  };

  useEffect(() => {
    loadKlines('M1');
  }, [loadKlines]);

  // Conexión WebSocket a Binance
  useEffect(() => {
    binanceFeed.connect('1m');

    const unsubTicker = binanceFeed.subscribeTicker((price, change) => {
      setCurrentPrice(price);
      setPriceChange24h(change);

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

    const unsubCandle = binanceFeed.subscribeCandle((candle) => {
      setCandles((prev) => {
        if (prev.length === 0) return [candle];
        const last = prev[prev.length - 1];

        if (last.time === candle.time) {
          const updated = [...prev];
          updated[updated.length - 1] = candle;
          return updated;
        } else {
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

  const handleToggleBot = useCallback(() => {
    setPortfolio((prev) => {
      const next = { ...prev, isBotRunning: !prev.isBotRunning };
      savePortfolioState(next);
      return next;
    });
  }, []);

  const handleResetAccount = useCallback(() => {
    if (window.confirm('¿Reiniciar saldo virtual a $50 USD? Se borrarán las órdenes abiertas y el historial.')) {
      const fresh = resetPortfolioState(50.0);
      setPortfolio(fresh);
      setLastNotification('Saldo reiniciado a $50.00 USD con éxito.');
    }
  }, []);

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
      notes: 'Compra manual de prueba MT5',
    };

    const nextPort: PortfolioState = {
      ...portfolio,
      availableUsdt: Number((portfolio.availableUsdt - trancheUsd).toFixed(2)),
      heldBtc: Number((portfolio.heldBtc + amountBtc).toFixed(6)),
      openPositions: [...portfolio.openPositions, newPos],
    };

    setPortfolio(nextPort);
    savePortfolioState(nextPort);
    setLastNotification(`Tramo ejecutado: ${amountBtc} BTC a $${currentPrice.toFixed(1)}`);
  }, [portfolio, currentPrice]);

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

  const handleUpdateMode = useCallback((mode: 'PAPER' | 'LIVE_BINANCE') => {
    setPortfolio((prev) => {
      const next: PortfolioState = { ...prev, mode };
      savePortfolioState(next);
      return next;
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#0e121a] text-slate-100 flex flex-col pb-16 md:pb-6">
      {/* Header MT5 Principal */}
      <Header
        portfolio={portfolio}
        currentPrice={currentPrice}
        priceChange24h={priceChange24h}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Notificación de evento del bot */}
      {lastNotification && (
        <div className="bg-gradient-to-r from-amber-950/80 to-emerald-950/80 border-b border-[#1e2638] px-4 py-1.5 text-xs font-mono text-amber-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>{lastNotification}</span>
          </div>
          <button
            onClick={() => setLastNotification(null)}
            className="text-gray-400 hover:text-white text-[10px]"
          >
            ✕
          </button>
        </div>
      )}

      {/* Contenido Principal */}
      <main className="max-w-7xl mx-auto w-full p-2.5 sm:p-4 space-y-3.5 flex-1">
        {/* Resumen del Portafolio ($50 inicial, BTC acumulado, PnL flotante) */}
        <PortfolioSummary portfolio={portfolio} />

        {/* VISTA MÓVIL CON PESTAÑAS NATIVAS DE MT5 (md:hidden) */}
        <div className="md:hidden space-y-3">
          {activeTab === 'CHART' && (
            <div className="space-y-3">
              <Mt5Chart
                candles={candles}
                currentPrice={currentPrice}
                openPositions={portfolio.openPositions}
                closedTrades={portfolio.closedTrades}
                symbol="BTCUSDT"
                selectedTimeframe={selectedTimeframe}
                onTimeframeChange={handleTimeframeChange}
                onQuickBuy={handleManualTranche}
              />
              <BotControls
                portfolio={portfolio}
                onToggleBot={handleToggleBot}
                onResetAccount={handleResetAccount}
                onManualTranche={handleManualTranche}
                onExportState={handleExportState}
              />
            </div>
          )}

          {activeTab === 'TRADE' && (
            <div className="space-y-3">
              <OpenPositions
                positions={portfolio.openPositions}
                currentPrice={currentPrice}
                availableUsdt={portfolio.availableUsdt}
                totalEquityUsd={portfolio.totalEquityUsd}
              />
              <BotControls
                portfolio={portfolio}
                onToggleBot={handleToggleBot}
                onResetAccount={handleResetAccount}
                onManualTranche={handleManualTranche}
                onExportState={handleExportState}
              />
            </div>
          )}

          {activeTab === 'HISTORY' && (
            <TradeHistory
              trades={portfolio.closedTrades}
              initialCapital={portfolio.initialCapitalUsd}
            />
          )}

          {activeTab === 'AI' && (
            <div className="space-y-3">
              <AiIntelligencePanel market={market} tuner={tuner} />
              <BotControls
                portfolio={portfolio}
                onToggleBot={handleToggleBot}
                onResetAccount={handleResetAccount}
                onManualTranche={handleManualTranche}
                onExportState={handleExportState}
              />
            </div>
          )}
        </div>

        {/* VISTA ESCRITORIO / TABLET: ESTILO MT5 WEBTERMINAL (hidden md:block) */}
        <div className="hidden md:block space-y-3.5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
            <div className="lg:col-span-2">
              <Mt5Chart
                candles={candles}
                currentPrice={currentPrice}
                openPositions={portfolio.openPositions}
                closedTrades={portfolio.closedTrades}
                symbol="BTCUSDT"
                selectedTimeframe={selectedTimeframe}
                onTimeframeChange={handleTimeframeChange}
                onQuickBuy={handleManualTranche}
              />
            </div>
            <div className="lg:col-span-1">
              <AiIntelligencePanel market={market} tuner={tuner} />
            </div>
          </div>

          <BotControls
            portfolio={portfolio}
            onToggleBot={handleToggleBot}
            onResetAccount={handleResetAccount}
            onManualTranche={handleManualTranche}
            onExportState={handleExportState}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            <OpenPositions
              positions={portfolio.openPositions}
              currentPrice={currentPrice}
              availableUsdt={portfolio.availableUsdt}
              totalEquityUsd={portfolio.totalEquityUsd}
            />
            <TradeHistory
              trades={portfolio.closedTrades}
              initialCapital={portfolio.initialCapitalUsd}
            />
          </div>
        </div>
      </main>

      {/* BARRA DE NAVEGACIÓN INFERIOR ESTILO MT5 MOBILE (Visible en Teléfonos) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#131722]/95 backdrop-blur-md border-t border-[#1e2638] px-2 py-1.5 flex items-center justify-around shadow-2xl">
        <button
          onClick={() => setActiveTab('CHART')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors ${
            activeTab === 'CHART' ? 'text-amber-400 font-bold' : 'text-gray-400 hover:text-white'
          }`}
        >
          <CandlestickChart className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-mono">Gráfico</span>
        </button>

        <button
          onClick={() => setActiveTab('TRADE')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors relative ${
            activeTab === 'TRADE' ? 'text-amber-400 font-bold' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Layers className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-mono">Trading</span>
          {portfolio.openPositions.length > 0 && (
            <span className="absolute top-0.5 right-2 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors ${
            activeTab === 'HISTORY' ? 'text-amber-400 font-bold' : 'text-gray-400 hover:text-white'
          }`}
        >
          <History className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-mono">Historial</span>
        </button>

        <button
          onClick={() => setActiveTab('AI')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors ${
            activeTab === 'AI' ? 'text-amber-400 font-bold' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Brain className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-mono">IA & Bot</span>
        </button>
      </nav>

      {/* Modal de Configuración */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        portfolio={portfolio}
        onUpdateMode={handleUpdateMode}
      />
    </div>
  );
}
