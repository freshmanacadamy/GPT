const bot = require('../config/bot');
const { getUser, setUser } = require('../database/users');
const { addWithdrawalRequest } = require('../database/withdrawals');
const { notifyAdminsWithdrawal } = require('../utils/notifications');
const { REFERRAL_REWARD, MIN_REFERRALS_FOR_WITHDRAW } = require('../config/environment');
const { getFirebaseTimestamp } = require('../utils/helpers');

const handleMyProfile = async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const user = await getUser(userId);

    const minWithdrawal = MIN_REFERRALS_FOR_WITHDRAW * REFERRAL_REWARD;
    const canWithdraw = user?.rewards >= minWithdrawal;

    const profileMessage = 
        `👤 *MY PROFILE*\n\n` +
        `📋 Name: ${user?.name || 'Not set'}\n` +
        `📱 Phone: ${user?.phone || 'Not set'}\n` +
        `🎓 Student Type: ${user?.studentType || 'Not set'}\n` +
        `✅ Status: ${user?.isVerified ? '✅ Verified' : '⏳ Pending Approval'}\n` +
        `👥 Referrals: ${user?.referralCount || 0}\n` +
        `💰 Rewards: ${(user?.rewards || 0)} ETB\n` +
        `📊 Registration: ${user?.joinedAt ? getFirebaseTimestamp(user.joinedAt).toLocaleDateString() : 'Not set'}\n` +
        `💳 Account: ${user?.accountNumber || 'Not set'}\n` +
        `👤 Account Name: ${user?.accountName || 'Not set'}\n\n` +
        `Can Withdraw: ${canWithdraw ? '✅ Yes' : '❌ No'}\n` +
        `Minimum for withdrawal: ${minWithdrawal} ETB`;

    const options = {
        reply_markup: {
            keyboard: [
                [{ text: '💰 Withdraw Rewards' }, { text: '💳 Change Payment Method' }],
                [{ text: '📊 My Referrals' }, { text: '🔙 Back to Menu' }]
            ],
            resize_keyboard: true
        }
    };

    await bot.sendMessage(chatId, profileMessage, { parse_mode: 'Markdown', ...options });
};

const handleWithdrawRewards = async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const user = await getUser(userId);

    const minWithdrawal = MIN_REFERRALS_FOR_WITHDRAW * REFERRAL_REWARD;
    
    if (!user || user.rewards < minWithdrawal) {
        await bot.sendMessage(chatId,
            `❌ *Insufficient funds for withdrawal*\n\n` +
            `💰 Available: ${user?.rewards || 0} ETB\n` +
            `Minimum required: ${minWithdrawal} ETB\n\n` +
            `Continue earning referrals to reach the minimum!`,
            { parse_mode: 'Markdown' }
        );
        return;
    }

    if (!user.accountNumber || !user.accountName) {
        await bot.sendMessage(chatId,
            `💳 *Payment account not set*\n\n` +
            `Please set your payment account first using the 'Change Payment Method' button.`,
            { parse_mode: 'Markdown' }
        );
        return;
    }

    await addWithdrawalRequest({
        userId: userId,
        amount: user.rewards,
        accountNumber: user.accountNumber,
        accountName: user.accountName,
        paymentMethod: user.paymentMethodPreference,
        status: 'pending'
    });

    await bot.sendMessage(chatId,
        `✅ *Withdrawal request submitted!*\n\n` +
        `💰 Amount: ${user.rewards} ETB\n` +
        `💳 To: ${user.paymentMethodPreference} ${user.accountNumber}\n` +
        `Status: ⏳ Pending admin approval\n\n` +
        `You will be notified when approved.`,
        { parse_mode: 'Markdown' }
    );

    await notifyAdminsWithdrawal(user, userId);
};

const handleChangePaymentMethod = async (msg) => {
    const chatId = msg.chat.id;

    await bot.sendMessage(chatId,
        `💳 *CHANGE PAYMENT METHOD*\n\n` +
        `Please select your preferred payment method:`,
        { 
            parse_mode: 'Markdown',
            reply_markup: {
                keyboard: [
                    [{ text: '📱 TeleBirr' }, { text: '🏦 CBE Birr' }],
                    [{ text: '🔙 Back to Menu' }]
                ],
                resize_keyboard: true
            }
        }
    );
};

const handleSetPaymentMethod = async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;
    const user = await getUser(userId);

    if (text === '📱 TeleBirr' || text === '🏦 CBE Birr') {
        user.paymentMethodPreference = text.includes('Tele') ? 'TeleBirr' : 'CBE Birr';
        await setUser(userId, user);

        await bot.sendMessage(chatId,
            `✅ *Payment method set to ${user.paymentMethodPreference}*\n\n` +
            `Now enter your ${user.paymentMethodPreference} account number:`,
            { parse_mode: 'Markdown' }
        );
    }
};

const handleSetAccountNumber = async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;
    const user = await getUser(userId);

    if (user?.paymentMethodPreference && text.startsWith('+') && text.length >= 10) {
        user.accountNumber = text;
        await setUser(userId, user);

        await bot.sendMessage(chatId,
            `✅ *Account number set: ${text}*\n\n` +
            `Now enter the account name as it appears on the account:`,
            { parse_mode: 'Markdown' }
        );
    } else {
        await bot.sendMessage(chatId,
            `❌ *Invalid account number format*\n\n` +
            `Please enter a valid phone number with country code (e.g., +251912345678)`,
            { parse_mode: 'Markdown' }
        );
    }
};

const handleSetAccountName = async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;
    const user = await getUser(userId);

    user.accountName = text;
    await setUser(userId, user);

    await bot.sendMessage(chatId,
        `✅ *Account name set: ${text}*\n\n` +
        `Your payment method has been updated successfully!`,
        { parse_mode: 'Markdown' }
    );
};

module.exports = {
    handleMyProfile,
    handleWithdrawRewards,
    handleChangePaymentMethod,
    handleSetPaymentMethod,
    handleSetAccountNumber,
    handleSetAccountName
};
