const bot = require('../config/bot');
const { getUser, setUser } = require('../database/users');
const { REGISTRATION_FEE } = require('../config/environment');

// --------------------------------------------------------
// REPLY BUTTONS (constant)
// --------------------------------------------------------
const baseReplyKeyboard = {
    reply_markup: {
        keyboard: [
            [{ text: "🏠 Home Page" }, { text: "❌ Cancel Registration" }]
        ],
        resize_keyboard: true
    }
};

// --------------------------------------------------------
// STEP 1 — Start Registration
// --------------------------------------------------------
const startRegistration = async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    const user = await getUser(userId) || {};

    user.registrationStep = "enter_name";
    await setUser(userId, user);

    await bot.sendMessage(chatId, "📝 *Enter your full name:*", {
        parse_mode: "Markdown",
        ...baseReplyKeyboard
    });
};

// --------------------------------------------------------
// STEP 2 — User enters name
// --------------------------------------------------------
const handleNameInput = async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    const user = await getUser(userId);

    if (user?.registrationStep !== "enter_name") return;

    // Ignore special buttons
    if (text === "❌ Cancel Registration" || text === "🏠 Home Page") return;

    user.name = text;
    user.registrationStep = "enter_phone";

    await setUser(userId, user);

    await bot.sendMessage(
        chatId,
        "📲 *Now share your phone number:*",
        {
            parse_mode: "Markdown",
            reply_markup: {
                keyboard: [
                    [{ text: "📲 Share My Phone Number", request_contact: true }],
                    [{ text: "🏠 Home Page" }, { text: "❌ Cancel Registration" }]
                ],
                resize_keyboard: true
            }
        }
    );
};

// --------------------------------------------------------
// STEP 3 — Handle Phone Number
// --------------------------------------------------------
const handleContactShared = async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    const user = await getUser(userId);
    if (user?.registrationStep !== "enter_phone") return;

    if (!msg.contact) return;

    user.phone = msg.contact.phone_number;
    user.registrationStep = "select_student_type";

    await setUser(userId, user);

    await bot.sendMessage(chatId, "🎓 *Select your student type:*", {
        parse_mode: "Markdown",
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "⬜ Social Science", callback_data: "type_social" },
                    { text: "⬜ Natural Science", callback_data: "type_natural" }
                ]
            ]
        }
    });

    await bot.sendMessage(chatId, "Choose one option above 👆", {
        ...baseReplyKeyboard
    });
};

// --------------------------------------------------------
// STEP 4 — Animated Student Selection
// --------------------------------------------------------
const handleStudentTypeCallback = async (callbackQuery) => {
    const data = callbackQuery.data;
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const userId = callbackQuery.from.id;

    const user = await getUser(userId);

    if (!["type_social", "type_natural"].includes(data)) return;

    // Set selection
    user.studentType = data === "type_social" ? "Social Science" : "Natural Science";
    user.registrationStep = "select_payment_method";
    await setUser(userId, user);

    // Animated inline buttons
    const inlineKeyboard = [
        [
            {
                text: user.studentType === "Social Science" ? "🟩 Social Science" : "⬜ Social Science",
                callback_data: "type_social"
            },
            {
                text: user.studentType === "Natural Science" ? "🟩 Natural Science" : "⬜ Natural Science",
                callback_data: "type_natural"
            }
        ]
    ];

    // Update inline keyboard (animation)
    await bot.editMessageReplyMarkup(
        { inline_keyboard: inlineKeyboard },
        { chat_id: chatId, message_id: messageId }
    );

    // Go next
    await bot.sendMessage(chatId, "💳 *Select your payment method:*", {
        parse_mode: "Markdown",
        reply_markup: {
            inline_keyboard: [
                [{ text: "TeleBirr", callback_data: "pay_telebirr" }],
                [{ text: "CBE Birr", callback_data: "pay_cbe" }]
            ]
        }
    });
};

// --------------------------------------------------------
// STEP 5 — Payment Method Selection
// --------------------------------------------------------
const handlePaymentSelection = async (callbackQuery) => {
    const data = callbackQuery.data;
    const userId = callbackQuery.from.id;
    const chatId = callbackQuery.message.chat.id;

    const user = await getUser(userId);
    if (!["pay_telebirr", "pay_cbe"].includes(data)) return;

    const method = data === "pay_telebirr" ? "TeleBirr" : "CBE Birr";
    user.paymentMethod = method;
    user.registrationStep = "upload_payment";
    await setUser(userId, user);

    const accounts = {
        TeleBirr: { number: "+251912345678", name: "TUTORIAL ETHIOPIA" },
        "CBE Birr": { number: "100023456789", name: "TUTORIAL ETHIOPIA" }
    };

    const account = accounts[method];

    await bot.sendMessage(
        chatId,
        `📱 *${method} Selected*\n\n` +
        `🏦 *Account Name:* ${account.name}\n` +
        `🔢 *Account Number:* ${account.number}\n\n` +
        `💡 Send *${REGISTRATION_FEE} ETB* and upload your screenshot.`,
        { parse_mode: "Markdown" }
    );

    await bot.sendMessage(chatId, "📸 Upload your payment screenshot:", {
        reply_markup: {
            keyboard: [
                [{ text: "📸 Upload Screenshot" }],
                [{ text: "🏠 Home Page" }, { text: "❌ Cancel Registration" }]
            ],
            resize_keyboard: true
        }
    });
};

// --------------------------------------------------------
// STEP 6 — Upload Screenshot
// --------------------------------------------------------
const handleScreenshotUpload = async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    const user = await getUser(userId);
    if (user.registrationStep !== "upload_payment") return;

    if (!msg.photo) {
        return bot.sendMessage(chatId, "❌ Please upload a valid screenshot.");
    }

    user.registrationStep = "completed";
    await setUser(userId, user);

    await bot.sendMessage(
        chatId,
        "✅ *Submitted successfully!*\nPlease wait for admin approval.",
        { parse_mode: "Markdown" }
    );

    // AUTO redirect to home page
    await sendHomePage(chatId);
};

// --------------------------------------------------------
// HOME PAGE
// --------------------------------------------------------
const sendHomePage = async (chatId) => {
    await bot.sendMessage(chatId, "🏠 *You are now at the Home Page*", {
        parse_mode: "Markdown",
        reply_markup: {
            keyboard: [
                [{ text: "🧾 Registration" }],
                [{ text: "ℹ️ Help" }]
            ],
            resize_keyboard: true
        }
    });
};

module.exports = {
    startRegistration,
    handleNameInput,
    handleContactShared,
    handleStudentTypeCallback,
    handlePaymentSelection,
    handleScreenshotUpload
};
