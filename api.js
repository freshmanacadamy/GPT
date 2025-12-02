// Initialize configuration
const { initializeConfig } = require('./config/environment');

initializeConfig().then(() => {
    console.log('Bot configuration initialized');
}).catch(error => {
    console.error('Failed to initialize config:', error);
});

// Global error handlers
process.on('unhandledRejection', (error) => {
    console.error('Unhandled Promise Rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

// Import configurations
const bot = require('./config/bot');
const { showMainMenu } = require('./handlers/menu');
const environment = require('./config/environment');

// Import handlers
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
const AdminHandler = require('./handlers/admin');
const { handleHelp, handleRules } = require('./handlers/help');
const SettingsHandler = require('./handlers/settings');
const StudentManagement = require('./handlers/studentManagement');

// Import database functions for health check
const { getAllUsers, getVerifiedUsers } = require('./database/users');
const { getPendingPayments } = require('./database/payments');
const { getPendingWithdrawals } = require('./database/withdrawals');

// Store admin message composition state
const adminMessageState = new Map();

// MESSAGE HANDLER
const handleMessage = async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    if (!text && !msg.contact && !msg.photo && !msg.document) return;

    try {
        // Check if user is in editing mode (settings)
        const editingState = SettingsHandler.getEditingState(userId);
        if (editingState) {
            await handleEditingInput(msg, editingState);
            return;
        }

        // Check admin message composition states
        const adminState = adminMessageState.get(userId);
        if (adminState) {
            // Handle broadcast message text
            if (adminState.type === 'broadcast' && adminState.step === 'waiting_message') {
                const handled = await AdminHandler.handleBroadcastMessageText(userId, text);
                if (handled) return;
            }

            // Handle single user message text
            if (adminState.type === 'single_user' && adminState.step === 'waiting_message') {
                const handled = await AdminHandler.handleCustomMessageText(userId, text);
                if (handled) return;
            }

            // Handle button data input (both single and broadcast)
            if (adminState.step === 'adding_url_button' || adminState.step === 'adding_callback_button') {
                const handled = await AdminHandler.handleButtonData(userId, text);
                if (handled) return;
            }
        }

        // Check if user is in date filter mode (student management)
        const dateState = StudentManagement.dateFilterState;
        if (dateState && dateState.get(chatId)) {
            await StudentManagement.handleDateInput(msg, text);
            return;
        }

        // Check if user is in delete confirmation mode
        if (text === 'CONFIRM DELETE' || text === 'Cancel Delete') {
            await StudentManagement.handleDeleteConfirmation(msg, text);
            return;
        }

        // First check if it's a navigation command
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
                    await AdminHandler.handleAdminPanel(msg);
                    break;
                case '/help':
                    await handleHelp(msg);
                    break;
                case '/stats':
                    await AdminHandler.handleAdminStats(msg);
                    break;
                case '/register':
                    await handleRegisterTutorial(msg);
                    break;
                case '/cancel':
                    SettingsHandler.clearEditingState(userId);
                    await bot.sendMessage(chatId, 'Editing cancelled.');
                    await showMainMenu(chatId);
                    break;
                default:
                    await showMainMenu(chatId);
            }
        } else {
            // Handle button clicks using DYNAMIC button texts
            await handleButtonClick(msg, text);
        }
    } catch (error) {
        console.error('Error handling message:', error);
        await bot.sendMessage(chatId, 'An error occurred. Please try again.');
    }
};

// Dynamic button click handler
async function handleButtonClick(msg, text) {
    const chatId = msg.chat.id;

    // Get fresh button texts from environment
    const buttons = environment.BUTTON_TEXTS;

    // Handle main menu buttons
    switch (text) {
        case buttons.REGISTER:
        case 'Register for Tutorial':
            await handleRegisterTutorial(msg);
            break;
        case buttons.PROFILE:
        case 'My Profile':
            await handleMyProfile(msg);
            break;
        case buttons.INVITE:
        case 'Invite & Earn':
            await handleInviteEarn(msg);
            break;
        case buttons.LEADERBOARD:
        case 'Leaderboard':
            await handleLeaderboard(msg);
            break;
        case buttons.HELP:
        case 'Help':
            await handleHelp(msg);
            break;
        case buttons.RULES:
        case 'Rules':
            await handleRules(msg);
            break;
        case buttons.PAY_FEE:
        case 'Pay Tutorial Fee':
            await handlePayFee(msg);
            break;
        case buttons.WITHDRAW:
        case 'Withdraw Rewards':
            await handleWithdrawRewards(msg);
            break;
        case buttons.CHANGE_PAYMENT:
        case 'Change Payment Method':
            await handleChangePaymentMethod(msg);
            break;
        case buttons.MY_REFERRALS:
        case 'My Referrals':
            await handleMyReferrals(msg);
            break;

        // Admin buttons
        case buttons.ADMIN_PANEL:
        case 'Admin Panel':
            await AdminHandler.handleAdminPanel(msg);
            break;
        case buttons.BOT_SETTINGS:
        case 'Bot Settings':
            await SettingsHandler.showSettingsDashboard(msg);
            break;
        case 'Financial Settings':
            await SettingsHandler.showFinancialSettings(msg);
            break;
        case 'Feature Toggles':
            await SettingsHandler.showFeatureToggles(msg);
            break;
        case 'Message Management':
            await SettingsHandler.showMessageManagement(msg);
            break;
        case 'Button Texts':
            await SettingsHandler.showButtonManagement(msg);
            break;
        case 'Reset Settings':
            await SettingsHandler.handleResetSettings(msg);
            break;
        case 'View All Config':
            await SettingsHandler.handleViewAllConfig(msg);
            break;
        case 'Broadcast Message':
            await AdminHandler.handleBroadcastMessage(msg);
            break;

        // Student Management buttons
        case 'Manage Students':
        case 'View All Students':
            await StudentManagement.viewAllStudents(msg);
            break;
        case 'Paid Students':
            await StudentManagement.viewAllStudents(msg, 'paid');
            break;
        case 'Unpaid Students':
            await StudentManagement.viewAllStudents(msg, 'unpaid');
            break;
        case 'Referral Tree':
            await StudentManagement.showReferralTree(msg);
            break;
        case 'Set Date Filter':
            await StudentManagement.showDateFilter(msg);
            break;
        case 'Export Data':
            await StudentManagement.showExportOptions(msg);
            break;
        case 'Delete Students':
            await StudentManagement.showDeleteOptions(msg);
            break;

        // Navigation buttons
        case 'Back to Menu':
            await showMainMenu(chatId);
            break;
        case 'Back to Admin Panel':
            await AdminHandler.handleAdminPanel(msg);
            break;
        case 'Upload Payment Screenshot':
            await handleScreenshotUpload(msg);
            break;
        default:
            // Handle name input and other text
            await handleNameInput(msg);
    }
}

// Handle editing input from settings
async function handleEditingInput(msg, editingState) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    if (text === '/cancel') {
        SettingsHandler.clearEditingState(userId);
        await bot.sendMessage(chatId, 'Editing cancelled.');
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
            await bot.sendMessage(chatId, 'Unknown editing mode. Cancelling.');
            SettingsHandler.clearEditingState(userId);
    }
}

// START COMMAND
const handleStart = async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Handle referral tracking
    await handleReferralStart(msg, userId);

    // Get fresh message from environment
    const startMessage = environment.MESSAGES.START_WELCOME
        .replace('{fee}', environment.REGISTRATION_FEE)
        .replace('{reward}', environment.REFERRAL_REWARD);

    await bot.sendMessage(chatId, startMessage, {
        parse_mode: 'Markdown'
    });

    await showMainMenu(chatId);
};

// CALLBACK QUERY HANDLER
const handleCallbackQuery = async (callbackQuery) => {
    const message = callbackQuery.message;
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;
    const chatId = message.chat.id;

    try {
        console.log('Callback received:', data);

        // First try the new registration callback handler
        const handled = await handleRegistrationCallback(callbackQuery);
        if (handled) {
            console.log('Registration callback handled');
            await bot.answerCallbackQuery(callbackQuery.id);
            return;
        }

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
        // RESET FUNCTIONALITY
        else if (data === 'reset_all_settings') {
            await SettingsHandler.handleResetAction(callbackQuery, 'all');
        }
        else if (data === 'reset_financial') {
            await SettingsHandler.handleResetAction(callbackQuery, 'financial');
        }
        else if (data === 'reset_features') {
            await SettingsHandler.handleResetAction(callbackQuery, 'features');
        }
        else if (data === 'reset_messages') {
            await SettingsHandler.handleResetAction(callbackQuery, 'messages');
        }
        // STUDENT MANAGEMENT CALLBACKS
        else if (data.startsWith('students_') || data.startsWith('export_') || data === 'detailed_referrals') {
            await StudentManagement.handleStudentCallback(callbackQuery, data);
        }
        // Admin callbacks
        else if (data.startsWith('admin_approve_')) {
            const targetUserId = parseInt(data.replace('admin_approve_', ''));
            await AdminHandler.handleAdminApprove(targetUserId, userId);
        }
        else if (data.startsWith('admin_reject_')) {
            const targetUserId = parseInt(data.replace('admin_reject_', ''));
            await AdminHandler.handleAdminReject(targetUserId, userId);
        }
        else if (data.startsWith('admin_details_')) {
            const targetUserId = parseInt(data.replace('admin_details_', ''));
            await AdminHandler.handleAdminDetails(targetUserId, userId);
        }
        // Admin approval messaging callbacks
        else if (data.startsWith('welcome_template:')) {
            const targetUserId = parseInt(data.replace('welcome_template:', ''));
            await AdminHandler.sendWelcomeTemplate(userId, targetUserId);
        }
        else if (data.startsWith('custom_msg:')) {
            const targetUserId = parseInt(data.replace('custom_msg:', ''));
            await AdminHandler.startCustomMessage(userId, targetUserId);
        }
        else if (data.startsWith('skip_message:')) {
            const targetUserId = parseInt(data.replace('skip_message:', ''));
            await AdminHandler.skipMessaging(userId, targetUserId);
        }
        else if (data.startsWith('add_url:')) {
            const targetUserId = parseInt(data.replace('add_url:', ''));
            await AdminHandler.addUrlButton(userId, targetUserId);
        }
        else if (data.startsWith('add_callback:')) {
            const targetUserId = parseInt(data.replace('add_callback:', ''));
            await AdminHandler.addCallbackButton(userId, targetUserId);
        }
        else if (data.startsWith('preview_msg:')) {
            const targetUserId = parseInt(data.replace('preview_msg:', ''));
            await AdminHandler.previewMessage(userId, targetUserId);
        }
        else if (data.startsWith('send_custom:')) {
            const targetUserId = parseInt(data.replace('send_custom:', ''));
            await AdminHandler.sendCustomMessage(userId, targetUserId);
        }
        else if (data.startsWith('cancel_custom:')) {
            const targetUserId = parseInt(data.replace('cancel_custom:', ''));
            await AdminHandler.cancelCustomMessage(userId, targetUserId);
        }
        else if (data.startsWith('clear_buttons:')) {
            const targetUserId = parseInt(data.replace('clear_buttons:', ''));
            await AdminHandler.clearAllButtons(userId, targetUserId);
        }
        // Broadcast callbacks
        else if (data.startsWith('broadcast_')) {
            if (data === 'broadcast_all' || data === 'broadcast_verified' ||
                data === 'broadcast_natural' || data === 'broadcast_social' ||
                data === 'broadcast_pending_approval') {
                await AdminHandler.setBroadcastTarget(callbackQuery, data);
            }
            else if (data === 'broadcast_add_url') {
                await AdminHandler.addBroadcastUrlButton(userId);
            }
            else if (data === 'broadcast_add_callback') {
                await AdminHandler.addBroadcastCallbackButton(userId);
            }
            else if (data === 'broadcast_preview') {
                await AdminHandler.previewBroadcast(userId);
            }
            else if (data === 'broadcast_send') {
                await AdminHandler.sendBroadcast(userId);
            }
            else if (data === 'broadcast_cancel') {
                await AdminHandler.cancelBroadcast(userId);
            }
            else if (data === 'broadcast_clear_buttons') {
                await AdminHandler.clearBroadcastButtons(userId);
            }
        }
        else {
            console.log('No handler found for callback:', data);
            await bot.answerCallbackQuery(callbackQuery.id, { text: 'Unknown command' });
        }

    } catch (error) {
        console.error('Callback error:', error);
        await bot.answerCallbackQuery(callbackQuery.id, { text: 'Error processing request' });
    }
};

// Export admin state for use in handlers
module.exports.adminMessageState = adminMessageState;

// VERCEL HANDLER
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
                message: 'Tutorial Registration Bot is running on Vercel',
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
            console.log('Webhook update received');

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

console.log('Tutorial Registration Bot configured for Vercel');
