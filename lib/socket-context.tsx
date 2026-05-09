'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface Player {
  id: string;
  name: string;
  score: number;
  isDrawer: boolean;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  roomId: string | null;
  playerName: string | null;
  players: Player[];
  gameState: 'lobby' | 'drawing' | 'intermission';
  currentDrawer: Player | undefined;
  secretWord: string | null;
  roundTimeRemaining: number;
  createRoom: (playerName: string) => Promise<string>;
  joinRoom: (roomCode: string, playerName: string) => Promise<void>;
  startGame: () => void;
  leaveRoom: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameState, setGameState] = useState<'lobby' | 'drawing' | 'intermission'>('lobby');
  const [currentDrawer, setCurrentDrawer] = useState<Player | undefined>();
  const [secretWord, setSecretWord] = useState<string | null>(null);
  const [roundTimeRemaining, setRoundTimeRemaining] = useState(0);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('[v0] Socket connected:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('[v0] Socket disconnected');
      setIsConnected(false);
      setRoomId(null);
    });

    newSocket.on('room-update', (data: any) => {
      console.log('[v0] Room update:', data);
      setPlayers(data.players);
      setGameState(data.gameState);
      setCurrentDrawer(data.currentDrawer);
      setRoundTimeRemaining(data.roundTimeRemaining);
    });

    newSocket.on('round-start', (data: any) => {
      console.log('[v0] Round started');
      setGameState('drawing');
      setRoundTimeRemaining(60000);
    });

    newSocket.on('round-end', (data: any) => {
      console.log('[v0] Round ended:', data);
      setGameState('intermission');
      setSecretWord(null);
    });

    newSocket.on('secret-word', (data: any) => {
      console.log('[v0] Secret word received');
      setSecretWord(data.word);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Update round timer
  useEffect(() => {
    if (gameState !== 'drawing' || roundTimeRemaining <= 0) return;

    const interval = setInterval(() => {
      setRoundTimeRemaining((prev) => Math.max(0, prev - 100));
    }, 100);

    return () => clearInterval(interval);
  }, [gameState, roundTimeRemaining]);

  const createRoom = (name: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!socket) {
        reject(new Error('Socket not initialized'));
        return;
      }

      setPlayerName(name);
      socket.emit('create-room', { playerName: name }, (response: any) => {
        if (response.success) {
          setRoomId(response.roomId);
          resolve(response.roomId);
        } else {
          reject(new Error(response.error || 'Failed to create room'));
        }
      });
    });
  };

  const joinRoom = (code: string, name: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!socket) {
        reject(new Error('Socket not initialized'));
        return;
      }

      setPlayerName(name);
      socket.emit('join-room', { roomCode: code, playerName: name }, (response: any) => {
        if (response.success) {
          setRoomId(response.roomId);
          resolve();
        } else {
          reject(new Error(response.error || 'Failed to join room'));
        }
      });
    });
  };

  const startGame = () => {
    if (!socket || !roomId) return;
    socket.emit('start-game');
  };

  const leaveRoom = () => {
    if (!socket) return;
    socket.disconnect();
    setRoomId(null);
    setPlayerName(null);
    setPlayers([]);
    setGameState('lobby');
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        roomId,
        playerName,
        players,
        gameState,
        currentDrawer,
        secretWord,
        roundTimeRemaining,
        createRoom,
        joinRoom,
        startGame,
        leaveRoom,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
}
