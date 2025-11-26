const bot = require('../config/bot');
const { getUser, setUser } = require('../database/users');
const { BOT_USERNAME, REFERRAL_REWARD, MIN_REFERRALS_FOR_WITHDRAW } = require('../config/environment');

const handleInviteEarn = async (msg) => {
    try {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        
        const user = await getUser(userId);
        if (!user) {
            await bot.sendMessage(chatId, '❌ User not found. Please start the bot with /start first.');
            return;
        }
        
        const referralLink = `https://t.me/${BOT_USERNAME}?start=ref_${userId}`;
        const minWithdrawal = MIN_REFERRALS_FOR_WITHDRAW * REFERRAL_REWARD;
        const canWithdraw = (user.rewards || 0) >= minWithdrawal;

        const inviteMessage = 
            `🎁 *INVITE & EARN*\n\n` +
            `🔗 *Your Referral Link:*\n` +
            `${referralLink}\n\n` +
            `📊 *Your Stats:*\n` +
            `• Referrals: ${user.referralCount || 0}\n` +
            `• Rewards: ${user.rewards || 0} ETB\n` +
            `• Can Withdraw: ${canWithdraw ? '✅ Yes' : '❌ No'}\n\n` +
            `💰 *Earn ${REFERRAL_REWARD} ETB for each successful referral!*\n\n` +
            `📝 *How it works:*\n` +
            `1. Click the button below to share\n` +
            `2. Friends register using your link\n` +
            `3. You get ${REFERRAL_REWARD} ETB when they complete registration\n` +
            `4. Withdraw after ${MIN_REFERRALS_FOR_WITHDRAW} referrals`;

        const options = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🔗 Share Your Referral Link', url: referralLink }]
                ]
            },
            parse_mode: 'Markdown'
        };

        await bot.sendMessage(chatId, inviteMessage, options);
        console.log('✅ Invite & Earn sent successfully to user:', userId);
        
    } catch (error) {
        console.error('❌ Error in handleInviteEarn:', error);
        await bot.sendMessage(msg.chat.id, '❌ An error occurred. Please try again.');
    }
};

const handleLeaderboard = async (msg) => {
    try {
        const chatId = msg.chat.id;
        const { getTopReferrers } = require('../database/users');
        
        const topReferrers = await getTopReferrers(10);

        if (!topReferrers || topReferrers.length === 0) {
            await bot.sendMessage(chatId,
                `📈 *LEADERBOARD*\n\n` +
                `🏆 No referrals yet. Be the first to invite friends!`,
                { parse_mode: 'Markdown' }
            );
            return;
        }

        let leaderboardText = `🏆 *TOP REFERRERS*\n\n`;
        
        topReferrers.forEach((user, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            const name = user.firstName || `User ${user.id}`;
            const referrals = user.referralCount || 0;
            const rewards = user.rewards || 0;
            
            leaderboardText += `${medal} ${name}\n`;
            leaderboardText += `   📊 ${referrals} referrals | 💰 ${rewards} ETB\n\n`;
        });

        leaderboardText += `\n💡 *Tip:* Share your referral link to climb the leaderboard!`;

        await bot.sendMessage(chatId, leaderboardText, { parse_mode: 'Markdown' });
        
    } catch (error) {
        console.error('❌ Error in handleLeaderboard:', error);
        await bot.sendMessage(msg.chat.id, '❌ An error occurred loading leaderboard.');
    }
};

const handleMyReferrals = async (msg) => {
    try {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const { getUserReferrals } = require('../database/users');
        
        const referrals = await getUserReferrals(userId);
        const user = await getUser(userId);
        
        if (!referrals || referrals.length === 0) {
            await bot.sendMessage(chatId,
                `📊 *MY REFERRALS*\n\n` +
                `You haven't referred anyone yet.\n\n` +
                `Share your referral link from "🎁 Invite & Earn" to start earning!`,
                { parse_mode: 'Markdown' }
            );
            return;
        }
        
        let referralText = `📊 *MY REFERRALS (${referrals.length})*\n\n`;
        referralText += `• Total Referrals: ${user.referralCount || 0}\n`;
        referralText += `• Total Rewards: ${user.rewards || 0} ETB\n\n`;
        referralText += `👥 *Referred Users:*\n\n`;
        
        referrals.forEach((referral, index) => {
            const name = referral.firstName || `User ${referral.id}`;
            const status = referral.isVerified ? '✅ Verified' : '⏳ Pending';
            referralText += `${index + 1}. ${name} - ${status}\n`;
        });
        
        referralText += `\n💰 *You've earned: ${(referrals.length * REFERRAL_REWARD)} ETB*`;
        
        await bot.sendMessage(chatId, referralText, { parse_mode: 'Markdown' });
        
    } catch (error) {
        console.error('❌ Error in handleMyReferrals:', error);
        await bot.sendMessage(msg.chat.id, '❌ An error occurred loading your referrals.');
    }
};

const handleReferralStart = async (msg, userId) => {
    try {
        let referrerId = null;
        
        if (msg.text && msg.text.includes('start=ref_')) {
            const refMatch = msg.text.match(/start=ref_(\d+)/);
            if (refMatch && refMatch[1]) {
                referrerId = parseInt(refMatch[1]);
                
                if (referrerId !== userId) {
                    const referrer = await getUser(referrerId);
                    const newUser = await getUser(userId);
                    
                    if (referrer && newUser) {
                        referrer.referralCount = (referrer.referralCount || 0) + 1;
                        referrer.rewards = (referrer.rewards || 0) + REFERRAL_REWARD;
                        referrer.totalRewards = (referrer.totalRewards || 0) + REFERRAL_REWARD;
                        
                        await setUser(referrerId, referrer);
                        
                        newUser.referrerId = referrerId.toString();
                        await setUser(userId, newUser);
                        
                        console.log(`✅ Referral recorded: User ${userId} referred by ${referrerId}`);
                    }
                }
            }
        }
        
        return referrerId;
        
    } catch (error) {
        console.error('❌ Error in handleReferralStart:', error);
        return null;
    }
};

module.exports = {
    handleInviteEarn,
    handleLeaderboard,
    handleMyReferrals,
    handleReferralStart
};
