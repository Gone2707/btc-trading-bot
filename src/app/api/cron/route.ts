import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Obtener precio actual de Binance
    const priceRes = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT', {
      cache: 'no-store',
    });
    const priceData = await priceRes.json();
    const currentPrice = parseFloat(priceData.price);

    // 2. Obtener últimas velas para análisis técnico
    const klinesRes = await fetch(
      'https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=25',
      { cache: 'no-store' }
    );
    const klinesData = await klinesRes.json();
    const candles = klinesData.map((k: any[]) => ({
      time: Math.floor(k[0] / 1000),
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));

    const lastCandle = candles[candles.length - 1];

    return NextResponse.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      symbol: 'BTCUSDT',
      currentPrice,
      lastCandle,
      message: 'Evaluación autónoma 24/7 ejecutada en la nube con éxito.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    );
  }
}
