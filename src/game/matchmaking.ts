import { GameManager } from './gameManager';

interface QueuedPlayer {
  userId: string;
  socketId: string;
  username: string;
  country: string;
  joinedAt: number;
}

export class Matchmaking {
  private queue: QueuedPlayer[] = [];
  private gameManager: GameManager;

  constructor(gameManager: GameManager) {
    this.gameManager = gameManager;
  }

  addToQueue(userId: string, socketId: string, username: string, country: string): void {
    // Remove if already in queue
    this.removeFromQueue(userId);

    this.queue.push({
      userId,
      socketId,
      username,
      country,
      joinedAt: Date.now()
    });

    console.log(`${username} joined matchmaking queue (${this.queue.length} in queue)`);
  }

  removeFromQueue(userId: string): void {
    const index = this.queue.findIndex(p => p.userId === userId);
    if (index !== -1) {
      const removed = this.queue.splice(index, 1)[0];
      console.log(`${removed.username} left matchmaking queue`);
    }
  }

  removeBySocketId(socketId: string): void {
    const index = this.queue.findIndex(p => p.socketId === socketId);
    if (index !== -1) {
      const removed = this.queue.splice(index, 1)[0];
      console.log(`${removed.username} left matchmaking queue (disconnect)`);
    }
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Try to create a match with 2-4 players
   * Auto-fills with CPU bots if only 1 player waiting
   * Returns matched players if successful
   */
  tryMatch(): { gameId: string; players: QueuedPlayer[]; cpuPlayers?: Array<{ id: string; name: string; country: string }> } | null {
    if (this.queue.length < 1) {
      return null;
    }

    // If only 1 player, auto-fill with CPU bots
    if (this.queue.length === 1) {
      const matchedPlayers = this.queue.splice(0, 1);
      const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const game = this.gameManager.createGame(gameId);

      // Add the real player
      this.gameManager.addPlayer(gameId, matchedPlayers[0].socketId, matchedPlayers[0].username, matchedPlayers[0].country);
      this.gameManager.setPlayerReady(gameId, matchedPlayers[0].socketId, true);

      // Add CPU opponents (3 bots for 4-player game)
      const cpuPlayers: Array<{ id: string; name: string; country: string }> = [];
      const cpuCountries = ['UK', 'JP', 'CN'];

      for (let i = 0; i < 3; i++) {
        const cpuId = `cpu_${Date.now()}_${Math.random()}_${i}`;
        const cpuName = `AI-Commander-${Math.floor(Math.random() * 900) + 100}`;
        const cpuCountry = cpuCountries[i % cpuCountries.length];

        this.gameManager.addPlayer(gameId, cpuId, cpuName, cpuCountry, true);
        this.gameManager.setPlayerReady(gameId, cpuId, true);

        cpuPlayers.push({ id: cpuId, name: cpuName, country: cpuCountry });
      }

      console.log(`Match created: ${gameId} with 1 player + 3 CPU bots`);

      return {
        gameId,
        players: matchedPlayers,
        cpuPlayers
      };
    }

    // Match 2-4 players (prefer 4, but start games with 2 minimum)
    const matchSize = Math.min(4, this.queue.length);
    const matchedPlayers = this.queue.splice(0, matchSize);

    // Create game
    const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const game = this.gameManager.createGame(gameId);

    // Add all matched players to the game
    for (const player of matchedPlayers) {
      this.gameManager.addPlayer(gameId, player.socketId, player.username, player.country);
      this.gameManager.setPlayerReady(gameId, player.socketId, true);
    }

    console.log(`Match created: ${gameId} with ${matchedPlayers.length} players`);

    return {
      gameId,
      players: matchedPlayers
    };
  }

  getPlayerInQueue(userId: string): QueuedPlayer | undefined {
    return this.queue.find(p => p.userId === userId);
  }
}