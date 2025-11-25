const bot = require('../config/bot');
const { getUser, setUser } = require('../database/users');
const { addPayment } = require('../database/payments');
const { notifyAdminsNewPayment } = require('../utils/notifications');
const { REGISTRATION_FEE } = require('../config/environment');

const handleUploadScreenshot = async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const user = await getUser(userId);

    if (user?.isVerified) {
        await bot.sendMessage(chatId, `✅ *You are already registered!*`, { parse_mode: 'Markdown' });
        return;
    }

    if (!user?.paymentMethod) {
        await bot.sendMessage(chatId,
            `❌ *Please complete registration first*\n\n` +
            `You need to select a payment method before uploading screenshot.`,
            { parse_mode: 'Markdown' }
        );
        return;
    }

    await bot.sendMessage(chatId,
        `📤 *UPLOAD PAYMENT SCREENSHOT*\n\n` +
        `Send your payment screenshot for verification:\n\n` +
        `💰 Fee: ${REGISTRATION_FEE} ETB\n` +
        `💳 Method: ${user.paymentMethod}`,
        { parse_mode: 'Markdown' }
    );
};

const handlePaymentScreenshot = async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const user = await getUser(userId);

    if (user?.registrationStep === 'filling_single_form' || user?.paymentStatus === 'pending') {
        let file_id = null;
        
        if (msg.photo) {
            file_id = msg.photo[msg.photo.length - 1].file_id;
        } else if (msg.document) {
            file_id = msg.document.file_id;
        }

        if (file_id) {
            await addPayment({
                userId: userId,
                file_id: file_id,
                paymentMethod: user.paymentMethod,
                status: 'pending'
            });

            user.paymentStatus = 'pending';
            user.registrationStep = 'completed';
            await setUser(userId, user);

            await bot.sendMessage(chatId,
                `✅ *Payment received!*\n\n` +
                `🎯 *Registration pending admin approval*\n\n` +
                `💰 Fee: ${REGISTRATION_FEE} ETB\n` +
                `💳 Method: ${user.paymentMethod}\n` +
                `📱 Status: ⏳ Pending Approval`,
                { parse_mode: 'Markdown' }
            );

            await notifyAdminsNewPayment(user, file_id);
        } else {
            await bot.sendMessage(chatId,
                `❌ *Please send a valid image or document.*\n\n` +
                `Send a clear screenshot of your payment.`,
                { parse_mode: 'Markdown' }
            );
        }
    }
};

const handlePayFee = async (msg) => {
    const chatId = msg.chat.id;

    const payFeeMessage = 
        `💰 *PAYMENT INFORMATION*\n\n` +
        `Registration Fee: ${REGISTRATION_FEE} ETB\n\n` +
        `📱 *Payment Methods:*\n` +
        `• TeleBirr: +251 91 234 5678\n` +
        `• CBE Birr: 1000 2345 6789\n\n` +
        `📋 *Payment Instructions:*\n` +
        `1. Send ${REGISTRATION_FEE} ETB to our account\n` +
        `2. Take a screenshot of the transaction\n` +
        `3. Upload it using the bot\n` +
        `4. Wait for admin approval\n\n` +
        `⚠️ *Important:*\n` +
        `• Only send payment after registration\n` +
        `• Keep transaction receipt\n` +
        `• Contact admin if payment fails`;

    await bot.sendMessage(chatId, payFeeMessage, { parse_mode: 'Markdown' });
};

module.exports = {
    handleUploadScreenshot,
    handlePaymentScreenshot,
    handlePayFee
};
