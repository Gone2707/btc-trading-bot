import {
  Candle,
  ClosedTrade,
  MarketIntelligence,
  PortfolioState,
  Position,
  SelfTunerState,
} from '../types/trading';
import { trainAndOptimize } from './selfTuner';

const BINANCE_FEE_RATE = 0.001; // 0.1% spot fee por operación en Binance

export interface StrategyDecision {
  action: 'BUY' | 'SELL' | 'HOLD';
  targetPositionId?: string;
  orderAmountUsd?: number;
  orderAmountBtc?: number;
  reason: string;
}

/**
 * Motor de Estrategia 100% Autónomo Conservador
 * Misión: Analizar a fondo, cero intervención manual, ventas estrictamente en beneficio neto positivo.
 */
export function evaluateStrategy(
  portfolio: PortfolioState,
  market: MarketIntelligence,
  tuner: SelfTunerState,
  currentPrice: number
): { decision: StrategyDecision; updatedPortfolio: PortfolioState; updatedTuner: SelfTunerState } {
  const updatedPortfolio: PortfolioState = { ...portfolio };
  let updatedTuner = tuner;

  // 1. Actualizar PnL flotante y valor en tiempo real de las posiciones abiertas
  let totalUnrealizedUsd = 0;
  let totalBtcHeld = 0;

  updatedPortfolio.openPositions = portfolio.openPositions.map(pos => {
    const currentVal = pos.amountBtc * currentPrice;
    const pnlUsd = currentVal - pos.investedUsd;
    const pnlPercent = (pnlUsd / pos.investedUsd) * 100;
    const trailingMax = pos.trailingMaxPrice
      ? Math.max(pos.trailingMaxPrice, currentPrice)
      : currentPrice;

    totalUnrealizedUsd += pnlUsd;
    totalBtcHeld += pos.amountBtc;

    return {
      ...pos,
      currentPrice,
      unrealizedPnlUsd: Number(pnlUsd.toFixed(2)),
      unrealizedPnlPercent: Number(pnlPercent.toFixed(2)),
      trailingMaxPrice: trailingMax,
    };
  });

  updatedPortfolio.currentBtcPrice = currentPrice;
  updatedPortfolio.heldBtc = Number(totalBtcHeld.toFixed(6));
  updatedPortfolio.unrealizedPnlUsd = Number(totalUnrealizedUsd.toFixed(2));
  updatedPortfolio.totalEquityUsd = Number(
    (updatedPortfolio.availableUsdt + totalBtcHeld * currentPrice).toFixed(2)
  );
  updatedPortfolio.totalPnlPercent = Number(
    (((updatedPortfolio.totalEquityUsd - updatedPortfolio.initialCapitalUsd) /
      updatedPortfolio.initialCapitalUsd) *
      100).toFixed(2)
  );

  if (!portfolio.isBotRunning) {
    return {
      decision: { action: 'HOLD', reason: 'Bot pausado por el usuario.' },
      updatedPortfolio,
      updatedTuner,
    };
  }

  // -------------------------------------------------------------
  // REGLA 1: EVALUAR VENTAS (TAKE PROFIT ESTRICTO - NUNCA A PÉRDIDA)
  // -------------------------------------------------------------
  for (const pos of updatedPortfolio.openPositions) {
    // Cálculo riguroso: Precio de compra + Margen de beneficio neto mínimo (0.6%+) + Comisiones de Binance ida y vuelta (0.2%)
    const minAcceptablePrice = pos.buyPrice * (1 + (tuner.minProfitHurdlePercent / 100) + (BINANCE_FEE_RATE * 2));

    // ¿El precio actual supera el objetivo y el umbral estricto de ganancia neta?
    if (currentPrice >= pos.targetSellPrice && currentPrice >= minAcceptablePrice) {
      // Si estamos en tendencia alcista fuerte, activamos Trailing Take-Profit para estirar las ganancias
      if (market.regime === 'TRENDING_UP') {
        const peak = pos.trailingMaxPrice || currentPrice;
        const pullbackThreshold = peak * 0.9965; // 0.35% de retroceso desde el pico más alto alcanzado

        if (currentPrice < pullbackThreshold) {
          // Retroceso confirmado desde el pico -> Cerramos con el máximo beneficio posible
          const { newPortfolio, newTuner, closedTrade } = executeSell(
            updatedPortfolio,
            pos,
            currentPrice,
            market,
            updatedTuner,
            `🎯 Trailing TP ejecutado en retroceso desde pico $${peak.toFixed(1)} (+${pos.unrealizedPnlPercent}%)`
          );
          return {
            decision: {
              action: 'SELL',
              targetPositionId: pos.id,
              orderAmountBtc: pos.amountBtc,
              reason: `Venta ganadora: Posición ${pos.id} cerrada con +$${closedTrade.netProfitUsd.toFixed(2)} (+${closedTrade.netProfitPercent.toFixed(2)}%)`,
            },
            updatedPortfolio: newPortfolio,
            updatedTuner: newTuner,
          };
        } else {
          // Continúa subiendo -> Dejamos correr la ganancia (Infinity Mode)
          return {
            decision: {
              action: 'HOLD',
              reason: `🚀 Trailing TP activo en ${pos.id}: Dejando correr ganancias (Pico: $${peak.toFixed(1)}, Flotante: +${pos.unrealizedPnlPercent}%)`,
            },
            updatedPortfolio,
            updatedTuner,
          };
        }
      } else {
        // En mercado de rango o rebote, vendemos directamente al tocar el target asegurando ganancia
        const { newPortfolio, newTuner, closedTrade } = executeSell(
          updatedPortfolio,
          pos,
          currentPrice,
          market,
          updatedTuner,
          `🎯 Take-Profit alcanzado en rango (+${pos.unrealizedPnlPercent}%)`
        );
        return {
          decision: {
            action: 'SELL',
            targetPositionId: pos.id,
            orderAmountBtc: pos.amountBtc,
            reason: `Venta en target: Posición ${pos.id} cerrada con +$${closedTrade.netProfitUsd.toFixed(2)} (+${closedTrade.netProfitPercent.toFixed(2)}%)`,
          },
          updatedPortfolio: newPortfolio,
          updatedTuner: newTuner,
        };
      }
    }
  }

  // -------------------------------------------------------------
  // REGLA 2: EVALUAR COMPRAS AUTÓNOMAS (ANÁLISIS CUANTITATIVO CONSERVADOR)
  // -------------------------------------------------------------
  const openCount = updatedPortfolio.openPositions.length;
  const maxTranches = tuner.maxTranches;

  // Solo compra si hay capital disponible (mínimo $5 USD) y no se ha alcanzado el límite de tramos
  if (updatedPortfolio.availableUsdt >= 5 && openCount < maxTranches) {
    const spacingPercent = Math.max(tuner.baseGridSpacingPercent, market.suggestedGridSpacingPercent);
    const takeProfitPercent = Math.max(tuner.baseTakeProfitPercent, market.suggestedTakeProfitPercent);

    // CASO A: No hay ninguna posición abierta -> Búsqueda autónoma de entrada óptima
    if (openCount === 0) {
      // Filtros cuantitativos de alta probabilidad:
      // 1. RSI no sobrecomprado (< 58), idealmente saliendo de sobreventa o en zona neutral-baja
      // 2. Precio en la mitad inferior de las Bandas de Bollinger (descuento) o soporte de media
      const isGoodPriceLevel = currentPrice <= (market.bbMiddle * 1.002);
      const isRsiFavorable = market.rsi <= 58;

      if (isGoodPriceLevel && isRsiFavorable) {
        // Asignar primer tramo conservador: 28% del capital total para tener reservas si el precio retrocede
        const trancheUsd = Number(Math.min(updatedPortfolio.availableUsdt * 0.28, 14).toFixed(2));
        
        if (trancheUsd >= 5) {
          const { newPortfolio } = executeBuy(
            updatedPortfolio,
            currentPrice,
            trancheUsd,
            0,
            takeProfitPercent,
            'Entrada Cuantitativa Autónoma'
          );

          return {
            decision: {
              action: 'BUY',
              orderAmountUsd: trancheUsd,
              reason: `🤖 Entrada autónoma en $${currentPrice.toFixed(1)} (RSI ${market.rsi}, soporte Bollinger). TP fijado en +${takeProfitPercent}%`,
            },
            updatedPortfolio: newPortfolio,
            updatedTuner,
          };
        }
      }
    } else {
      // CASO B: Ya hay posiciones abiertas -> DCA Dinámico en Descuentos (Solo en sobreventa confirmada)
      const lowestBuyPrice = Math.min(...updatedPortfolio.openPositions.map(p => p.buyPrice));
      const priceDropPercent = ((lowestBuyPrice - currentPrice) / lowestBuyPrice) * 100;

      // El precio debe haber caído al menos el espaciado adaptativo determinado por la volatilidad
      if (priceDropPercent >= spacingPercent) {
        // En caídas, solo compra si RSI muestra rebote o soporte fuerte en banda inferior
        const isReboundOpportunity = market.rsi < 42 || currentPrice <= market.bbLower;

        if (isReboundOpportunity) {
          // Tamaño de tramo progresivo para promediar a la baja eficientemente
          const baseTrancheUsd = updatedPortfolio.initialCapitalUsd / (maxTranches + 1);
          const trancheUsd = Number(
            Math.min(
              updatedPortfolio.availableUsdt,
              baseTrancheUsd * Math.pow(tuner.dcaMultiplier, openCount * 0.4)
            ).toFixed(2)
          );

          if (trancheUsd >= 5) {
            const { newPortfolio } = executeBuy(
              updatedPortfolio,
              currentPrice,
              trancheUsd,
              openCount,
              takeProfitPercent,
              `Tramo DCA #${openCount + 1} tras caída de ${priceDropPercent.toFixed(1)}%`
            );

            return {
              decision: {
                action: 'BUY',
                orderAmountUsd: trancheUsd,
                reason: `🛒 DCA Autónomo: Tramo #${openCount + 1} ejecutado a $${currentPrice.toFixed(1)} (-${priceDropPercent.toFixed(1)}% de descuento).`,
              },
              updatedPortfolio: newPortfolio,
              updatedTuner,
            };
          }
        }
      }
    }
  }

  // -------------------------------------------------------------
  // REGLA 3: HOLD Y PROTECCIÓN (MONITOREO CONTINUO)
  // -------------------------------------------------------------
  return {
    decision: {
      action: 'HOLD',
      reason: `IA analizando BTC ($${currentPrice.toFixed(1)}). Posiciones: ${openCount}/${maxTranches}. Esperando condiciones óptimas de beneficio o descuento.`,
    },
    updatedPortfolio,
    updatedTuner,
  };
}

function executeBuy(
  portfolio: PortfolioState,
  price: number,
  investedUsd: number,
  trancheIndex: number,
  takeProfitPercent: number,
  notes: string
): { newPortfolio: PortfolioState } {
  const fee = investedUsd * BINANCE_FEE_RATE;
  const netInvestedUsd = investedUsd - fee;
  const amountBtc = Number((netInvestedUsd / price).toFixed(6));

  // Venta garantizada estrictamente por encima de: precio + ganancia neta + comisión de compra + comisión de venta
  const targetSellPrice = Number(
    (price * (1 + takeProfitPercent / 100 + BINANCE_FEE_RATE * 2)).toFixed(2)
  );

  const newPosition: Position = {
    id: `TK-${Math.floor(1000 + Math.random() * 9000)}`,
    trancheIndex,
    buyPrice: price,
    targetSellPrice,
    amountBtc,
    investedUsd,
    timestamp: Date.now(),
    status: 'OPEN',
    currentPrice: price,
    unrealizedPnlUsd: 0,
    unrealizedPnlPercent: 0,
    trailingMaxPrice: price,
    notes,
  };

  const newPortfolio: PortfolioState = {
    ...portfolio,
    availableUsdt: Number((portfolio.availableUsdt - investedUsd).toFixed(2)),
    heldBtc: Number((portfolio.heldBtc + amountBtc).toFixed(6)),
    openPositions: [...portfolio.openPositions, newPosition],
  };

  return { newPortfolio };
}

function executeSell(
  portfolio: PortfolioState,
  pos: Position,
  sellPrice: number,
  market: MarketIntelligence,
  tuner: SelfTunerState,
  reason: string
): { newPortfolio: PortfolioState; newTuner: SelfTunerState; closedTrade: ClosedTrade } {
  const grossReturnUsd = pos.amountBtc * sellPrice;
  const sellFee = grossReturnUsd * BINANCE_FEE_RATE;
  const netReturnUsd = grossReturnUsd - sellFee;

  const netProfitUsd = Number((netReturnUsd - pos.investedUsd).toFixed(2));
  const netProfitPercent = Number(((netProfitUsd / pos.investedUsd) * 100).toFixed(2));
  const durationMinutes = Math.max(1, Math.round((Date.now() - pos.timestamp) / 60000));

  const closedTrade: ClosedTrade = {
    id: `CL-${Math.floor(10000 + Math.random() * 90000)}`,
    ticket: pos.id,
    buyPrice: pos.buyPrice,
    sellPrice,
    amountBtc: pos.amountBtc,
    investedUsd: pos.investedUsd,
    returnedUsd: Number(netReturnUsd.toFixed(2)),
    feeUsd: Number((pos.investedUsd * BINANCE_FEE_RATE + sellFee).toFixed(3)),
    netProfitUsd,
    netProfitPercent,
    openTime: pos.timestamp,
    closeTime: Date.now(),
    durationMinutes,
    regime: market.regime,
  };

  const updatedClosedTrades = [closedTrade, ...portfolio.closedTrades];
  const winningTrades = updatedClosedTrades.filter(t => t.netProfitUsd > 0).length;
  const totalClosed = updatedClosedTrades.length;
  const winRate = Number(((winningTrades / totalClosed) * 100).toFixed(1));

  const totalGrossProfits = updatedClosedTrades
    .filter(t => t.netProfitUsd > 0)
    .reduce((sum, t) => sum + t.netProfitUsd, 0);
  const totalGrossLosses = Math.abs(
    updatedClosedTrades.filter(t => t.netProfitUsd < 0).reduce((sum, t) => sum + t.netProfitUsd, 0)
  );
  const profitFactor = totalGrossLosses === 0 ? 99.9 : Number((totalGrossProfits / totalGrossLosses).toFixed(2));

  const newPortfolio: PortfolioState = {
    ...portfolio,
    availableUsdt: Number((portfolio.availableUsdt + netReturnUsd).toFixed(2)),
    heldBtc: Number(Math.max(0, portfolio.heldBtc - pos.amountBtc).toFixed(6)),
    realizedProfitUsd: Number((portfolio.realizedProfitUsd + netProfitUsd).toFixed(2)),
    openPositions: portfolio.openPositions.filter(p => p.id !== pos.id),
    closedTrades: updatedClosedTrades,
    totalTradesCount: totalClosed,
    winningTradesCount: winningTrades,
    winRatePercent: winRate,
    profitFactor,
  };

  // El bot se auto-mejora con cada operación cerrada
  const newTuner = trainAndOptimize(tuner, closedTrade, portfolio.closedTrades);

  return { newPortfolio, newTuner, closedTrade };
}
