'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Candle, ClosedTrade, Position } from '../types/trading';
import { ZoomIn, ZoomOut, Crosshair, Plus, TrendingUp, Layers } from 'lucide-react';

interface Mt5ChartProps {
  candles: Candle[];
  currentPrice: number;
  openPositions: Position[];
  closedTrades: ClosedTrade[];
  symbol?: string;
  selectedTimeframe?: string;
  onTimeframeChange?: (tf: string) => void;
  onQuickBuy?: () => void;
}

export const Mt5Chart: React.FC<Mt5ChartProps> = ({
  candles,
  currentPrice,
  openPositions,
  closedTrades,
  symbol = 'BTCUSDT',
  selectedTimeframe = 'M1',
  onTimeframeChange,
  onQuickBuy,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [visibleCount, setVisibleCount] = useState(50);
  const [crosshairActive, setCrosshairActive] = useState(false);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);
  const [showIndicators, setShowIndicators] = useState(true);

  // Soporte para arrastre táctil (Pan) en móvil
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [panOffset, setPanOffset] = useState(0);

  const timeframes = ['M1', 'M5', 'M15', 'H1'];

  const handleZoomIn = () => setVisibleCount(prev => Math.max(18, prev - 6));
  const handleZoomOut = () => setVisibleCount(prev => Math.min(120, prev + 6));

  // Renderizado en Canvas con estética 100% MT5
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Fondo MT5 Charcoal Oscuro
    ctx.fillStyle = '#131722';
    ctx.fillRect(0, 0, width, height);

    if (candles.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '13px "Roboto Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Conectando con Binance Spot Feed...', width / 2, height / 2);
      return;
    }

    const rightMargin = 72;
    const bottomMargin = 24;
    const chartWidth = width - rightMargin;
    const chartHeight = height - bottomMargin;

    // Slice de velas con desplazamiento
    const totalCandles = candles.length;
    const startIdx = Math.max(0, totalCandles - visibleCount - panOffset);
    const endIdx = Math.min(totalCandles, totalCandles - panOffset);
    const displayedCandles = candles.slice(startIdx, endIdx);

    if (displayedCandles.length === 0) return;

    let minPrice = Math.min(...displayedCandles.map(c => c.low));
    let maxPrice = Math.max(...displayedCandles.map(c => c.high));

    openPositions.forEach(p => {
      minPrice = Math.min(minPrice, p.buyPrice * 0.998);
      maxPrice = Math.max(maxPrice, p.targetSellPrice * 1.002);
    });

    const padding = (maxPrice - minPrice) * 0.08 || 40;
    minPrice -= padding;
    maxPrice += padding;
    const priceRange = maxPrice - minPrice;

    const getY = (price: number) => {
      return chartHeight - ((price - minPrice) / priceRange) * chartHeight;
    };

    const candleStep = chartWidth / displayedCandles.length;
    const candleWidth = Math.max(2.5, candleStep * 0.68);

    // 1. CUADRÍCULA ESTILO MT5
    ctx.strokeStyle = '#1e2433';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);

    const horizontalGrids = 6;
    for (let i = 0; i <= horizontalGrids; i++) {
      const y = (chartHeight / horizontalGrids) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();

      const priceVal = maxPrice - (priceRange / horizontalGrids) * i;
      ctx.fillStyle = '#6b7280';
      ctx.font = '10px "Roboto Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(priceVal.toFixed(1), chartWidth + 5, y + 3);
    }

    // Cuadrícula vertical de tiempo
    const timeGrids = Math.min(6, displayedCandles.length);
    const timeStep = Math.floor(displayedCandles.length / timeGrids);
    for (let i = 0; i < displayedCandles.length; i += timeStep) {
      const x = i * candleStep + candleStep / 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, chartHeight);
      ctx.stroke();

      const c = displayedCandles[i];
      if (c) {
        const d = new Date(c.time * 1000);
        const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        ctx.fillStyle = '#6b7280';
        ctx.font = '10px "Roboto Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(timeStr, x, height - 8);
      }
    }
    ctx.setLineDash([]);

    // 2. INDICADOR DE MEDIA MÓVIL MT5 (EMA 20)
    if (showIndicators && displayedCandles.length > 5) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      let hasStarted = false;

      displayedCandles.forEach((_, idx) => {
        const fullIdx = startIdx + idx;
        if (fullIdx >= 9) {
          const slice = candles.slice(Math.max(0, fullIdx - 19), fullIdx + 1);
          const emaVal = slice.reduce((a, b) => a + b.close, 0) / slice.length;
          const x = idx * candleStep + candleStep / 2;
          const y = getY(emaVal);
          if (!hasStarted) {
            ctx.moveTo(x, y);
            hasStarted = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.stroke();
    }

    // 3. DIBUJAR VELAS JAPONESAS MT5 (Verdes / Rojas nítidas)
    displayedCandles.forEach((c, idx) => {
      const x = idx * candleStep + candleStep / 2;
      const openY = getY(c.open);
      const closeY = getY(c.close);
      const highY = getY(c.high);
      const lowY = getY(c.low);

      const isBull = c.close >= c.open;
      const barColor = isBull ? '#26a69a' : '#ef5350';

      // Mecha
      ctx.strokeStyle = barColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Cuerpo
      ctx.fillStyle = barColor;
      const top = Math.min(openY, closeY);
      const h = Math.max(1.5, Math.abs(closeY - openY));
      ctx.fillRect(x - candleWidth / 2, top, candleWidth, h);
    });

    // 4. HISTORIAL DE TRADES (Flechas MT5 de apertura y cierre)
    closedTrades.forEach(t => {
      const openIdx = displayedCandles.findIndex(c => Math.abs(c.time - Math.floor(t.openTime / 1000)) < 90);
      if (openIdx !== -1) {
        const x = openIdx * candleStep + candleStep / 2;
        const y = getY(t.buyPrice);

        ctx.fillStyle = '#26a69a';
        ctx.beginPath();
        ctx.moveTo(x, y + 8);
        ctx.lineTo(x - 4, y + 15);
        ctx.lineTo(x + 4, y + 15);
        ctx.closePath();
        ctx.fill();
      }

      const closeIdx = displayedCandles.findIndex(c => Math.abs(c.time - Math.floor(t.closeTime / 1000)) < 90);
      if (closeIdx !== -1) {
        const x = closeIdx * candleStep + candleStep / 2;
        const y = getY(t.sellPrice);

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(x, y - 8);
        ctx.lineTo(x - 4, y - 15);
        ctx.lineTo(x + 4, y - 15);
        ctx.closePath();
        ctx.fill();
      }
    });

    // 5. OPERATIVAS ABIERTAS (Líneas Clásicas de MT5 con PnL Flotante)
    openPositions.forEach(p => {
      const entryY = getY(p.buyPrice);
      const tpY = getY(p.targetSellPrice);

      // --- Línea de Entrada BUY (Verde Punteada) ---
      ctx.save();
      ctx.strokeStyle = '#26a69a';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(0, entryY);
      ctx.lineTo(chartWidth, entryY);
      ctx.stroke();
      ctx.restore();

      // Badge MT5: buy 0.00021 $65210
      ctx.fillStyle = '#064e3b';
      ctx.fillRect(2, entryY - 9, 140, 16);
      ctx.strokeStyle = '#26a69a';
      ctx.lineWidth = 1;
      ctx.strokeRect(2, entryY - 9, 140, 16);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px "Roboto Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${p.id} buy ${p.amountBtc} @ ${p.buyPrice.toFixed(0)}`, 5, entryY + 3);

      // --- Línea de Take Profit (Dorada / Roja Punteada) ---
      ctx.save();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(0, tpY);
      ctx.lineTo(chartWidth, tpY);
      ctx.stroke();
      ctx.restore();

      // Badge MT5: t/p $66250
      ctx.fillStyle = '#78350f';
      ctx.fillRect(2, tpY - 9, 110, 16);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.strokeRect(2, tpY - 9, 110, 16);
      ctx.fillStyle = '#fef3c7';
      ctx.font = 'bold 9px "Roboto Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`t/p ${p.targetSellPrice.toFixed(0)}`, 5, tpY + 3);

      // Etiqueta PnL Flotante a la derecha
      const isProfitable = p.unrealizedPnlUsd >= 0;
      const pnlColor = isProfitable ? '#26a69a' : '#f97316';
      const sign = isProfitable ? '+' : '';
      const pnlStr = `${sign}$${p.unrealizedPnlUsd.toFixed(2)} (${sign}${p.unrealizedPnlPercent.toFixed(1)}%)`;

      ctx.fillStyle = '#1e2638';
      ctx.fillRect(chartWidth - 130, entryY - 9, 125, 16);
      ctx.strokeStyle = pnlColor;
      ctx.strokeRect(chartWidth - 130, entryY - 9, 125, 16);
      ctx.fillStyle = pnlColor;
      ctx.font = 'bold 9px "Roboto Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(pnlStr, chartWidth - 67, entryY + 3);
    });

    // 6. LÍNEA BID / ASK ACTUAL (MT5 Style)
    if (currentPrice > 0) {
      const curY = getY(currentPrice);
      ctx.save();
      ctx.strokeStyle = '#ef5350'; // Línea Ask roja
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(0, curY);
      ctx.lineTo(chartWidth, curY);
      ctx.stroke();
      ctx.restore();

      // Etiqueta en el eje derecho
      ctx.fillStyle = '#ef5350';
      ctx.fillRect(chartWidth, curY - 9, rightMargin, 18);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px "Roboto Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(currentPrice.toFixed(1), chartWidth + 4, curY + 4);
    }

    // 7. CROSSHAIR (Si está activo o con mouse)
    if ((crosshairActive || mousePos) && mousePos && mousePos.x < chartWidth && mousePos.y < chartHeight) {
      ctx.save();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(mousePos.x, 0);
      ctx.lineTo(mousePos.x, chartHeight);
      ctx.moveTo(0, mousePos.y);
      ctx.lineTo(chartWidth, mousePos.y);
      ctx.stroke();

      // Etiqueta de precio en el crosshair
      const chPrice = maxPrice - (mousePos.y / chartHeight) * priceRange;
      ctx.fillStyle = '#334155';
      ctx.fillRect(chartWidth, mousePos.y - 9, rightMargin, 18);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px "Roboto Mono", monospace';
      ctx.fillText(chPrice.toFixed(1), chartWidth + 4, mousePos.y + 4);
      ctx.restore();
    }
  }, [candles, currentPrice, openPositions, closedTrades, visibleCount, panOffset, showIndicators, crosshairActive, mousePos]);

  // Manejo de eventos táctiles para Pan en teléfono
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setDragStartX(e.touches[0].clientX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStartX !== null && e.touches.length === 1) {
      const deltaX = e.touches[0].clientX - dragStartX;
      if (Math.abs(deltaX) > 8) {
        const step = Math.round(deltaX / 12);
        setPanOffset(prev => Math.max(0, Math.min(candles.length - visibleCount, prev + step)));
        setDragStartX(e.touches[0].clientX);
      }
    }
  };

  const handleTouchEnd = () => setDragStartX(null);

  return (
    <div className="bg-[#131722] border border-[#1e2638] rounded-xl overflow-hidden shadow-2xl flex flex-col">
      {/* Barra de Herramientas Superior Estilo MT5 Mobile */}
      <div className="bg-[#181c27] px-3 py-2 border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Símbolo y Temporalidades MT5 */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          <span className="font-bold text-white font-mono tracking-tight text-sm">
            {symbol}
          </span>

          <div className="flex items-center space-x-0.5 bg-[#0e121a] p-0.5 rounded-lg border border-[#1e2638]">
            {timeframes.map(tf => (
              <button
                key={tf}
                onClick={() => onTimeframeChange?.(tf)}
                className={`px-2 py-0.5 rounded font-mono text-[11px] font-semibold transition-all ${
                  selectedTimeframe === tf
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Panel Rápido de Cotizaciones BID / ASK MT5 */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-[#0b0e14] rounded-lg border border-[#1e2638] overflow-hidden text-[11px] font-mono">
            <div className="px-2 py-1 bg-rose-950/40 text-rose-400 border-r border-[#1e2638]">
              <span className="text-[9px] text-gray-500 block">SELL</span>
              <strong>${(currentPrice * 0.9999).toFixed(1)}</strong>
            </div>
            <div className="px-2 py-1 bg-blue-950/40 text-sky-400">
              <span className="text-[9px] text-gray-500 block">BUY</span>
              <strong>${currentPrice.toFixed(1)}</strong>
            </div>
          </div>

          {/* Botón de Orden Rápida estilo MT5 */}
          <button
            onClick={onQuickBuy}
            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs flex items-center space-x-1 transition-colors shadow-sm"
            title="Nueva orden manual en spot"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nueva Orden</span>
          </button>

          {/* Herramientas MT5 (Crosshair, Indicadores, Zoom) */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCrosshairActive(!crosshairActive)}
              className={`p-1.5 rounded-lg border transition-colors ${
                crosshairActive ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-[#1e2638] border-transparent text-gray-400 hover:text-white'
              }`}
              title="Mira de cruz MT5 (Crosshair)"
            >
              <Crosshair className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowIndicators(!showIndicators)}
              className={`p-1.5 rounded-lg border transition-colors ${
                showIndicators ? 'bg-sky-500/20 border-sky-500 text-sky-300' : 'bg-[#1e2638] border-transparent text-gray-400 hover:text-white'
              }`}
              title="Indicadores (f)"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomIn}
              className="p-1.5 bg-[#1e2638] hover:bg-[#2a344d] text-gray-300 rounded-lg transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1.5 bg-[#1e2638] hover:bg-[#2a344d] text-gray-300 rounded-lg transition-colors"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Canvas del Gráfico (Optimizado para móvil con gestos táctiles) */}
      <div ref={containerRef} className="relative w-full h-[380px] sm:h-[460px] bg-[#131722]">
        <canvas
          ref={canvasRef}
          onMouseMove={(e) => {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (!rect) return;
            setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          }}
          onMouseLeave={() => setMousePos(null)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="w-full h-full cursor-crosshair block select-none touch-none"
        />
      </div>

      {/* Barra Inferior del Gráfico con resumen MT5 */}
      <div className="bg-[#181c27] px-3 py-1.5 border-t border-[#1e2638] flex items-center justify-between text-[11px] font-mono text-gray-400">
        <div className="flex items-center space-x-3">
          <span>Posiciones: <strong className="text-white">{openPositions.length}</strong></span>
          <span>•</span>
          <span>TP Esperado: <strong className="text-amber-400">{openPositions.length > 0 ? `$${openPositions[0].targetSellPrice.toFixed(0)}` : '---'}</strong></span>
        </div>
        <div className="text-gray-500 hidden sm:block">
          Binance Spot Direct Feed • Cuadrícula MT5
        </div>
      </div>
    </div>
  );
};
