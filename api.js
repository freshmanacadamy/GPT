// Global error handlers
process.on('unhandledRejection', (error) => {
    console.error('🔴 Unhandled Promise Rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('🔴 Uncaught Exception:', error);
});

// Import configurations
const bot = require('./config/bot');
const { showMainMenu } = require('./handlers/menu');

// Import NEW registration handlers
const { 
    handleRegisterTutorial, 
    handleNameInput, 
    handleContactShared, 
    handleScreenshotUpload,
    handleNavigation,
    handleRegistrationCallback 
} = require('./handlers/registration');

const { handlePayFee } = require('./handlers/payment');
const { handleInviteEarn, handleLeaderboard, handleMyReferrals, handleReferralStart } = require('./handlers/referral');
const { handleMyProfile, handleWithdrawRewards, handleChangePaymentMethod, handleSetPaymentMethod } = require('./handlers/profile');
const { handleAdminPanel, handleAdminApprove, handleAdminReject, handleAdminDetails, handleAdminStats } = require('./handlers/admin');
const { handleHelp, handleRules } = require('./handlers/help');

// Import database functions for health check
const { getAllUsers, getVerifiedUsers } = require('./database/users');
const { getPendingPayments } = require('./database/payments');
const { getPendingWithdrawals } = require('./database/withdrawals');

// ========== MESSAGE HANDLER ========== //
const handleMessage = async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    if (!text && !msg.contact && !msg.photo && !msg.document) return;

    try {
        // First check if it's a navigation command (Cancel Registration, Homepage)
        const isNavigation = await handleNavigation(msg);
        if (isNavigation) return;

        // Handle contact sharing
        if (msg.contact) {
            await handleContactShared(msg);
            return;
        }

        // Handle photo/document (payment screenshot)
        if (msg.photo || msg.document) {
            await handleScreenshotUpload(msg);
            return;
        }

        // Handle commands
        if (text.startsWith('/')) {
            switch (text) {
                case '/start':
                    await handleStart(msg);
                    break;
                case '/admin':
                    await handleAdminPanel(msg);
                    break;
                case '/help':
                    await handleHelp(msg);
                    break;
                case '/stats':
                    await handleAdminStats(msg);
                    break;
                case '/register':
                    await handleRegisterTutorial(msg);
                    break;
                default:
                    await showMainMenu(chatId);
            }
        } else {
            // Handle button clicks and form interactions
            switch (text) {
                case '📚 Register for Tutorial':
                case '🆕 Register':
                    await handleRegisterTutorial(msg);
                    break;
                case '👤 My Profile':
                    await handleMyProfile(msg);
                    break;
                case '🎁 Invite & Earn':
                    await handleInviteEarn(msg);
                    break;
                case '📈 Leaderboard':
                    await handleLeaderboard(msg);
                    break;
                case '❓ Help':
                    await handleHelp(msg);
                    break;
                case '📌 Rules':
                    await handleRules(msg);
                    break;
                case '💰 Pay Tutorial Fee':
                    await handlePayFee(msg);
                    break;
                case '📤 Upload Payment Screenshot':
                case '📎 Upload Payment Screenshot':
                    await handleScreenshotUpload(msg);
                    break;
                case '💰 Withdraw Rewards':
                    await handleWithdrawRewards(msg);
                    break;
                case '💳 Change Payment Method':
                    await handleChangePaymentMethod(msg);
                    break;
                case '📊 My Referrals':
                    await handleMyReferrals(msg);
                    break;
                case '🔙 Back to Menu':
                    await showMainMenu(chatId);
                    break;
                default:
                    // Handle name input and other text
                    await handleNameInput(msg);
            }
        }
    } catch (error) {
        console.error('Error handling message:', error);
        await bot.sendMessage(chatId, '❌ An error occurred. Please try again.');
    }
};

// ========== START COMMAND ========== //
const handleStart = async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    // Handle referral tracking
    await handleReferralStart(msg, userId);
    
    await bot.sendMessage(chatId,
        `🎯 *Welcome to Tutorial Registration Bot!*\n\n` +
        `📚 Register for our comprehensive tutorials\n` +
        `💰 Registration fee: ${process.env.REGISTRATION_FEE || 500} ETB\n` +
        `🎁 Earn ${process.env.REFERRAL_REWARD || 30} ETB per referral\n\n` +
        `Start your registration journey!`,
        { parse_mode: 'Markdown' }
    );

    await showMainMenu(chatId);
};

// ========== CALLBACK QUERY HANDLER ========== //
const handleCallbackQuery = async (callbackQuery) => {
    const message = callbackQuery.message;
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;
    const chatId = message.chat.id;

    try {
        console.log('🔵 Callback received:', data);
        console.log('👤 From user ID:', userId);
        console.log('💬 In chat ID:', chatId);

        // First try the new registration callback handler
        console.log('🔄 Trying registration callback handler...');
        const handled = await handleRegistrationCallback(callbackQuery);
        if (handled) {
            console.log('✅ Registration callback handled');
            await bot.answerCallbackQuery(callbackQuery.id);
            return;
        }

        console.log('🔄 Registration callback not handled, trying admin callbacks...');

        // Admin callbacks
        if (data.startsWith('admin_approve_')) {
            const targetUserId = parseInt(data.replace('admin_approve_', ''));
            console.log(`🔄 Processing admin approve for user: ${targetUserId}`);
            await handleAdminApprove(targetUserId, userId);
        }
        else if (data.startsWith('admin_reject_')) {
            const targetUserId = parseInt(data.replace('admin_reject_', ''));
            console.log(`🔄 Processing admin reject for user: ${targetUserId}`);
            await handleAdminReject(targetUserId, userId);
        }
        else if (data.startsWith('admin_details_')) {
            const targetUserId = parseInt(data.replace('admin_details_', ''));
            console.log(`🔄 Processing admin details for user: ${targetUserId}`);
            await handleAdminDetails(targetUserId, userId);
        }
        else {
            console.log('❌ No handler found for callback:', data);
            await bot.answerCallbackQuery(callbackQuery.id, { text: 'Unknown command' });
        }

    } catch (error) {
        console.error('❌ Callback error:', error);
        await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Error processing request' });
    }
};

// ========== VERCEL HANDLER ========== //
module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Handle GET requests - health check
    if (req.method === 'GET') {
        try {
            const allUsers = await getAllUsers();
            const verifiedUsers = await getVerifiedUsers();
            const pendingPayments = await getPendingPayments();
            const pendingWithdrawals = await getPendingWithdrawals();

            return res.status(200).json({
                status: 'online',
                message: 'Tutorial Registration Bot is running on Vercel!',
                timestamp: new Date().toISOString(),
                stats: {
                    users: Object.keys(allUsers).length,
                    verified: verifiedUsers.length,
                    pending: pendingPayments.length,
                    withdrawals: pendingWithdrawals.length,
                    referrals: Object.values(allUsers).reduce((sum, u) => sum + (u.referralCount || 0), 0)
                }
            });
        } catch (error) {
            return res.status(500).json({ error: 'Database connection failed' });
        }
    }

    // Handle POST requests (Telegram webhook)
    if (req.method === 'POST') {
        try {
            const update = req.body;
            console.log('📨 Webhook update received');

            if (update.message) {
                await handleMessage(update.message);
            } else if (update.callback_query) {
                await handleCallbackQuery(update.callback_query);
            }

            return res.status(200).json({ ok: true });
        } catch (error) {
            console.error('❌ Error processing update:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
};

console.log('✅ Tutorial Registration Bot configured for Vercel!');
