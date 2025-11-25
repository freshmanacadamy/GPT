const bot = require('../config/bot');
const { getUser, setUser } = require('../database/users');
const { getUserReferrals, getTopReferrers } = require('../database/users');
const { BOT_USERNAME, REFERRAL_REWARD, MIN_REFERRALS_FOR_WITHDRAW } = require('../config/environment');

const handleInviteEarn = async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const user = await getUser(userId);

    const referralLink = `https://t.me/${BOT_USERNAME}?start=ref_${userId}`;
    const minWithdrawal = MIN_REFERRALS_FOR_WITHDRAW * REFERRAL_REWARD;
    const canWithdraw = user?.rewards >= minWithdrawal;

    const inviteMessage = 
        `🎁 *INVITE & EARN*\n\n` +
        `🔗 *Your Referral Link:*\n` +
        `${referralLink}\n\n` +
        `📊 *Stats:*\n` +
        `• Referrals: ${user?.referralCount || 0}\n` +
        `• Rewards: ${(user?.rewards || 0)} ETB\n` +
        `• Can Withdraw: ${canWithdraw ? '✅ Yes' : '❌ No'}\n\n` +
        `💰 *Earn ${REFERRAL_REWARD} ETB for each successful referral!*`;

    await bot.sendMessage(chatId, inviteMessage, { parse_mode: 'Markdown' });
};

const handleLeaderboard = async (msg) => {
    const chatId = msg.chat.id;
    const topReferrers = await getTopReferrers(10);

    if (topReferrers.length === 0) {
        await bot.sendMessage(chatId,
            `📈 *LEADERBOARD*\n\n` +
            `📊 No referrals yet. Start inviting friends!`,
            { parse_mode: 'Markdown' }
        );
        return;
    }

    let leaderboardText = `📈 *TOP REFERRERS*\n\n`;
    topReferrers.forEach((user, index) => {
        leaderboardText += `${index + 1}. ${user.firstName} (${user.referralCount || 0} referrals)\n`;
    });

    await bot.sendMessage(chatId, leaderboardText, { parse_mode: 'Markdown' });
};

const handleMyReferrals = async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const referrals = await getUserReferrals(userId);
    
    let referralText = `📊 *MY REFERRALS (${referrals.length})*\n\n`;
    referrals.forEach((referral, index) => {
        referralText += `${index + 1}. ${referral.firstName}\n`;
    });
    
    await bot.sendMessage(chatId, referralText, { parse_mode: 'Markdown' });
};

// Handle referral tracking in start command
const handleReferralStart = async (msg, userId) => {
    let referrerId = null;
    
    if (msg.text && msg.text.includes('start=ref_')) {
        const refMatch = msg.text.match(/start=ref_(\d+)/);
        if (refMatch && refMatch[1]) {
            referrerId = parseInt(refMatch[1]);
            if (referrerId !== userId) {
                const referrer = await getUser(referrerId);
                if (referrer) {
                    referrer.referralCount = (referrer.referralCount || 0) + 1;
                    referrer.rewards = (referrer.rewards || 0) + REFERRAL_REWARD;
                    referrer.totalRewards = (referrer.totalRewards || 0) + REFERRAL_REWARD;
                    await setUser(referrerId, referrer);
                }
            }
        }
    }
    
    return referrerId;
};

module.exports = {
    handleInviteEarn,
    handleLeaderboard,
    handleMyReferrals,
    handleReferralStart
};
