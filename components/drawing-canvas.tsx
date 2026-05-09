'use client';

import { useRef, useEffect, useState } from 'react';
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
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Set drawing context
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#000';

    setContext(ctx);
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('draw', (data: { stroke: any }) => {
      drawStroke(data.stroke);
    });

    socket.on('clear-canvas', () => {
      clearCanvas();
    });

    return () => {
      socket.off('draw');
      socket.off('clear-canvas');
    };
  }, [socket, context]);

  const drawStroke = (stroke: any) => {
    if (!context) return;

    context.beginPath();
    context.moveTo(stroke.startX, stroke.startY);
    context.lineTo(stroke.endX, stroke.endY);
    context.stroke();
  };

  const clearCanvas = () => {
    if (!context || !canvasRef.current) return;
    context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isDrawer || !isDrawing || !context) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    context.beginPath();
    context.moveTo(x, y);
    setIsMouseDown(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown || !isDrawer || !isDrawing || !context) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    context.lineTo(x, y);
    context.stroke();

    // Store stroke for last position
    const lastX = e.clientX - rect.left - 2;
    const lastY = e.clientY - rect.top - 2;

    const stroke = {
      startX: lastX,
      startY: lastY,
      endX: x,
      endY: y,
    };

    socket?.emit('draw', { stroke });
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
  };

  const handleClearCanvas = () => {
    clearCanvas();
    socket?.emit('clear-canvas');
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`border-2 border-gray-200 bg-white rounded-lg flex-1 cursor-crosshair ${
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
