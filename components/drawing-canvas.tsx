'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface DrawingCanvasProps {
  socket: Socket | null;
  isDrawer: boolean;
  isDrawing: boolean;
  onStrokeDrawn?: (stroke: any) => void;
}

export function DrawingCanvas({
  socket,
  isDrawer,
  isDrawing,
  onStrokeDrawn,
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const isMouseDown = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // ─── Canvas Init & Resize ────────────────────────────────────────────────────
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    // CSS display size
    const displayWidth = canvas.offsetWidth;
    const displayHeight = canvas.offsetHeight;

    // Backing store size (physical pixels)
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;

    // Reset transform before scaling to avoid compounding on resize
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    // Apply consistent style defaults
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#000';

    contextRef.current = ctx;
  }, []);

  useEffect(() => {
    initCanvas();

    // Re-init if the canvas container is resized (prevents coordinate drift)
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new ResizeObserver(() => {
      initCanvas();
    });
    observer.observe(canvas);

    return () => observer.disconnect();
  }, [initCanvas]);

  // ─── Socket Listeners ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    socket.on('draw', (data: { stroke: any }) => {
      drawRemoteStroke(data.stroke);
    });

    socket.on('clear-canvas', () => {
      clearCanvas();
    });

    return () => {
      socket.off('draw');
      socket.off('clear-canvas');
    };
  }, [socket]);

  // ─── Drawing Helpers ─────────────────────────────────────────────────────────

  /**
   * Draw a stroke received from the network.
   * Coordinates are always in CSS pixel space (same space as local drawing).
   * The DPR scale applied during initCanvas handles the HiDPI mapping automatically.
   */
  const drawRemoteStroke = (stroke: any) => {
    const ctx = contextRef.current;
    if (!ctx) return;

    // Re-apply style — remote strokes need the same settings as local ones
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#000';

    ctx.beginPath();
    ctx.moveTo(stroke.startX, stroke.startY);
    ctx.lineTo(stroke.endX, stroke.endY);
    ctx.stroke();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!ctx || !canvas) return;

    // Use CSS display dimensions (offsetWidth/Height), NOT canvas.width/height.
    // canvas.width is already multiplied by DPR; the context is pre-scaled,
    // so passing DPR-inflated values would clear outside the visible area.
    ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
  };

  // ─── Get CSS-space position from mouse/touch event ───────────────────────────
  const getPos = (
    e: React.MouseEvent | React.TouchEvent
  ): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const touch = e.touches[0];
      if (!touch) return null;
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }

    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    };
  };

  // ─── Mouse / Touch Handlers ──────────────────────────────────────────────────
  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawer || !isDrawing) return;
    const ctx = contextRef.current;
    if (!ctx) return;

    const pos = getPos(e);
    if (!pos) return;

    lastPos.current = pos;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    isMouseDown.current = true;
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isMouseDown.current || !isDrawer || !isDrawing) return;
    const ctx = contextRef.current;
    if (!ctx) return;

    const pos = getPos(e);
    if (!pos) return;

    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    const stroke = {
      startX: lastPos.current.x,
      startY: lastPos.current.y,
      endX: pos.x,
      endY: pos.y,
    };

    lastPos.current = pos;
    socket?.emit('draw', { stroke });
    onStrokeDrawn?.(stroke);
  };

  const handlePointerUp = () => {
    isMouseDown.current = false;
  };

  const handleClearCanvas = () => {
    clearCanvas();
    socket?.emit('clear-canvas');
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <canvas
        ref={canvasRef}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        className={`border-2 border-gray-200 bg-white rounded-lg flex-1 cursor-crosshair touch-none ${
          !isDrawer || !isDrawing ? 'pointer-events-none opacity-50' : ''
        }`}
      />
      {isDrawer && isDrawing && (
        <Button
          onClick={handleClearCanvas}
          variant="outline"
          size="sm"
          className="w-full"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Clear Canvas
        </Button>
      )}
    </div>
  );
}
