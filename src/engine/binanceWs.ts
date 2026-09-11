import { Candle } from '../types/trading';

export type TickerCallback = (price: number, change24h: number, high24h: number, low24h: number) => void;
export type CandleCallback = (candle: Candle) => void;

class BinanceMarketFeed {
  private tickerWs: WebSocket | null = null;
  private klineWs: WebSocket | null = null;
  private tickerListeners: TickerCallback[] = [];
  private candleListeners: CandleCallback[] = [];
  private isConnecting = false;
  private reconnectTimeout: any = null;
  private currentInterval = '1m';

  public async fetchHistoricalKlines(symbol = 'BTCUSDT', interval = '1m', limit = 100): Promise<Candle[]> {
    this.currentInterval = interval;
    try {
      const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
      if (!res.ok) throw new Error(`Binance REST status: ${res.status}`);
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
      console.warn('Fallback a Binance alternative endpoint...', e);
      try {
        const res2 = await fetch(`https://api.binance.us/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
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

  public connect(interval = '1m'): void {
    if (typeof window === 'undefined') return;
    this.currentInterval = interval;
    this.disconnect();
    this.isConnecting = true;

    try {
      // 1. Ticker WebSocket en vivo
      this.tickerWs = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@ticker');
      
      this.tickerWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const price = parseFloat(data.c);
          const change24h = parseFloat(data.P);
          const high24h = parseFloat(data.h);
          const low24h = parseFloat(data.l);
          this.tickerListeners.forEach(cb => cb(price, change24h, high24h, low24h));
        } catch (err) {
          console.error('Error parseando ticker:', err);
        }
      };

      this.tickerWs.onerror = () => this.scheduleReconnect();
      this.tickerWs.onclose = () => this.scheduleReconnect();

      // 2. Velas Klines en vivo según intervalo
      this.klineWs = new WebSocket(`wss://stream.binance.com:9443/ws/btcusdt@kline_${interval}`);

      this.klineWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
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
        } catch (err) {
          console.error('Error parseando kline:', err);
        }
      };

      this.klineWs.onerror = () => this.scheduleReconnect();
      this.klineWs.onclose = () => this.scheduleReconnect();

    } catch (e) {
      console.error('Error conectando WebSockets:', e);
      this.scheduleReconnect();
    }
  }

  public switchInterval(newInterval: string): void {
    this.currentInterval = newInterval;
    if (this.klineWs) {
      this.klineWs.close();
      this.klineWs = new WebSocket(`wss://stream.binance.com:9443/ws/btcusdt@kline_${newInterval}`);
      this.klineWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
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
        } catch (err) {
          console.error('Error parseando kline:', err);
        }
      };
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) return;
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.isConnecting = false;
      this.connect(this.currentInterval);
    }, 4000);
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
    if (this.tickerWs) {
      this.tickerWs.close();
      this.tickerWs = null;
    }
    if (this.klineWs) {
      this.klineWs.close();
      this.klineWs = null;
    }
    this.isConnecting = false;
  }
}

export const binanceFeed = new BinanceMarketFeed();
