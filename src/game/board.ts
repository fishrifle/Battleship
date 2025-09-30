import { Board, Coordinate, Ship, CellState } from '../models/types';
import { ShipDefinition, BOARD_SIZE, getFleetForCountry } from '../config/ships';

export { BOARD_SIZE };

export function createEmptyBoard(): Board {
  const cells: CellState[][] = [];
  for (let i = 0; i < BOARD_SIZE; i++) {
    cells[i] = [];
    for (let j = 0; j < BOARD_SIZE; j++) {
      cells[i][j] = 'empty';
    }
  }
  return { cells, ships: [] };
}

export function isValidCoordinate(coord: Coordinate): boolean {
  return coord.x >= 0 && coord.x < BOARD_SIZE && coord.y >= 0 && coord.y < BOARD_SIZE;
}

export function canPlaceShip(
  board: Board,
  startCoord: Coordinate,
  length: number,
  isHorizontal: boolean
): boolean {
  const coords = getShipCoordinates(startCoord, length, isHorizontal);

  // Check all coords are valid and empty
  for (const coord of coords) {
    if (!isValidCoordinate(coord)) return false;
    if (board.cells[coord.y][coord.x] === 'ship') return false;
  }

  return true;
}

export function getShipCoordinates(
  startCoord: Coordinate,
  length: number,
  isHorizontal: boolean
): Coordinate[] {
  const coords: Coordinate[] = [];
  for (let i = 0; i < length; i++) {
    coords.push({
      x: isHorizontal ? startCoord.x + i : startCoord.x,
      y: isHorizontal ? startCoord.y : startCoord.y + i
    });
  }
  return coords;
}

export function placeShip(
  board: Board,
  shipDef: ShipDefinition,
  startCoord: Coordinate,
  isHorizontal: boolean
): Ship | null {
  if (!canPlaceShip(board, startCoord, shipDef.length, isHorizontal)) {
    return null;
  }

  const coords = getShipCoordinates(startCoord, shipDef.length, isHorizontal);
  const ship: Ship = {
    id: `ship_${Date.now()}_${Math.random()}`,
    name: shipDef.name,
    length: shipDef.length,
    coords,
    hits: 0
  };

  // Mark cells as ship
  for (const coord of coords) {
    board.cells[coord.y][coord.x] = 'ship';
  }

  board.ships.push(ship);
  return ship;
}

export function autoPlaceFleet(board: Board, countryCode: string): void {
  const fleet = getFleetForCountry(countryCode);

  for (const shipDef of fleet) {
    let placed = false;
    let attempts = 0;
    const maxAttempts = 100;

    while (!placed && attempts < maxAttempts) {
      const isHorizontal = Math.random() < 0.5;
      const startCoord: Coordinate = {
        x: Math.floor(Math.random() * BOARD_SIZE),
        y: Math.floor(Math.random() * BOARD_SIZE)
      };

      const ship = placeShip(board, shipDef, startCoord, isHorizontal);
      if (ship) {
        placed = true;
      }
      attempts++;
    }

    if (!placed) {
      throw new Error(`Failed to place ship: ${shipDef.name}`);
    }
  }
}

export function processShot(board: Board, coord: Coordinate): { hit: boolean; sunkShip?: Ship } {
  if (!isValidCoordinate(coord)) {
    throw new Error('Invalid coordinate');
  }

  const cell = board.cells[coord.y][coord.x];

  if (cell === 'hit' || cell === 'miss') {
    throw new Error('Cell already targeted');
  }

  if (cell === 'ship') {
    board.cells[coord.y][coord.x] = 'hit';

    // Find the ship and increment hits
    const ship = board.ships.find(s =>
      s.coords.some(c => c.x === coord.x && c.y === coord.y)
    );

    if (ship) {
      ship.hits++;
      if (ship.hits === ship.length) {
        return { hit: true, sunkShip: ship };
      }
    }

    return { hit: true };
  }

  board.cells[coord.y][coord.x] = 'miss';
  return { hit: false };
}

export function areAllShipsSunk(board: Board): boolean {
  return board.ships.every(ship => ship.hits === ship.length);
}

export function getClientBoard(board: Board, revealShips: boolean): CellState[][] {
  const clientBoard: CellState[][] = [];

  for (let y = 0; y < BOARD_SIZE; y++) {
    clientBoard[y] = [];
    for (let x = 0; x < BOARD_SIZE; x++) {
      const cell = board.cells[y][x];
      if (revealShips || cell === 'hit' || cell === 'miss') {
        clientBoard[y][x] = cell;
      } else {
        clientBoard[y][x] = 'empty';
      }
    }
  }

  return clientBoard;
}