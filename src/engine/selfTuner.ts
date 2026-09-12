import { ClosedTrade, SelfTunerState } from '../types/trading';

const TUNER_STORAGE_KEY = 'btc_bot_selftuner_v2';

export function getInitialSelfTunerState(): SelfTunerState {
  return {
    version: 2,
    generation: 1,
    successfulCycles: 0,
    baseGridSpacingPercent: 0.95, // Optimizado para micro-ciclos en BTC
    baseTakeProfitPercent: 1.15,   // Objetivo alcanzable que genera ganancias constantes
    dcaMultiplier: 1.25,
    maxTranches: 4,
    minProfitHurdlePercent: 0.5, // Mínimo para cubrir comisiones de Binance (0.2%) + ganancia neta
    learningLog: [
      'Modelo de autoaprendizaje inicializado con perfil Conservador Spot.',
      'Regla estricta: Jamás vender a pérdida. TP mínimo dinámico activo.',
    ],
  };
}

export function loadSelfTunerState(): SelfTunerState {
  if (typeof window === 'undefined') return getInitialSelfTunerState();
  try {
    const raw = localStorage.getItem(TUNER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.generation === 'number') {
        return {
          ...getInitialSelfTunerState(),
          ...parsed,
        };
      }
    }
  } catch (err) {
    console.warn('Error leyendo estado de SelfTuner:', err);
  }
  return getInitialSelfTunerState();
}

export function saveSelfTunerState(state: SelfTunerState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TUNER_STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Error guardando SelfTuner:', err);
  }
}

export function trainAndOptimize(
  currentState: SelfTunerState,
  newTrade: ClosedTrade,
  recentTrades: ClosedTrade[]
): SelfTunerState {
  const next = { ...currentState };
  next.successfulCycles += 1;
  const logEntries: string[] = [];

  const allRecent = [newTrade, ...recentTrades].slice(0, 20);
  const avgProfit = allRecent.reduce((acc, t) => acc + t.netProfitPercent, 0) / allRecent.length;
  const avgDurationMin = allRecent.reduce((acc, t) => acc + t.durationMinutes, 0) / allRecent.length;

  // Cada 3 operaciones completadas, avanza una generación de auto-mejora
  if (next.successfulCycles % 3 === 0) {
    next.generation += 1;

    // Si los ciclos se cierran muy rápido (< 35 min) con 100% de éxito, incrementamos ligeramente el TP para ganar más
    if (avgDurationMin < 35 && avgProfit > 0.9) {
      const prevTP = next.baseTakeProfitPercent;
      next.baseTakeProfitPercent = Math.min(3.0, Number((next.baseTakeProfitPercent + 0.12).toFixed(2)));
      logEntries.push(`[Gen ${next.generation}] 📈 Ciclos veloces (${avgDurationMin.toFixed(0)}m). TP aumentado de ${prevTP}% a ${next.baseTakeProfitPercent}% para capturar más ganancia.`);
    } 
    // Si el mercado se vuelve lento (> 180 min), ajustamos la cuadrícula más cerca para entrar y salir con más frecuencia
    else if (avgDurationMin > 180) {
      const prevSpacing = next.baseGridSpacingPercent;
      next.baseGridSpacingPercent = Math.max(0.7, Number((next.baseGridSpacingPercent - 0.08).toFixed(2)));
      logEntries.push(`[Gen ${next.generation}] ⏳ Mercado en pausa. Espaciado ajustado a ${next.baseGridSpacingPercent}% para mayor dinamismo.`);
    }

    // Reforzar DCA si hubo caídas
    const crashTrades = allRecent.filter(t => t.regime === 'DOWNTREND_DEFENSIVE');
    if (crashTrades.length >= 2) {
      next.dcaMultiplier = Math.min(1.45, Number((next.dcaMultiplier + 0.05).toFixed(2)));
      logEntries.push(`[Gen ${next.generation}] 🛡️ DCA reforzado: Multiplicador ajustado a ${next.dcaMultiplier}x.`);
    }
  }

  logEntries.push(`Operación ${newTrade.ticket} cerrada con +$${newTrade.netProfitUsd.toFixed(2)} (+${newTrade.netProfitPercent.toFixed(2)}%).`);

  next.learningLog = [...logEntries, ...next.learningLog].slice(0, 30);
  saveSelfTunerState(next);
  return next;
}
