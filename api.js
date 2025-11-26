// Add at the top of api.js
const { initializeConfig } = require('./config/environment');

// Initialize configuration on startup
initializeConfig().then(() => {
    console.log('✅ Bot configuration initialized');
}).catch(error => {
    console.error('❌ Failed to initialize config:', error);
});

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
const SettingsHandler = require('./handlers/settings');

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
        // Check if user is in editing mode
        const editingState = SettingsHandler.getEditingState(userId);
        if (editingState) {
            await handleEditingInput(msg, editingState);
            return;
        }

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
                case '/cancel':
                    SettingsHandler.clearEditingState(userId);
                    await bot.sendMessage(chatId, '❌ Editing cancelled.');
                    await showMainMenu(chatId);
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
                case '🛠️ Admin Panel':
                    await handleAdminPanel(msg);
                    break;
                case '⚙️ Bot Settings':
                    await SettingsHandler.showSettingsDashboard(msg);
                    break;
                case '💰 Financial Settings':
                    await SettingsHandler.showFinancialSettings(msg);
                    break;
                case '⚙️ Feature Toggles':
                    await SettingsHandler.showFeatureToggles(msg);
                    break;
                case '📝 Message Settings':
                    await SettingsHandler.showMessageManagement(msg);
                    break;
                case '🔧 Button Texts':
                    await SettingsHandler.showButtonManagement(msg);
                    break;
                case '🔄 Reset Settings':
                    await SettingsHandler.handleResetSettings(msg);
                    break;
                case '📊 View All Config':
                    await SettingsHandler.handleViewAllConfig(msg);
                    break;
                case '🔙 Back to Admin Panel':
                    await handleAdminPanel(msg);
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

// Handle editing input from settings
async function handleEditingInput(msg, editingState) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    if (text === '/cancel') {
        SettingsHandler.clearEditingState(userId);
        await bot.sendMessage(chatId, '❌ Editing cancelled.');
        await SettingsHandler.showSettingsDashboard(msg);
        return;
    }

    switch (editingState.type) {
        case 'financial':
            await SettingsHandler.handleNumericInput(msg, editingState.key, text);
            break;
        case 'message':
            await SettingsHandler.handleMessageInput(msg, editingState.key, text);
            break;
        case 'button':
            await SettingsHandler.handleButtonInput(msg, editingState.key, text);
            break;
        default:
            await bot.sendMessage(chatId, '❌ Unknown editing mode. Cancelling.');
            SettingsHandler.clearEditingState(userId);
    }
}

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

        console.log('🔄 Registration callback not handled, trying settings callbacks...');

        // Settings callbacks
        if (data.startsWith('edit_financial:')) {
            const settingKey = data.replace('edit_financial:', '');
            await SettingsHandler.handleFinancialEdit(callbackQuery, settingKey);
        }
        else if (data.startsWith('toggle_feature:')) {
            const featureKey = data.replace('toggle_feature:', '');
            await SettingsHandler.handleFeatureToggle(callbackQuery, featureKey);
        }
        else if (data.startsWith('edit_message:')) {
            const messageKey = data.replace('edit_message:', '');
            await SettingsHandler.handleMessageEdit(callbackQuery, messageKey);
        }
        else if (data.startsWith('edit_buttons:')) {
            const category = data.replace('edit_buttons:', '');
            await SettingsHandler.handleButtonEdit(callbackQuery, category);
        }
        else if (data.startsWith('edit_button:')) {
            const buttonKey = data.replace('edit_button:', '');
            await SettingsHandler.handleIndividualButtonEdit(callbackQuery, buttonKey);
        }
        else if (data === 'settings_back') {
            await SettingsHandler.showSettingsDashboard(callbackQuery.message);
        }
        else if (data === 'button_management_back') {
            await SettingsHandler.showButtonManagement(callbackQuery.message);
        }
        else if (data === 'cancel_edit') {
            SettingsHandler.clearEditingState(userId);
            await bot.answerCallbackQuery(callbackQuery.id, { text: 'Editing cancelled' });
            await SettingsHandler.showSettingsDashboard(callbackQuery.message);
        }
        else if (data === 'reset_all_settings') {
            const success = await require('../database/config').ConfigService.resetToDefault();
            if (success) {
                await bot.answerCallbackQuery(callbackQuery.id, { text: '✅ All settings reset to defaults' });
                await SettingsHandler.showSettingsDashboard(callbackQuery.message);
            } else {
                await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Failed to reset settings' });
            }
        }
        // Admin callbacks
        else if (data.startsWith('admin_approve_')) {
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
