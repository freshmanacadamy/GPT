const bot = require('../config/bot');
const { getUser, setUser } = require('../database/users');
const { REGISTRATION_FEE } = require('../config/environment');
const { showMainMenu } = require('./menu');
const { notifyAdminsNewRegistration, notifyAdminsNewPayment } = require('../utils/notifications');

// Main registration handler
const handleRegisterTutorial = async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const user = await getUser(userId);

    if (user?.blocked) {
        await bot.sendMessage(chatId, '❌ You are blocked from using this bot.', { parse_mode: 'Markdown' });
        return;
    }

    if (user?.isVerified) {
        await bot.sendMessage(chatId,
            `✅ *You are already registered!*\n\n` +
            `Your account is verified and active.`,
            { parse_mode: 'Markdown' }
        );
        return;
    }

    // Reset user data for new registration
    const userData = {
        telegramId: userId,
        firstName: msg.from.first_name,
        username: msg.from.username || null,
        isVerified: false,
        registrationStep: 'awaiting_name',
        paymentStatus: 'not_started',
        name: null,
        phone: null,
        studentType: null,
        paymentMethod: null,
        referralCount: user?.referralCount || 0,
        rewards: user?.rewards || 0,
        joinedAt: user?.joinedAt || new Date(),
        blocked: false
    };
    await setUser(userId, userData);

    // Step 1: Ask for name
    await askForName(chatId);
};

// Step 1: Ask for name
const askForName = async (chatId) => {
    const message = `👤 *ENTER YOUR FULL NAME*\n\nPlease type your full name:`;
    
    const options = {
        reply_markup: {
            keyboard: [
                [{ text: "❌ Cancel Registration" }, { text: "🏠 Homepage" }]
            ],
            resize_keyboard: true
        },
        parse_mode: 'Markdown'
    };

    await bot.sendMessage(chatId, message, options);
};

// Step 2: Ask for phone number after name is provided
const askForPhone = async (chatId, userName) => {
    const message = `✅ Name saved: *${userName}*\n\n📱 *SHARE YOUR PHONE NUMBER*\n\nPlease share your phone number using the button below:`;
    
    const options = {
        reply_markup: {
            keyboard: [
                [{ text: "📲 Share My Phone Number", request_contact: true }],
                [{ text: "❌ Cancel Registration" }, { text: "🏠 Homepage" }]
            ],
            resize_keyboard: true
        },
        parse_mode: 'Markdown'
    };

    await bot.sendMessage(chatId, message, options);
};

// Step 3: Ask for stream selection after phone is shared
const askForStream = async (chatId, phoneNumber) => {
    const message = `✅ Phone saved: *${phoneNumber}*\n\n🎓 *SELECT YOUR STREAM*\n\nChoose your field of study:`;
    
    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '⚪ Natural Science', callback_data: 'stream_natural' },
                    { text: '⚪ Social Science', callback_data: 'stream_social' }
                ]
            ]
        },
        parse_mode: 'Markdown'
    };

    await bot.sendMessage(chatId, message, options);
};

// Step 4: Show payment methods after stream selection
const askForPaymentMethod = async (chatId, stream) => {
    const streamText = stream === 'natural' ? 'Natural Science' : 'Social Science';
    const message = `✅ Stream selected: *${streamText}*\n\n💳 *SELECT PAYMENT METHOD*\n\nChoose how you want to pay ${REGISTRATION_FEE} ETB:`;
    
    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '⚪ TeleBirr', callback_data: 'payment_telebirr' },
                    { text: '⚪ CBE Birr', callback_data: 'payment_cbe' }
                ]
            ]
        },
        parse_mode: 'Markdown'
    };

    await bot.sendMessage(chatId, message, options);
};

// Step 5: Show account details and ask for screenshot
const showAccountDetails = async (chatId, paymentMethod, userId) => {
    const accountDetails = {
        'telebirr': { 
            number: '+251911234567', 
            name: 'TUTORIAL ETHIOPIA',
            type: 'TeleBirr'
        },
        'cbe': { 
            number: '100023456789', 
            name: 'TUTORIAL ETHIOPIA',
            type: 'CBE Birr'
        }
    };

    const account = accountDetails[paymentMethod];
    const isTeleBirr = paymentMethod === 'telebirr';
    
    const message = 
        `✅ Selected: *${account.type}*\n\n` +
        `📱 *${isTeleBirr ? 'Mobile Number' : 'Account Number'}:* \`${account.number}\`\n` +
        `👤 *Account Name:* ${account.name}\n\n` +
        `💡 *Payment Instructions:*\n` +
        `1. Send exactly *${REGISTRATION_FEE} ETB* to the above account\n` +
        `2. Copy the ${isTeleBirr ? 'number' : 'account number'} easily\n` +
        `3. Take a clear screenshot of transaction\n\n` +
        `📸 *Send your payment screenshot now:*`;

    const options = {
        reply_markup: {
            keyboard: [
                [{ text: "📎 Upload Payment Screenshot" }],
                [{ text: "❌ Cancel Registration" }, { text: "🏠 Homepage" }]
            ],
            resize_keyboard: true
        },
        parse_mode: 'Markdown'
    };

    await bot.sendMessage(chatId, message, options);
};

// Handle registration completion (ONLY after screenshot)
const completeRegistration = async (chatId, userId, fileId = null) => {
    const user = await getUser(userId);
    
    if (!user) {
        console.error('❌ User not found for completion:', userId);
        return;
    }

    // Update user status
    user.registrationStep = 'completed';
    user.paymentStatus = 'pending_approval';
    await setUser(userId, user);

    console.log('🔄 Completing registration for user:', userId);
    console.log('📤 Sending admin notifications...');

    // Send success message to user
    const successMessage = 
        `🎉 *REGISTRATION SUCCESSFUL!*\n\n` +
        `✅ Your registration is complete\n` +
        `✅ Payment verification pending\n` +
        `⏳ Please wait for admin approval\n\n` +
        `_You will be notified once approved._`;

    await bot.sendMessage(chatId, successMessage, { parse_mode: 'Markdown' });

    // Send notifications to admin
    if (fileId) {
        // If screenshot was provided, send it to admin
        console.log('📸 Sending screenshot to admin');
        await notifyAdminsNewPayment(user, fileId);
    } else {
        // If no screenshot, just send registration notification
        console.log('📋 Sending registration notification to admin');
        await notifyAdminsNewRegistration(user);
    }

    // Auto-redirect to main menu after 2 seconds
    setTimeout(async () => {
        await showMainMenu(chatId);
    }, 2000);
};

// Handle name input
const handleNameInput = async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;
    const user = await getUser(userId);

    if (user?.registrationStep === 'awaiting_name' && text && 
        !text.startsWith('/') && 
        text !== '❌ Cancel Registration' && 
        text !== '🏠 Homepage') {
        
        user.name = text;
        user.registrationStep = 'awaiting_phone';
        await setUser(userId, user);

        await askForPhone(chatId, text);
    }
};

// Handle contact sharing
const handleContactShared = async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const user = await getUser(userId);

    if (user?.registrationStep === 'awaiting_phone' && msg.contact) {
        user.phone = msg.contact.phone_number;
        user.registrationStep = 'awaiting_stream';
        await setUser(userId, user);

        // Remove share contact buttons and show stream selection
        await bot.sendMessage(chatId, 
            `✅ Phone number saved: *${msg.contact.phone_number}*\n\n` +
            `Now select your stream:`,
            { parse_mode: 'Markdown' }
        );
        
        await askForStream(chatId, msg.contact.phone_number);
    }
};

// Handle stream selection callback
const handleStreamSelection = async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const user = await getUser(userId);
    const stream = callbackQuery.data.replace('stream_', '');

    if (user && !user.isVerified) {
        user.studentType = stream;
        user.registrationStep = 'awaiting_payment_method';
        await setUser(userId, user);

        // Update inline buttons to show selection
        const updatedKeyboard = [
            [
                { 
                    text: stream === 'natural' ? '✅ Natural Science' : 'Natural Science', 
                    callback_data: 'stream_natural' 
                },
                { 
                    text: stream === 'social' ? '✅ Social Science' : 'Social Science', 
                    callback_data: 'stream_social' 
                }
            ]
        ];

        await bot.editMessageReplyMarkup(
            { inline_keyboard: updatedKeyboard },
            {
                chat_id: chatId,
                message_id: callbackQuery.message.message_id
            }
        );

        await bot.answerCallbackQuery(callbackQuery.id);
        await askForPaymentMethod(chatId, stream);
    }
};

// Handle payment method selection callback
const handlePaymentMethodSelection = async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const user = await getUser(userId);
    const paymentMethod = callbackQuery.data.replace('payment_', '');

    if (user && !user.isVerified) {
        user.paymentMethod = paymentMethod;
        user.registrationStep = 'awaiting_screenshot';
        await setUser(userId, user);

        // Update inline buttons to show selection
        const updatedKeyboard = [
            [
                { 
                    text: paymentMethod === 'telebirr' ? '✅ TeleBirr' : 'TeleBirr', 
                    callback_data: 'payment_telebirr' 
                },
                { 
                    text: paymentMethod === 'cbe' ? '✅ CBE Birr' : 'CBE Birr', 
                    callback_data: 'payment_cbe' 
                }
            ]
        ];

        await bot.editMessageReplyMarkup(
            { inline_keyboard: updatedKeyboard },
            {
                chat_id: chatId,
                message_id: callbackQuery.message.message_id
            }
        );

        await bot.answerCallbackQuery(callbackQuery.id);
        
        // Show account details and ask for screenshot
        await showAccountDetails(chatId, paymentMethod, userId);
    }
};

// Handle screenshot upload
const handleScreenshotUpload = async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const user = await getUser(userId);

    if (user?.registrationStep === 'awaiting_screenshot') {
        let fileId = null;
        
        // Get file ID from photo or document
        if (msg.photo) {
            // Get the highest quality photo
            fileId = msg.photo[msg.photo.length - 1].file_id;
            console.log(`📸 Photo received from user: ${userId}, file_id: ${fileId}`);
        } else if (msg.document) {
            fileId = msg.document.file_id;
            console.log(`📄 Document received from user: ${userId}, file_id: ${fileId}`);
        } else if (msg.text === "📎 Upload Payment Screenshot") {
            console.log(`📎 Upload button clicked by user: ${userId}`);
            // User clicked the upload button but didn't send file yet
            await bot.sendMessage(chatId, 
                'Please send your payment screenshot as a photo or document.',
                { parse_mode: 'Markdown' }
            );
            return;
        }

        if (fileId) {
            // Complete registration with screenshot
            await completeRegistration(chatId, userId, fileId);
        } else {
            await bot.sendMessage(chatId, 
                'Please send a valid screenshot (photo or document).',
                { parse_mode: 'Markdown' }
            );
        }
    }
};

// Handle cancel registration
const handleCancelRegistration = async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Reset user registration data
    const userData = {
        registrationStep: 'not_started',
        paymentStatus: 'not_started',
        name: null,
        phone: null,
        studentType: null,
        paymentMethod: null
    };
    await setUser(userId, userData);

    await bot.sendMessage(chatId, '❌ Registration cancelled.', { parse_mode: 'Markdown' });
    await showMainMenu(chatId);
};

// Handle homepage navigation
const handleHomepage = async (msg) => {
    const chatId = msg.chat.id;
    await showMainMenu(chatId);
};

// Handle text messages for navigation
const handleNavigation = async (msg) => {
    const text = msg.text;
    
    if (text === '❌ Cancel Registration') {
        await handleCancelRegistration(msg);
        return true;
    } else if (text === '🏠 Homepage') {
        await handleHomepage(msg);
        return true;
    }
    return false;
};

// Handle callback queries
const handleRegistrationCallback = async (callbackQuery) => {
    const data = callbackQuery.data;
    
    if (data.startsWith('stream_')) {
        await handleStreamSelection(callbackQuery);
        return true;
    } else if (data.startsWith('payment_')) {
        await handlePaymentMethodSelection(callbackQuery);
        return true;
    }
    return false;
};

module.exports = {
    handleRegisterTutorial,
    handleNameInput,
    handleContactShared,
    handleScreenshotUpload,
    handleNavigation,
    handleRegistrationCallback
};
