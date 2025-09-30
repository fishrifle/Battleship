# ⚓ Modern Battleship

A multiplayer Battleship game supporting 1–4 players with PvP or CPU opponents. Built with Node.js, TypeScript, Express, and Socket.IO.

## Features

- **Multiplayer Support**: 1–4 players in a room
- **CPU Opponents**: Add computer players with hunt-then-target AI
- **Modern Vessels**: Country-specific ship names (US, UK, JP, CN, RU)
- **Real-time Gameplay**: Socket.IO for instant updates
- **Mobile-Friendly**: Responsive grid with touch support (36px+ targets)
- **Game Statistics**: Track hits, misses, and accuracy

## Game Rules

- **Board**: 10×10 grid
- **Fleet**: 5 ships with lengths 5, 4, 3, 3, 2 (names vary by country)
- **Turns**: Round-robin; one shot per turn
- **Win Condition**: Last player standing with ships remaining
- **Cell States**: Empty, Ship, Hit, Miss

## Installation

### Prerequisites

- Node.js 16+ and npm

### Setup

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start the server
npm start
```

The server will start on `http://localhost:3000`

## Development Mode

```bash
# Run with auto-reload (requires ts-node)
npm run dev
```

## Running Tests

```bash
# Run all tests
npm test
```

## How to Play

### 1. Create or Join a Room

1. Enter your name
2. Select your country (determines your fleet's ship names)
3. Click **Create Room** to host a new game
   - Or click **Join Room** and enter a room code

### 2. Lobby

- Wait for players (minimum 2, maximum 4)
- Click **Add CPU Player** to fill empty slots
- Click **Ready** when ready to start
- Game starts automatically when all players are ready

### 3. Gameplay

- **Your Turn**: Click on opponent's grid to fire
- **Hit**: Red cell with 💥
- **Miss**: Blue cell with ○
- **Sunk Ship**: Notification when all cells hit
- **Elimination**: Player eliminated when all ships sunk
- **Winner**: Last player alive wins

### 4. Game Over

- View statistics: shots taken, hits, accuracy
- Winner displayed with 👑

## Project Structure

```
battleship/
├── src/
│   ├── config/
│   │   └── ships.ts           # Ship definitions and constants
│   ├── models/
│   │   └── types.ts           # TypeScript interfaces
│   ├── game/
│   │   ├── board.ts           # Board logic (placement, validation)
│   │   ├── board.test.ts      # Board tests
│   │   ├── gameManager.ts     # Game state management
│   │   ├── gameManager.test.ts # Game manager tests
│   │   └── cpuAI.ts           # CPU opponent AI
│   └── server.ts              # Express + Socket.IO server
├── public/
│   ├── index.html             # Frontend UI
│   ├── style.css              # Responsive styling
│   └── client.js              # Socket.IO client
├── package.json
├── tsconfig.json
└── README.md
```

## Ship Definitions by Country

### United States (US)
- Gerald R. Ford-class Carrier (5)
- Arleigh Burke-class Destroyer (4)
- Independence-class Frigate (3)
- Virginia-class Submarine (3)
- Cyclone-class Patrol Boat (2)

### United Kingdom (UK)
- Queen Elizabeth-class Carrier (5)
- Type 45 Destroyer (4)
- Type 26 Frigate (3)
- Astute-class Submarine (3)
- Archer-class Patrol Boat (2)

### Japan (JP)
- Izumo-class Carrier (5)
- Maya-class Destroyer (4)
- Mogami-class Frigate (3)
- Sōryū-class Submarine (3)
- Hayabusa-class Patrol Boat (2)

### China (CN)
- Fujian-class Carrier (5)
- Type 055 Destroyer (4)
- Type 054A Frigate (3)
- Type 093 Submarine (3)
- Type 022 Patrol Boat (2)

### Russia (RU)
- Admiral Kuznetsov Carrier (5)
- Sovremenny-class Destroyer (4)
- Admiral Gorshkov-class Frigate (3)
- Yasen-class Submarine (3)
- Buyan-class Patrol Boat (2)

## CPU AI Strategy

The CPU opponent uses a two-mode strategy:

1. **Random Mode**: Checkerboard-pattern firing for coverage
2. **Hunt Mode**: After a hit, targets adjacent cells
   - Detects ship orientation after second hit
   - Focuses fire along detected axis

## Configuration

Edit `src/config/ships.ts` to:

- Change `BOARD_SIZE` (default: 10)
- Adjust `MAX_PLAYERS` (default: 4)
- Modify `CPU_TURN_DELAY` (default: 700ms)
- Add new countries or ship configurations

## Future Enhancements (Stretch Goals)

- Manual ship placement with drag-and-drop
- Ship rotation UI
- Spectator mode
- ELO ranking system
- Persistent stats with database
- Sound effects and animations
- Multiple game modes (salvo, rapid-fire)

## Deployment

### Environment Variables

```bash
PORT=3000  # Default port
```

### Production Build

```bash
npm run build
npm start
```

### Deploy to Cloud

Compatible with:
- Heroku
- Render
- Railway
- DigitalOcean App Platform
- AWS/Azure/GCP

Ensure `PORT` environment variable is set.

## License

MIT

## Credits

Built with Node.js, TypeScript, Express, Socket.IO, and modern web technologies.

---

🎮 **Enjoy the game!** Feel free to open issues or contribute improvements.