const bot = require('../config/bot');
const { getUser, setUser } = require('../database/users');
const { BOT_USERNAME, REFERRAL_REWARD, MIN_REFERRALS_FOR_WITHDRAW } = require('../config/environment');

const handleInviteEarn = async (msg) => {
    try {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        
        console.log('=== DEBUG START ===');
        console.log('User ID:', userId);
        console.log('BOT_USERNAME from env:', BOT_USERNAME);
        console.log('REFERRAL_REWARD:', REFERRAL_REWARD);
        console.log('MIN_REFERRALS_FOR_WITHDRAW:', MIN_REFERRALS_FOR_WITHDRAW);
        
        // Test 1: Send simple message
        await bot.sendMessage(chatId, 'Test 1: Basic message works ✅');
        console.log('Test 1 passed');
        
        // Test 2: Check if getUser works
        const user = await getUser(userId);
        console.log('User data:', user);
        await bot.sendMessage(chatId, `Test 2: User lookup works ✅\nReferrals: ${user?.referralCount || 0}`);
        console.log('Test 2 passed');
        
        // Test 3: Create referral link
        const referralLink = `https://t.me/${BOT_USERNAME}?start=ref_${userId}`;
        console.log('Referral link:', referralLink);
        await bot.sendMessage(chatId, `Test 3: Link created ✅\n${referralLink}`);
        console.log('Test 3 passed');
        
        // Test 4: Try to send button
        const options = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'TEST BUTTON', url: referralLink }]
                ]
            }
        };
        await bot.sendMessage(chatId, 'Test 4: Testing button...', options);
        console.log('Test 4 passed - Button works!');
        
        console.log('=== DEBUG END ===');
        
    } catch (error) {
        console.error('❌ ERROR DETAILS:');
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
        await bot.sendMessage(msg.chat.id, `❌ Error at step. Check logs.`);
    }
};

// Keep other functions simple for now
const handleLeaderboard = async (msg) => {
    await bot.sendMessage(msg.chat.id, 'Leaderboard - Coming soon');
};

const handleMyReferrals = async (msg) => {
    await bot.sendMessage(msg.chat.id, 'My Referrals - Coming soon');
};

const handleReferralStart = async (msg, userId) => {
    console.log('Referral start:', msg.text);
    return null;
};

module.exports = {
    handleInviteEarn,
    handleLeaderboard,
    handleMyReferrals,
    handleReferralStart
};
