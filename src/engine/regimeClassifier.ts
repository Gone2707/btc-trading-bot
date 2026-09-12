import { Candle, MarketIntelligence, MarketRegime } from '../types/trading';
import {
  calculateRSI,
  calculateBollingerBands,
  calculateATR,
  calculateEMA,
  calculateADX,
} from './indicators';

export function analyzeMarketRegime(candles: Candle[], currentPrice: number): MarketIntelligence {
  if (candles.length === 0) {
    return {
      regime: 'RANGING',
      rsi: 50,
      atr: 100,
      atrPercent: 0.15,
      bbUpper: currentPrice * 1.02,
      bbMiddle: currentPrice,
      bbLower: currentPrice * 0.98,
      emaFast: currentPrice,
      emaSlow: currentPrice,
      adx: 20,
      suggestedGridSpacingPercent: 1.2,
      suggestedTakeProfitPercent: 1.5,
      trendDirection: 'NEUTRAL',
      aiConfidence: 85,
      lastAnalysisTimestamp: Date.now(),
      aiDecisions: ['Inicializando datos de mercado en tiempo real...'],
    };
  }

  const closes = candles.map(c => c.close);
  const rsi = Number(calculateRSI(candles, 14).toFixed(2));
  const bb = calculateBollingerBands(candles, 20, 2);
  const atr = calculateATR(candles, 14);
  const atrPercent = Number(((atr / (currentPrice || 1)) * 100).toFixed(2));
  const emaFast = calculateEMA(closes, 9);
  const emaSlow = calculateEMA(closes, 21);
  const adx = calculateADX(candles, 14);

  const decisions: string[] = [];
  let regime: MarketRegime = 'RANGING';
  let trendDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  let suggestedGridSpacingPercent = 1.2;
  let suggestedTakeProfitPercent = 1.8;
  let aiConfidence = 80;

  // Evaluar dirección de la media móvil
  if (emaFast > emaSlow * 1.002) {
    trendDirection = 'BULLISH';
  } else if (emaFast < emaSlow * 0.998) {
    trendDirection = 'BEARISH';
  } else {
    trendDirection = 'NEUTRAL';
  }

  // Lógica de clasificación de Régimen con Auto-adaptación
  if (atrPercent > 2.2) {
    // Régimen de Alta Volatilidad / Transición
    regime = 'VOLATILE_TRANSITION';
    suggestedGridSpacingPercent = Math.max(2.0, atrPercent * 0.85);
    suggestedTakeProfitPercent = Math.max(2.2, atrPercent * 1.1);
    aiConfidence = 88;
    decisions.push(`⚠️ Alta volatilidad detectada (ATR: ${atrPercent}%). Cuadrícula ampliada a ${suggestedGridSpacingPercent.toFixed(2)}% para evitar atrapadas.`);
  } else if (trendDirection === 'BULLISH' && rsi > 52 && currentPrice >= bb.middle) {
    // Régimen de Tendencia Alcista
    regime = 'TRENDING_UP';
    suggestedGridSpacingPercent = 1.4;
    suggestedTakeProfitPercent = 2.4; // Permitir más recorrido para maximizar ganancias
    aiConfidence = 92;
    decisions.push(`🚀 Impulso alcista detectado (EMA9 > EMA21, RSI ${rsi}). Activando modo Trailing para estirar beneficios en BTC.`);
  } else if (trendDirection === 'BEARISH' && (rsi < 38 || currentPrice < bb.lower)) {
    // Régimen de Caída / Descuento (Modo Defensivo DCA)
    regime = 'DOWNTREND_DEFENSIVE';
    suggestedGridSpacingPercent = Math.max(1.8, atrPercent * 1.1);
    suggestedTakeProfitPercent = 1.6;
    aiConfidence = 90;
    decisions.push(`🛡️ Zona de descuento/sobreventa detectada (RSI ${rsi}). Modo defensivo: acumulando tramos solo en rebotes confirmados, NUNCA venta a pérdida.`);
  } else {
    // Régimen de Rango / Lateral (El favorito para swing rápido y ganancias frecuentes)
    regime = 'RANGING';
    suggestedGridSpacingPercent = Math.max(0.7, Math.min(1.2, atrPercent * 0.6));
    suggestedTakeProfitPercent = Math.max(0.9, Math.min(1.35, suggestedGridSpacingPercent * 1.25));
    aiConfidence = 94;
    decisions.push(`🔄 Mercado en Rango Lateral. Cuadrícula ajustada a ${suggestedGridSpacingPercent.toFixed(2)}% con TP ágil de +${suggestedTakeProfitPercent.toFixed(2)}% para asegurar ganancias continuas.`);
  }

  return {
    regime,
    rsi,
    atr: Number(atr.toFixed(2)),
    atrPercent,
    bbUpper: Number(bb.upper.toFixed(2)),
    bbMiddle: Number(bb.middle.toFixed(2)),
    bbLower: Number(bb.lower.toFixed(2)),
    emaFast: Number(emaFast.toFixed(2)),
    emaSlow: Number(emaSlow.toFixed(2)),
    adx: Number(adx.toFixed(1)),
    suggestedGridSpacingPercent: Number(suggestedGridSpacingPercent.toFixed(2)),
    suggestedTakeProfitPercent: Number(suggestedTakeProfitPercent.toFixed(2)),
    trendDirection,
    aiConfidence,
    lastAnalysisTimestamp: Date.now(),
    aiDecisions: decisions,
  };
}
