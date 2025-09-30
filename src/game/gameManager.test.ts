import { GameManager } from './gameManager';

describe('GameManager', () => {
  let manager: GameManager;

  beforeEach(() => {
    manager = new GameManager();
  });

  describe('createGame', () => {
    it('should create a new game', () => {
      const game = manager.createGame('TEST123');

      expect(game.id).toBe('TEST123');
      expect(game.players.length).toBe(0);
      expect(game.status).toBe('waiting');
    });
  });

  describe('addPlayer', () => {
    it('should add a player to a game', () => {
      manager.createGame('ROOM1');
      const player = manager.addPlayer('ROOM1', 'player1', 'Alice', 'US');

      expect(player).not.toBeNull();
      expect(player!.name).toBe('Alice');
      expect(player!.country).toBe('US');
      expect(player!.isBot).toBe(false);
    });

    it('should not add more than 4 players', () => {
      manager.createGame('ROOM2');
      manager.addPlayer('ROOM2', 'p1', 'P1', 'US');
      manager.addPlayer('ROOM2', 'p2', 'P2', 'UK');
      manager.addPlayer('ROOM2', 'p3', 'P3', 'JP');
      manager.addPlayer('ROOM2', 'p4', 'P4', 'CN');

      const fifthPlayer = manager.addPlayer('ROOM2', 'p5', 'P5', 'RU');
      expect(fifthPlayer).toBeNull();
    });

    it('should not add duplicate player', () => {
      manager.createGame('ROOM3');
      manager.addPlayer('ROOM3', 'player1', 'Alice', 'US');

      const duplicate = manager.addPlayer('ROOM3', 'player1', 'Alice2', 'UK');
      expect(duplicate).toBeNull();
    });
  });

  describe('setPlayerReady', () => {
    it('should set player ready status', () => {
      manager.createGame('ROOM4');
      manager.addPlayer('ROOM4', 'player1', 'Alice', 'US');

      const result = manager.setPlayerReady('ROOM4', 'player1', true);
      expect(result).toBe(true);

      const game = manager.getGame('ROOM4');
      expect(game!.players[0].ready).toBe(true);
    });
  });

  describe('canStartGame', () => {
    it('should return false with less than 2 players', () => {
      manager.createGame('ROOM5');
      manager.addPlayer('ROOM5', 'player1', 'Alice', 'US');
      manager.setPlayerReady('ROOM5', 'player1', true);

      expect(manager.canStartGame('ROOM5')).toBe(false);
    });

    it('should return false if not all players are ready', () => {
      manager.createGame('ROOM6');
      manager.addPlayer('ROOM6', 'player1', 'Alice', 'US');
      manager.addPlayer('ROOM6', 'player2', 'Bob', 'UK');
      manager.setPlayerReady('ROOM6', 'player1', true);

      expect(manager.canStartGame('ROOM6')).toBe(false);
    });

    it('should return true when all players ready and count >= 2', () => {
      manager.createGame('ROOM7');
      manager.addPlayer('ROOM7', 'player1', 'Alice', 'US');
      manager.addPlayer('ROOM7', 'player2', 'Bob', 'UK');
      manager.setPlayerReady('ROOM7', 'player1', true);
      manager.setPlayerReady('ROOM7', 'player2', true);

      expect(manager.canStartGame('ROOM7')).toBe(true);
    });
  });

  describe('startGame', () => {
    it('should start game when conditions are met', () => {
      manager.createGame('ROOM8');
      manager.addPlayer('ROOM8', 'player1', 'Alice', 'US');
      manager.addPlayer('ROOM8', 'player2', 'Bob', 'UK');
      manager.setPlayerReady('ROOM8', 'player1', true);
      manager.setPlayerReady('ROOM8', 'player2', true);

      const result = manager.startGame('ROOM8');
      expect(result).toBe(true);

      const game = manager.getGame('ROOM8');
      expect(game!.status).toBe('active');
      expect(game!.players[0].board.ships.length).toBeGreaterThan(0);
    });
  });

  describe('executeShot', () => {
    it('should execute a valid shot', () => {
      manager.createGame('ROOM9');
      manager.addPlayer('ROOM9', 'player1', 'Alice', 'US');
      manager.addPlayer('ROOM9', 'player2', 'Bob', 'UK');
      manager.setPlayerReady('ROOM9', 'player1', true);
      manager.setPlayerReady('ROOM9', 'player2', true);
      manager.startGame('ROOM9');

      const result = manager.executeShot('ROOM9', 'player1', 'player2', { x: 0, y: 0 });

      expect(result).not.toBeNull();
      expect(typeof result!.hit).toBe('boolean');
    });

    it('should not allow shot when not current player turn', () => {
      manager.createGame('ROOM10');
      manager.addPlayer('ROOM10', 'player1', 'Alice', 'US');
      manager.addPlayer('ROOM10', 'player2', 'Bob', 'UK');
      manager.setPlayerReady('ROOM10', 'player1', true);
      manager.setPlayerReady('ROOM10', 'player2', true);
      manager.startGame('ROOM10');

      const result = manager.executeShot('ROOM10', 'player2', 'player1', { x: 0, y: 0 });
      expect(result).toBeNull();
    });

    it('should not allow shooting yourself', () => {
      manager.createGame('ROOM11');
      manager.addPlayer('ROOM11', 'player1', 'Alice', 'US');
      manager.addPlayer('ROOM11', 'player2', 'Bob', 'UK');
      manager.setPlayerReady('ROOM11', 'player1', true);
      manager.setPlayerReady('ROOM11', 'player2', true);
      manager.startGame('ROOM11');

      const result = manager.executeShot('ROOM11', 'player1', 'player1', { x: 0, y: 0 });
      expect(result).toBeNull();
    });
  });

  describe('removePlayer', () => {
    it('should remove a player from game', () => {
      manager.createGame('ROOM12');
      manager.addPlayer('ROOM12', 'player1', 'Alice', 'US');

      const result = manager.removePlayer('ROOM12', 'player1');
      expect(result).toBe(true);

      const game = manager.getGame('ROOM12');
      expect(game).toBeUndefined();
    });
  });
});