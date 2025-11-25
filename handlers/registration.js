// handlers/registration.js

const bot = require('../config/bot');
const { getUser, setUser } = require('../database/users');
const { REGISTRATION_FEE } = require('../config/environment');

// Button label constants to avoid typos
const BUTTONS = {
    SHARE_PHONE: '📲 Share My Phone Number',
    SUBMIT_REGISTRATION: '✅ SUBMIT REGISTRATION',
    START_OVER: '🔄 START OVER',
    START_OVER_ALT: '🔄 Start Over',
    UPLOAD_SCREENSHOT: '📎 Upload Payment Screenshot',
    CHANGE_PAYMENT_METHOD: '🔙 Change Payment Method'
};

// --- MAIN REGISTRATION START ---

// Single form registration entry point
const handleRegisterTutorial = async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const existingUser = await getUser(userId);

    if (existingUser?.blocked) {
        await bot.sendMessage(
            chatId,
            '❌ You are blocked from using this bot.',
            { parse_mode: 'Markdown' }
        );
        return;
    }

    if (existingUser?.isVerified) {
        await bot.sendMessage(
            chatId,
            `✅ *You are already registered!*\n\nYour account is verified and active.`,
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

    // INLINE BUTTONS for student type selection
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
                [{ text: BUTTONS.SHARE_PHONE, request_contact: true }],
                [{ text: BUTTONS.SUBMIT_REGISTRATION }, { text: BUTTONS.START_OVER }]
            ],
            resize_keyboard: true
        }
    };

    // Merge with existing user data if any
    const userData = {
        ...(existingUser || {}),
        telegramId: userId,
        firstName: msg.from.first_name,
        username: msg.from.username || null,
        isVerified: existingUser?.isVerified || false,
        registrationStep: 'filling_single_form',
        paymentStatus: existingUser?.paymentStatus || 'not_started',
        name: existingUser?.name || null,
        phone: existingUser?.phone || null,
        studentType: existingUser?.studentType || null,
        paymentMethod: existingUser?.paymentMethod || null,
        referralCount: existingUser?.referralCount || 0,
        rewards: existingUser?.rewards || 0,
        joinedAt: existingUser?.joinedAt || new Date(),
        blocked: existingUser?.blocked || false
    };

    await setUser(userId, userData);

    await bot.sendMessage(chatId, registrationForm, { parse_mode: 'Markdown', ...inlineOptions });
    await bot.sendMessage(
        chatId,
        'Use buttons below to complete your registration:',
        { ...replyOptions }
    );
};

// --- PAYMENT METHOD SELECTION ---

const showPaymentMethods = async (chatId, userId) => {
    const paymentMessage =
        `💳 *SELECT PAYMENT METHOD*\n\n` +
        `Choose how you want to pay *${REGISTRATION_FEE} ETB*:`;

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

// Show account details for selected payment method
const showAccountDetails = async (chatId, paymentMethod) => {
    const accountDetails = {
        TeleBirr: { number: '+251 91 234 5678', name: 'TUTORIAL ETHIOPIA' },
        'CBE Birr': { number: '1000 2345 6789', name: 'TUTORIAL ETHIOPIA' }
    };

    const account = accountDetails[paymentMethod];

    if (!account) {
        await bot.sendMessage(
            chatId,
            '⚠️ An error occurred while loading account details. Please try selecting the payment method again.'
        );
        return;
    }

    const accountMessage =
        `✅ SELECTED: *${paymentMethod}*\n\n` +
        `📱 Account Number: \`${account.number}\`\n` +
        `👤 Account Name: *${account.name}*\n\n` +
        `💡 *Payment Instructions:*\n` +
        `1. Send exactly *${REGISTRATION_FEE} ETB* to the above account\n` +
        `2. Take a clear screenshot of the transaction\n` +
        `3. Upload using the button below\n\n` +
        `📸 Ready to upload your payment screenshot?`;

    const uploadOptions = {
        reply_markup: {
            keyboard: [
                [{ text: BUTTONS.UPLOAD_SCREENSHOT }],
                [{ text: BUTTONS.CHANGE_PAYMENT_METHOD }, { text: BUTTONS.START_OVER }]
            ],
            resize_keyboard: true
        }
    };

    await bot.sendMessage(chatId, accountMessage, { parse_mode: 'Markdown', ...uploadOptions });
};

// --- CONTACT HANDLING ---

const handleContactShared = async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const user = await getUser(userId);

    if (!user) return;

    if (user.registrationStep === 'filling_single_form' && msg.contact) {
        user.phone = msg.contact.phone_number;
        await setUser(userId, user);

        await bot.sendMessage(
            chatId,
            `✅ Phone number saved: *${msg.contact.phone_number}*\n\n` +
            `Now please *type your full name* in the chat.`,
            { parse_mode: 'Markdown' }
        );
    }
};

// --- NAME INPUT HANDLING ---

const handleNameInput = async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;
    const user = await getUser(userId);

    if (!user || !text) return;

    const isButtonText = [
        BUTTONS.SUBMIT_REGISTRATION,
        BUTTONS.START_OVER,
        BUTTONS.START_OVER_ALT,
        BUTTONS.SHARE_PHONE,
        BUTTONS.UPLOAD_SCREENSHOT,
        BUTTONS.CHANGE_PAYMENT_METHOD
    ].includes(text);

    if (
        user.registrationStep === 'filling_single_form' &&
        !text.startsWith('/') &&
        !isButtonText
    ) {
        // Only set name if not already set (avoid overwriting)
        if (!user.name) {
            user.name = text;
            await setUser(userId, user);

            await bot.sendMessage(
                chatId,
                `✅ Name saved: *${text}*\n\n` +
                `Great! Now select your *student type* using the buttons above.`,
                { parse_mode: 'Markdown' }
            );
        } else {
            // Optional: notify that name is already set
            await bot.sendMessage(
                chatId,
                `ℹ️ Your name is already set as: *${user.name}*\n\n` +
                `If you need to change it, you can start over.`,
                { parse_mode: 'Markdown' }
            );
        }
    }
};

// --- FORM SUBMISSION HANDLING ---

const handleFormSubmission = async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const user = await getUser(userId);

    if (!user) return;

    if (
        user.registrationStep === 'filling_single_form' &&
        msg.text === BUTTONS.SUBMIT_REGISTRATION
    ) {
        if (!user.name || !user.phone || !user.studentType) {
            const missingFields = [];
            if (!user.name) missingFields.push('• Full Name');
            if (!user.phone) missingFields.push('• Phone Number');
            if (!user.studentType) missingFields.push('• Student Type');

            await bot.sendMessage(
                chatId,
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

// --- START OVER HANDLING ---

const handleStartOver = async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    if (text !== BUTTONS.START_OVER && text !== BUTTONS.START_OVER_ALT) {
        return;
    }

    const user = await getUser(userId);

    // If no user exists yet, simply restart registration
    if (!user) {
        await bot.sendMessage(
            chatId,
            `🔄 Registration restarted. Let's begin fresh!`,
            { parse_mode: 'Markdown' }
        );
        await handleRegisterTutorial(msg);
        return;
    }

    // Reset only registration-related fields
    user.registrationStep = 'not_started';
    user.paymentStatus = 'not_started';
    user.name = null;
    user.phone = null;
    user.studentType = null;
    user.paymentMethod = null;

    await setUser(userId, user);

    await bot.sendMessage(
        chatId,
        `🔄 Registration restarted. Let's begin fresh!`,
        { parse_mode: 'Markdown' }
    );
    await handleRegisterTutorial(msg);
};

// --- CALLBACK HANDLERS ---

// Handle student type selection from inline keyboard
const handleStudentTypeSelection = async (callbackQuery) => {
    const userId = callbackQuery.from.id;
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    const user = await getUser(userId);
    if (!user) return;

    if (data === 'select_social') {
        user.studentType = 'Social Science';
    } else if (data === 'select_natural') {
        user.studentType = 'Natural Science';
    } else {
        return; // Unknown callback
    }

    await setUser(userId, user);

    await bot.sendMessage(
        chatId,
        `✅ Student Type saved: *${user.studentType}*`,
        { parse_mode: 'Markdown' }
    );

    // Optionally remove the inline keyboard after selection
    try {
        await bot.editMessageReplyMarkup(
            { inline_keyboard: [] },
            {
                chat_id: chatId,
                message_id: callbackQuery.message.message_id
            }
        );
    } catch (e) {
        // Ignore edit errors (e.g. already edited)
    }
};

// Handle payment method selection from inline keyboard
const handlePaymentMethodSelection = async (callbackQuery) => {
    const data = callbackQuery.data;
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;

    const user = await getUser(userId);
    if (!user) return;

    let paymentMethod = null;

    if (data === 'payment_telebirr') {
        paymentMethod = 'TeleBirr';
    } else if (data === 'payment_cbe') {
        paymentMethod = 'CBE Birr';
    } else {
        return; // Unknown payment callback
    }

    user.paymentMethod = paymentMethod;
    user.paymentStatus = 'pending_payment';
    await setUser(userId, user);

    await showAccountDetails(chatId, paymentMethod);

    // Optionally remove the inline keyboard after selection
    try {
        await bot.editMessageReplyMarkup(
            { inline_keyboard: [] },
            {
                chat_id: chatId,
                message_id: callbackQuery.message.message_id
            }
        );
    } catch (e) {
        // Ignore edit errors
    }
};

module.exports = {
    handleRegisterTutorial,
    showPaymentMethods,
    showAccountDetails,
    handleContactShared,
    handleNameInput,
    handleFormSubmission,
    handleStartOver,
    handleStudentTypeSelection,
    handlePaymentMethodSelection
};
