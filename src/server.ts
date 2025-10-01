import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import path from 'path';
import { GameManager } from './game/gameManager';
import { CPUPlayer } from './game/cpuAI';
import { Matchmaking } from './game/matchmaking';
import { AuthService } from './auth/authService';
import { Coordinate } from './models/types';
import { getClientBoard } from './game/board';
import { CPU_TURN_DELAY } from './config/ships';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

app.use(express.json());

const gameManager = new GameManager();
const matchmaking = new Matchmaking(gameManager);
const authService = new AuthService();
const cpuPlayers = new Map<string, CPUPlayer>();

// Track socket -> userId mapping
const socketToUser = new Map<string, string>();
const userToSocket = new Map<string, string>();
const socketToGame = new Map<string, string>();

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

io.on('connection', (socket: Socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Register / Login
  socket.on('register', async (data: { username: string; password: string }) => {
    const result = await authService.register(data.username, data.password);

    if (result.success && result.user) {
      socketToUser.set(socket.id, result.user.id);
      userToSocket.set(result.user.id, socket.id);
    }

    socket.emit('authResponse', result);
  });

  socket.on('login', async (data: { username: string; password: string }) => {
    const result = await authService.login(data.username, data.password);

    if (result.success && result.user) {
      socketToUser.set(socket.id, result.user.id);
      userToSocket.set(result.user.id, socket.id);
    }

    socket.emit('authResponse', result);
  });

  // Verify token on reconnect
  socket.on('verifyToken', (data: { token: string }) => {
    const decoded = authService.verifyToken(data.token);

    if (decoded) {
      const user = authService.getUser(decoded.userId);
      if (user) {
        socketToUser.set(socket.id, user.id);
        userToSocket.set(user.id, socket.id);

        socket.emit('authResponse', {
          success: true,
          token: data.token,
          user: {
            id: user.id,
            username: user.username,
            wins: user.wins,
            losses: user.losses,
            gamesPlayed: user.gamesPlayed
          }
        });
        return;
      }
    }

    socket.emit('authResponse', { success: false, message: 'Invalid token' });
  });

  // Join matchmaking queue
  socket.on('joinQueue', (data: { country: string }) => {
    const userId = socketToUser.get(socket.id);
    if (!userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const user = authService.getUser(userId);
    if (!user) {
      socket.emit('error', { message: 'User not found' });
      return;
    }

    matchmaking.addToQueue(userId, socket.id, user.username, data.country);
    socket.emit('queueJoined', { queueSize: matchmaking.getQueueSize() });

    // Try to make a match
    tryMatchmaking();
  });

  // Leave matchmaking queue
  socket.on('leaveQueue', () => {
    const userId = socketToUser.get(socket.id);
    if (userId) {
      matchmaking.removeFromQueue(userId);
      socket.emit('queueLeft');
    }
  });

  // Add CPU to current game
  socket.on('addCPU', (data: { country: string }) => {
    const gameId = socketToGame.get(socket.id);
    if (!gameId) {
      socket.emit('error', { message: 'Not in a game' });
      return;
    }

    const game = gameManager.getGame(gameId);
    if (!game || game.status !== 'waiting') {
      socket.emit('error', { message: 'Cannot add CPU at this time' });
      return;
    }

    const cpuId = `cpu_${Date.now()}_${Math.random()}`;
    const cpuName = `CPU-${Math.floor(Math.random() * 1000)}`;

    const player = gameManager.addPlayer(gameId, cpuId, cpuName, data.country, true);

    if (player) {
      cpuPlayers.set(cpuId, new CPUPlayer());
      gameManager.setPlayerReady(gameId, cpuId, true);

      // Notify all players in the game
      notifyGamePlayers(gameId, 'gameUpdate', {
        players: game.players.map(p => ({
          id: p.id,
          name: p.name,
          country: p.country,
          isBot: p.isBot,
          ready: p.ready
        }))
      });
    }
  });

  // Request placement screen
  socket.on('requestPlacement', () => {
    const gameId = socketToGame.get(socket.id);
    if (!gameId) return;

    const game = gameManager.getGame(gameId);
    if (!game) return;

    const player = game.players.find(p => p.id === socket.id);
    if (!player) return;

    // Send fleet configuration to player for placement
    const { getFleetForCountry } = require('./config/ships');
    const fleet = getFleetForCountry(player.country);
    socket.emit('requestFleet', { fleet });
  });

  // Receive ships from player
  socket.on('setShips', (data: { ships: any[] }) => {
    const gameId = socketToGame.get(socket.id);
    if (!gameId) return;

    const game = gameManager.getGame(gameId);
    if (!game) return;

    const player = game.players.find(p => p.id === socket.id);
    if (!player) return;

    // Validate and place ships
    try {
      gameManager.setPlayerShips(gameId, socket.id, data.ships);
      gameManager.setPlayerReady(gameId, socket.id, true);

      socket.emit('shipsAccepted');

      // Notify all players
      notifyGamePlayers(gameId, 'gameUpdate', {
        players: game.players.map(p => ({
          id: p.id,
          name: p.name,
          country: p.country,
          isBot: p.isBot,
          ready: p.ready
        }))
      });

      // Auto-start if all ready
      if (gameManager.canStartGame(gameId)) {
        setTimeout(() => {
          if (gameManager.startGame(gameId)) {
            startGame(gameId);
          }
        }, 1000);
      }
    } catch (error) {
      socket.emit('error', { message: 'Invalid ship placement' });
    }
  });

  // Fire shot
  socket.on('fireShot', (data: { targetId: string; coord: Coordinate }) => {
    const gameId = socketToGame.get(socket.id);
    if (!gameId) return;

    const result = gameManager.executeShot(gameId, socket.id, data.targetId, data.coord);

    if (result) {
      notifyGamePlayers(gameId, 'shotResult', {
        shooterId: socket.id,
        targetId: data.targetId,
        coord: data.coord,
        result
      });

      sendGameState(gameId);

      const game = gameManager.getGame(gameId);
      if (game && game.status === 'finished') {
        handleGameEnd(gameId);
      } else if (game) {
        processCPUTurns(gameId);
      }
    } else {
      socket.emit('error', { message: 'Invalid shot' });
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);

    const userId = socketToUser.get(socket.id);
    if (userId) {
      matchmaking.removeFromQueue(userId);
      socketToUser.delete(socket.id);
      userToSocket.delete(userId);
    }

    matchmaking.removeBySocketId(socket.id);
    socketToGame.delete(socket.id);
  });
});

function tryMatchmaking(): void {
  const match = matchmaking.tryMatch();

  if (match) {
    const { gameId, players, cpuPlayers: botPlayers } = match;

    // Register CPU AI instances
    if (botPlayers) {
      for (const cpu of botPlayers) {
        cpuPlayers.set(cpu.id, new CPUPlayer());
      }
    }

    // Assign players to game
    for (const player of players) {
      socketToGame.set(player.socketId, gameId);
      io.to(player.socketId).emit('matchFound', {
        gameId,
        players: players.map(p => ({
          username: p.username,
          country: p.country
        }))
      });
    }

    const game = gameManager.getGame(gameId);
    if (game) {
      notifyGamePlayers(gameId, 'gameUpdate', {
        players: game.players.map(p => ({
          id: p.id,
          name: p.name,
          country: p.country,
          isBot: p.isBot,
          ready: p.ready
        }))
      });
    }
  }
}

function startGame(gameId: string): void {
  const game = gameManager.getGame(gameId);
  if (!game) return;

  notifyGamePlayers(gameId, 'gameStarted', {
    currentPlayerId: game.players[game.currentPlayerIndex].id
  });

  sendGameState(gameId);
  processCPUTurns(gameId);
}

function sendGameState(gameId: string): void {
  const game = gameManager.getGame(gameId);
  if (!game) return;

  for (const player of game.players) {
    const gameState = {
      gameId,
      currentPlayerId: game.players[game.currentPlayerIndex].id,
      status: game.status,
      players: game.players.map(p => ({
        id: p.id,
        name: p.name,
        country: p.country,
        isBot: p.isBot,
        isAlive: p.isAlive,
        board: getClientBoard(p.board, p.id === player.id)
      }))
    };

    io.to(player.id).emit('gameState', gameState);
  }
}

function processCPUTurns(gameId: string): void {
  const game = gameManager.getGame(gameId);
  if (!game || game.status !== 'active') return;

  const currentPlayer = game.players[game.currentPlayerIndex];

  if (currentPlayer && currentPlayer.isBot) {
    setTimeout(() => {
      executeCPUTurn(gameId);
    }, CPU_TURN_DELAY);
  }
}

function executeCPUTurn(gameId: string): void {
  const game = gameManager.getGame(gameId);
  if (!game || game.status !== 'active') return;

  const currentPlayer = game.players[game.currentPlayerIndex];
  if (!currentPlayer || !currentPlayer.isBot) return;

  const cpuAI = cpuPlayers.get(currentPlayer.id);
  if (!cpuAI) return;

  const targets = game.players.filter(p => p.id !== currentPlayer.id);
  const decision = cpuAI.selectTarget(targets, currentPlayer.id);

  if (!decision) return;

  const result = gameManager.executeShot(gameId, currentPlayer.id, decision.targetId, decision.coord);

  if (result) {
    cpuAI.recordShot(decision.targetId, decision.coord, result.hit, result.sunk);

    notifyGamePlayers(gameId, 'shotResult', {
      shooterId: currentPlayer.id,
      targetId: decision.targetId,
      coord: decision.coord,
      result
    });

    sendGameState(gameId);

    const updatedGame = gameManager.getGame(gameId);
    if (updatedGame && updatedGame.status === 'finished') {
      handleGameEnd(gameId);
    } else {
      processCPUTurns(gameId);
    }
  }
}

function handleGameEnd(gameId: string): void {
  const game = gameManager.getGame(gameId);
  if (!game) return;

  // Update user stats
  for (const player of game.players) {
    if (!player.isBot) {
      const userId = socketToUser.get(player.id);
      if (userId) {
        const won = game.winnerId === player.id;
        authService.updateStats(userId, won);
      }
    }
  }

  notifyGamePlayers(gameId, 'gameFinished', {
    winnerId: game.winnerId,
    players: game.players.map(p => ({
      id: p.id,
      name: p.name,
      shotsTaken: p.shotsTaken,
      shotsHit: p.shotsHit,
      accuracy: p.shotsTaken > 0 ? ((p.shotsHit / p.shotsTaken) * 100).toFixed(1) : '0.0'
    }))
  });

  // Clean up
  setTimeout(() => {
    for (const player of game.players) {
      socketToGame.delete(player.id);
    }
    gameManager.deleteGame(gameId);
  }, 30000); // 30 seconds before cleanup
}

function notifyGamePlayers(gameId: string, event: string, data: any): void {
  const game = gameManager.getGame(gameId);
  if (!game) return;

  for (const player of game.players) {
    io.to(player.id).emit(event, data);
  }
}

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});