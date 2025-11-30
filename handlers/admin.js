const bot = require('../config/bot');
const { getUser, setUser, getAllUsers, getVerifiedUsers, getPendingPayments } = require('../database/users');
const { ADMIN_IDS } = require('../config/environment');
const { notifyAdminsNewRegistration, notifyAdminsNewPayment } = require('../utils/notifications');

// Store admin message composition state
const adminMessageState = new Map();

class AdminHandler {
    // Show admin panel
    static async handleAdminPanel(msg) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!ADMIN_IDS.includes(userId)) {
            await bot.sendMessage(chatId, '❌ You are not authorized to access admin panel.');
            return;
        }

        const adminText = 
            `🛠️ *ADMIN PANEL*\n\n` +
            `Choose an option to manage:`;

        const options = {
            reply_markup: {
                keyboard: [
                    [{ text: '👥 Manage Students' }, { text: '💰 Review Payments' }],
                    [{ text: '📊 Student Stats' }, { text: '📢 Broadcast Message' }],
                    [{ text: '🔙 Back to Menu' }]
                ],
                resize_keyboard: true
            },
            parse_mode: 'Markdown'
        };

        await bot.sendMessage(chatId, adminText, options);
    }

    // Handle admin approval with immediate messaging
    static async handleAdminApprove(targetUserId, adminId) {
        try {
            // 1. Get user data
            const user = await getUser(targetUserId);
            if (!user) {
                await bot.sendMessage(adminId, '❌ User not found.');
                return;
            }

            // 2. Approve the user
            user.isVerified = true;
            user.paymentStatus = 'approved';
            await setUser(targetUserId, user);

            console.log(`✅ Admin ${adminId} approved user ${targetUserId}`);

            // 3. Notify user
            await bot.sendMessage(targetUserId,
                `🎉 *REGISTRATION APPROVED!*\n\n` +
                `Congratulations! Your registration has been approved.\n\n` +
                `You now have full access to all features!`,
                { parse_mode: 'Markdown' }
            );

            // 4. Show message options to admin
            await this.showPostApprovalMessageOptions(adminId, user);

        } catch (error) {
            console.error('Error in admin approval:', error);
            await bot.sendMessage(adminId, '❌ Error approving user.');
        }
    }

    // Show message options after approval
    static async showPostApprovalMessageOptions(adminId, user) {
        const message = 
            `✅ *User Approved!*\n\n` +
            `👤 Name: ${user.name}\n` +
            `📱 Phone: ${user.phone}\n` +
            `🎓 Stream: ${user.studentType === 'natural' ? 'Natural Science' : 'Social Science'}\n\n` +
            `💬 Send welcome message to user?`;

        const options = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "📝 Send Custom Message", callback_data: `custom_msg:${user.telegramId}` },
                        { text: "🚀 Send Welcome Template", callback_data: `welcome_template:${user.telegramId}` }
                    ],
                    [
                        { text: "❌ Skip", callback_data: `skip_message:${user.telegramId}` }
                    ]
                ]
            },
            parse_mode: 'Markdown'
        };

        await bot.sendMessage(adminId, message, options);
    }

    // Send welcome template to user
    static async sendWelcomeTemplate(adminId, targetUserId) {
        try {
            const user = await getUser(targetUserId);
            if (!user) {
                await bot.sendMessage(adminId, '❌ User not found.');
                return;
            }

            const welcomeMessage = 
                `🎉 *Welcome to Tutorial Academy!*\n\n` +
                `Your registration has been approved! 🎊\n\n` +
                `We're excited to have you onboard. Start your learning journey now and achieve your goals!\n\n` +
                `Here are some resources to get you started:`;

            const buttons = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "📚 Download Materials", url: "https://example.com/materials" },
                            { text: "🎥 Watch Videos", callback_data: "access_videos" }
                        ],
                        [
                            { text: "📋 Course Schedule", callback_data: "view_schedule" },
                            { text: "📞 Contact Support", url: "https://t.me/support" }
                        ],
                        [
                            { text: "👤 Student Portal", callback_data: "student_portal" }
                        ]
                    ]
                },
                parse_mode: 'Markdown'
            };

            // Send to user
            await bot.sendMessage(targetUserId, welcomeMessage, buttons);
            
            // Confirm to admin
            await bot.sendMessage(adminId, 
                `✅ Welcome message sent to ${user.name}!`,
                { parse_mode: 'Markdown' }
            );

        } catch (error) {
            console.error('Error sending welcome template:', error);
            await bot.sendMessage(adminId, '❌ Error sending welcome message.');
        }
    }

    // Start custom message composition
    static async startCustomMessage(adminId, targetUserId) {
        try {
            const user = await getUser(targetUserId);
            if (!user) {
                await bot.sendMessage(adminId, '❌ User not found.');
                return;
            }

            // Store composition state
            adminMessageState.set(adminId, { 
                type: 'single_user',
                composingFor: targetUserId,
                targetName: user.name,
                step: 'waiting_message',
                messageText: '',
                buttons: []
            });

            await bot.sendMessage(adminId, 
                `✏️ *Compose Custom Message for ${user.name}*\n\n` +
                `Please type the message you want to send:\n\n` +
                `You can add inline buttons after writing the message.`,
                { parse_mode: 'Markdown' }
            );

        } catch (error) {
            console.error('Error starting custom message:', error);
            await bot.sendMessage(adminId, '❌ Error starting message composition.');
        }
    }

    // Handle custom message text input
    static async handleCustomMessageText(adminId, text) {
        const state = adminMessageState.get(adminId);
        if (!state || state.type !== 'single_user' || state.step !== 'waiting_message') return false;

        state.messageText = text;
        state.step = 'building_buttons';
        adminMessageState.set(adminId, state);

        await this.showButtonBuilder(adminId);
        return true;
    }

    // Show button builder interface
    static async showButtonBuilder(adminId) {
        const state = adminMessageState.get(adminId);
        if (!state || state.type !== 'single_user') return;

        const previewText = state.messageText.length > 100 
            ? state.messageText.substring(0, 100) + '...' 
            : state.messageText;

        const builderMessage = 
            `📝 *Message Preview:*\n${previewText}\n\n` +
            `🔘 *Add Inline Buttons:*\n` +
            `Current buttons: ${state.buttons.length}\n\n` +
            `Choose button type to add:`;

        const keyboard = [
            [
                { text: "🔗 URL Button", callback_data: `add_url:${state.composingFor}` },
                { text: "📱 Callback Button", callback_data: `add_callback:${state.composingFor}` }
            ]
        ];

        if (state.buttons.length > 0) {
            keyboard.unshift([
                { text: "👀 Preview Message", callback_data: `preview_msg:${state.composingFor}` }
            ]);
            keyboard.push([
                { text: "🗑️ Clear All Buttons", callback_data: `clear_buttons:${state.composingFor}` }
            ]);
        }

        keyboard.push([
            { text: "✅ Send Message", callback_data: `send_custom:${state.composingFor}` },
            { text: "❌ Cancel", callback_data: `cancel_custom:${state.composingFor}` }
        ]);

        const options = {
            reply_markup: { inline_keyboard: keyboard },
            parse_mode: 'Markdown'
        };

        await bot.sendMessage(adminId, builderMessage, options);
    }

    // Add URL button
    static async addUrlButton(adminId, targetUserId) {
        const state = adminMessageState.get(adminId);
        if (!state || state.type !== 'single_user') return;

        state.step = 'adding_url_button';
        state.currentButton = { type: 'url' };
        adminMessageState.set(adminId, state);

        await bot.sendMessage(adminId,
            `🔗 *Add URL Button*\n\n` +
            `Please enter the button text and URL in this format:\n` +
            `"Button Text | https://example.com"\n\n` +
            `Example: "Download PDF | https://example.com/file.pdf"`,
            { parse_mode: 'Markdown' }
        );
    }

    // Add callback button
    static async addCallbackButton(adminId, targetUserId) {
        const state = adminMessageState.get(adminId);
        if (!state || state.type !== 'single_user') return;

        state.step = 'adding_callback_button';
        state.currentButton = { type: 'callback' };
        adminMessageState.set(adminId, state);

        await bot.sendMessage(adminId,
            `📱 *Add Callback Button*\n\n` +
            `Please enter the button text and callback data:\n` +
            `"Button Text | callback_data"\n\n` +
            `Example: "View Courses | view_courses"`,
            { parse_mode: 'Markdown' }
        );
    }

    // Handle button data input
    static async handleButtonData(adminId, text) {
        const state = adminMessageState.get(adminId);
        if (!state || !state.currentButton) return false;

        try {
            const [buttonText, data] = text.split('|').map(s => s.trim());
            
            if (!buttonText || !data) {
                await bot.sendMessage(adminId, '❌ Invalid format. Use: "Text | data"');
                return true;
            }

            if (state.currentButton.type === 'url') {
                if (!data.startsWith('http://') && !data.startsWith('https://')) {
                    await bot.sendMessage(adminId, '❌ URL must start with http:// or https://');
                    return true;
                }
                state.buttons.push({ text: buttonText, url: data });
            } else {
                state.buttons.push({ text: buttonText, callback_data: data });
            }

            state.step = 'building_buttons';
            state.currentButton = null;
            adminMessageState.set(adminId, state);

            await bot.sendMessage(adminId, `✅ Button added: "${buttonText}"`);
            
            if (state.type === 'single_user') {
                await this.showButtonBuilder(adminId);
            } else if (state.type === 'broadcast') {
                await this.showBroadcastButtonBuilder(adminId);
            }
            return true;

        } catch (error) {
            await bot.sendMessage(adminId, '❌ Error adding button. Use format: "Text | data"');
            return true;
        }
    }

    // Preview message with buttons
    static async previewMessage(adminId, targetUserId) {
        const state = adminMessageState.get(adminId);
        if (!state || state.type !== 'single_user') return;

        // Convert buttons to inline keyboard format
        const inline_keyboard = [];
        state.buttons.forEach(button => {
            if (button.url) {
                inline_keyboard.push([{ text: button.text, url: button.url }]);
            } else {
                inline_keyboard.push([{ text: button.text, callback_data: button.callback_data }]);
            }
        });

        const previewMessage = 
            `👀 *Message Preview for ${state.targetName}:*\n\n` +
            `${state.messageText}`;

        const options = {
            reply_markup: { inline_keyboard },
            parse_mode: 'Markdown'
        };

        await bot.sendMessage(adminId, previewMessage, options);
    }

    // Send custom message to user
    static async sendCustomMessage(adminId, targetUserId) {
        try {
            const state = adminMessageState.get(adminId);
            if (!state || state.type !== 'single_user') return;

            const user = await getUser(targetUserId);
            if (!user) {
                await bot.sendMessage(adminId, '❌ User not found.');
                return;
            }

            // Convert buttons to inline keyboard
            const inline_keyboard = [];
            state.buttons.forEach(button => {
                if (button.url) {
                    inline_keyboard.push([{ text: button.text, url: button.url }]);
                } else {
                    inline_keyboard.push([{ text: button.text, callback_data: button.callback_data }]);
                }
            });

            const messageOptions = {
                parse_mode: 'Markdown'
            };

            if (inline_keyboard.length > 0) {
                messageOptions.reply_markup = { inline_keyboard };
            }

            // Send to user
            await bot.sendMessage(targetUserId, state.messageText, messageOptions);
            
            // Clear state and confirm to admin
            adminMessageState.delete(adminId);
            
            await bot.sendMessage(adminId, 
                `✅ Custom message sent to ${user.name}!`,
                { parse_mode: 'Markdown' }
            );

        } catch (error) {
            console.error('Error sending custom message:', error);
            await bot.sendMessage(adminId, '❌ Error sending message to user.');
        }
    }

    // Cancel custom message
    static async cancelCustomMessage(adminId, targetUserId) {
        adminMessageState.delete(adminId);
        await bot.sendMessage(adminId, '❌ Message composition cancelled.');
    }

    // Clear all buttons
    static async clearAllButtons(adminId, targetUserId) {
        const state = adminMessageState.get(adminId);
        if (!state || state.type !== 'single_user') return;

        state.buttons = [];
        adminMessageState.set(adminId, state);

        await bot.sendMessage(adminId, '✅ All buttons cleared.');
        await this.showButtonBuilder(adminId);
    }

    // Skip messaging
    static async skipMessaging(adminId, targetUserId) {
        const user = await getUser(targetUserId);
        await bot.sendMessage(adminId, 
            `✅ No message sent to ${user?.name || 'user'}.`,
            { parse_mode: 'Markdown' }
        );
    }

    // Handle admin rejection
    static async handleAdminReject(targetUserId, adminId) {
        try {
            const user = await getUser(targetUserId);
            if (!user) {
                await bot.sendMessage(adminId, '❌ User not found.');
                return;
            }

            user.paymentStatus = 'rejected';
            await setUser(targetUserId, user);

            // Notify user
            await bot.sendMessage(targetUserId,
                `❌ *REGISTRATION REJECTED*\n\n` +
                `Your registration has been rejected by admin.\n\n` +
                `Please contact support for more information.`,
                { parse_mode: 'Markdown' }
            );

            await bot.sendMessage(adminId, `✅ User ${user.name} rejected.`);

        } catch (error) {
            console.error('Error in admin rejection:', error);
            await bot.sendMessage(adminId, '❌ Error rejecting user.');
        }
    }

    // Handle admin details view
    static async handleAdminDetails(targetUserId, adminId) {
        try {
            const user = await getUser(targetUserId);
            if (!user) {
                await bot.sendMessage(adminId, '❌ User not found.');
                return;
            }

            const userDetails = 
                `👤 *USER DETAILS*\n\n` +
                `🆔 ID: ${user.telegramId}\n` +
                `📛 Name: ${user.name || 'Not provided'}\n` +
                `📱 Phone: ${user.phone || 'Not provided'}\n` +
                `🎓 Stream: ${user.studentType === 'natural' ? 'Natural Science' : user.studentType === 'social' ? 'Social Science' : 'Not selected'}\n` +
                `💳 Payment Method: ${user.paymentMethod === 'telebirr' ? 'TeleBirr' : user.paymentMethod === 'cbe' ? 'CBE Birr' : 'Not selected'}\n\n` +
                `📊 *STATUS:*\n` +
                `✅ Verified: ${user.isVerified ? 'Yes' : 'No'}\n` +
                `📝 Registration Step: ${user.registrationStep || 'Not started'}\n` +
                `💰 Payment Status: ${user.paymentStatus || 'Not started'}\n` +
                `👥 Referrals: ${user.referralCount || 0}\n` +
                `🎁 Rewards: ${user.rewards || 0} ETB\n` +
                `📅 Joined: ${new Date(user.joinedAt).toLocaleDateString()}`;

            await bot.sendMessage(adminId, userDetails, { parse_mode: 'Markdown' });

        } catch (error) {
            console.error('Error showing user details:', error);
            await bot.sendMessage(adminId, '❌ Error loading user details.');
        }
    }

    // Handle admin stats
    static async handleAdminStats(msg) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!ADMIN_IDS.includes(userId)) {
            await bot.sendMessage(chatId, '❌ You are not authorized.');
            return;
        }

        try {
            const allUsers = await getAllUsers();
            const verifiedUsers = Object.values(allUsers).filter(u => u.isVerified);
            const pendingPayments = Object.values(allUsers).filter(u => u.paymentStatus === 'pending_approval');

            const statsText = 
                `📊 *BOT STATISTICS*\n\n` +
                `👥 Total Users: ${Object.keys(allUsers).length}\n` +
                `✅ Verified Users: ${verifiedUsers.length}\n` +
                `⏳ Pending Approval: ${pendingPayments.length}\n` +
                `💰 Total Referrals: ${Object.values(allUsers).reduce((sum, u) => sum + (u.referralCount || 0), 0)}\n` +
                `🎁 Total Rewards: ${Object.values(allUsers).reduce((sum, u) => sum + (u.rewards || 0), 0)} ETB\n\n` +
                `📈 *Stream Distribution:*\n` +
                `🔬 Natural Science: ${Object.values(allUsers).filter(u => u.studentType === 'natural').length}\n` +
                `📚 Social Science: ${Object.values(allUsers).filter(u => u.studentType === 'social').length}\n` +
                `❓ Not Selected: ${Object.values(allUsers).filter(u => !u.studentType).length}`;

            await bot.sendMessage(chatId, statsText, { parse_mode: 'Markdown' });

        } catch (error) {
            console.error('Error loading stats:', error);
            await bot.sendMessage(chatId, '❌ Error loading statistics.');
        }
    }

    // ========== BROADCAST MESSAGING SYSTEM ========== //

    // Broadcast message functionality
    static async handleBroadcastMessage(msg) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!ADMIN_IDS.includes(userId)) {
            await bot.sendMessage(chatId, '❌ You are not authorized.');
            return;
        }

        // Store broadcast state
        adminMessageState.set(userId, {
            type: 'broadcast',
            step: 'selecting_target',
            messageText: '',
            buttons: [],
            target: 'broadcast_all'
        });

        const broadcastText = 
            `📢 *BROADCAST MESSAGE*\n\n` +
            `Choose target audience:`;

        const options = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "👥 All Users", callback_data: 'broadcast_all' },
                        { text: "✅ Verified Only", callback_data: 'broadcast_verified' }
                    ],
                    [
                        { text: "🎓 Natural Science", callback_data: 'broadcast_natural' },
                        { text: "🎓 Social Science", callback_data: 'broadcast_social' }
                    ],
                    [
                        { text: "⏳ Pending Approval", callback_data: 'broadcast_pending_approval' }
                    ],
                    [
                        { text: "❌ Cancel", callback_data: 'broadcast_cancel' }
                    ]
                ]
            },
            parse_mode: 'Markdown'
        };

        await bot.sendMessage(chatId, broadcastText, options);
    }

    // Set broadcast target
    static async setBroadcastTarget(callbackQuery, targetType) {
        const adminId = callbackQuery.from.id;
        const chatId = callbackQuery.message.chat.id;

        let state = adminMessageState.get(adminId);
        if (!state || state.type !== 'broadcast') {
            await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ No broadcast in progress' });
            return;
        }

        state.target = targetType;
        state.step = 'waiting_message';
        adminMessageState.set(adminId, state);

        const targetNames = {
            'broadcast_all': 'All Users',
            'broadcast_verified': 'Verified Users Only',
            'broadcast_natural': 'Natural Science Students',
            'broadcast_social': 'Social Science Students',
            'broadcast_pending_approval': 'Users Pending Approval'
        };

        await bot.editMessageText(
            `📢 *BROADCAST TO: ${targetNames[targetType]}*\n\n` +
            `Please type your broadcast message:\n\n` +
            `You can add inline buttons after writing the message.`,
            {
                chat_id: chatId,
                message_id: callbackQuery.message.message_id,
                parse_mode: 'Markdown'
            }
        );

        await bot.answerCallbackQuery(callbackQuery.id);
    }

    // Handle broadcast message text
    static async handleBroadcastMessageText(adminId, text) {
        const state = adminMessageState.get(adminId);
        if (!state || state.type !== 'broadcast' || state.step !== 'waiting_message') return false;

        state.messageText = text;
        state.step = 'building_buttons';
        adminMessageState.set(adminId, state);

        await this.showBroadcastButtonBuilder(adminId);
        return true;
    }

    // Show broadcast button builder
    static async showBroadcastButtonBuilder(adminId) {
        const state = adminMessageState.get(adminId);
        if (!state || state.type !== 'broadcast') return;

        const targetNames = {
            'broadcast_all': 'All Users',
            'broadcast_verified': 'Verified Users Only',
            'broadcast_natural': 'Natural Science Students',
            'broadcast_social': 'Social Science Students',
            'broadcast_pending_approval': 'Users Pending Approval'
        };

        const previewText = state.messageText.length > 100 
            ? state.messageText.substring(0, 100) + '...' 
            : state.messageText;

        const builderMessage = 
            `📢 *Broadcast to: ${targetNames[state.target]}*\n\n` +
            `📝 *Message Preview:*\n${previewText}\n\n` +
            `🔘 *Add Inline Buttons:*\n` +
            `Current buttons: ${state.buttons.length}\n\n` +
            `Choose button type to add:`;

        const keyboard = [
            [
                { text: "🔗 URL Button", callback_data: 'broadcast_add_url' },
                { text: "📱 Callback Button", callback_data: 'broadcast_add_callback' }
            ]
        ];

        if (state.buttons.length > 0) {
            keyboard.unshift([
                { text: "👀 Preview Broadcast", callback_data: 'broadcast_preview' }
            ]);
            keyboard.push([
                { text: "🗑️ Clear All Buttons", callback_data: 'broadcast_clear_buttons' }
            ]);
        }

        keyboard.push([
            { text: "✅ Send Broadcast", callback_data: 'broadcast_send' },
            { text: "❌ Cancel", callback_data: 'broadcast_cancel' }
        ]);

        const options = {
            reply_markup: { inline_keyboard: keyboard },
            parse_mode: 'Markdown'
        };

        await bot.sendMessage(adminId, builderMessage, options);
    }

    // Add URL button to broadcast
    static async addBroadcastUrlButton(adminId) {
        const state = adminMessageState.get(adminId);
        if (!state || state.type !== 'broadcast') return;

        state.step = 'adding_url_button';
        state.currentButton = { type: 'url' };
        adminMessageState.set(adminId, state);

        await bot.sendMessage(adminId,
            `🔗 *Add URL Button to Broadcast*\n\n` +
            `Please enter the button text and URL in this format:\n` +
            `"Button Text | https://example.com"\n\n` +
            `Example: "Download PDF | https://example.com/file.pdf"`,
            { parse_mode: 'Markdown' }
        );
    }

    // Add callback button to broadcast
    static async addBroadcastCallbackButton(adminId) {
        const state = adminMessageState.get(adminId);
        if (!state || state.type !== 'broadcast') return;

        state.step = 'adding_callback_button';
        state.currentButton = { type: 'callback' };
        adminMessageState.set(adminId, state);

        await bot.sendMessage(adminId,
            `📱 *Add Callback Button to Broadcast*\n\n` +
            `Please enter the button text and callback data:\n` +
            `"Button Text | callback_data"\n\n` +
            `Example: "View Courses | view_courses"`,
            { parse_mode: 'Markdown' }
        );
    }

    // Preview broadcast message
    static async previewBroadcast(adminId) {
        const state = adminMessageState.get(adminId);
        if (!state || state.type !== 'broadcast') return;

        // Convert buttons to inline keyboard format
        const inline_keyboard = [];
        state.buttons.forEach(button => {
            if (button.url) {
                inline_keyboard.push([{ text: button.text, url: button.url }]);
            } else {
                inline_keyboard.push([{ text: button.text, callback_data: button.callback_data }]);
            }
        });

        const targetNames = {
            'broadcast_all': 'All Users',
            'broadcast_verified': 'Verified Users Only',
            'broadcast_natural': 'Natural Science Students',
            'broadcast_social': 'Social Science Students',
            'broadcast_pending_approval': 'Users Pending Approval'
        };

        const previewMessage = 
            `👀 *BROADCAST PREVIEW (To: ${targetNames[state.target]})*\n\n` +
            `${state.messageText}`;

        const options = {
            reply_markup: { inline_keyboard },
            parse_mode: 'Markdown'
        };

        await bot.sendMessage(adminId, previewMessage, options);
    }

    // Send broadcast to all selected users
    static async sendBroadcast(adminId) {
        try {
            const state = adminMessageState.get(adminId);
            if (!state || state.type !== 'broadcast') return;

            // Get users based on target
            let users = [];
            const allUsers = await getAllUsers();

            switch (state.target) {
                case 'broadcast_all':
                    users = Object.values(allUsers).filter(u => !u.blocked);
                    break;
                case 'broadcast_verified':
                    users = Object.values(allUsers).filter(u => u.isVerified && !u.blocked);
                    break;
                case 'broadcast_natural':
                    users = Object.values(allUsers).filter(u => u.studentType === 'natural' && !u.blocked);
                    break;
                case 'broadcast_social':
                    users = Object.values(allUsers).filter(u => u.studentType === 'social' && !u.blocked);
                    break;
                case 'broadcast_pending_approval':
                    users = Object.values(allUsers).filter(u => 
                        u.paymentStatus === 'pending_approval' && !u.blocked
                    );
                    break;
            }

            if (users.length === 0) {
                await bot.sendMessage(adminId, '❌ No users found for this target.');
                return;
            }

            // Convert buttons to inline keyboard
            const inline_keyboard = [];
            state.buttons.forEach(button => {
                if (button.url) {
                    inline_keyboard.push([{ text: button.text, url: button.url }]);
                } else {
                    inline_keyboard.push([{ text: button.text, callback_data: button.callback_data }]);
                }
            });

            const messageOptions = {
                parse_mode: 'Markdown'
            };

            if (inline_keyboard.length > 0) {
                messageOptions.reply_markup = { inline_keyboard };
            }

            // Send to admin first for confirmation
            await bot.sendMessage(adminId, 
                `📤 Sending broadcast to ${users.length} users...\n\n` +
                `This may take a few moments.`,
                { parse_mode: 'Markdown' }
            );

            // Send to all users
            let successCount = 0;
            let failCount = 0;

            for (const user of users) {
                try {
                    await bot.sendMessage(user.telegramId, state.messageText, messageOptions);
                    successCount++;
                    
                    // Small delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 100));
                } catch (error) {
                    console.error(`Failed to send to user ${user.telegramId}:`, error);
                    failCount++;
                }
            }

            // Clear state and show results
            adminMessageState.delete(adminId);

            await bot.sendMessage(adminId,
                `✅ *BROADCAST COMPLETE*\n\n` +
                `📊 Results:\n` +
                `✅ Successful: ${successCount} users\n` +
                `❌ Failed: ${failCount} users\n` +
                `📨 Total: ${users.length} users targeted`,
                { parse_mode: 'Markdown' }
            );

        } catch (error) {
            console.error('Error sending broadcast:', error);
            await bot.sendMessage(adminId, '❌ Error sending broadcast.');
        }
    }

    // Cancel broadcast
    static async cancelBroadcast(adminId) {
        adminMessageState.delete(adminId);
        await bot.sendMessage(adminId, '❌ Broadcast cancelled.');
    }

    // Clear broadcast buttons
    static async clearBroadcastButtons(adminId) {
        const state = adminMessageState.get(adminId);
        if (!state || state.type !== 'broadcast') return;

        state.buttons = [];
        adminMessageState.set(adminId, state);

        await bot.sendMessage(adminId, '✅ All buttons cleared.');
        await this.showBroadcastButtonBuilder(adminId);
    }
}

module.exports = AdminHandler;
