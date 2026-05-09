'use client';

import { useState } from 'react';
import { useSocket } from '@/lib/socket-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RoomSetupProps {
  onRoomJoined: () => void;
}

export function RoomSetup({ onRoomJoined }: RoomSetupProps) {
  const { createRoom, joinRoom } = useSocket();
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdRoomCode, setCreatedRoomCode] = useState('');

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const roomId = await createRoom(playerName);
      setCreatedRoomCode(roomId);
      onRoomJoined();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await joinRoom(roomCode.toUpperCase(), playerName);
      onRoomJoined();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-600 to-purple-600 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Draw & Guess</CardTitle>
          <p className="text-muted-foreground mt-2">Multiplayer Drawing Game</p>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4 mb-4">
            <Input
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="create">Create</TabsTrigger>
              <TabsTrigger value="join">Join</TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-4">
              <Button
                onClick={handleCreateRoom}
                disabled={isLoading || !playerName.trim()}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Room'
                )}
              </Button>

              {createdRoomCode && (
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg text-center">
                  <p className="text-sm text-green-700 mb-2">Room created!</p>
                  <p className="text-2xl font-bold text-green-900 tracking-widest">{createdRoomCode}</p>
                  <p className="text-xs text-green-600 mt-2">Share this code with friends</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="join" className="space-y-4">
              <Input
                placeholder="Enter room code"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                disabled={isLoading}
                maxLength={6}
              />
              <Button
                onClick={handleJoinRoom}
                disabled={isLoading || !playerName.trim() || !roomCode.trim()}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  'Join Room'
                )}
              </Button>
            </TabsContent>
          </Tabs>

          <p className="text-xs text-muted-foreground text-center mt-6">
            Play with friends in real-time. First to guess the word wins points!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
