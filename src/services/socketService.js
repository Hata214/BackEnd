const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');

class SocketService {
    constructor() {
        this.io = null;
        this.connectedUsers = new Map();
    }

    initialize(server) {
        this.io = socketIo(server, {
            cors: {
                origin: process.env.CLIENT_URL || "*",
                methods: ["GET", "POST"]
            }
        });

        this.io.use((socket, next) => {
            if (socket.handshake.auth && socket.handshake.auth.token) {
                jwt.verify(socket.handshake.auth.token, process.env.JWT_SECRET, (err, decoded) => {
                    if (err) return next(new Error('Authentication error'));
                    socket.userId = decoded.id;
                    next();
                });
            } else {
                next(new Error('Authentication error'));
            }
        });

        this.io.on('connection', (socket) => {
            console.log(`User connected: ${socket.userId}`);
            this.connectedUsers.set(socket.userId, socket.id);

            // Handle user disconnect
            socket.on('disconnect', () => {
                console.log(`User disconnected: ${socket.userId}`);
                this.connectedUsers.delete(socket.userId);
            });

            // Join user to their personal room
            socket.join(`user_${socket.userId}`);
        });
    }

    // Notify user about new transaction
    notifyNewTransaction(userId, transaction) {
        this.io.to(`user_${userId}`).emit('newTransaction', {
            message: 'New transaction created',
            transaction
        });
    }

    // Notify user about budget limit
    notifyBudgetLimit(userId, category, currentAmount, limit) {
        this.io.to(`user_${userId}`).emit('budgetLimit', {
            message: `Budget limit reached for ${category}`,
            category,
            currentAmount,
            limit
        });
    }

    // Notify balance update
    notifyBalanceUpdate(userId, newBalance) {
        this.io.to(`user_${userId}`).emit('balanceUpdate', {
            balance: newBalance
        });
    }

    // Broadcast online users count
    broadcastOnlineUsers() {
        this.io.emit('onlineUsers', {
            count: this.connectedUsers.size
        });
    }
}

module.exports = new SocketService(); 