const { Server } = require('socket.io');

const ROOM_CLEANUP_TIME = 5 * 60 * 1000; // 5 minutes
const ROUND_DURATION = 60000; // 60 seconds
const INTERMISSION_DURATION = 3000; // 3 seconds

const WORDS = [
  'apple', 'bicycle', 'cat', 'dog', 'elephant', 'fish', 'guitar', 'house',
  'ice cream', 'jellyfish', 'kite', 'lighthouse', 'mountain', 'nose', 'octopus',
  'penguin', 'queen', 'rocket', 'snake', 'tree', 'umbrella', 'violin', 'whale',
  'xylophone', 'yacht', 'zebra',
];

const rooms = new Map();
const roomTimers = new Map();

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getRandomWord() {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
}

function createRoom() {
  return {
    id: generateRoomCode(),
    players: new Map(),
    currentDrawerIndex: 0,
    secretWord: '',
    gameState: 'lobby',
    roundStartTime: 0,
    roundDuration: ROUND_DURATION,
    drawnStrokes: [],
  };
}

function getNextDrawer(room) {
  if (room.players.size === 0) return null;

  const playerArray = Array.from(room.players.values());
  let nextIndex = (room.currentDrawerIndex + 1) % playerArray.length;

  let attempts = 0;
  while (attempts < playerArray.length) {
    if (playerArray[nextIndex]) {
      room.currentDrawerIndex = nextIndex;
      return playerArray[nextIndex];
    }
    nextIndex = (nextIndex + 1) % playerArray.length;
    attempts++;
  }

  return null;
}

function broadcastRoomState(io, roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  const players = Array.from(room.players.values());
  io.to(roomId).emit('room-update', {
    players,
    gameState: room.gameState,
    currentDrawer: players.find((p) => p.isDrawer),
    roundTimeRemaining:
      room.roundStartTime > 0
        ? Math.max(0, room.roundDuration - (Date.now() - room.roundStartTime))
        : 0,
  });
}

function startRound(io, roomId) {
  const room = rooms.get(roomId);
  if (!room || room.players.size < 1) return;

  // Clear previous drawer status
  room.players.forEach((p) => {
    p.isDrawer = false;
  });

  // Set next drawer
  const drawer = getNextDrawer(room);
  if (!drawer) return;

  drawer.isDrawer = true;
  room.secretWord = getRandomWord();
  room.gameState = 'drawing';
  room.roundStartTime = Date.now();
  room.drawnStrokes = [];

  broadcastRoomState(io, roomId);
  io.to(roomId).emit('round-start', {
    drawerName: drawer.name,
  });

  // Send secret word only to drawer
  io.to(drawer.id).emit('secret-word', {
    word: room.secretWord,
  });

  // Set round timer
  const timer = setTimeout(() => {
    room.gameState = 'intermission';
    io.to(roomId).emit('round-end', {
      correctGuess: false,
      word: room.secretWord,
    });

    setTimeout(() => {
      startRound(io, roomId);
    }, INTERMISSION_DURATION);
  }, ROUND_DURATION);

  if (roomTimers.has(roomId)) {
    clearTimeout(roomTimers.get(roomId));
  }
  roomTimers.set(roomId, timer);
}

function cleanupRoom(io, roomId) {
  const timer = roomTimers.get(roomId);
  if (timer) {
    clearTimeout(timer);
    roomTimers.delete(roomId);
  }
  rooms.delete(roomId);
  io.to(roomId).emit('room-closed');
}

function initializeSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`[v0] Client connected: ${socket.id}`);

    // Create room
    socket.on('create-room', (data, callback) => {
      const room = createRoom();
      rooms.set(room.id, room);

      const player = {
        id: socket.id,
        name: data.playerName,
        score: 0,
        isDrawer: false,
      };

      room.players.set(socket.id, player);
      socket.join(room.id);
      socket.data.roomId = room.id;
      socket.data.playerId = socket.id;

      console.log(`[v0] Room created: ${room.id}`);
      callback({ roomId: room.id, success: true });
    });

    // Join room
    socket.on('join-room', (data, callback) => {
      const room = rooms.get(data.roomCode);

      if (!room) {
        callback({ success: false, error: 'Room not found' });
        return;
      }

      if (room.gameState !== 'lobby') {
        callback({ success: false, error: 'Game already in progress' });
        return;
      }

      const player = {
        id: socket.id,
        name: data.playerName,
        score: 0,
        isDrawer: false,
      };

      room.players.set(socket.id, player);
      socket.join(room.id);
      socket.data.roomId = room.id;
      socket.data.playerId = socket.id;

      console.log(`[v0] Player ${data.playerName} joined room ${data.roomCode}`);
      callback({ success: true, roomId: room.id });

      broadcastRoomState(io, room.id);
    });

    // Start game
    socket.on('start-game', () => {
      const roomId = socket.data.roomId;
      const room = rooms.get(roomId);

      if (!room || room.players.size < 1) return;

      startRound(io, roomId);
    });

    // Draw
    socket.on('draw', (data) => {
      const roomId = socket.data.roomId;
      const room = rooms.get(roomId);

      if (!room) return;

      room.drawnStrokes.push(data.stroke);
      io.to(roomId).emit('draw', data);
    });

    // Clear canvas
    socket.on('clear-canvas', () => {
      const roomId = socket.data.roomId;
      io.to(roomId).emit('clear-canvas');
    });

    // Chat message / Guess
    socket.on('message', (data) => {
      const roomId = socket.data.roomId;
      const room = rooms.get(roomId);
      const player = room?.players.get(socket.id);

      if (!room || !player) return;

      const isCorrectGuess =
        room.gameState === 'drawing' &&
        !player.isDrawer &&
        data.text.toLowerCase().trim() === room.secretWord.toLowerCase();

      if (isCorrectGuess) {
        // Award points
        player.score += 10;
        const drawer = Array.from(room.players.values()).find((p) => p.isDrawer);
        if (drawer) {
          drawer.score += 5;
        }

        // End round
        room.gameState = 'intermission';
        clearTimeout(roomTimers.get(roomId));

        io.to(roomId).emit('round-end', {
          correctGuess: true,
          guesser: player.name,
          word: room.secretWord,
        });

        broadcastRoomState(io, roomId);

        setTimeout(() => {
          startRound(io, roomId);
        }, INTERMISSION_DURATION);
      } else {
        // Broadcast chat message
        io.to(roomId).emit('message', {
          playerName: player.name,
          text: data.text,
          isCorrect: isCorrectGuess,
        });
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      const roomId = socket.data.roomId;
      const room = rooms.get(roomId);

      if (!room) return;

      room.players.delete(socket.id);
      console.log(`[v0] Player disconnected from room ${roomId}`);

      if (room.players.size === 0) {
        cleanupRoom(io, roomId);
      } else {
        broadcastRoomState(io, roomId);
      }
    });
  });

  // Cleanup idle rooms every 5 minutes
  setInterval(() => {
    rooms.forEach((room, roomId) => {
      if (room.players.size === 0) {
        cleanupRoom(io, roomId);
      }
    });
  }, ROOM_CLEANUP_TIME);

  return io;
}

module.exports = { initializeSocketServer };
