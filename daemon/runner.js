/**
 * BTC HODL Grid AI - Standalone Cloud Runner 24/7 (Costo Cero)
 * Persiste estado en disco y sincroniza con el dashboard web
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '..', 'data', 'bot_state.json');

console.log('=====================================================');
console.log('🤖 BTC HODL Grid AI - Motor Autónomo 24/7 Iniciado');
console.log('Perfil: Spot Conservador (Regla: Jamás vende a pérdida)');
console.log('Sincronización con data/bot_state.json activa');
console.log('=====================================================');

let state = {
  initialCapitalUsd: 50.0,
  availableUsdt: 50.0,
  heldBtc: 0.0,
  currentBtcPrice: 65000.0,
  totalEquityUsd: 50.0,
  realizedProfitUsd: 0.0,
  unrealizedPnlUsd: 0.0,
  totalPnlPercent: 0.0,
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

// Cargar estado persistente si existe
try {
  if (fs.existsSync(STATE_FILE)) {
    const saved = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    if (saved && typeof saved.availableUsdt === 'number') {
      state = { ...state, ...saved };
      console.log(`📁 Estado previo restaurado. Balance: $${state.totalEquityUsd.toFixed(2)} | Posiciones: ${state.openPositions.length} | Trades cerrados: ${state.closedTrades.length}`);
    }
  }
} catch (e) {
  console.warn('Iniciando con nuevo estado...');
}

function saveState() {
  try {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    state.lastActiveTimestamp = Date.now();
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error guardando estado:', e.message);
  }
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function runStrategyCycle() {
  try {
    const ticker = await fetchJson('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
    const price = parseFloat(ticker.price);
    const now = new Date().toLocaleTimeString();

    state.currentBtcPrice = price;
    let totalUnrealized = 0;

    // 1. Evaluar Take-Profit de posiciones abiertas (NUNCA A PÉRDIDA)
    for (let i = state.openPositions.length - 1; i >= 0; i--) {
      const pos = state.openPositions[i];
      const pnl = (pos.amountBtc * price) - pos.investedUsd;
      pos.currentPrice = price;
      pos.unrealizedPnlUsd = Number(pnl.toFixed(2));
      pos.unrealizedPnlPercent = Number(((pnl / pos.investedUsd) * 100).toFixed(2));
      totalUnrealized += pnl;

      const minAcceptable = pos.buyPrice * 1.008; // Mínimo neto cubriendo comisiones

      if (price >= pos.targetSellPrice && price >= minAcceptable) {
        const grossReturn = pos.amountBtc * price;
        const fee = grossReturn * 0.001;
        const netReturn = grossReturn - fee;
        const profit = Number((netReturn - pos.investedUsd).toFixed(2));

        state.availableUsdt = Number((state.availableUsdt + netReturn).toFixed(2));
        state.heldBtc = Number(Math.max(0, state.heldBtc - pos.amountBtc).toFixed(6));
        state.realizedProfitUsd = Number((state.realizedProfitUsd + profit).toFixed(2));
        state.openPositions.splice(i, 1);

        const closed = {
          id: `CL-${Math.floor(10000 + Math.random() * 90000)}`,
          ticket: pos.id,
          buyPrice: pos.buyPrice,
          sellPrice: price,
          amountBtc: pos.amountBtc,
          investedUsd: pos.investedUsd,
          returnedUsd: Number(netReturn.toFixed(2)),
          feeUsd: Number(fee.toFixed(3)),
          netProfitUsd: profit,
          netProfitPercent: Number(((profit / pos.investedUsd) * 100).toFixed(2)),
          openTime: pos.timestamp,
          closeTime: Date.now(),
          durationMinutes: Math.max(1, Math.round((Date.now() - pos.timestamp) / 60000)),
          regime: 'RANGING',
        };

        state.closedTrades.unshift(closed);
        state.totalTradesCount = state.closedTrades.length;
        state.winningTradesCount = state.closedTrades.filter(t => t.netProfitUsd > 0).length;
        state.winRatePercent = Number(((state.winningTradesCount / state.totalTradesCount) * 100).toFixed(1));

        saveState();
        console.log(`\n🎯 [${now}] VENTA EXITOSA: ${pos.id} a $${price.toFixed(1)} | Ganancia: +$${profit.toFixed(2)} | Balance Total: $${(state.availableUsdt + state.heldBtc * price).toFixed(2)}\n`);
      }
    }

    // 2. Evaluar compras autónomas
    if (state.availableUsdt >= 10 && state.openPositions.length < 3) {
      if (state.openPositions.length === 0) {
        const invest = Number(Math.min(state.availableUsdt * 0.28, 14).toFixed(2));
        const fee = invest * 0.001;
        const btc = Number(((invest - fee) / price).toFixed(6));
        const target = Number((price * 1.0115).toFixed(2)); // +1.15% Take Profit ágil

        state.availableUsdt = Number((state.availableUsdt - invest).toFixed(2));
        state.heldBtc = Number((state.heldBtc + btc).toFixed(6));

        const newPos = {
          id: `TK-${Math.floor(1000 + Math.random() * 9000)}`,
          trancheIndex: 0,
          buyPrice: price,
          targetSellPrice: target,
          amountBtc: btc,
          investedUsd: invest,
          timestamp: Date.now(),
          status: 'OPEN',
          currentPrice: price,
          unrealizedPnlUsd: 0,
          unrealizedPnlPercent: 0,
          trailingMaxPrice: price,
          notes: 'Entrada autónoma de fondo 24/7',
        };

        state.openPositions.push(newPos);
        saveState();
        console.log(`\n🟢 [${now}] COMPRA AUTÓNOMA: ${newPos.id} en $${price.toFixed(1)} ($${invest.toFixed(2)}) | Target: $${target.toFixed(1)}\n`);
      }
    }

    state.unrealizedPnlUsd = Number(totalUnrealized.toFixed(2));
    state.totalEquityUsd = Number((state.availableUsdt + state.heldBtc * price).toFixed(2));
    state.totalPnlPercent = Number((((state.totalEquityUsd - state.initialCapitalUsd) / state.initialCapitalUsd) * 100).toFixed(2));

    saveState();
    process.stdout.write(`\r[${now}] BTC: $${price.toFixed(1)} | Equidad: $${state.totalEquityUsd.toFixed(2)} (+$${state.realizedProfitUsd.toFixed(2)}) | USDT: $${state.availableUsdt.toFixed(2)} | Activas: ${state.openPositions.length}`);

  } catch (err) {
    console.error('\nError en ciclo de trading:', err.message);
  }
}

setInterval(runStrategyCycle, 4000);
runStrategyCycle();
