# 🚀 BTC HODL Grid AI — Bot de Trading Spot Conservador

Bot de trading cuantitativo para Bitcoin (BTC/USDT) diseñado específicamente para el perfil **Conservador HODL**:
- 🛡️ **Spot Puro (Cero Apalancamiento / Cero Liquidación)**: Nunca opera futuros ni margen. No existe el riesgo de liquidación forzosa.
- 🔒 **Regla Estricta: Jamás Vende a Pérdida ("Never Sell at a Loss")**: Solo vende cuando el precio supera el costo de compra + comisiones + margen de beneficio. Si el mercado cae, custodia los Satoshis pacientemente hasta la recuperación del ciclo.
- 🎯 **Visualización Gráfica Estilo MT5**: Velas en tiempo real de Binance, flechas de compra/venta, líneas horizontales punteadas con etiquetas de PnL flotante en vivo y barras de progreso hacia el Take Profit.
- 🧠 **Autoaprendizaje e IA de Régimen**: Detecta volatilidad (ATR), fuerza de tendencia (ADX), sobreventa (RSI) y ajusta automáticamente la cuadrícula y el Take-Profit para mejorar el rendimiento con cada ciclo.
- 💰 **Paper Trading de $50 USD**: Inicia con saldo virtual de $50 USD operando contra el mercado real de Binance.
- 🌐 **Costo Cero**: WebSockets públicos gratuitos de Binance, despliegue 100% gratuito en Vercel, accesible desde tu teléfono móvil o PC.

---

## 📸 Características Estilo MetaTrader 5 (MT5)

1. **Gráfico Interactivo de Velas Japonesas**:
   - Velas de 1 minuto actualizadas en vivo vía WebSockets de Binance.
   - Flechas verdes `▲ BUY` donde se abrió la posición.
   - Marcadores dorados `🎯 SELL (+X.X%)` donde se cerró con ganancia.
   - Líneas punteadas de **Precio de Entrada** y **Take Profit**.
   - **Etiquetas de Beneficio Flotante (PnL)** directamente sobre las líneas en tiempo real.
2. **Panel de Operativas Abiertas**:
   - Muestra cada ticket (ej. `#TK-1002`), capital invertido en dólares, volumen en BTC, precio de entrada, precio actual, distancia a TP y PnL flotante (+$ o -$ con %).
3. **Historial de Operaciones Cerradas**:
   - Resumen detallado de cada ciclo completado con su ganancia neta en dólares y porcentaje, duración en minutos y comisiones calculadas.

---

## 🧠 ¿Cómo Funciona la IA y el Autoaprendizaje?

1. **Clasificación de Régimen de Mercado**:
   - **Rango Lateral (Consolidación)**: Reduce el espaciado (0.8% - 1.4%) para capturar micro-oscilaciones constantes.
   - **Tendencia Alcista (Impulso)**: Activa *Trailing Take-Profit* (Infinity Grid) para no vender de golpe y dejar correr los beneficios.
   - **Caída / Descuento**: Activa el *Modo Defensivo DCA*, promediando tramos únicamente en niveles de sobreventa confirmada (RSI < 38) para reducir drásticamente el precio promedio de entrada.
2. **Motor de Auto-Mejora (Self-Tuner)**:
   - Con cada 3 operaciones cerradas, el bot analiza la duración promedio del ciclo y la rentabilidad.
   - Si los ciclos son rápidos y efectivos, incrementa el Take Profit para extraer más ganancias.
   - Si el mercado se estanca, optimiza la cercanía de la cuadrícula.
   - Todo se ejecuta de manera determinista y estadística, **sin depender de APIs pagas de IA**.

---

## 🛠️ Instalación y Ejecución Local

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo
npm run dev

# Abre en tu navegador: http://localhost:3000
```

---

## 📱 Despliegue en Vercel (100% Gratuito y en 1 Clic)

El código ya está publicado en tu repositorio oficial de GitHub: [https://github.com/Gone2707/btc-trading-bot](https://github.com/Gone2707/btc-trading-bot).

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FGone2707%2Fbtc-trading-bot)

### Paso a paso para desplegar:
1. Haz clic directamente en el botón **"Deploy with Vercel"** o entra en [vercel.com/new](https://vercel.com/new).
2. Conéctate con tu cuenta de GitHub (`Gone2707`).
3. Verás listado tu repositorio **`btc-trading-bot`** -> haz clic en **"Import"**.
4. Haz clic en **"Deploy"** (no necesitas configurar variables de entorno).
5. ¡Listo! En 60 segundos tendrás tu enlace público (ejemplo: `https://btc-trading-bot.vercel.app`) para abrirlo y vigilarlo desde tu teléfono móvil.

---

## ⚡ Ejecución 24/7 en Segundo Plano (Opcional)

Si deseas dejar el bot monitoreando continuamente las 24 horas sin depender de tener la pestaña abierta en el navegador:

```bash
# Ejecutar en segundo plano en tu Mac
node daemon/runner.js
```

---

## 🔒 Pasar a Binance Real (Cuando estés listo)

1. En el Dashboard web, haz clic en el ícono de **Configuración ⚙️** (esquina superior derecha).
2. Cambia el modo a **Binance Spot Real**.
3. Ingresa tu `API Key` y `API Secret` de Binance (solo permisos de lectura y trading spot; nunca actives retiros).
