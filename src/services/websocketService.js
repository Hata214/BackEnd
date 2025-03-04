const socketIo = require('socket.io');

class WebSocketService {
    constructor() {
        this.io = null;
        this.connectedUsers = new Map();
    }

    init(server) {
        try {
            this.io = socketIo(server, {
                cors: {
                    origin: '*', // Cho phép tất cả origin trong giai đoạn debug
                    methods: ['GET', 'POST'],
                    credentials: true
                },
                transports: ['websocket', 'polling'],
                path: '/socket.io',
                // Cấu hình cho môi trường serverless
                pingTimeout: 30000,
                pingInterval: 25000,
                upgradeTimeout: 30000,
                maxHttpBufferSize: 1e8
            });

            // Xử lý lỗi khi khởi tạo Socket.IO
            this.io.engine.on('connection_error', (err) => {
                console.error('Socket.IO connection error:', err);
            });

            this.io.on('connection', (socket) => {
                console.log('Client connected:', socket.id);

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
                    console.log('Client disconnected:', socket.id);
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
        } catch (error) {
            console.error('Error initializing Socket.IO:', error);
            // Trả về null thay vì để lỗi crash ứng dụng
            return null;
        }
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