const bot = require('../config/bot');
const { getUser, setUser } = require('../database/users');
const { REGISTRATION_FEE } = require('../config/environment');

// Main registration handler
const handleRegisterTutorial = async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    try {
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
    } catch (error) {
        console.error('Error in handleRegisterTutorial:', error);
        await bot.sendMessage(chatId, '❌ An error occurred during registration. Please try again.');
    }
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

// Step 5: Show account details based on payment method
const showAccountDetails = async (chatId, paymentMethod) => {
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
        `3. Take a clear screenshot of transaction\n` +
        `4. Upload using the button below\n\n` +
        `📸 *Ready to upload your payment screenshot?*`;

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

// Step 6: Handle registration completion
const completeRegistration = async (chatId, userId) => {
    try {
        const user = await getUser(userId);
        
        // Update user status
        user.registrationStep = 'completed';
        user.paymentStatus = 'pending_approval';
        await setUser(userId, user);

        // Send success message (full-screen effect)
        const successMessage = 
            `🎉 *REGISTRATION SUCCESSFUL!*\n\n` +
            `✅ Your registration is complete\n` +
            `✅ Payment verification pending\n` +
            `⏳ Please wait for admin approval\n\n` +
            `📋 *Registration Details:*\n` +
            `👤 Name: ${user.name}\n` +
            `📱 Phone: ${user.phone}\n` +
            `🎓 Stream: ${user.studentType === 'natural' ? 'Natural Science' : 'Social Science'}\n` +
            `💳 Payment: ${user.paymentMethod === 'telebirr' ? 'TeleBirr' : 'CBE Birr'}\n\n` +
            `_You will be notified once approved._`;

        await bot.sendMessage(chatId, successMessage, { parse_mode: 'Markdown' });

        // Send approval notification to admin
        await notifyAdmin(userId, user);

        // Show main menu after a short delay
        setTimeout(() => {
            showMainMenu(chatId).catch(error => {
                console.error('Error showing main menu:', error);
            });
        }, 2000);
    } catch (error) {
        console.error('Error in completeRegistration:', error);
        await bot.sendMessage(chatId, '❌ An error occurred during registration completion. Please try again.');
    }
};

// Notify admin about new registration
const notifyAdmin = async (userId, user) => {
    const adminChatId = process.env.ADMIN_CHAT_ID;
    
    if (!adminChatId) {
        console.error('ADMIN_CHAT_ID not set in environment');
        return;
    }
    
    try {
        const adminMessage = 
            `📋 *NEW REGISTRATION REQUEST*\n\n` +
            `👤 User: ${user.name}\n` +
            `📱 Phone: ${user.phone}\n` +
            `🎓 Stream: ${user.studentType === 'natural' ? 'Natural Science' : 'Social Science'}\n` +
            `💳 Payment: ${user.paymentMethod === 'telebirr' ? 'TeleBirr' : 'CBE Birr'}\n` +
            `🆔 User ID: ${userId}\n` +
            `📅 Registered: ${new Date().toLocaleString()}`;

        await bot.sendMessage(adminChatId, adminMessage, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('Error notifying admin:', error);
    }
};

// Show main menu
const showMainMenu = async (chatId) => {
    try {
        const message = `🏠 *Welcome to Main Menu*\n\nSelect an option:`;
        
        const options = {
            reply_markup: {
                keyboard: [
                    [{ text: "📚 Tutorials" }, { text: "🎓 Courses" }],
                    [{ text: "👤 Profile" }, { text: "🆕 Register" }],
                    [{ text: "ℹ️ Help" }, { text: "📞 Contact" }]
                ],
                resize_keyboard: true
            },
            parse_mode: 'Markdown'
        };

        await bot.sendMessage(chatId, message, options);
    } catch (error) {
        console.error('Error showing main menu:', error);
    }
};

// Handle name input
const handleNameInput = async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;
    
    try {
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
    } catch (error) {
        console.error('Error in handleNameInput:', error);
        await bot.sendMessage(chatId, '❌ An error occurred. Please try again.');
    }
};

// Handle contact sharing
const handleContactShared = async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    try {
        const user = await getUser(userId);

        if (user?.registrationStep === 'awaiting_phone' && msg.contact) {
            user.phone = msg.contact.phone_number;
            user.registrationStep = 'awaiting_stream';
            await setUser(userId, user);

            await askForStream(chatId, msg.contact.phone_number);
        }
    } catch (error) {
        console.error('Error in handleContactShared:', error);
        await bot.sendMessage(chatId, '❌ An error occurred. Please try again.');
    }
};

// Handle stream selection callback
const handleStreamSelection = async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const stream = callbackQuery.data.replace('stream_', '');

    try {
        const user = await getUser(userId);

        if (user && !user.isVerified) {
            user.studentType = stream;
            user.registrationStep = 'awaiting_payment_method';
            await setUser(userId, user);

            // Update inline buttons to show selection
            const updatedKeyboard = [
                [
                    { 
                        text: stream === 'natural' ? '✅ Natural Science' : '⚪ Natural Science', 
                        callback_data: 'stream_natural' 
                    },
                    { 
                        text: stream === 'social' ? '✅ Social Science' : '⚪ Social Science', 
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
    } catch (error) {
        console.error('Error in handleStreamSelection:', error);
        await bot.answerCallbackQuery(callbackQuery.id, 'An error occurred. Please try again.');
    }
};

// Handle payment method selection callback
const handlePaymentMethodSelection = async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const paymentMethod = callbackQuery.data.replace('payment_', '');

    try {
        const user = await getUser(userId);

        if (user && !user.isVerified) {
            user.paymentMethod = paymentMethod;
            user.registrationStep = 'awaiting_screenshot';
            await setUser(userId, user);

            // Update inline buttons to show selection
            const updatedKeyboard = [
                [
                    { 
                        text: paymentMethod === 'telebirr' ? '✅ TeleBirr' : '⚪ TeleBirr', 
                        callback_data: 'payment_telebirr' 
                    },
                    { 
                        text: paymentMethod === 'cbe' ? '✅ CBE Birr' : '⚪ CBE Birr', 
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
            await showAccountDetails(chatId, paymentMethod);
        }
    } catch (error) {
        console.error('Error in handlePaymentMethodSelection:', error);
        await bot.answerCallbackQuery(callbackQuery.id, 'An error occurred. Please try again.');
    }
};

// Handle screenshot upload
const handleScreenshotUpload = async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    try {
        const user = await getUser(userId);

        if (user?.registrationStep === 'awaiting_screenshot' && 
            (msg.photo || msg.document || msg.text === "📎 Upload Payment Screenshot")) {
            
            await completeRegistration(chatId, userId);
        }
    } catch (error) {
        console.error('Error in handleScreenshotUpload:', error);
        await bot.sendMessage(chatId, '❌ An error occurred. Please try again.');
    }
};

// Handle cancel registration
const handleCancelRegistration = async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    try {
        // Reset user registration data
        const user = await getUser(userId);
        if (user) {
            user.registrationStep = 'not_started';
            user.paymentStatus = 'not_started';
            user.name = null;
            user.phone = null;
            user.studentType = null;
            user.paymentMethod = null;
            await setUser(userId, user);
        }

        await bot.sendMessage(chatId, '❌ Registration cancelled.', { parse_mode: 'Markdown' });
        await showMainMenu(chatId);
    } catch (error) {
        console.error('Error in handleCancelRegistration:', error);
        await bot.sendMessage(chatId, '❌ An error occurred. Please try again.');
    }
};

// Handle homepage navigation
const handleHomepage = async (msg) => {
    const chatId = msg.chat.id;
    try {
        await showMainMenu(chatId);
    } catch (error) {
        console.error('Error in handleHomepage:', error);
        await bot.sendMessage(chatId, '❌ An error occurred. Please try again.');
    }
};

// Handle text messages for navigation
const handleNavigation = async (msg) => {
    const text = msg.text;
    
    try {
        if (text === '❌ Cancel Registration') {
            await handleCancelRegistration(msg);
            return true;
        } else if (text === '🏠 Homepage') {
            await handleHomepage(msg);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error in handleNavigation:', error);
        return false;
    }
};

// Handle callback queries
const handleCallbackQuery = async (callbackQuery) => {
    const data = callbackQuery.data;
    
    try {
        if (data.startsWith('stream_')) {
            await handleStreamSelection(callbackQuery);
            return true;
        } else if (data.startsWith('payment_')) {
            await handlePaymentMethodSelection(callbackQuery);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error in handleCallbackQuery:', error);
        return false;
    }
};

module.exports = {
    handleRegisterTutorial,
    handleNameInput,
    handleContactShared,
    handleScreenshotUpload,
    handleNavigation,
    handleCallbackQuery,
    showMainMenu,
    handleCancelRegistration,
    handleHomepage
};
