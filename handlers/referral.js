const bot = require('../config/bot');
const { getUser, setUser } = require('../database/users');
const { BOT_USERNAME, REFERRAL_REWARD, MIN_REFERRALS_FOR_WITHDRAW } = require('../config/environment');

const handleInviteEarn = async (msg) => {
    try {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        
        console.log('🔄 HandleInviteEarn called for user:', userId);
        
        // Test if basic function works
        await bot.sendMessage(chatId, '🎁 Testing Invite & Earn...');
        
        // Test if getUser works
        const user = await getUser(userId);
        console.log('📊 User data:', user);
        
        if (!user) {
            await bot.sendMessage(chatId, '❌ User not found in database');
            return;
        }
        
        // Test if environment variables work
        console.log('🔧 Env vars:', { BOT_USERNAME, REFERRAL_REWARD, MIN_REFERRALS_FOR_WITHDRAW });
        
        const referralLink = `https://t.me/${BOT_USERNAME}?start=ref_${userId}`;
        console.log('🔗 Generated link:', referralLink);
        
        // Simple message without buttons first
        const testMessage = `🎁 INVITE & EARN TEST\n\nYour ID: ${userId}\nBot: ${BOT_USERNAME}`;
        await bot.sendMessage(chatId, testMessage);
        
        console.log('✅ Basic test passed');
        
    } catch (error) {
        console.error('❌ CRITICAL Error in handleInviteEarn:', error);
        await bot.sendMessage(msg.chat.id, '❌ Critical error occurred.');
    }
};

const handleLeaderboard = async (msg) => {
    try {
        const chatId = msg.chat.id;
        await bot.sendMessage(chatId, '📊 Leaderboard - Working!');
    } catch (error) {
        console.error('Error in handleLeaderboard:', error);
    }
};

const handleMyReferrals = async (msg) => {
    try {
        const chatId = msg.chat.id;
        await bot.sendMessage(chatId, '👥 My Referrals - Working!');
    } catch (error) {
        console.error('Error in handleMyReferrals:', error);
    }
};

const handleReferralStart = async (msg, userId) => {
    try {
        console.log('Referral start check:', msg.text);
        return null;
    } catch (error) {
        console.error('Error in handleReferralStart:', error);
        return null;
    }
};

module.exports = {
    handleInviteEarn,
    handleLeaderboard,
    handleMyReferrals,
    handleReferralStart
};
