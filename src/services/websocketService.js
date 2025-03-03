const socketIo = require('socket.io');

class WebSocketService {
    constructor() {
        this.io = null;
        this.connectedUsers = new Map();
    }

    init(server) {
        this.io = socketIo(server, {
            cors: {
                origin: process.env.WS_CLIENT_URL || 'http://localhost:3001',
                methods: ['GET', 'POST'],
                credentials: true
            }
        });

        this.io.on('connection', (socket) => {
            console.log('New client connected:', socket.id);

            // Handle user authentication
            socket.on('authenticate', (userId) => {
                this.connectedUsers.set(userId, socket.id);
                socket.userId = userId;
                console.log(`User ${userId} authenticated with socket ${socket.id}`);
            });

            // Handle disconnection
            socket.on('disconnect', () => {
                if (socket.userId) {
                    this.connectedUsers.delete(socket.userId);
                    console.log(`User ${socket.userId} disconnected`);
                }
            });

            // Handle transaction notifications
            socket.on('transaction:created', (data) => {
                this.notifyUser(data.userId, 'transaction:notification', {
                    type: 'created',
                    message: `New ${data.type} transaction: ${data.amount}`,
                    data: data
                });
            });

            // Handle budget alerts
            socket.on('budget:alert', (data) => {
                this.notifyUser(data.userId, 'budget:notification', {
                    type: 'alert',
                    message: `Budget alert: ${data.message}`,
                    data: data
                });
            });

            // Handle errors
            socket.on('error', (error) => {
                console.error('Socket error:', error);
            });
        });

        return this.io;
    }

    // Send notification to specific user
    notifyUser(userId, event, data) {
        const socketId = this.connectedUsers.get(userId);
        if (socketId) {
            this.io.to(socketId).emit(event, data);
        }
    }

    // Broadcast to all connected users
    broadcast(event, data) {
        this.io.emit(event, data);
    }

    // Get connected socket by user ID
    getSocketByUserId(userId) {
        return this.connectedUsers.get(userId);
    }

    // Get all connected users
    getConnectedUsers() {
        return Array.from(this.connectedUsers.keys());
    }
}

module.exports = new WebSocketService(); 