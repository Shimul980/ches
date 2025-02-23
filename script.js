class ChessGame {
    constructor(mode) {
        this.gameMode = mode;
        this.board = document.getElementById('chessBoard');
        this.currentTurn = 'white';
        this.selectedPiece = null;
        this.pieces = {
            white: {
                '♔': 'king',
                '♕': 'queen',
                '♖': 'rook',
                '♗': 'bishop',
                '♘': 'knight',
                '♙': 'pawn'
            },
            black: {
                '♚': 'king',
                '♛': 'queen',
                '♜': 'rook',
                '♝': 'bishop',
                '♞': 'knight',
                '♟': 'pawn'
            }
        };
        this.initialBoardState = [
            ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'],
            ['♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟'],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙'],
            ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖']
        ];
        this.boardState = JSON.parse(JSON.stringify(this.initialBoardState));
        this.initializeBoard();
        this.addEventListeners();
        this.isInCheck = false;
        this.moveHistory = [];
        this.currentMoveIndex = -1;
        this.initializeGameControls();
        this.lastMove = null;

        // Initialize based on game mode
        this.initializeGameMode();
        this.addVictoryStyles();
    }

    initializeBoard() {
        this.board.innerHTML = '';
        
        // Update both board and container classes based on turn
        this.board.className = `board ${this.currentTurn}-turn`;
        const container = document.querySelector('.container');
        container.className = `container ${this.currentTurn}-turn`;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 === 0 ? 'white' : 'black'}`;
                
                // Add last move highlight
                if (this.lastMove && 
                    ((row === this.lastMove.from.row && col === this.lastMove.from.col) ||
                     (row === this.lastMove.to.row && col === this.lastMove.to.col))) {
                    square.classList.add('last-move');
                }
                
                square.dataset.row = row;
                square.dataset.col = col;
                square.textContent = this.boardState[row][col];
                this.board.appendChild(square);
            }
        }

        // Update turn indicator
        const turnIndicator = document.querySelector('.turn');
        turnIndicator.className = `turn ${this.currentTurn}-turn`;
    }

    addEventListeners() {
        this.board.addEventListener('click', (e) => {
            const square = e.target.closest('.square');
            if (!square) return;

            const row = parseInt(square.dataset.row);
            const col = parseInt(square.dataset.col);
            this.handleSquareClick(row, col);
        });

        document.getElementById('resetBtn').addEventListener('click', () => {
            this.resetGame();
        });
    }

    handleSquareClick(row, col) {
        const piece = this.boardState[row][col];
        const isWhitePiece = Object.keys(this.pieces.white).includes(piece);
        const isBlackPiece = Object.keys(this.pieces.black).includes(piece);

        // Clear previous selections
        document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
        document.querySelectorAll('.valid-move').forEach(el => el.classList.remove('valid-move'));

        // Select piece
        if ((isWhitePiece && this.currentTurn === 'white') || (isBlackPiece && this.currentTurn === 'black')) {
            this.selectedPiece = { row, col, piece };
            document.querySelector(`[data-row="${row}"][data-col="${col}"]`).classList.add('selected');
            this.showValidMoves(row, col, piece);
        }
        // Move piece only if the target square is a valid move
        else if (this.selectedPiece) {
            const { row: fromRow, col: fromCol, piece: selectedPiece } = this.selectedPiece;
            if (this.isValidMove(fromRow, fromCol, row, col, selectedPiece)) {
                this.movePiece(row, col);
            } else {
                // If invalid move, deselect the piece
                this.selectedPiece = null;
            }
        }
    }

    showValidMoves(row, col, piece) {
        const squares = document.querySelectorAll('.square');
        squares.forEach(square => {
            const targetRow = parseInt(square.dataset.row);
            const targetCol = parseInt(square.dataset.col);
            if (this.canMoveWithoutCheck(row, col, targetRow, targetCol, piece, this.currentTurn)) {
                square.classList.add('valid-move');
            }
        });
    }

    isValidMove(fromRow, fromCol, toRow, toCol, piece) {
        // Check if the destination has a piece of the same color
        const destPiece = this.boardState[toRow][toCol];
        if (this.currentTurn === 'white' && Object.keys(this.pieces.white).includes(destPiece)) return false;
        if (this.currentTurn === 'black' && Object.keys(this.pieces.black).includes(destPiece)) return false;

        // Get piece type
        const pieceType = this.currentTurn === 'white' ? this.pieces.white[piece] : this.pieces.black[piece];

        switch (pieceType) {
            case 'pawn':
                return this.isValidPawnMove(fromRow, fromCol, toRow, toCol);
            case 'rook':
                return this.isValidRookMove(fromRow, fromCol, toRow, toCol);
            case 'knight':
                return this.isValidKnightMove(fromRow, fromCol, toRow, toCol);
            case 'bishop':
                return this.isValidBishopMove(fromRow, fromCol, toRow, toCol);
            case 'queen':
                return this.isValidQueenMove(fromRow, fromCol, toRow, toCol);
            case 'king':
                return this.isValidKingMove(fromRow, fromCol, toRow, toCol);
            default:
                return false;
        }
    }

    isValidPawnMove(fromRow, fromCol, toRow, toCol) {
        const direction = this.currentTurn === 'white' ? -1 : 1;
        const startRow = this.currentTurn === 'white' ? 6 : 1;
        const destPiece = this.boardState[toRow][toCol];

        // Regular move forward
        if (fromCol === toCol && !destPiece) {
            if (toRow === fromRow + direction) return true;
            // First move can be 2 squares
            if (fromRow === startRow && toRow === fromRow + 2 * direction && !this.boardState[fromRow + direction][fromCol]) {
                return true;
            }
        }

        // Capture move
        if (Math.abs(toCol - fromCol) === 1 && toRow === fromRow + direction) {
            if (this.currentTurn === 'white' && Object.keys(this.pieces.black).includes(destPiece)) return true;
            if (this.currentTurn === 'black' && Object.keys(this.pieces.white).includes(destPiece)) return true;
        }

        return false;
    }

    isValidRookMove(fromRow, fromCol, toRow, toCol) {
        if (fromRow !== toRow && fromCol !== toCol) return false;
        return this.isPathClear(fromRow, fromCol, toRow, toCol);
    }

    isValidKnightMove(fromRow, fromCol, toRow, toCol) {
        const rowDiff = Math.abs(toRow - fromRow);
        const colDiff = Math.abs(toCol - fromCol);
        return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
    }

    isValidBishopMove(fromRow, fromCol, toRow, toCol) {
        if (Math.abs(toRow - fromRow) !== Math.abs(toCol - fromCol)) return false;
        return this.isPathClear(fromRow, fromCol, toRow, toCol);
    }

    isValidQueenMove(fromRow, fromCol, toRow, toCol) {
        const isDiagonal = Math.abs(toRow - fromRow) === Math.abs(toCol - fromCol);
        const isStraight = fromRow === toRow || fromCol === toCol;
        if (!isDiagonal && !isStraight) return false;
        return this.isPathClear(fromRow, fromCol, toRow, toCol);
    }

    isValidKingMove(fromRow, fromCol, toRow, toCol) {
        const rowDiff = Math.abs(toRow - fromRow);
        const colDiff = Math.abs(toCol - fromCol);
        return rowDiff <= 1 && colDiff <= 1;
    }

    isPathClear(fromRow, fromCol, toRow, toCol) {
        const rowDirection = fromRow === toRow ? 0 : (toRow - fromRow) / Math.abs(toRow - fromRow);
        const colDirection = fromCol === toCol ? 0 : (toCol - fromCol) / Math.abs(toCol - fromCol);
        
        let currentRow = fromRow + rowDirection;
        let currentCol = fromCol + colDirection;
        
        while (currentRow !== toRow || currentCol !== toCol) {
            if (this.boardState[currentRow][currentCol] !== '') return false;
            currentRow += rowDirection;
            currentCol += colDirection;
        }
        
        return true;
    }

    initializeGameControls() {
        document.getElementById('undoBtn').addEventListener('click', () => this.undoMove());
        document.getElementById('redoBtn').addEventListener('click', () => this.redoMove());
        document.getElementById('newGameBtn').addEventListener('click', () => this.resetGame());
    }

    // Add this method to save moves
    saveMoveToHistory(fromRow, fromCol, toRow, toCol, piece, capturedPiece) {
        // Remove any future moves if we're in the middle of the history
        this.moveHistory = this.moveHistory.slice(0, this.currentMoveIndex + 1);
        
        this.moveHistory.push({
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol },
            piece: piece,
            capturedPiece: capturedPiece,
            turn: this.currentTurn
        });
        
        this.currentMoveIndex++;
        this.updateControlButtons();
    }

    undoMove() {
        if (this.currentMoveIndex < 0) return;
        
        const move = this.moveHistory[this.currentMoveIndex];
        
        // Restore the previous position
        this.boardState[move.from.row][move.from.col] = move.piece;
        this.boardState[move.to.row][move.to.col] = move.capturedPiece;
        
        // Update last move
        this.lastMove = this.currentMoveIndex > 0 ? 
            this.moveHistory[this.currentMoveIndex - 1] : null;
        
        // Restore the turn
        this.currentTurn = move.turn;
        
        this.currentMoveIndex--;
        this.updateControlButtons();
        this.initializeBoard();
        document.getElementById('currentTurn').textContent = 
            this.currentTurn.charAt(0).toUpperCase() + this.currentTurn.slice(1);
    }

    redoMove() {
        if (this.currentMoveIndex >= this.moveHistory.length - 1) return;
        
        const move = this.moveHistory[this.currentMoveIndex + 1];
        
        // Replay the move
        this.boardState[move.to.row][move.to.col] = move.piece;
        this.boardState[move.from.row][move.from.col] = '';
        
        // Update last move
        this.lastMove = move;
        
        // Update the turn
        this.currentTurn = move.turn === 'white' ? 'black' : 'white';
        
        this.currentMoveIndex++;
        this.updateControlButtons();
        this.initializeBoard();
        document.getElementById('currentTurn').textContent = 
            this.currentTurn.charAt(0).toUpperCase() + this.currentTurn.slice(1);
    }

    updateControlButtons() {
        document.getElementById('undoBtn').disabled = this.currentMoveIndex < 0;
        document.getElementById('redoBtn').disabled = this.currentMoveIndex >= this.moveHistory.length - 1;
    }

    showGameOver(message) {
        const modal = document.getElementById('gameOverModal');
        const messageElement = document.getElementById('gameOverMessage');
        messageElement.textContent = message;
        modal.classList.add('show');
        
        // Add victory effect
        const container = document.querySelector('.container');
        container.classList.add('victory');
        
        // Play victory sound (optional)
        this.playVictorySound();
    }

    resetGame() {
        this.boardState = JSON.parse(JSON.stringify(this.initialBoardState));
        this.currentTurn = 'white';
        this.selectedPiece = null;
        this.moveHistory = [];
        this.currentMoveIndex = -1;
        this.lastMove = null;
        document.getElementById('currentTurn').textContent = 'White';
        document.getElementById('gameOverModal').classList.remove('show');
        this.updateControlButtons();
        this.initializeBoard();
        
        // Update container class
        document.querySelector('.container').className = `container white-turn`;
        
        if (this.gameMode === 'online') {
            this.ws.close();
        }
    }

    // Add new methods for check detection
    isKingInCheck(color) {
        // Find king's position
        let kingRow, kingCol;
        const kingSymbol = color === 'white' ? '♔' : '♚';
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.boardState[row][col] === kingSymbol) {
                    kingRow = row;
                    kingCol = col;
                    break;
                }
            }
        }

        // Check if any opponent piece can attack the king
        const opponentColor = color === 'white' ? 'black' : 'white';
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.boardState[row][col];
                if (piece && (opponentColor === 'white' ? 
                    Object.keys(this.pieces.white).includes(piece) : 
                    Object.keys(this.pieces.black).includes(piece))) {
                    if (this.isValidMove(row, col, kingRow, kingCol, piece, true)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    isCheckmate(color) {
        if (!this.isKingInCheck(color)) return false;

        // Try all possible moves for all pieces
        for (let fromRow = 0; fromRow < 8; fromRow++) {
            for (let fromCol = 0; fromCol < 8; fromCol++) {
                const piece = this.boardState[fromRow][fromCol];
                // Check if it's the current player's piece
                if (piece && (color === 'white' ? 
                    Object.keys(this.pieces.white).includes(piece) : 
                    Object.keys(this.pieces.black).includes(piece))) {
                    
                    // Try all possible destinations
                    for (let toRow = 0; toRow < 8; toRow++) {
                        for (let toCol = 0; toCol < 8; toCol++) {
                            if (this.canMoveWithoutCheck(fromRow, fromCol, toRow, toCol, piece, color)) {
                                return false; // Found at least one legal move
                            }
                        }
                    }
                }
            }
        }
        return true; // No legal moves found
    }

    canMoveWithoutCheck(fromRow, fromCol, toRow, toCol, piece, color) {
        if (!this.isValidMove(fromRow, fromCol, toRow, toCol, piece)) return false;

        // Try the move
        const originalDest = this.boardState[toRow][toCol];
        this.boardState[toRow][toCol] = piece;
        this.boardState[fromRow][fromCol] = '';

        // Check if the king is still in check after the move
        const stillInCheck = this.isKingInCheck(color);

        // Undo the move
        this.boardState[fromRow][fromCol] = piece;
        this.boardState[toRow][toCol] = originalDest;

        return !stillInCheck;
    }

    movePiece(toRow, toCol) {
        if (this.selectedPiece) {
            const { row: fromRow, col: fromCol, piece } = this.selectedPiece;
            const currentColor = this.currentTurn;
            
            if (!this.canMoveWithoutCheck(fromRow, fromCol, toRow, toCol, piece, currentColor)) {
                this.selectedPiece = null;
                return;
            }

            // Save the captured piece before making the move
            const capturedPiece = this.boardState[toRow][toCol];
            
            // Check if a king is being captured
            if (capturedPiece === '♔' || capturedPiece === '♚') {
                const winner = this.currentTurn;
                this.showGameOver(`Game Over! ${winner.charAt(0).toUpperCase() + winner.slice(1)} wins by capturing the King!`);
                return;
            }
            
            // Make the move
            this.boardState[toRow][toCol] = piece;
            this.boardState[fromRow][fromCol] = '';
            
            // Save the last move for highlighting
            this.lastMove = {
                from: { row: fromRow, col: fromCol },
                to: { row: toRow, col: toCol }
            };
            
            // Save the move to history
            this.saveMoveToHistory(fromRow, fromCol, toRow, toCol, piece, capturedPiece);
            
            // Change turn
            this.currentTurn = this.currentTurn === 'white' ? 'black' : 'white';
            
            // Check for check/checkmate
            if (this.isKingInCheck(this.currentTurn)) {
                if (this.isCheckmate(this.currentTurn)) {
                    this.showGameOver(`Checkmate! ${currentColor} wins!`);
                } else {
                    alert("Check!");
                }
            }

            document.getElementById('currentTurn').textContent = 
                this.currentTurn.charAt(0).toUpperCase() + this.currentTurn.slice(1);
            this.selectedPiece = null;
            this.initializeBoard();

            // After move is complete, check if bot should move
            if (this.gameMode === 'bot' && this.currentTurn === 'black') {
                this.makeBotMove();
            }

            // Send move to opponent in online mode
            if (this.gameMode === 'online' && 
                ((this.onlineColor === 'white' && this.currentTurn === 'white') ||
                 (this.onlineColor === 'black' && this.currentTurn === 'black'))) {
                this.ws.send(JSON.stringify({
                    type: 'move',
                    roomId: this.roomId,
                    move: {
                        fromRow,
                        fromCol,
                        toRow,
                        toCol
                    }
                }));
            }
        }
    }

    initializeGameMode() {
        const player1Elem = document.getElementById('player1');
        const player2Elem = document.getElementById('player2');

        switch(this.gameMode) {
            case 'offline':
                player1Elem.textContent = 'Player 1 (White)';
                player2Elem.textContent = 'Player 2 (Black)';
                break;
            case 'bot':
                player1Elem.textContent = 'You (White)';
                player2Elem.textContent = 'Bot (Black)';
                break;
            case 'online':
                player1Elem.textContent = 'You (White)';
                player2Elem.textContent = 'Waiting for opponent...';
                this.initializeOnlineMode();
                break;
        }
    }

    // Add bot move logic
    async makeBotMove() {
        if (this.gameMode === 'bot' && this.currentTurn === 'black') {
            // Simple bot logic (can be improved)
            const validMoves = this.getAllValidMoves('black');
            if (validMoves.length > 0) {
                // Add delay to make it look like the bot is thinking
                await new Promise(resolve => setTimeout(resolve, 500));
                
                const move = validMoves[Math.floor(Math.random() * validMoves.length)];
                this.selectedPiece = {
                    row: move.fromRow,
                    col: move.fromCol,
                    piece: this.boardState[move.fromRow][move.fromCol]
                };
                this.movePiece(move.toRow, move.toCol);
            }
        }
    }

    getAllValidMoves(color) {
        const moves = [];
        for (let fromRow = 0; fromRow < 8; fromRow++) {
            for (let fromCol = 0; fromCol < 8; fromCol++) {
                const piece = this.boardState[fromRow][fromCol];
                if (piece && ((color === 'white' && Object.keys(this.pieces.white).includes(piece)) ||
                            (color === 'black' && Object.keys(this.pieces.black).includes(piece)))) {
                    for (let toRow = 0; toRow < 8; toRow++) {
                        for (let toCol = 0; toCol < 8; toCol++) {
                            if (this.canMoveWithoutCheck(fromRow, fromCol, toRow, toCol, piece, color)) {
                                moves.push({ fromRow, fromCol, toRow, toCol });
                            }
                        }
                    }
                }
            }
        }
        return moves;
    }

    // Add online mode initialization
    initializeOnlineMode() {
        this.ws = new WebSocket('ws://localhost:8080');
        
        this.ws.onopen = () => {
            console.log('Connected to server');
            this.ws.send(JSON.stringify({
                type: 'find_game'
            }));
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            switch(data.type) {
                case 'waiting':
                    document.getElementById('player2').textContent = 'Waiting for opponent...';
                    break;
                    
                case 'game_start':
                    this.onlineColor = data.color;
                    this.roomId = data.roomId;
                    document.getElementById('player2').textContent = 
                        `Opponent (${this.onlineColor === 'white' ? 'Black' : 'White'})`;
                    break;
                    
                case 'opponent_move':
                    this.handleOnlineMove(data.move);
                    break;
                    
                case 'opponent_left':
                    this.showGameOver('Opponent left the game');
                    break;
            }
        };

        this.ws.onclose = () => {
            console.log('Disconnected from server');
            this.showGameOver('Connection lost');
        };
    }

    handleOnlineMove(move) {
        // Apply opponent's move
        this.selectedPiece = {
            row: move.fromRow,
            col: move.fromCol,
            piece: this.boardState[move.fromRow][move.fromCol]
        };
        this.movePiece(move.toRow, move.toCol);
    }

    // Add victory sound (optional)
    playVictorySound() {
        const audio = new Audio('data:audio/wav;base64,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qJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=');
        audio.play();
    }

    // Add CSS for victory effect
    addVictoryStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .container.victory {
                animation: victoryPulse 1s ease-in-out;
            }
            
            @keyframes victoryPulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
        `;
        document.head.appendChild(style);
    }
}

// Game mode selection handling
document.addEventListener('DOMContentLoaded', () => {
    const gameModeSelector = document.getElementById('gameModeSelector');
    const gameContainer = document.querySelector('.container');
    let currentGame = null;

    function startGame(mode) {
        gameModeSelector.style.display = 'none';
        gameContainer.style.display = 'flex';
        currentGame = new ChessGame(mode);
    }

    document.getElementById('offlineMode').addEventListener('click', () => startGame('offline'));
    document.getElementById('botMode').addEventListener('click', () => startGame('bot'));
    document.getElementById('onlineMode').addEventListener('click', () => startGame('online'));

    document.getElementById('changeModeBtn').addEventListener('click', () => {
        gameContainer.style.display = 'none';
        gameModeSelector.style.display = 'flex';
    });
});

// Initialize the game
const game = new ChessGame(); 