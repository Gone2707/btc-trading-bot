import { Candle } from '../types/trading';

export type TickerCallback = (
  price: number,
  change24h: number,
  high24h: number,
  low24h: number,
  latencyMs: number
) => void;

export type CandleCallback = (candle: Candle) => void;

class BinanceMarketFeed {
  private combinedWs: WebSocket | null = null;
  private tickerListeners: TickerCallback[] = [];
  private candleListeners: CandleCallback[] = [];
  private isConnecting = false;
  private reconnectTimeout: any = null;
  private currentInterval = '1m';
  private lastChange24h = 0;
  private lastHigh24h = 0;
  private lastLow24h = 0;

  public async fetchHistoricalKlines(symbol = 'BTCUSDT', interval = '1m', limit = 80): Promise<Candle[]> {
    this.currentInterval = interval;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500); // 3.5s max timeout

    try {
      const res = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`Binance status: ${res.status}`);
      const data = await res.json();
      return data.map((item: any[]) => ({
        time: Math.floor(item[0] / 1000),
        open: parseFloat(item[1]),
        high: parseFloat(item[2]),
        low: parseFloat(item[3]),
        close: parseFloat(item[4]),
        volume: parseFloat(item[5]),
        isClosed: true,
      }));
    } catch (e) {
      clearTimeout(timeout);
      console.warn('Fallback rápido a endpoint alternativo de Binance...', e);
      try {
        const res2 = await fetch(
          `https://api.binance.us/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
        );
        const data2 = await res2.json();
        return data2.map((item: any[]) => ({
          time: Math.floor(item[0] / 1000),
          open: parseFloat(item[1]),
          high: parseFloat(item[2]),
          low: parseFloat(item[3]),
          close: parseFloat(item[4]),
          volume: parseFloat(item[5]),
          isClosed: true,
        }));
      } catch (err) {
        console.error('Error obteniendo velas de Binance:', err);
        return [];
      }
    }
  }

  /**
   * Conexión Ultra-Rápida con Stream Combinado Multiplexado de Binance
   * Utiliza aggTrade para recibir CADA TICK DE PRECIO EN TIEMPO REAL (sub-100ms)
   */
  public connect(interval = '1m'): void {
    if (typeof window === 'undefined') return;
    this.currentInterval = interval;
    this.disconnect();
    this.isConnecting = true;

    try {
      // Stream combinado oficial de Binance: aggTrade (ticks instantáneos) + ticker (24h) + kline (velas)
      const streamUrl = `wss://stream.binance.com:9443/stream?streams=btcusdt@aggTrade/btcusdt@ticker/btcusdt@kline_${interval}`;
      this.combinedWs = new WebSocket(streamUrl);

      this.combinedWs.onopen = () => {
        this.isConnecting = false;
      };

      this.combinedWs.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const stream = payload.stream;
          const data = payload.data;
          const now = Date.now();

          // 1. TICKS ULTRA-RÁPIDOS DE PRECIO (aggTrade)
          if (stream === 'btcusdt@aggTrade') {
            const price = parseFloat(data.p);
            const serverTime = data.T || data.E || now;
            const latencyMs = Math.max(5, Math.min(999, now - serverTime));

            this.tickerListeners.forEach(cb =>
              cb(price, this.lastChange24h, this.lastHigh24h, this.lastLow24h, latencyMs)
            );
          }

          // 2. ESTADÍSTICAS 24H (ticker)
          else if (stream === 'btcusdt@ticker') {
            this.lastChange24h = parseFloat(data.P);
            this.lastHigh24h = parseFloat(data.h);
            this.lastLow24h = parseFloat(data.l);
            const price = parseFloat(data.c);
            const serverTime = data.E || now;
            const latencyMs = Math.max(5, Math.min(999, now - serverTime));

            this.tickerListeners.forEach(cb =>
              cb(price, this.lastChange24h, this.lastHigh24h, this.lastLow24h, latencyMs)
            );
          }

          // 3. VELAS DE TIEMPO REAL (kline)
          else if (stream && stream.startsWith('btcusdt@kline')) {
            const k = data.k;
            const candle: Candle = {
              time: Math.floor(k.t / 1000),
              open: parseFloat(k.o),
              high: parseFloat(k.h),
              low: parseFloat(k.l),
              close: parseFloat(k.c),
              volume: parseFloat(k.v),
              isClosed: k.x,
            };
            this.candleListeners.forEach(cb => cb(candle));
          }
        } catch (err) {
          console.error('Error parseando stream WebSocket:', err);
        }
      };

      this.combinedWs.onerror = () => this.scheduleReconnect();
      this.combinedWs.onclose = () => this.scheduleReconnect();

    } catch (e) {
      console.error('Error inicializando WebSocket:', e);
      this.scheduleReconnect();
    }
  }

  public switchInterval(newInterval: string): void {
    this.currentInterval = newInterval;
    this.connect(newInterval);
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) return;
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.isConnecting = false;
      this.connect(this.currentInterval);
    }, 2500);
  }

  public subscribeTicker(cb: TickerCallback): () => void {
    this.tickerListeners.push(cb);
    return () => {
      this.tickerListeners = this.tickerListeners.filter(l => l !== cb);
    };
  }

  public subscribeCandle(cb: CandleCallback): () => void {
    this.candleListeners.push(cb);
    return () => {
      this.candleListeners = this.candleListeners.filter(l => l !== cb);
    };
  }

  public disconnect(): void {
    if (this.combinedWs) {
      this.combinedWs.close();
      this.combinedWs = null;
    }
    this.isConnecting = false;
  }
}

export const binanceFeed = new BinanceMarketFeed();
