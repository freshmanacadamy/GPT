const bot = require('../config/bot');
const { getAllUsers, getVerifiedUsers, setUser, getUser } = require('../database/users');
const { getPendingPayments } = require('../database/payments');
const { getPendingWithdrawals } = require('../database/withdrawals');
const { ADMIN_IDS, REGISTRATION_FEE, REFERRAL_REWARD, MIN_REFERRALS_FOR_WITHDRAW, MIN_WITHDRAWAL_AMOUNT } = require('../config/environment');
const { getFirebaseTimestamp } = require('../utils/helpers');
const MessageHelper = require('../utils/messageHelper');
const SettingsHandler = require('./settings');

const handleAdminPanel = async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!ADMIN_IDS.includes(userId)) {
        await bot.sendMessage(chatId, '❌ You are not authorized to use admin commands.', { parse_mode: 'Markdown' });
        return;
    }

    const allUsers = await getAllUsers();
    const verifiedUsers = await getVerifiedUsers();
    const pendingPayments = await getPendingPayments();
    const pendingWithdrawals = await getPendingWithdrawals();

    const options = {
        reply_markup: {
            keyboard: MessageHelper.getAdminButtons(),
            resize_keyboard: true
        }
    };

    const adminMessage = 
        `🛡️ *ADMIN PANEL*\n\n` +
        `📊 *Quick Stats:*\n` +
        `• Total Users: ${Object.keys(allUsers).length}\n` +
        `• Verified Users: ${verifiedUsers.length}\n` +
        `• Pending Payments: ${pendingPayments.length}\n` +
        `• Pending Withdrawals: ${pendingWithdrawals.length}\n` +
        `• Total Referrals: ${Object.values(allUsers).reduce((sum, u) => sum + (u.referralCount || 0), 0)}\n\n` +
        `💰 *Current Settings:*\n` +
        `• Registration Fee: ${REGISTRATION_FEE} ETB\n` +
        `• Referral Reward: ${REFERRAL_REWARD} ETB\n` +
        `• Min Referrals: ${MIN_REFERRALS_FOR_WITHDRAW}\n` +
        `• Min Withdrawal: ${MIN_WITHDRAWAL_AMOUNT} ETB\n\n` +
        `Choose an admin function:`;

    await bot.sendMessage(chatId, adminMessage, { parse_mode: 'Markdown', ...options });
};

// Add the new admin commands to handleAdminPanel
// Update the admin panel keyboard in the getAdminButtons function

// ... rest of your existing admin functions remain the same
const handleAdminApprove = async (targetUserId, adminId) => {
    const user = await getUser(targetUserId);
    if (user) {
        user.isVerified = true;
        user.paymentStatus = 'approved';
        await setUser(targetUserId, user);

        try {
            await bot.sendMessage(targetUserId,
                `🎉 *REGISTRATION APPROVED!*\n\n` +
                `✅ Your registration has been approved!\n\n` +
                `📚 You can now access tutorials.\n` +
                `💰 Registration fee: ${REGISTRATION_FEE} ETB`,
                { parse_mode: 'Markdown' }
            );
        } catch (error) {
            console.error('Failed to send approval message:', error);
        }

        await bot.sendMessage(adminId, `✅ *Payment approved for user ${targetUserId}*`, { parse_mode: 'Markdown' });
    }
};

const handleAdminReject = async (targetUserId, adminId) => {
    const user = await getUser(targetUserId);
    if (user) {
        user.isVerified = false;
        user.paymentStatus = 'rejected';
        await setUser(targetUserId, user);

        try {
            await bot.sendMessage(targetUserId,
                `❌ *PAYMENT REJECTED*\n\n` +
                `Your payment has been rejected.\n\n` +
                `Please contact admin for more information.`,
                { parse_mode: 'Markdown' }
            );
        } catch (error) {
            console.error('Failed to send rejection message:', error);
        }

        await bot.sendMessage(adminId, `❌ *Payment rejected for user ${targetUserId}*`, { parse_mode: 'Markdown' });
    }
};

const handleAdminDetails = async (targetUserId, adminId) => {
    const user = await getUser(targetUserId);
    if (user) {
        const detailsMessage = 
            `🔍 *USER DETAILS*\n\n` +
            `👤 Name: ${user.name}\n` +
            `📱 Phone: ${user.phone}\n` +
            `🎓 Type: ${user.studentType}\n` +
            `✅ Verified: ${user.isVerified ? 'Yes' : 'No'}\n` +
            `👥 Referrals: ${user.referralCount || 0}\n` +
            `💰 Rewards: ${user.rewards || 0} ETB\n` +
            `📊 Joined: ${user.joinedAt ? getFirebaseTimestamp(user.joinedAt).toLocaleDateString() : 'N/A'}\n` +
            `💳 Account: ${user.accountNumber || 'Not set'}\n` +
            `🆔 User ID: ${user.telegramId}`;

        await bot.sendMessage(adminId, detailsMessage, { parse_mode: 'Markdown' });
    }
};

const handleAdminStats = async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!ADMIN_IDS.includes(userId)) {
        await bot.sendMessage(chatId, '❌ You are not authorized.', { parse_mode: 'Markdown' });
        return;
    }

    const allUsers = await getAllUsers();
    const verifiedUsers = await getVerifiedUsers();
    const pendingPayments = await getPendingPayments();
    const pendingWithdrawals = await getPendingWithdrawals();
    const totalReferrals = Object.values(allUsers).reduce((sum, u) => sum + (u.referralCount || 0), 0);
    const totalRewards = Object.values(allUsers).reduce((sum, u) => sum + (u.totalRewards || 0), 0);

    const statsMessage = 
        `📊 *STUDENT STATISTICS*\n\n` +
        `👥 Total Users: ${Object.keys(allUsers).length}\n` +
        `✅ Verified Users: ${verifiedUsers.length}\n` +
        `⏳ Pending Approvals: ${pendingPayments.length}\n` +
        `💳 Pending Withdrawals: ${pendingWithdrawals.length}\n` +
        `💰 Total Referrals: ${totalReferrals}\n` +
        `🎁 Total Rewards: ${totalRewards} ETB\n` +
        `📅 Active Since: ${Object.values(allUsers)[0]?.joinedAt ? getFirebaseTimestamp(Object.values(allUsers)[0].joinedAt).toLocaleDateString() : 'N/A'}`;

    await bot.sendMessage(chatId, statsMessage, { parse_mode: 'Markdown' });
};

module.exports = {
    handleAdminPanel,
    handleAdminApprove,
    handleAdminReject,
    handleAdminDetails,
    handleAdminStats
};
