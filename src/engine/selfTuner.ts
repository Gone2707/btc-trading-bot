import { ClosedTrade, SelfTunerState } from '../types/trading';

const STORAGE_KEY = 'btc_bot_selftuner_v1';

export function getInitialSelfTunerState(): SelfTunerState {
  return {
    version: 1,
    generation: 1,
    successfulCycles: 0,
    baseGridSpacingPercent: 1.1,
    baseTakeProfitPercent: 1.6,
    dcaMultiplier: 1.25,
    maxTranches: 4,
    minProfitHurdlePercent: 0.6, // Mínimo absoluto para cubrir comisiones de Binance (0.2% ida y vuelta) + ganancia neta
    learningLog: [
      'Modelo de auto-aprendizaje inicializado con perfil Conservador Spot.',
      'Regla fija activa: Venta estrictamente condicionada a ganancia neta positiva.',
    ],
  };
}

export function loadSelfTunerState(): SelfTunerState {
  if (typeof window === 'undefined') return getInitialSelfTunerState();
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Error cargando SelfTuner state:', e);
  }
  return getInitialSelfTunerState();
}

export function saveSelfTunerState(state: SelfTunerState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Error guardando SelfTuner state:', e);
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

  // Analizar historial de últimas operaciones
  const allRecent = [newTrade, ...recentTrades].slice(0, 20);
  const avgProfit = allRecent.reduce((acc, t) => acc + t.netProfitPercent, 0) / allRecent.length;
  const avgDurationMin = allRecent.reduce((acc, t) => acc + t.durationMinutes, 0) / allRecent.length;

  // Cada 3 operaciones completadas, avanza una generación de auto-mejora
  if (next.successfulCycles % 3 === 0) {
    next.generation += 1;

    // Si los ciclos se cierran muy rápido (< 45 min) con 100% de éxito, incrementamos ligeramente el TP para ganar más
    if (avgDurationMin < 45 && avgProfit > 1.2) {
      const prevTP = next.baseTakeProfitPercent;
      next.baseTakeProfitPercent = Math.min(3.5, Number((next.baseTakeProfitPercent + 0.15).toFixed(2)));
      logEntries.push(`[Gen ${next.generation}] 📈 Alta velocidad de ciclo (${avgDurationMin.toFixed(0)}m). Auto-ajuste: TP aumentado de ${prevTP}% a ${next.baseTakeProfitPercent}% para capturar más valor.`);
    } 
    // Si los ciclos tardan más de 4 horas, ajustamos la cuadrícula más cerca del precio actual
    else if (avgDurationMin > 240) {
      const prevSpacing = next.baseGridSpacingPercent;
      next.baseGridSpacingPercent = Math.max(0.8, Number((next.baseGridSpacingPercent - 0.1).toFixed(2)));
      logEntries.push(`[Gen ${next.generation}] ⏳ Ciclos extendidos. Auto-ajuste: Reduciendo espaciado de ${prevSpacing}% a ${next.baseGridSpacingPercent}% para mayor frecuencia de captura.`);
    }

    // Adaptar multiplicador de DCA según el régimen más frecuente
    const crashTrades = allRecent.filter(t => t.regime === 'DOWNTREND_DEFENSIVE');
    if (crashTrades.length >= 2) {
      next.dcaMultiplier = Math.min(1.5, Number((next.dcaMultiplier + 0.05).toFixed(2)));
      logEntries.push(`[Gen ${next.generation}] 🛡️ Reforzada defensa en caídas: Multiplicador de tramos DCA ajustado a ${next.dcaMultiplier}x.`);
    }
  }

  logEntries.push(`Operación ${newTrade.ticket} cerrada con +$${newTrade.netProfitUsd.toFixed(2)} (+${newTrade.netProfitPercent.toFixed(2)}%). Duración: ${newTrade.durationMinutes} min.`);

  next.learningLog = [...logEntries, ...next.learningLog].slice(0, 30);
  saveSelfTunerState(next);
  return next;
}
