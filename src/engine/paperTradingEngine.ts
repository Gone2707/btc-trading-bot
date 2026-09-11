import { PortfolioState } from '../types/trading';

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

/**
 * 100% EN MEMORIA (RAM) - CERO USO DE LOCALSTORAGE
 * No ocupa memoria persistente en el navegador.
 */
export function loadPortfolioState(): PortfolioState {
  return getInitialPortfolioState();
}

export function savePortfolioState(_state: PortfolioState): void {
  // Sin operaciones de almacenamiento en disco / localStorage
}

export function clearBrowserStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('btc_bot_portfolio_v1');
    localStorage.removeItem('btc_bot_selftuner_v1');
    localStorage.removeItem('btc_bot_settings_v1');
  } catch (e) {
    // Silencioso
  }
}

export function resetPortfolioState(initialBalance: number = DEFAULT_INITIAL_BALANCE): PortfolioState {
  clearBrowserStorage();
  return {
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
}
