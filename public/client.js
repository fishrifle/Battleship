const socket = io();

let authToken = null;
let currentUser = null;
let currentGameId = null;
let gameState = null;
let isReady = false;

// DOM Elements
const screens = {
    auth: document.getElementById('auth'),
    matchmaking: document.getElementById('matchmaking'),
    preGame: document.getElementById('preGame'),
    shipPlacement: document.getElementById('shipPlacement'),
    game: document.getElementById('game'),
    gameOver: document.getElementById('gameOver')
};

// Auth elements
const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');
const registerUsername = document.getElementById('registerUsername');
const registerPassword = document.getElementById('registerPassword');
const registerPasswordConfirm = document.getElementById('registerPasswordConfirm');
const registerBtn = document.getElementById('registerBtn');
const registerError = document.getElementById('registerError');

// Matchmaking elements
const usernameDisplay = document.getElementById('usernameDisplay');
const winsDisplay = document.getElementById('winsDisplay');
const lossesDisplay = document.getElementById('lossesDisplay');
const gamesDisplay = document.getElementById('gamesDisplay');
const countrySelect = document.getElementById('countrySelect');
const findMatchBtn = document.getElementById('findMatchBtn');
const cancelQueueBtn = document.getElementById('cancelQueueBtn');
const logoutBtn = document.getElementById('logoutBtn');
const queueStatus = document.getElementById('queueStatus');
const queueSize = document.getElementById('queueSize');

// Pre-game elements
const matchPlayersList = document.getElementById('matchPlayersList');
const addCPUBtn = document.getElementById('addCPUBtn');
const readyBtn = document.getElementById('readyBtn');

// Game elements
const currentTurnText = document.getElementById('currentTurnText');
const turnIndicator = document.getElementById('turnIndicator');
const yourBoard = document.getElementById('yourBoard');
const opponentBoards = document.getElementById('opponentBoards');
const gameLog = document.getElementById('gameLog');

// Game over elements
const winnerText = document.getElementById('winnerText');
const statsBody = document.getElementById('statsBody');
const backToMenuBtn = document.getElementById('backToMenuBtn');

// Ship placement elements
const placementBoard = document.getElementById('placementBoard');
const currentShipName = document.getElementById('currentShipName');
const currentShipLength = document.getElementById('currentShipLength');
const rotateBtn = document.getElementById('rotateBtn');
const randomPlaceBtn = document.getElementById('randomPlaceBtn');
const clearBoardBtn = document.getElementById('clearBoardBtn');
const confirmPlacementBtn = document.getElementById('confirmPlacementBtn');
const shipsListContainer = document.getElementById('shipsListContainer');

// Ship placement state
let placementShips = [];
let currentShipIndex = 0;
let isHorizontal = true;
let placedShips = [];
let playerBoard = null;

// Initialize
checkStoredToken();

// Auth Tab Switching
loginTab.addEventListener('click', () => {
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
});

registerTab.addEventListener('click', () => {
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
});

// Auth Events
loginBtn.addEventListener('click', () => {
    const username = loginUsername.value.trim();
    const password = loginPassword.value;

    if (!username || !password) {
        showError(loginError, 'Please enter username and password');
        return;
    }

    socket.emit('login', { username, password });
});

registerBtn.addEventListener('click', () => {
    const username = registerUsername.value.trim();
    const password = registerPassword.value;
    const passwordConfirm = registerPasswordConfirm.value;

    if (!username || !password || !passwordConfirm) {
        showError(registerError, 'All fields are required');
        return;
    }

    if (password !== passwordConfirm) {
        showError(registerError, 'Passwords do not match');
        return;
    }

    socket.emit('register', { username, password });
});

// Matchmaking Events
findMatchBtn.addEventListener('click', () => {
    socket.emit('joinQueue', { country: countrySelect.value });
});

cancelQueueBtn.addEventListener('click', () => {
    socket.emit('leaveQueue');
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('battleship_token');
    location.reload();
});

addCPUBtn.addEventListener('click', () => {
    socket.emit('addCPU', { country: countrySelect.value });
});

readyBtn.addEventListener('click', () => {
    // Request fleet from server
    socket.emit('requestPlacement');
});

backToMenuBtn.addEventListener('click', () => {
    currentGameId = null;
    gameState = null;
    isReady = false;
    showScreen('matchmaking');
});

// Ship placement events
rotateBtn.addEventListener('click', () => {
    isHorizontal = !isHorizontal;
    updatePlacementPreview();
});

randomPlaceBtn.addEventListener('click', () => {
    randomPlaceAllShips();
});

clearBoardBtn.addEventListener('click', () => {
    clearPlacementBoard();
});

confirmPlacementBtn.addEventListener('click', () => {
    if (placedShips.length === placementShips.length) {
        socket.emit('setShips', { ships: placedShips });
        isReady = true;
    }
});

// Keyboard support for rotation
document.addEventListener('keydown', (e) => {
    if (screens.shipPlacement.classList.contains('active') && e.key.toLowerCase() === 'r') {
        isHorizontal = !isHorizontal;
        updatePlacementPreview();
    }
});

// Socket Events
socket.on('authResponse', (data) => {
    if (data.success) {
        authToken = data.token;
        currentUser = data.user;
        localStorage.setItem('battleship_token', authToken);

        updateUserStats(data.user);
        showScreen('matchmaking');

        loginError.classList.add('hidden');
        registerError.classList.add('hidden');
    } else {
        showError(loginForm.classList.contains('hidden') ? registerError : loginError, data.message);
    }
});

socket.on('queueJoined', (data) => {
    queueStatus.classList.remove('hidden');
    queueSize.textContent = data.queueSize;
    findMatchBtn.classList.add('hidden');
    cancelQueueBtn.classList.remove('hidden');
});

socket.on('queueLeft', () => {
    queueStatus.classList.add('hidden');
    findMatchBtn.classList.remove('hidden');
    cancelQueueBtn.classList.add('hidden');
});

socket.on('matchFound', (data) => {
    currentGameId = data.gameId;
    queueStatus.classList.add('hidden');
    findMatchBtn.classList.remove('hidden');
    cancelQueueBtn.classList.add('hidden');
    showScreen('preGame');
});

socket.on('gameUpdate', (data) => {
    matchPlayersList.innerHTML = '';
    data.players.forEach(player => {
        const div = document.createElement('div');
        div.className = 'player-item';
        if (player.ready) div.classList.add('ready');
        if (player.isBot) div.classList.add('bot');

        div.innerHTML = `
            <span>${player.name} ${player.isBot ? '🤖' : ''}</span>
            <span>${player.ready ? '✓ Ready' : 'Not Ready'}</span>
        `;
        matchPlayersList.appendChild(div);
    });
});

socket.on('requestFleet', (data) => {
    placementShips = data.fleet;
    showScreen('shipPlacement');
    initShipPlacement();
});

socket.on('shipsAccepted', () => {
    // Wait for game to start
    addLog('Ships placed! Waiting for other players...');
});

socket.on('gameStarted', () => {
    showScreen('game');
    addLog('Game started! All fleets deployed.');
});

socket.on('gameState', (state) => {
    gameState = state;
    renderGame();
});

socket.on('shotResult', (data) => {
    const shooter = gameState.players.find(p => p.id === data.shooterId);
    const target = gameState.players.find(p => p.id === data.targetId);

    if (!shooter || !target) return;

    let message = `${shooter.name} fired at ${target.name}: `;

    if (data.result.hit) {
        message += '💥 HIT!';
        if (data.result.sunk) {
            message += ` Sank ${data.result.shipName}!`;
        }
        if (data.result.eliminated) {
            message += ` ${target.name} has been eliminated!`;
        }
    } else {
        message += '💧 Miss';
    }

    addLog(message, data.result.hit ? 'hit' : '', data.result.sunk ? 'sunk' : '');
});

socket.on('gameFinished', (data) => {
    const winner = data.players.find(p => p.id === data.winnerId);
    winnerText.textContent = winner ? `🏆 ${winner.name} Wins! 🏆` : 'Game Over';

    // Update user stats if winner
    if (currentUser && data.winnerId === socket.id) {
        currentUser.wins++;
        currentUser.gamesPlayed++;
    } else if (currentUser) {
        currentUser.losses++;
        currentUser.gamesPlayed++;
    }
    updateUserStats(currentUser);

    statsBody.innerHTML = '';
    data.players.forEach(player => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${player.name}${player.id === data.winnerId ? ' 👑' : ''}</td>
            <td>${player.shotsTaken}</td>
            <td>${player.shotsHit}</td>
            <td>${player.accuracy}%</td>
        `;
        statsBody.appendChild(row);
    });

    setTimeout(() => {
        showScreen('gameOver');
    }, 2000);
});

socket.on('error', (data) => {
    alert(data.message);
});

// Helper Functions
function checkStoredToken() {
    const token = localStorage.getItem('battleship_token');
    if (token) {
        socket.emit('verifyToken', { token });
    }
}

function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[screenName].classList.add('active');
}

function showError(element, message) {
    element.textContent = message;
    element.classList.remove('hidden');
    setTimeout(() => {
        element.classList.add('hidden');
    }, 5000);
}

function updateUserStats(user) {
    if (!user) return;
    usernameDisplay.textContent = user.username;
    winsDisplay.textContent = user.wins;
    lossesDisplay.textContent = user.losses;
    gamesDisplay.textContent = user.gamesPlayed;
}

function renderGame() {
    if (!gameState) return;

    const currentPlayer = gameState.players.find(p => p.id === socket.id);
    const isMyTurn = gameState.currentPlayerId === socket.id;

    const currentTurnPlayer = gameState.players.find(p => p.id === gameState.currentPlayerId);
    currentTurnText.textContent = isMyTurn
        ? "🎯 YOUR TURN"
        : `Waiting for ${currentTurnPlayer?.name || 'opponent'}...`;

    if (isMyTurn) {
        turnIndicator.classList.add('your-turn');
    } else {
        turnIndicator.classList.remove('your-turn');
    }

    if (currentPlayer) {
        renderBoard(yourBoard, currentPlayer.board, false, null);
    }

    opponentBoards.innerHTML = '';
    gameState.players.forEach(player => {
        if (player.id === socket.id) return;

        const section = document.createElement('div');
        section.className = 'opponent-board-section';
        if (!player.isAlive) section.classList.add('eliminated');

        const title = document.createElement('h4');
        title.textContent = player.name;
        section.appendChild(title);

        const board = document.createElement('div');
        board.className = 'opponent-board';
        renderBoard(board, player.board, isMyTurn && player.isAlive, player.id);

        section.appendChild(board);
        opponentBoards.appendChild(section);
    });
}

function renderBoard(container, boardData, clickable, targetId) {
    container.innerHTML = '';

    for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            const cellState = boardData[y][x];

            cell.classList.add(cellState);

            if (clickable && (cellState === 'empty' || cellState === 'ship')) {
                cell.addEventListener('click', () => {
                    fireShot(targetId, { x, y });
                });
            } else if (!clickable || cellState === 'hit' || cellState === 'miss') {
                cell.classList.add('disabled');
            }

            container.appendChild(cell);
        }
    }
}

function fireShot(targetId, coord) {
    socket.emit('fireShot', { targetId, coord });
}

function addLog(message, ...classes) {
    const entry = document.createElement('div');
    entry.className = 'log-entry ' + classes.join(' ');
    entry.textContent = message;
    gameLog.insertBefore(entry, gameLog.firstChild);

    while (gameLog.children.length > 20) {
        gameLog.removeChild(gameLog.lastChild);
    }
}

// Enter key support
loginPassword.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loginBtn.click();
});

registerPasswordConfirm.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') registerBtn.click();
});

// Ship Placement Functions
function initShipPlacement() {
    currentShipIndex = 0;
    isHorizontal = true;
    placedShips = [];
    playerBoard = createEmptyBoardArray();

    renderPlacementBoard();
    updateShipsList();
    updateCurrentShipDisplay();
    confirmPlacementBtn.disabled = true;
}

function createEmptyBoardArray() {
    const board = [];
    for (let y = 0; y < 10; y++) {
        board[y] = [];
        for (let x = 0; x < 10; x++) {
            board[y][x] = 'empty';
        }
    }
    return board;
}

function renderPlacementBoard() {
    placementBoard.innerHTML = '';

    for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.x = x;
            cell.dataset.y = y;

            if (playerBoard[y][x] === 'ship') {
                cell.classList.add('ship');
            }

            cell.addEventListener('mouseenter', (e) => {
                highlightPlacementCells(x, y, true);
            });

            cell.addEventListener('mouseleave', () => {
                clearHighlights();
            });

            cell.addEventListener('click', () => {
                attemptPlaceShip(x, y);
            });

            placementBoard.appendChild(cell);
        }
    }
}

function highlightPlacementCells(x, y, isPreview) {
    clearHighlights();

    if (currentShipIndex >= placementShips.length) return;

    const ship = placementShips[currentShipIndex];
    const coords = getShipCoords(x, y, ship.length, isHorizontal);
    const canPlace = checkCanPlace(coords);

    coords.forEach(coord => {
        if (coord.x >= 0 && coord.x < 10 && coord.y >= 0 && coord.y < 10) {
            const cell = placementBoard.children[coord.y * 10 + coord.x];
            if (cell) {
                cell.classList.add(canPlace ? 'preview-valid' : 'preview-invalid');
            }
        }
    });
}

function clearHighlights() {
    Array.from(placementBoard.children).forEach(cell => {
        cell.classList.remove('preview-valid', 'preview-invalid');
    });
}

function getShipCoords(startX, startY, length, horizontal) {
    const coords = [];
    for (let i = 0; i < length; i++) {
        coords.push({
            x: horizontal ? startX + i : startX,
            y: horizontal ? startY : startY + i
        });
    }
    return coords;
}

function checkCanPlace(coords) {
    for (const coord of coords) {
        if (coord.x < 0 || coord.x >= 10 || coord.y < 0 || coord.y >= 10) {
            return false;
        }
        if (playerBoard[coord.y][coord.x] === 'ship') {
            return false;
        }
    }
    return true;
}

function attemptPlaceShip(x, y) {
    if (currentShipIndex >= placementShips.length) return;

    const ship = placementShips[currentShipIndex];
    const coords = getShipCoords(x, y, ship.length, isHorizontal);

    if (!checkCanPlace(coords)) return;

    // Place the ship
    coords.forEach(coord => {
        playerBoard[coord.y][coord.x] = 'ship';
    });

    placedShips.push({
        name: ship.name,
        length: ship.length,
        coords: coords,
        isHorizontal: isHorizontal
    });

    currentShipIndex++;
    updateCurrentShipDisplay();
    updateShipsList();
    renderPlacementBoard();

    if (currentShipIndex >= placementShips.length) {
        confirmPlacementBtn.disabled = false;
    }
}

function updateCurrentShipDisplay() {
    if (currentShipIndex < placementShips.length) {
        const ship = placementShips[currentShipIndex];
        currentShipName.textContent = ship.name;
        currentShipLength.textContent = ship.length;
    } else {
        currentShipName.textContent = 'All ships placed!';
        currentShipLength.textContent = '-';
    }
}

function updateShipsList() {
    shipsListContainer.innerHTML = '';

    placementShips.forEach((ship, index) => {
        const div = document.createElement('div');
        div.className = 'ship-item';

        if (index < currentShipIndex) {
            div.classList.add('placed');
            div.innerHTML = `✓ ${ship.name} (${ship.length})`;
        } else if (index === currentShipIndex) {
            div.classList.add('current');
            div.innerHTML = `→ ${ship.name} (${ship.length})`;
        } else {
            div.innerHTML = `${ship.name} (${ship.length})`;
        }

        shipsListContainer.appendChild(div);
    });
}

function updatePlacementPreview() {
    renderPlacementBoard();
}

function clearPlacementBoard() {
    currentShipIndex = 0;
    placedShips = [];
    playerBoard = createEmptyBoardArray();
    renderPlacementBoard();
    updateCurrentShipDisplay();
    updateShipsList();
    confirmPlacementBtn.disabled = true;
}

function randomPlaceAllShips() {
    clearPlacementBoard();

    for (let i = 0; i < placementShips.length; i++) {
        const ship = placementShips[i];
        let placed = false;
        let attempts = 0;

        while (!placed && attempts < 100) {
            const horizontal = Math.random() < 0.5;
            const x = Math.floor(Math.random() * 10);
            const y = Math.floor(Math.random() * 10);

            const coords = getShipCoords(x, y, ship.length, horizontal);

            if (checkCanPlace(coords)) {
                coords.forEach(coord => {
                    playerBoard[coord.y][coord.x] = 'ship';
                });

                placedShips.push({
                    name: ship.name,
                    length: ship.length,
                    coords: coords,
                    isHorizontal: horizontal
                });

                placed = true;
            }

            attempts++;
        }
    }

    currentShipIndex = placementShips.length;
    updateCurrentShipDisplay();
    updateShipsList();
    renderPlacementBoard();
    confirmPlacementBtn.disabled = false;
}