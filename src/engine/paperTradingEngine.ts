import { PortfolioState } from '../types/trading';

export const DEFAULT_INITIAL_BALANCE = 50.0;
const STORAGE_KEY = 'btc_bot_portfolio_v2';

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
    lastActiveTimestamp: Date.now(),
  };
}

/**
 * Carga segura de portafolio desde almacenamiento persistente del navegador.
 * Garantiza que al recargar (F5) o cerrar el navegador, el balance, posiciones e historial NO se borren.
 */
export function loadPortfolioState(): PortfolioState {
  if (typeof window === 'undefined') return getInitialPortfolioState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.availableUsdt === 'number') {
        return {
          ...getInitialPortfolioState(),
          ...parsed,
          // Asegurar que las posiciones e historial sean arreglos válidos
          openPositions: Array.isArray(parsed.openPositions) ? parsed.openPositions : [],
          closedTrades: Array.isArray(parsed.closedTrades) ? parsed.closedTrades : [],
        };
      }
    }
  } catch (err) {
    console.warn('Error leyendo estado persistente del portafolio:', err);
  }
  return getInitialPortfolioState();
}

/**
 * Guarda el portafolio en almacenamiento persistente de forma segura y ligera.
 */
export function savePortfolioState(state: PortfolioState): void {
  if (typeof window === 'undefined') return;
  try {
    const toSave: PortfolioState = {
      ...state,
      lastActiveTimestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (err) {
    console.error('Error guardando estado persistente:', err);
  }
}

/**
 * Reinicia voluntariamente la cuenta a los $50 USD originales si el usuario pulsa Reset.
 */
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
    lastActiveTimestamp: Date.now(),
  };
  savePortfolioState(freshState);
  return freshState;
}
