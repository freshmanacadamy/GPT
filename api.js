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

// Import handlers
const { handleRegisterTutorial, showPaymentMethods, showAccountDetails, handleContactShared, handleNameInput, handleFormSubmission, handleStartOver } = require('./handlers/registration');
const { handleUploadScreenshot, handlePaymentScreenshot, handlePayFee } = require('./handlers/payment');
const { handleInviteEarn, handleLeaderboard, handleMyReferrals, handleReferralStart } = require('./handlers/referral');
const { handleMyProfile, handleWithdrawRewards, handleChangePaymentMethod, handleSetPaymentMethod, handleSetAccountNumber, handleSetAccountName } = require('./handlers/profile');
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
        // Handle contact sharing
        if (msg.contact) {
            await handleContactShared(msg);
            return;
        }

        // Handle photo/document (payment screenshot)
        if (msg.photo || msg.document) {
            await handlePaymentScreenshot(msg);
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
                default:
                    await showMainMenu(chatId);
            }
        } else {
            // Handle button clicks and form interactions
            switch (text) {
                case '📚 Register for Tutorial':
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
                    await handleUploadScreenshot(msg);
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
                case '✅ SUBMIT REGISTRATION':
                    await handleFormSubmission(msg);
                    break;
                case '🔄 START OVER':
                    await handleStartOver(msg);
                    break;
                case '📎 Upload Payment Screenshot':
                    await handleUploadScreenshot(msg);
                    break;
                case '🔙 Change Payment Method':
                    await handleRegisterTutorial(msg);
                    break;
                case '🔙 Back to Menu':
                    await showMainMenu(chatId);
                    break;
                case '📱 TeleBirr':
                case '🏦 CBE Birr':
                    await handleSetPaymentMethod(msg);
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
        // Admin callbacks
        if (data.startsWith('admin_approve_')) {
            const targetUserId = parseInt(data.replace('admin_approve_', ''));
            await handleAdminApprove(targetUserId, userId);
        }
        else if (data.startsWith('admin_reject_')) {
            const targetUserId = parseInt(data.replace('admin_reject_', ''));
            await handleAdminReject(targetUserId, userId);
        }
        else if (data.startsWith('admin_details_')) {
            const targetUserId = parseInt(data.replace('admin_details_', ''));
            await handleAdminDetails(targetUserId, userId);
        }
        // Registration form callbacks
        else if (data === 'select_social') {
            const { getUser, setUser } = require('./database/users');
            const user = await getUser(userId);
            if (user) {
                user.studentType = 'Social Science';
                await setUser(userId, user);
                await bot.answerCallbackQuery(callbackQuery.id, { text: '✅ Social Science selected' });
                await showPaymentMethods(chatId, userId);
            }
        }
        else if (data === 'select_natural') {
            const { getUser, setUser } = require('./database/users');
            const user = await getUser(userId);
            if (user) {
                user.studentType = 'Natural Science';
                await setUser(userId, user);
                await bot.answerCallbackQuery(callbackQuery.id, { text: '✅ Natural Science selected' });
                await showPaymentMethods(chatId, userId);
            }
        }
        else if (data === 'payment_telebirr') {
            const { getUser, setUser } = require('./database/users');
            const user = await getUser(userId);
            if (user) {
                user.paymentMethod = 'TeleBirr';
                await setUser(userId, user);
                await bot.answerCallbackQuery(callbackQuery.id, { text: '✅ TeleBirr selected' });
                await showAccountDetails(chatId, 'TeleBirr');
            }
        }
        else if (data === 'payment_cbe') {
            const { getUser, setUser } = require('./database/users');
            const user = await getUser(userId);
            if (user) {
                user.paymentMethod = 'CBE Birr';
                await setUser(userId, user);
                await bot.answerCallbackQuery(callbackQuery.id, { text: '✅ CBE Birr selected' });
                await showAccountDetails(chatId, 'CBE Birr');
            }
        }

        await bot.answerCallbackQuery(callbackQuery.id);
    } catch (error) {
        console.error('Callback error:', error);
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

            if (update.message) {
                await handleMessage(update.message);
            } else if (update.callback_query) {
                await handleCallbackQuery(update.callback_query);
            }

            return res.status(200).json({ ok: true });
        } catch (error) {
            console.error('Error processing update:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
};

console.log('✅ Modular Tutorial Registration Bot configured for Vercel!');
