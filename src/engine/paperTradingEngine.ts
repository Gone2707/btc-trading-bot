import { PortfolioState } from '../types/trading';

const PORTFOLIO_STORAGE_KEY = 'btc_bot_portfolio_v1';
export const DEFAULT_INITIAL_BALANCE = 50.0; // $50 USD solicitados por el usuario

export function getInitialPortfolioState(): PortfolioState {
  return {
    initialCapitalUsd: DEFAULT_INITIAL_BALANCE,
    availableUsdt: DEFAULT_INITIAL_BALANCE,
    heldBtc: 0,
    currentBtcPrice: 65000,
    totalEquityUsd: DEFAULT_INITIAL_BALANCE,
    realizedProfitUsd: 0,
    unrealizedPnlUsd: 0,
    totalPnlPercent: 0,
    totalTradesCount: 0,
    winningTradesCount: 0,
    winRatePercent: 100,
    profitFactor: 0,
    openPositions: [],
    closedTrades: [],
    mode: 'PAPER',
    isBotRunning: true,
  };
}

export function loadPortfolioState(): PortfolioState {
  if (typeof window === 'undefined') return getInitialPortfolioState();
  try {
    const saved = localStorage.getItem(PORTFOLIO_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Garantizar retrocompatibilidad
      return {
        ...getInitialPortfolioState(),
        ...parsed,
      };
    }
  } catch (e) {
    console.error('Error cargando estado del portafolio:', e);
  }
  return getInitialPortfolioState();
}

export function savePortfolioState(state: PortfolioState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Error guardando estado del portafolio:', e);
  }
}

export function resetPortfolioState(initialBalance: number = DEFAULT_INITIAL_BALANCE): PortfolioState {
  const freshState: PortfolioState = {
    initialCapitalUsd: initialBalance,
    availableUsdt: initialBalance,
    heldBtc: 0,
    currentBtcPrice: 65000,
    totalEquityUsd: initialBalance,
    realizedProfitUsd: 0,
    unrealizedPnlUsd: 0,
    totalPnlPercent: 0,
    totalTradesCount: 0,
    winningTradesCount: 0,
    winRatePercent: 100,
    profitFactor: 0,
    openPositions: [],
    closedTrades: [],
    mode: 'PAPER',
    isBotRunning: true,
  };
  savePortfolioState(freshState);
  return freshState;
}
