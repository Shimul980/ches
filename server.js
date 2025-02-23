const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

const rooms = new Map();
const waitingPlayers = new Set();

wss.on('connection', (ws) => {
    console.log('New player connected');

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        
        switch(data.type) {
            case 'find_game':
                handleFindGame(ws);
                break;
            case 'move':
                handleMove(ws, data);
                break;
            case 'leave_game':
                handleLeaveGame(ws);
                break;
        }
    });

    ws.on('close', () => {
        handleLeaveGame(ws);
    });
});

function handleFindGame(ws) {
    if (waitingPlayers.size > 0) {
        // Match with waiting player
        const opponent = waitingPlayers.values().next().value;
        waitingPlayers.delete(opponent);
        
        // Create new room
        const roomId = Date.now().toString();
        rooms.set(roomId, {
            white: opponent,
            black: ws,
            moves: []
        });

        // Notify both players
        opponent.send(JSON.stringify({
            type: 'game_start',
            color: 'white',
            roomId
        }));
        ws.send(JSON.stringify({
            type: 'game_start',
            color: 'black',
            roomId
        }));
    } else {
        // Wait for opponent
        waitingPlayers.add(ws);
        ws.send(JSON.stringify({
            type: 'waiting'
        }));
    }
}

function handleMove(ws, data) {
    const room = rooms.get(data.roomId);
    if (!room) return;

    const opponent = ws === room.white ? room.black : room.white;
    opponent.send(JSON.stringify({
        type: 'opponent_move',
        move: data.move
    }));
}

function handleLeaveGame(ws) {
    // Remove from waiting list
    waitingPlayers.delete(ws);

    // Notify opponent if in game
    for (const [roomId, room] of rooms.entries()) {
        if (room.white === ws || room.black === ws) {
            const opponent = ws === room.white ? room.black : room.white;
            opponent.send(JSON.stringify({
                type: 'opponent_left'
            }));
            rooms.delete(roomId);
            break;
        }
    }
} 