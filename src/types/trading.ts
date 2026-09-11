export type OrderSide = 'BUY' | 'SELL';
export type OrderStatus = 'PENDING' | 'FILLED' | 'CANCELLED';

export interface Candle {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed?: boolean;
}

export type MarketRegime = 
  | 'RANGING'               // Lateral / Consolidación (Ideal para micro-grids y tomas rápidas)
  | 'TRENDING_UP'           // Tendencia Alcista (Infinity Grid con Trailing Take-Profit)
  | 'DOWNTREND_DEFENSIVE'   // Caída / Descuento (DCA escalonado por sobreventa, nunca venta a pérdida)
  | 'VOLATILE_TRANSITION';  // Alta volatilidad (Ampliar bandas y esperar estabilización)

export interface Position {
  id: string; // Ej: "TK-101"
  trancheIndex: number;
  buyPrice: number;
  targetSellPrice: number;
  amountBtc: number;
  investedUsd: number;
  timestamp: number;
  status: 'OPEN' | 'CLOSED';
  currentPrice: number;
  unrealizedPnlUsd: number;
  unrealizedPnlPercent: number;
  trailingMaxPrice?: number;
  notes?: string;
}

export interface ClosedTrade {
  id: string;
  ticket: string;
  buyPrice: number;
  sellPrice: number;
  amountBtc: number;
  investedUsd: number;
  returnedUsd: number;
  feeUsd: number;
  netProfitUsd: number;
  netProfitPercent: number;
  openTime: number;
  closeTime: number;
  durationMinutes: number;
  regime: MarketRegime;
}

export interface MarketIntelligence {
  regime: MarketRegime;
  rsi: number;
  atr: number;
  atrPercent: number;
  bbUpper: number;
  bbMiddle: number;
  bbLower: number;
  emaFast: number;
  emaSlow: number;
  adx: number;
  suggestedGridSpacingPercent: number;
  suggestedTakeProfitPercent: number;
  trendDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  aiConfidence: number;
  lastAnalysisTimestamp: number;
  aiDecisions: string[];
}

export interface SelfTunerState {
  version: number;
  generation: number;
  successfulCycles: number;
  baseGridSpacingPercent: number;
  baseTakeProfitPercent: number;
  dcaMultiplier: number;
  maxTranches: number;
  minProfitHurdlePercent: number; // Margen mínimo sobre costo + fees (estrictamente > 0)
  learningLog: string[];
}

export interface PortfolioState {
  initialCapitalUsd: number; // Por defecto $50 USD
  availableUsdt: number;
  heldBtc: number;
  currentBtcPrice: number;
  totalEquityUsd: number;
  realizedProfitUsd: number;
  unrealizedPnlUsd: number;
  totalPnlPercent: number;
  totalTradesCount: number;
  winningTradesCount: number;
  winRatePercent: number;
  profitFactor: number;
  openPositions: Position[];
  closedTrades: ClosedTrade[];
  mode: 'PAPER' | 'LIVE_BINANCE';
  isBotRunning: boolean;
  binanceConfigured?: boolean;
}

export interface BotSettings {
  initialBalance: number;
  riskProfile: 'CONSERVATIVE_HODL' | 'BALANCED' | 'AGGRESSIVE';
  maxTranches: number;
  minNetProfitPercent: number;
  autoReinvest: boolean;
  paperMode: boolean;
  binanceApiKey?: string;
  binanceApiSecret?: string;
}
