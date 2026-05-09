'use client';

import { useState } from 'react';
import { useSocket } from '@/lib/socket-context';
import { RoomSetup } from '@/components/room-setup';
import { GameView } from '@/components/game-view';

export default function Home() {
  const { roomId } = useSocket();
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);

  if (!roomId || !hasJoinedRoom) {
    return <RoomSetup onRoomJoined={() => setHasJoinedRoom(true)} />;
  }

  return <GameView />;
}
