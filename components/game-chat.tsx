'use client';

import { useRef, useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send } from 'lucide-react';

interface Message {
  id: string;
  playerName: string;
  text: string;
  isCorrect?: boolean;
  timestamp: number;
}

interface GameChatProps {
  socket: Socket | null;
  playerName: string;
  isDrawer: boolean;
  isDrawing: boolean;
}

export function GameChat({ socket, playerName, isDrawer, isDrawing }: GameChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('message', (data: { playerName: string; text: string; isCorrect?: boolean }) => {
      const message: Message = {
        id: `${Date.now()}-${Math.random()}`,
        playerName: data.playerName,
        text: data.text,
        isCorrect: data.isCorrect,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socket.off('message');
    };
  }, [socket]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputValue.trim() || !socket || isLoading) return;

    setIsLoading(true);
    socket.emit('message', { text: inputValue });
    setInputValue('');
    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background rounded-lg border border-border">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-foreground">Chat</h3>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>No messages yet. {!isDrawer && !isDrawing ? 'Waiting for game to start...' : 'Make your guesses!'}</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-2 rounded text-sm ${
                  msg.isCorrect
                    ? 'bg-green-100 text-green-900 border border-green-300'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <span className="font-semibold text-foreground">{msg.playerName}:</span>{' '}
                <span>{msg.text}</span>
                {msg.isCorrect && <span className="ml-2 font-bold">✓ CORRECT!</span>}
              </div>
            ))
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {!isDrawer && isDrawing && (
        <div className="p-4 border-t border-border gap-2 flex">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Make a guess..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim()}
            size="sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      )}

      {isDrawer && isDrawing && (
        <div className="p-4 border-t border-border text-center">
          <p className="text-sm text-muted-foreground">You are the drawer. Draw to give hints!</p>
        </div>
      )}

      {!isDrawing && (
        <div className="p-4 border-t border-border text-center">
          <p className="text-sm text-muted-foreground">Round in progress...</p>
        </div>
      )}
    </div>
  );
}
