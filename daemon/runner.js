/**
 * BTC HODL Grid AI - Daemon de Ejecución Continua 24/7 (Costo Cero)
 * Puede ejecutarse en segundo plano en tu Mac o en cualquier servidor gratuito (Render, Railway, etc.)
 */

const https = require('https');

console.log('🚀 Iniciando BTC HODL Grid AI Daemon 24/7...');
console.log('Perfil: Conservador HODL Spot (Ventas estrictamente en ganancia neta).');

// Función para obtener precio en tiempo real
function fetchBtcPrice() {
  return new Promise((resolve, reject) => {
    https.get('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parseFloat(parsed.price));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function loop() {
  try {
    const price = await fetchBtcPrice();
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] 📊 BTC/USDT: $${price.toFixed(2)} | Bot activo | Evaluando condiciones...`);
  } catch (err) {
    console.error('Error en consulta de precio:', err.message);
  }
}

// Ejecutar cada 10 segundos
setInterval(loop, 10000);
loop();
