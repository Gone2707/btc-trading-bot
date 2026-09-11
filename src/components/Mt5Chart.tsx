'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Candle, ClosedTrade, Position } from '../types/trading';
import { ZoomIn, ZoomOut, Maximize2, RefreshCw } from 'lucide-react';

interface Mt5ChartProps {
  candles: Candle[];
  currentPrice: number;
  openPositions: Position[];
  closedTrades: ClosedTrade[];
  symbol?: string;
}

export const Mt5Chart: React.FC<Mt5ChartProps> = ({
  candles,
  currentPrice,
  openPositions,
  closedTrades,
  symbol = 'BTC/USDT',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [visibleCount, setVisibleCount] = useState(45); // Cuántas velas mostrar
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const handleZoomIn = () => setVisibleCount(prev => Math.max(20, prev - 8));
  const handleZoomOut = () => setVisibleCount(prev => Math.min(100, prev + 8));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ajustar para pantallas Retina/HiDPI
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Limpiar canvas
    ctx.fillStyle = '#0d1117'; // Fondo oscuro estilo terminal MT5 / TradingView
    ctx.fillRect(0, 0, width, height);

    if (candles.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Cargando velas en tiempo real desde Binance...', width / 2, height / 2);
      return;
    }

    const displayedCandles = candles.slice(-visibleCount);
    const rightMargin = 75; // Espacio para el eje de precios
    const bottomMargin = 26; // Espacio para eje de tiempo
    const chartWidth = width - rightMargin;
    const chartHeight = height - bottomMargin;

    // Calcular escala de precios High / Low
    let minPrice = Math.min(...displayedCandles.map(c => c.low));
    let maxPrice = Math.max(...displayedCandles.map(c => c.high));

    // Incluir niveles de posiciones abiertas en el rango visible si están cerca
    openPositions.forEach(p => {
      minPrice = Math.min(minPrice, p.buyPrice * 0.998);
      maxPrice = Math.max(maxPrice, p.targetSellPrice * 1.002);
    });

    // Agregar un 2% de margen vertical
    const padding = (maxPrice - minPrice) * 0.08 || 50;
    minPrice -= padding;
    maxPrice += padding;
    const priceRange = maxPrice - minPrice;

    const getY = (price: number) => {
      return chartHeight - ((price - minPrice) / priceRange) * chartHeight;
    };

    const candleWidth = Math.max(3, (chartWidth / displayedCandles.length) * 0.7);
    const candleStep = chartWidth / displayedCandles.length;

    // 1. DIBUJAR CUADRÍCULA ESTILO MT5
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const gridLines = 6;
    for (let i = 0; i <= gridLines; i++) {
      const y = (chartHeight / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();

      // Etiquetas de precio en el eje derecho
      const p = maxPrice - (priceRange / gridLines) * i;
      ctx.fillStyle = '#64748b';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`$${p.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`, chartWidth + 6, y + 4);
    }

    // 2. DIBUJAR VELAS JAPONESAS
    displayedCandles.forEach((c, idx) => {
      const x = idx * candleStep + candleStep / 2;
      const openY = getY(c.open);
      const closeY = getY(c.close);
      const highY = getY(c.high);
      const lowY = getY(c.low);

      const isBullish = c.close >= c.open;
      const color = isBullish ? '#10b981' : '#ef4444';

      // Mecha (Wick)
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Cuerpo (Body)
      ctx.fillStyle = color;
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(2, Math.abs(closeY - openY));
      ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
    });

    // 3. DIBUJAR OPERACIONES CERRADAS HISTÓRICAS (Flechas de COMPRA y VENTA)
    closedTrades.forEach(t => {
      // Buscar si el tiempo de apertura está en las velas visibles
      const candleIdx = displayedCandles.findIndex(c => Math.abs(c.time - Math.floor(t.openTime / 1000)) < 120);
      if (candleIdx !== -1) {
        const x = candleIdx * candleStep + candleStep / 2;
        const y = getY(t.buyPrice);

        // Flecha de Compra (Verde ▲)
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.moveTo(x, y + 10);
        ctx.lineTo(x - 5, y + 18);
        ctx.lineTo(x + 5, y + 18);
        ctx.closePath();
        ctx.fill();

        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('BUY', x, y + 28);
      }

      // Marcador de Venta (Take Profit Dorado 🎯)
      const closeIdx = displayedCandles.findIndex(c => Math.abs(c.time - Math.floor(t.closeTime / 1000)) < 120);
      if (closeIdx !== -1) {
        const x = closeIdx * candleStep + candleStep / 2;
        const y = getY(t.sellPrice);

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(x, y - 10);
        ctx.lineTo(x - 5, y - 18);
        ctx.lineTo(x + 5, y - 18);
        ctx.closePath();
        ctx.fill();

        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`+$${t.netProfitUsd.toFixed(2)}`, x, y - 22);
      }
    });

    // 4. DIBUJAR OPERACIONES ABIERTAS EN TIEMPO REAL (Estilo MT5)
    openPositions.forEach(p => {
      const entryY = getY(p.buyPrice);
      const tpY = getY(p.targetSellPrice);

      // --- LÍNEA DE ENTRADA (BUY) ---
      ctx.save();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = '#10b981'; // Verde compra
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, entryY);
      ctx.lineTo(chartWidth, entryY);
      ctx.stroke();
      ctx.restore();

      // Etiqueta de entrada a la izquierda
      ctx.fillStyle = '#065f46';
      ctx.fillRect(4, entryY - 11, 150, 18);
      ctx.strokeStyle = '#10b981';
      ctx.strokeRect(4, entryY - 11, 150, 18);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`BUY ${p.id}: $${p.buyPrice.toFixed(1)} ($${p.investedUsd})`, 8, entryY + 2);

      // --- LÍNEA DE TAKE PROFIT (TP) ---
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#f59e0b'; // Dorado TP
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, tpY);
      ctx.lineTo(chartWidth, tpY);
      ctx.stroke();
      ctx.restore();

      // Etiqueta de TP
      ctx.fillStyle = '#78350f';
      ctx.fillRect(4, tpY - 11, 140, 18);
      ctx.strokeStyle = '#f59e0b';
      ctx.strokeRect(4, tpY - 11, 140, 18);
      ctx.fillStyle = '#fef3c7';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`TP ${p.id}: $${p.targetSellPrice.toFixed(1)} (+${((p.targetSellPrice / p.buyPrice - 1) * 100).toFixed(1)}%)`, 8, tpY + 2);

      // Badge flotante de PnL en tiempo real sobre la línea
      const pnlColor = p.unrealizedPnlUsd >= 0 ? '#10b981' : '#f97316';
      const pnlSign = p.unrealizedPnlUsd >= 0 ? '+' : '';
      const pnlText = `PnL: ${pnlSign}$${p.unrealizedPnlUsd.toFixed(2)} (${pnlSign}${p.unrealizedPnlPercent.toFixed(2)}%)`;

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(chartWidth - 165, entryY - 11, 160, 18);
      ctx.strokeStyle = pnlColor;
      ctx.strokeRect(chartWidth - 165, entryY - 11, 160, 18);
      ctx.fillStyle = pnlColor;
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(pnlText, chartWidth - 85, entryY + 2);
    });

    // 5. LÍNEA DE PRECIO ACTUAL (Ask/Bid en vivo con etiqueta parpadeante)
    if (currentPrice > 0) {
      const curY = getY(currentPrice);
      ctx.save();
      ctx.strokeStyle = '#38bdf8'; // Azul brillante
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(0, curY);
      ctx.lineTo(chartWidth, curY);
      ctx.stroke();
      ctx.restore();

      // Etiqueta de precio actual en el eje derecho
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(chartWidth, curY - 10, rightMargin, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`$${currentPrice.toFixed(1)}`, chartWidth + 4, curY + 4);
    }

    // 6. MIRA DE PUNTERO (Crosshair) si el mouse está sobre el gráfico
    if (mousePos && mousePos.x < chartWidth && mousePos.y < chartHeight) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(mousePos.x, 0);
      ctx.lineTo(mousePos.x, chartHeight);
      ctx.moveTo(0, mousePos.y);
      ctx.lineTo(chartWidth, mousePos.y);
      ctx.stroke();
      ctx.restore();
    }
  }, [candles, currentPrice, openPositions, closedTrades, visibleCount, mousePos]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    const chartWidth = rect.width - 75;
    if (x >= 0 && x <= chartWidth && candles.length > 0) {
      const displayedCandles = candles.slice(-visibleCount);
      const step = chartWidth / displayedCandles.length;
      const idx = Math.floor(x / step);
      if (displayedCandles[idx]) {
        setHoveredCandle(displayedCandles[idx]);
      }
    }
  };

  const handleMouseLeave = () => {
    setMousePos(null);
    setHoveredCandle(null);
  };

  return (
    <div className="bg-[#121722] border border-[#1e2638] rounded-xl p-4 shadow-xl flex flex-col">
      {/* Barra superior de controles del gráfico */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1e2638] mb-3">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-white tracking-wide">{symbol}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-[#1e2638] text-gray-300 font-mono">1m</span>
          </div>

          {hoveredCandle ? (
            <div className="hidden sm:flex items-center space-x-3 text-xs font-mono text-gray-400">
              <span>O: <strong className="text-white">${hoveredCandle.open.toFixed(1)}</strong></span>
              <span>H: <strong className="text-emerald-400">${hoveredCandle.high.toFixed(1)}</strong></span>
              <span>L: <strong className="text-rose-400">${hoveredCandle.low.toFixed(1)}</strong></span>
              <span>C: <strong className="text-white">${hoveredCandle.close.toFixed(1)}</strong></span>
            </div>
          ) : (
            <span className="hidden sm:inline text-xs text-gray-400">Binance Spot Direct Stream</span>
          )}
        </div>

        {/* Controles estilo MT5 (Zoom, Leyenda) */}
        <div className="flex items-center space-x-2">
          <div className="hidden md:flex items-center space-x-3 text-xs text-gray-400 mr-2">
            <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-emerald-500 mr-1" /> Entrada Buy</span>
            <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-amber-500 mr-1" /> Take Profit</span>
            <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-sky-400 mr-1" /> Precio Actual</span>
          </div>

          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg bg-[#1e2638] hover:bg-[#2a344d] text-gray-300 transition-colors"
            title="Acercar (Zoom In)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg bg-[#1e2638] hover:bg-[#2a344d] text-gray-300 transition-colors"
            title="Alejar (Zoom Out)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Contenedor del Canvas */}
      <div ref={containerRef} className="relative w-full h-[360px] sm:h-[420px]">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full h-full cursor-crosshair rounded-lg block"
        />
      </div>

      {/* Pie del gráfico con estado de operativas */}
      <div className="mt-3 pt-2 border-t border-[#1e2638] flex flex-wrap items-center justify-between text-xs text-gray-400">
        <div className="flex items-center space-x-2">
          <span>Operativas en gráfico: <strong className="text-white">{openPositions.length} activas</strong></span>
          <span>•</span>
          <span>Cerradas: <strong className="text-emerald-400">{closedTrades.length}</strong></span>
        </div>
        <div className="text-[11px] text-gray-500">
          Visualización MT5: Líneas punteadas verdes = Compras | Líneas doradas = Take Profit
        </div>
      </div>
    </div>
  );
};
