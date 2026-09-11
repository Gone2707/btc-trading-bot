import { ClosedTrade, SelfTunerState } from '../types/trading';

export function getInitialSelfTunerState(): SelfTunerState {
  return {
    version: 1,
    generation: 1,
    successfulCycles: 0,
    baseGridSpacingPercent: 1.1,
    baseTakeProfitPercent: 1.6,
    dcaMultiplier: 1.25,
    maxTranches: 4,
    minProfitHurdlePercent: 0.6, // Mínimo para cubrir comisiones de Binance + ganancia neta
    learningLog: [
      'Modelo de autoaprendizaje en memoria RAM listo (Cero localStorage).',
      'Regla fija activa: Venta estrictamente condicionada a ganancia neta positiva.',
    ],
  };
}

/**
 * 100% EN MEMORIA (RAM) - CERO LOCALSTORAGE
 */
export function loadSelfTunerState(): SelfTunerState {
  return getInitialSelfTunerState();
}

export function saveSelfTunerState(_state: SelfTunerState): void {
  // Sin almacenamiento en disco
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

  if (next.successfulCycles % 3 === 0) {
    next.generation += 1;

    if (avgDurationMin < 45 && avgProfit > 1.2) {
      const prevTP = next.baseTakeProfitPercent;
      next.baseTakeProfitPercent = Math.min(3.5, Number((next.baseTakeProfitPercent + 0.15).toFixed(2)));
      logEntries.push(`[Gen ${next.generation}] 📈 Ciclos rápidos (${avgDurationMin.toFixed(0)}m). Auto-ajuste: TP aumentado de ${prevTP}% a ${next.baseTakeProfitPercent}% para capturar más valor.`);
    } else if (avgDurationMin > 240) {
      const prevSpacing = next.baseGridSpacingPercent;
      next.baseGridSpacingPercent = Math.max(0.8, Number((next.baseGridSpacingPercent - 0.1).toFixed(2)));
      logEntries.push(`[Gen ${next.generation}] ⏳ Mercado lento. Auto-ajuste: Reduciendo espaciado a ${next.baseGridSpacingPercent}% para mayor frecuencia.`);
    }

    const crashTrades = allRecent.filter(t => t.regime === 'DOWNTREND_DEFENSIVE');
    if (crashTrades.length >= 2) {
      next.dcaMultiplier = Math.min(1.5, Number((next.dcaMultiplier + 0.05).toFixed(2)));
      logEntries.push(`[Gen ${next.generation}] 🛡️ DCA adaptado a caídas: Multiplicador a ${next.dcaMultiplier}x.`);
    }
  }

  logEntries.push(`Operación ${newTrade.ticket} cerrada con +$${newTrade.netProfitUsd.toFixed(2)} (+${newTrade.netProfitPercent.toFixed(2)}%).`);

  next.learningLog = [...logEntries, ...next.learningLog].slice(0, 25);
  return next;
}
