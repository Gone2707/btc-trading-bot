import { Candle, ClosedTrade, MarketIntelligence, PortfolioState, Position, SelfTunerState } from '../types/trading';
import { evaluateStrategy } from './adaptiveGridStrategy';
import { analyzeMarketRegime } from './regimeClassifier';
import { savePortfolioState } from './paperTradingEngine';
import { saveSelfTunerState } from './selfTuner';

export interface CatchUpReport {
  missedMinutes: number;
  candlesAnalyzed: number;
  tradesClosed: number;
  profitEarnedUsd: number;
  newPositionsOpened: number;
}

/**
 * Motor de Recuperación en Desconexión (Offline Catch-Up)
 * Revisa el historial de velas de Binance durante el tiempo en que el usuario no tuvo la web abierta.
 * Si el precio alcanzó el Take Profit mientras dormías o tenías el navegador cerrado,
 * liquida la orden con beneficio neto positivo y lo suma al balance y al historial.
 */
export async function processOfflineCatchUp(
  currentPortfolio: PortfolioState,
  currentTuner: SelfTunerState
): Promise<{ updatedPortfolio: PortfolioState; updatedTuner: SelfTunerState; report: CatchUpReport | null }> {
  const now = Date.now();
  const lastActive = currentPortfolio.lastActiveTimestamp || (now - 60000);
  const missedSeconds = Math.floor((now - lastActive) / 1000);

  // Si estuvo desconectado menos de 75 segundos, no requiere catch-up
  if (missedSeconds < 75) {
    return { updatedPortfolio: currentPortfolio, updatedTuner: currentTuner, report: null };
  }

  const missedMinutes = Math.min(500, Math.max(1, Math.floor(missedSeconds / 60)));

  try {
    // 1. Descargar las velas de 1 minuto de Binance correspondientes al tiempo de ausencia
    const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=${missedMinutes}`);
    if (!res.ok) throw new Error(`Binance status ${res.status}`);
    const rawData = await res.json();

    const missedCandles: Candle[] = rawData.map((k: any[]) => ({
      time: Math.floor(k[0] / 1000),
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
      isClosed: true,
    }));

    if (missedCandles.length === 0) {
      return { updatedPortfolio: currentPortfolio, updatedTuner: currentTuner, report: null };
    }

    let runningPortfolio: PortfolioState = { ...currentPortfolio };
    let runningTuner: SelfTunerState = { ...currentTuner };
    let tradesClosed = 0;
    let initialProfit = runningPortfolio.realizedProfitUsd;
    let initialOpenCount = runningPortfolio.openPositions.length;

    // 2. Simular cronológicamente cada vela ocurrida en ausencia
    for (let i = 0; i < missedCandles.length; i++) {
      const candle = missedCandles[i];
      const slice = missedCandles.slice(Math.max(0, i - 20), i + 1);
      const market = analyzeMarketRegime(slice, candle.close);

      // Evaluar primero si el High de la vela tocó el Take Profit de alguna posición abierta
      const beforeClosed = runningPortfolio.closedTrades.length;

      // Evaluar al High para Take-Profit
      const highEval = evaluateStrategy(runningPortfolio, market, runningTuner, candle.high);
      runningPortfolio = highEval.updatedPortfolio;
      runningTuner = highEval.updatedTuner;

      // Si no vendió al High, evaluar al Close
      const closeEval = evaluateStrategy(runningPortfolio, market, runningTuner, candle.close);
      runningPortfolio = closeEval.updatedPortfolio;
      runningTuner = closeEval.updatedTuner;

      if (runningPortfolio.closedTrades.length > beforeClosed) {
        tradesClosed += (runningPortfolio.closedTrades.length - beforeClosed);
      }
    }

    runningPortfolio.lastActiveTimestamp = now;
    savePortfolioState(runningPortfolio);
    saveSelfTunerState(runningTuner);

    const profitEarned = Number((runningPortfolio.realizedProfitUsd - initialProfit).toFixed(2));
    const newPositionsOpened = Math.max(0, runningPortfolio.openPositions.length - initialOpenCount);

    const report: CatchUpReport = {
      missedMinutes,
      candlesAnalyzed: missedCandles.length,
      tradesClosed,
      profitEarnedUsd: profitEarned,
      newPositionsOpened,
    };

    return { updatedPortfolio: runningPortfolio, updatedTuner: runningTuner, report };
  } catch (e) {
    console.warn('Error en proceso de Offline Catch-Up:', e);
    return { updatedPortfolio: currentPortfolio, updatedTuner: currentTuner, report: null };
  }
}
