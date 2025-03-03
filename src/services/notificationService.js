const nodemailer = require('nodemailer');
const socketService = require('./socketService');

class NotificationService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: true,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    // Send in-app notification
    async sendInAppNotification(userId, title, message, type = 'info') {
        try {
            socketService.io.to(`user_${userId}`).emit('notification', {
                title,
                message,
                type,
                timestamp: new Date()
            });
        } catch (error) {
            console.error('Error sending in-app notification:', error);
        }
    }

    // Send email notification
    async sendEmailNotification(to, subject, text) {
        try {
            await this.transporter.sendMail({
                from: process.env.SMTP_FROM,
                to,
                subject,
                text
            });
        } catch (error) {
            console.error('Error sending email notification:', error);
        }
    }

    // Send budget limit notification
    async sendBudgetLimitNotification(user, category, currentAmount, limit) {
        const message = `You have exceeded the budget limit for ${category}. Current: ${currentAmount}, Limit: ${limit}`;

        // Send in-app notification
        await this.sendInAppNotification(user._id, 'Budget Limit Exceeded', message, 'warning');

        // Send email notification
        if (user.email) {
            await this.sendEmailNotification(
                user.email,
                'Budget Limit Alert - VanLangBudget',
                message
            );
        }
    }

    // Send new transaction notification
    async sendTransactionNotification(user, transaction) {
        const message = `New ${transaction.type} transaction: ${transaction.amount} - ${transaction.description || 'No description'}`;

        // Send in-app notification
        await this.sendInAppNotification(user._id, 'New Transaction', message, 'info');

        // Send email for large transactions
        if (transaction.amount > 1000000 && user.email) { // > 1M VND
            await this.sendEmailNotification(
                user.email,
                'Large Transaction Alert - VanLangBudget',
                `A large ${transaction.type} transaction of ${transaction.amount} has been recorded in your account.`
            );
        }
    }

    // Send balance update notification
    async sendBalanceUpdateNotification(user, newBalance) {
        const message = `Your current balance is: ${newBalance}`;
        await this.sendInAppNotification(user._id, 'Balance Update', message, 'info');
    }
}

module.exports = new NotificationService(); 