import {
  Candle,
  ClosedTrade,
  MarketIntelligence,
  PortfolioState,
  Position,
  SelfTunerState,
} from '../types/trading';
import { trainAndOptimize } from './selfTuner';

const BINANCE_FEE_RATE = 0.001; // 0.1% spot fee por operación (maker/taker standard)

export interface StrategyDecision {
  action: 'BUY' | 'SELL' | 'HOLD';
  targetPositionId?: string;
  orderAmountUsd?: number;
  orderAmountBtc?: number;
  reason: string;
}

export function evaluateStrategy(
  portfolio: PortfolioState,
  market: MarketIntelligence,
  tuner: SelfTunerState,
  currentPrice: number
): { decision: StrategyDecision; updatedPortfolio: PortfolioState; updatedTuner: SelfTunerState } {
  const updatedPortfolio: PortfolioState = { ...portfolio };
  let updatedTuner = tuner;

  // Actualizar precio actual y PnL no realizado de todas las posiciones abiertas
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
  updatedPortfolio.heldBtc = totalBtcHeld;
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
      decision: { action: 'HOLD', reason: 'Bot en pausa manual por el usuario.' },
      updatedPortfolio,
      updatedTuner,
    };
  }

  // -------------------------------------------------------------
  // REGLA 1: EVALUAR VENTAS (TAKE PROFIT ESTRICTO - NUNCA A PÉRDIDA)
  // -------------------------------------------------------------
  for (const pos of updatedPortfolio.openPositions) {
    const minAcceptablePrice = pos.buyPrice * (1 + tuner.minProfitHurdlePercent / 100 + BINANCE_FEE_RATE * 2);

    // ¿El precio actual supera el precio objetivo y el mínimo de seguridad?
    if (currentPrice >= pos.targetSellPrice && currentPrice >= minAcceptablePrice) {
      // Si estamos en tendencia alcista, aplicamos Trailing Take-Profit
      if (market.regime === 'TRENDING_UP') {
        const peak = pos.trailingMaxPrice || currentPrice;
        const pullbackThreshold = peak * 0.996; // 0.4% de retroceso desde el pico

        if (currentPrice < pullbackThreshold) {
          // El precio comenzó a retroceder desde el pico -> Cerramos con el máximo beneficio capturado
          const { newPortfolio, newTuner, closedTrade } = executeSell(
            updatedPortfolio,
            pos,
            currentPrice,
            market,
            updatedTuner,
            `🎯 Trailing Take-Profit ejecutado en retroceso desde pico $${peak.toFixed(1)} (+${pos.unrealizedPnlPercent}%)`
          );
          return {
            decision: {
              action: 'SELL',
              targetPositionId: pos.id,
              orderAmountBtc: pos.amountBtc,
              reason: `Venta exitosa en pico: Posición ${pos.id} cerrada con +$${closedTrade.netProfitUsd.toFixed(2)} (+${closedTrade.netProfitPercent.toFixed(2)}%)`,
            },
            updatedPortfolio: newPortfolio,
            updatedTuner: newTuner,
          };
        } else {
          // Aún subiendo, permitimos que siga corriendo la ganancia
          return {
            decision: {
              action: 'HOLD',
              reason: `🚀 Trailing Take-Profit activo en ${pos.id}: Dejando correr ganancias (Pico actual: $${peak.toFixed(1)}, PnL: +${pos.unrealizedPnlPercent}%)`,
            },
            updatedPortfolio,
            updatedTuner,
          };
        }
      } else {
        // En mercado de rango o rebote, cerramos directamente al tocar el target
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
            reason: `Venta en objetivo: Posición ${pos.id} cerrada con +$${closedTrade.netProfitUsd.toFixed(2)} (+${closedTrade.netProfitPercent.toFixed(2)}%)`,
          },
          updatedPortfolio: newPortfolio,
          updatedTuner: newTuner,
        };
      }
    }
  }

  // -------------------------------------------------------------
  // REGLA 2: EVALUAR COMPRAS (ENTRADA INICIAL O TRAMOS DCA POR VOLATILIDAD)
  // -------------------------------------------------------------
  const openCount = updatedPortfolio.openPositions.length;
  const maxTranches = tuner.maxTranches;

  // Si tenemos capital disponible suficiente (mínimo $5 USD para un tramo)
  if (updatedPortfolio.availableUsdt >= 5 && openCount < maxTranches) {
    const spacingPercent = Math.max(tuner.baseGridSpacingPercent, market.suggestedGridSpacingPercent);
    const takeProfitPercent = Math.max(tuner.baseTakeProfitPercent, market.suggestedTakeProfitPercent);

    // Caso A: No hay ninguna posición abierta -> Entrada Inicial inteligente
    if (openCount === 0) {
      // Condiciones favorables: RSI no sobrecomprado (< 65) y no en caída vertical sin freno
      if (market.rsi < 68) {
        // Asignar primer tramo: 25% del capital disponible para conservar reservas
        const trancheUsd = Number(Math.min(updatedPortfolio.availableUsdt * 0.35, 15).toFixed(2));
        const { newPortfolio } = executeBuy(
          updatedPortfolio,
          currentPrice,
          trancheUsd,
          0,
          takeProfitPercent,
          'Entrada Inicial de Cuadrícula Spot'
        );

        return {
          decision: {
            action: 'BUY',
            orderAmountUsd: trancheUsd,
            reason: `🟢 Entrada inicial en $${currentPrice.toFixed(1)} (RSI ${market.rsi}, Régimen: ${market.regime}). TP fijado en +${takeProfitPercent}%`,
          },
          updatedPortfolio: newPortfolio,
          updatedTuner,
        };
      }
    } else {
      // Caso B: Ya hay posiciones abiertas -> Compras escalonadas en descuento (DCA Dinámico)
      // Buscamos el precio más bajo entre las posiciones abiertas
      const lowestBuyPrice = Math.min(...updatedPortfolio.openPositions.map(p => p.buyPrice));
      const priceDropPercent = ((lowestBuyPrice - currentPrice) / lowestBuyPrice) * 100;

      // Solo compramos si el precio cayó al menos el porcentaje de espaciado adaptativo
      if (priceDropPercent >= spacingPercent) {
        // En caída libre, verificamos que el RSI muestre signos de piso/rebote (ej. RSI < 35 o empezando a curvar)
        const isOversoldOrRebounding = market.rsi < 40 || currentPrice > market.bbLower;

        if (isOversoldOrRebounding) {
          // Tamaño de tramo proporcional con multiplicador de DCA
          const baseTrancheUsd = updatedPortfolio.initialCapitalUsd / (maxTranches + 1);
          const trancheUsd = Number(
            Math.min(
              updatedPortfolio.availableUsdt,
              baseTrancheUsd * Math.pow(tuner.dcaMultiplier, openCount * 0.5)
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
                reason: `🛒 Compra en descuento: Tramo #${openCount + 1} ejecutado a $${currentPrice.toFixed(1)} (-${priceDropPercent.toFixed(1)}% desde tramo anterior).`,
              },
              updatedPortfolio: newPortfolio,
              updatedTuner,
            };
          }
        }
      }
    }
  }

  // Si no se cumple ninguna condición de compra o venta -> HOLD (Mantenemos y observamos)
  return {
    decision: {
      action: 'HOLD',
      reason: `Monitoreando BTC ($${currentPrice.toFixed(1)}). Posiciones abiertas: ${openCount}/${maxTranches}. Régimen: ${market.regime}`,
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

  // Cálculo del precio objetivo de venta: estricto costo + ganancia + comisiones
  const targetSellPrice = Number((price * (1 + takeProfitPercent / 100 + BINANCE_FEE_RATE * 2)).toFixed(2));

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

  // Autoaprendizaje: Entrenar y actualizar los hiperparámetros del bot
  const newTuner = trainAndOptimize(tuner, closedTrade, portfolio.closedTrades);

  return { newPortfolio, newTuner, closedTrade };
}
