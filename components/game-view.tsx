'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '@/lib/socket-context';
import { DrawingCanvas } from './drawing-canvas';
import { GameChat } from './game-chat';
import { Scoreboard } from './scoreboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Copy, LogOut } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function GameView() {
  const {
    socket,
    roomId,
    playerName,
    players,
    gameState,
    currentDrawer,
    secretWord,
    roundTimeRemaining,
    startGame,
    leaveRoom,
  } = useSocket();

  const [copied, setCopied] = useState(false);
  const currentPlayer = players.find((p) => p.name === playerName);
  const isDrawer = currentPlayer?.isDrawer || false;
  const isDrawing = gameState === 'drawing';

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleCopyCode = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      setCopied(true);
    }
  };

  const handleLeave = () => {
    leaveRoom();
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Draw & Guess</h1>
            {roomId && (
              <p className="text-sm text-muted-foreground mt-1">
                Room: <span className="font-mono font-bold text-foreground">{roomId}</span>
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {roomId && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyCode}
                className="gap-2"
              >
                <Copy className="w-4 h-4" />
                {copied ? 'Copied!' : 'Copy Code'}
              </Button>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={handleLeave}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              Leave
            </Button>
          </div>
        </div>

        {/* Game Area */}
        {gameState === 'lobby' && players.length > 0 && (
          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              Waiting for the host to start the game. Current players: {players.length}
            </AlertDescription>
          </Alert>
        )}

        {gameState === 'lobby' && currentPlayer && (
          <div className="mb-6">
            <Button
              onClick={startGame}
              size="lg"
              className="w-full md:w-auto"
              disabled={players.length < 1}
            >
              Start Game
            </Button>
          </div>
        )}

        {secretWord && isDrawer && (
          <Alert className="mb-6 bg-yellow-50 border-yellow-200">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800 font-mono text-lg">
              Draw this: <span className="font-bold uppercase">{secretWord}</span>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Canvas - Takes 3 columns */}
          <div className="lg:col-span-3">
            <Card className="h-full">
              <CardContent className="p-4 h-full">
                <DrawingCanvas
                  socket={socket}
                  isDrawer={isDrawer}
                  isDrawing={isDrawing}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar - Chat and Scoreboard */}
          <div className="flex flex-col gap-6">
            {/* Chat */}
            <Card className="flex-1 min-h-96">
              <CardContent className="p-0 h-full">
                <GameChat
                  socket={socket}
                  playerName={playerName || ''}
                  isDrawer={isDrawer}
                  isDrawing={isDrawing}
                />
              </CardContent>
            </Card>

            {/* Scoreboard */}
            <Card>
              <CardContent className="p-6">
                <Scoreboard
                  players={players}
                  currentDrawer={currentDrawer}
                  roundTimeRemaining={roundTimeRemaining}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Mobile View - Stack everything */}
        <div className="lg:hidden mt-6 space-y-6">
          <Card>
            <CardContent className="p-6">
              <Scoreboard
                players={players}
                currentDrawer={currentDrawer}
                roundTimeRemaining={roundTimeRemaining}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
