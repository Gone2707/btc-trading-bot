/**
 * BTC HODL Grid AI - Standalone Cloud Runner 24/7 (Costo Cero)
 * Diseñado para correr en la nube (Render, Koyeb, Railway) o en tu Mac en segundo plano
 * Sin necesidad de tener Antigravity ni el navegador abierto.
 */

const https = require('https');

console.log('=====================================================');
console.log('🤖 BTC HODL Grid AI - Motor Autónomo 24/7 Iniciado');
console.log('Perfil: Spot Conservador (Regla: Jamás vende a pérdida)');
console.log('Capital Inicial Simulado: $50.00 USD');
console.log('=====================================================');

let balanceUsdt = 50.0;
let heldBtc = 0.0;
let positions = [];
let closedTrades = [];
let generation = 1;

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
    // 1. Obtener precio actual de Binance
    const ticker = await fetchJson('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
    const price = parseFloat(ticker.price);
    const now = new Date().toLocaleTimeString();

    // 2. Evaluar posiciones abiertas para Take-Profit (VENTA NUNCA A PÉRDIDA)
    for (let i = positions.length - 1; i >= 0; i--) {
      const pos = positions[i];
      const minAcceptable = pos.buyPrice * 1.012; // Mínimo +1.2% neto cubriendo comisiones

      if (price >= pos.targetSellPrice && price >= minAcceptable) {
        const grossReturn = pos.amountBtc * price;
        const fee = grossReturn * 0.001;
        const netReturn = grossReturn - fee;
        const profit = netReturn - pos.investedUsd;

        balanceUsdt += netReturn;
        heldBtc -= pos.amountBtc;
        positions.splice(i, 1);

        console.log(`\n🎯 [${now}] VENTA EXITOSA: ${pos.id} a $${price.toFixed(1)} | Ganancia: +$${profit.toFixed(2)} | Balance USDT: $${balanceUsdt.toFixed(2)}\n`);
      }
    }

    // 3. Evaluar compras autónomas (Conservador en rangos / descuentos)
    if (balanceUsdt >= 10 && positions.length < 3) {
      if (positions.length === 0) {
        // Entrada inicial: 30% del saldo
        const invest = Math.min(balanceUsdt * 0.3, 15);
        const fee = invest * 0.001;
        const btc = (invest - fee) / price;
        const target = price * 1.018; // +1.8% Take Profit

        balanceUsdt -= invest;
        heldBtc += btc;
        const newPos = { id: `TK-${Math.floor(1000 + Math.random() * 9000)}`, buyPrice: price, targetSellPrice: target, investedUsd: invest, amountBtc: btc };
        positions.push(newPos);

        console.log(`\n🟢 [${now}] COMPRA AUTÓNOMA: ${newPos.id} en $${price.toFixed(1)} ($${invest.toFixed(2)}) | Target: $${target.toFixed(1)}\n`);
      }
    }

    const totalEquity = balanceUsdt + heldBtc * price;
    process.stdout.write(`\r[${now}] BTC: $${price.toFixed(1)} | Equidad: $${totalEquity.toFixed(2)} | USDT: $${balanceUsdt.toFixed(2)} | Posiciones: ${positions.length}`);

  } catch (err) {
    console.error('\nError en ciclo de trading:', err.message);
  }
}

// Ejecutar ciclo cada 5 segundos
setInterval(runStrategyCycle, 5000);
runStrategyCycle();
