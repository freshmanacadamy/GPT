const bot = require('../config/bot');
const { getUser, setUser } = require('../database/users');
const { REGISTRATION_FEE } = require('../config/environment');

// NEW: Single form registration
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

    const registrationForm = 
        `📝 *COMPLETE REGISTRATION FORM*\n\n` +
        `👤 *PERSONAL DETAILS:*\n` +
        `📋 Full Name: (Type your name in chat)\n` +
        `📱 Phone: Use share button below 👇\n\n` +
        `🎓 *STUDENT TYPE:*\n` +
        `Choose your field:`;

    // INLINE BUTTONS for selections
    const inlineOptions = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🔘 Social Science', callback_data: 'select_social' },
                    { text: '⚪ Natural Science', callback_data: 'select_natural' }
                ]
            ]
        }
    };

    // REPLY KEYBOARD for actions
    const replyOptions = {
        reply_markup: {
            keyboard: [
                [{ text: "📲 Share My Phone Number", request_contact: true }],
                [{ text: '✅ SUBMIT REGISTRATION' }, { text: '🔄 START OVER' }]
            ],
            resize_keyboard: true
        }
    };

    // Reset user data for new registration
    const userData = {
        telegramId: userId,
        firstName: msg.from.first_name,
        username: msg.from.username || null,
        isVerified: false,
        registrationStep: 'filling_single_form',
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

    await bot.sendMessage(chatId, registrationForm, { parse_mode: 'Markdown', ...inlineOptions });
    await bot.sendMessage(chatId, 'Use buttons below to complete your registration:', { ...replyOptions });
};

// NEW: Show payment method selection
const showPaymentMethods = async (chatId, userId) => {
    const paymentMessage = 
        `💳 *SELECT PAYMENT METHOD*\n\n` +
        `Choose how you want to pay ${REGISTRATION_FEE} ETB:`;

    const paymentOptions = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🔘 TeleBirr', callback_data: 'payment_telebirr' },
                    { text: '⚪ CBE Birr', callback_data: 'payment_cbe' }
                ]
            ]
        }
    };

    await bot.sendMessage(chatId, paymentMessage, { parse_mode: 'Markdown', ...paymentOptions });
};

// NEW: Show account details
const showAccountDetails = async (chatId, paymentMethod) => {
    const accountDetails = {
        'TeleBirr': { number: '+251 91 234 5678', name: 'TUTORIAL ETHIOPIA' },
        'CBE Birr': { number: '1000 2345 6789', name: 'TUTORIAL ETHIOPIA' }
    };

    const account = accountDetails[paymentMethod];
    
    const accountMessage = 
        `✅ SELECTED: ${paymentMethod}\n\n` +
        `📱 Account Number: ${account.number}\n` +
        `👤 Account Name: ${account.name}\n\n` +
        `💡 Payment Instructions:\n` +
        `1. Send exactly ${REGISTRATION_FEE} ETB to above account\n` +
        `2. Take clear screenshot of transaction\n` +
        `3. Upload using the button below\n\n` +
        `📸 Ready to upload your payment screenshot?`;

    const uploadOptions = {
        reply_markup: {
            keyboard: [
                [{ text: '📎 Upload Payment Screenshot' }],
                [{ text: '🔙 Change Payment Method' }, { text: '🔄 Start Over' }]
            ],
            resize_keyboard: true
        }
    };

    await bot.sendMessage(chatId, accountMessage, { parse_mode: 'Markdown', ...uploadOptions });
};

// NEW: Handle contact sharing
const handleContactShared = async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const user = await getUser(userId);

    if (user?.registrationStep === 'filling_single_form' && msg.contact) {
        user.phone = msg.contact.phone_number;
        await setUser(userId, user);

        await bot.sendMessage(chatId,
            `✅ Phone number saved: ${msg.contact.phone_number}\n\n` +
            `Now please type your full name in the chat.`,
            { parse_mode: 'Markdown' }
        );
    }
};

// NEW: Handle name input
const handleNameInput = async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;
    const user = await getUser(userId);

    if (user?.registrationStep === 'filling_single_form' && text && !text.startsWith('/') && 
        !['✅ SUBMIT REGISTRATION', '🔄 START OVER', '📲 Share My Phone Number'].includes(text)) {
        
        user.name = text;
        await setUser(userId, user);

        await bot.sendMessage(chatId,
            `✅ Name saved: ${text}\n\n` +
            `Great! Now select your student type using the buttons above.`,
            { parse_mode: 'Markdown' }
        );
    }
};

// NEW: Handle form submission
const handleFormSubmission = async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const user = await getUser(userId);

    if (user?.registrationStep === 'filling_single_form' && msg.text === '✅ SUBMIT REGISTRATION') {
        if (!user.name || !user.phone || !user.studentType) {
            const missingFields = [];
            if (!user.name) missingFields.push('• Full Name');
            if (!user.phone) missingFields.push('• Phone Number');
            if (!user.studentType) missingFields.push('• Student Type');

            await bot.sendMessage(chatId,
                `❌ *Incomplete Form*\n\n` +
                `Please complete these fields:\n${missingFields.join('\n')}\n\n` +
                `Fill the missing information and submit again.`,
                { parse_mode: 'Markdown' }
            );
            return;
        }

        await showPaymentMethods(chatId, userId);
    }
};

// NEW: Handle start over
const handleStartOver = async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (msg.text === '🔄 START OVER') {
        const userData = {
            registrationStep: 'not_started',
            paymentStatus: 'not_started',
            name: null,
            phone: null,
            studentType: null,
            paymentMethod: null
        };
        await setUser(userId, userData);

        await bot.sendMessage(chatId, `🔄 Registration restarted. Let's begin fresh!`, { parse_mode: 'Markdown' });
        await handleRegisterTutorial(msg);
    }
};

module.exports = {
    handleRegisterTutorial,
    showPaymentMethods,
    showAccountDetails,
    handleContactShared,
    handleNameInput,
    handleFormSubmission,
    handleStartOver
};
