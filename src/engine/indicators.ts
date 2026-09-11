import { Candle } from '../types/trading';

export function calculateSMA(values: number[], period: number): number {
  if (values.length < period) return values[values.length - 1] || 0;
  const slice = values.slice(-period);
  const sum = slice.reduce((a, b) => a + b, 0);
  return sum / period;
}

export function calculateEMA(values: number[], period: number): number {
  if (values.length === 0) return 0;
  if (values.length < period) return calculateSMA(values, values.length);
  
  const k = 2 / (period + 1);
  let ema = calculateSMA(values.slice(0, period), period);
  
  for (let i = period; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
  }
  return ema;
}

export function calculateRSI(candles: Candle[], period: number = 14): number {
  if (candles.length <= period) return 50; // Neutral por defecto
  
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff >= 0) {
      avgGain = (avgGain * (period - 1) + diff) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - diff) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

export function calculateBollingerBands(
  candles: Candle[],
  period: number = 20,
  multiplier: number = 2
): { upper: number; middle: number; lower: number } {
  if (candles.length === 0) return { upper: 0, middle: 0, lower: 0 };
  
  const closes = candles.map(c => c.close);
  const p = Math.min(closes.length, period);
  const slice = closes.slice(-p);
  const middle = slice.reduce((a, b) => a + b, 0) / p;
  
  const variance = slice.reduce((sum, val) => sum + Math.pow(val - middle, 2), 0) / p;
  const stdDev = Math.sqrt(variance);

  return {
    upper: middle + (multiplier * stdDev),
    middle,
    lower: middle - (multiplier * stdDev),
  };
}

export function calculateATR(candles: Candle[], period: number = 14): number {
  if (candles.length < 2) return 0;
  const trs: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const prev = candles[i - 1];
    const hl = current.high - current.low;
    const hc = Math.abs(current.high - prev.close);
    const lc = Math.abs(current.low - prev.close);
    trs.push(Math.max(hl, hc, lc));
  }

  if (trs.length < period) {
    return trs.reduce((a, b) => a + b, 0) / trs.length;
  }

  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
  }
  return atr;
}

export function calculateADX(candles: Candle[], period: number = 14): number {
  if (candles.length < period * 2) return 20; // Rango neutral si hay pocas velas
  
  // Simplificación aproximada de ADX para detección rápida de rango vs tendencia
  const closes = candles.map(c => c.close);
  const emaFast = calculateEMA(closes, 9);
  const emaSlow = calculateEMA(closes, 21);
  const diffPct = Math.abs(emaFast - emaSlow) / emaSlow * 100;
  
  // Mapeo proporcional a rango ADX (0 - 100)
  return Math.min(100, Math.max(10, diffPct * 15 + 15));
}
