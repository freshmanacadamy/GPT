const bot = require('../config/bot');
const { ConfigService, ADMIN_IDS, refreshConfig } = require('../config/environment');

// Store editing state (in production, use Redis or database)
const editingState = new Map();

class SettingsHandler {
    // Main settings dashboard
    static async showSettingsDashboard(msg) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!ADMIN_IDS.includes(userId)) {
            await bot.sendMessage(chatId, '❌ You are not authorized to access settings.');
            return;
        }

        // Get current settings
        const config = await ConfigService.getAll();

        const dashboardText = 
            `🛠️ *BOT SETTINGS DASHBOARD*\n\n` +
            `💰 *Financial Settings:*\n` +
            `• Registration Fee: ${config.registration_fee} ETB\n` +
            `• Referral Reward: ${config.referral_reward} ETB\n` +
            `• Min Referrals: ${config.min_referrals_withdraw}\n` +
            `• Min Withdrawal: ${config.min_withdrawal_amount} ETB\n\n` +
            `⚙️ *System Features:*\n` +
            `• Registration: ${config.registration_enabled ? '✅ ON' : '❌ OFF'}\n` +
            `• Referral System: ${config.referral_enabled ? '✅ ON' : '❌ OFF'}\n` +
            `• Withdrawal System: ${config.withdrawal_enabled ? '✅ ON' : '❌ OFF'}\n` +
            `• Tutorial System: ${config.tutorial_enabled ? '✅ ON' : '❌ OFF'}\n` +
            `• Maintenance Mode: ${config.maintenance_mode ? '🔴 ON' : '🟢 OFF'}\n\n` +
            `Choose what you want to manage:`;

        const options = {
            reply_markup: {
                keyboard: [
                    [{ text: '💰 Financial Settings' }, { text: '⚙️ Feature Toggles' }],
                    [{ text: '📝 Message Management' }, { text: '🔧 Button Texts' }],
                    [{ text: '🔄 Reset Settings' }, { text: '📊 View All Config' }],
                    [{ text: '🔙 Back to Admin Panel' }]
                ],
                resize_keyboard: true
            },
            parse_mode: 'Markdown'
        };

        await bot.sendMessage(chatId, dashboardText, options);
    }

    // Financial settings editor
    static async showFinancialSettings(msg) {
        const chatId = msg.chat.id;
        const config = await ConfigService.getAll();

        const financialText = 
            `💰 *FINANCIAL SETTINGS*\n\n` +
            `Current Values:\n` +
            `1. Registration Fee: ${config.registration_fee} ETB\n` +
            `2. Referral Reward: ${config.referral_reward} ETB\n` +
            `3. Min Referrals for Withdraw: ${config.min_referrals_withdraw}\n` +
            `4. Min Withdrawal Amount: ${config.min_withdrawal_amount} ETB\n\n` +
            `Click on any setting to edit it:`;

        const options = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: `Edit Fee (${config.registration_fee} ETB)`, callback_data: 'edit_financial:registration_fee' },
                        { text: `Edit Reward (${config.referral_reward} ETB)`, callback_data: 'edit_financial:referral_reward' }
                    ],
                    [
                        { text: `Edit Min Referrals (${config.min_referrals_withdraw})`, callback_data: 'edit_financial:min_referrals_withdraw' },
                        { text: `Edit Min Withdrawal (${config.min_withdrawal_amount} ETB)`, callback_data: 'edit_financial:min_withdrawal_amount' }
                    ],
                    [
                        { text: '🔙 Back to Settings', callback_data: 'settings_back' }
                    ]
                ]
            },
            parse_mode: 'Markdown'
        };

        await bot.sendMessage(chatId, financialText, options);
    }

    // Feature toggles editor
    static async showFeatureToggles(msg) {
        const chatId = msg.chat.id;
        const config = await ConfigService.getAll();

        const featuresText = 
            `⚙️ *FEATURE TOGGLES*\n\n` +
            `Toggle system features ON/OFF:\n\n` +
            `• Registration System: ${config.registration_enabled ? '✅ ON' : '❌ OFF'}\n` +
            `• Referral System: ${config.referral_enabled ? '✅ ON' : '❌ OFF'}\n` +
            `• Withdrawal System: ${config.withdrawal_enabled ? '✅ ON' : '❌ OFF'}\n` +
            `• Tutorial System: ${config.tutorial_enabled ? '✅ ON' : '❌ OFF'}\n` +
            `• Maintenance Mode: ${config.maintenance_mode ? '🔴 ON' : '🟢 OFF'}\n\n` +
            `Click any feature to toggle it:`;

        const options = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: `Registration: ${config.registration_enabled ? '✅' : '❌'}`, callback_data: 'toggle_feature:registration_enabled' },
                        { text: `Referral: ${config.referral_enabled ? '✅' : '❌'}`, callback_data: 'toggle_feature:referral_enabled' }
                    ],
                    [
                        { text: `Withdrawal: ${config.withdrawal_enabled ? '✅' : '❌'}`, callback_data: 'toggle_feature:withdrawal_enabled' },
                        { text: `Tutorial: ${config.tutorial_enabled ? '✅' : '❌'}`, callback_data: 'toggle_feature:tutorial_enabled' }
                    ],
                    [
                        { text: `Maintenance: ${config.maintenance_mode ? '🔴' : '🟢'}`, callback_data: 'toggle_feature:maintenance_mode' }
                    ],
                    [
                        { text: '🔙 Back to Settings', callback_data: 'settings_back' }
                    ]
                ]
            },
            parse_mode: 'Markdown'
        };

        await bot.sendMessage(chatId, featuresText, options);
    }

    // Message management
    static async showMessageManagement(msg) {
        const chatId = msg.chat.id;
        const config = await ConfigService.getAll();

        const messageText = 
            `📝 *MESSAGE MANAGEMENT*\n\n` +
            `Edit bot messages and texts:\n\n` +
            `• Welcome Message\n` +
            `• Start Message\n` +
            `• Registration Messages\n` +
            `• System Messages\n\n` +
            `Choose what to edit:`;

        const options = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: 'Edit Welcome Message', callback_data: 'edit_message:welcome_message' },
                        { text: 'Edit Start Message', callback_data: 'edit_message:start_message' }
                    ],
                    [
                        { text: 'Edit Registration Messages', callback_data: 'edit_message_category:registration' },
                        { text: 'Edit System Messages', callback_data: 'edit_message_category:system' }
                    ],
                    [
                        { text: '🔙 Back to Settings', callback_data: 'settings_back' }
                    ]
                ]
            },
            parse_mode: 'Markdown'
        };

        await bot.sendMessage(chatId, messageText, options);
    }

    // Button text management
    static async showButtonManagement(msg) {
        const chatId = msg.chat.id;
        const config = await ConfigService.getAll();

        const buttonText = 
            `🔧 *BUTTON TEXT MANAGEMENT*\n\n` +
            `Edit button labels and texts:\n\n` +
            `• Main Menu Buttons\n` +
            `• Registration Buttons\n` +
            `• Profile Buttons\n` +
            `• Admin Buttons\n\n` +
            `Choose category to edit:`;

        const options = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: 'Main Menu Buttons', callback_data: 'edit_buttons:main_menu' },
                        { text: 'Registration Buttons', callback_data: 'edit_buttons:registration' }
                    ],
                    [
                        { text: 'Profile Buttons', callback_data: 'edit_buttons:profile' },
                        { text: 'Admin Buttons', callback_data: 'edit_buttons:admin' }
                    ],
                    [
                        { text: '🔙 Back to Settings', callback_data: 'settings_back' }
                    ]
                ]
            },
            parse_mode: 'Markdown'
        };

        await bot.sendMessage(chatId, buttonText, options);
    }

    // Handle financial editing
    static async handleFinancialEdit(callbackQuery, settingKey) {
        const chatId = callbackQuery.message.chat.id;
        const userId = callbackQuery.from.id;
        const messageId = callbackQuery.message.message_id;

        const settingLabels = {
            'registration_fee': 'Registration Fee (ETB)',
            'referral_reward': 'Referral Reward (ETB)',
            'min_referrals_withdraw': 'Minimum Referrals for Withdrawal',
            'min_withdrawal_amount': 'Minimum Withdrawal Amount (ETB)'
        };

        // Store editing state
        editingState.set(userId, { type: 'financial', key: settingKey });

        await bot.editMessageText(
            `✏️ Editing: *${settingLabels[settingKey]}*\n\n` +
            `Please enter the new value (numbers only):\n\n` +
            `Type /cancel to cancel editing.`,
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '❌ Cancel', callback_data: 'cancel_edit' }]
                    ]
                }
            }
        );

        await bot.answerCallbackQuery(callbackQuery.id);
    }

    // Handle feature toggling
    static async handleFeatureToggle(callbackQuery, featureKey) {
        const chatId = callbackQuery.message.chat.id;
        const messageId = callbackQuery.message.message_id;

        const currentValue = await ConfigService.get(featureKey);
        const newValue = !currentValue;

        const success = await ConfigService.set(featureKey, newValue);
        
        if (success) {
            // Refresh the live config
            await refreshConfig();
            
            await bot.answerCallbackQuery(callbackQuery.id, {
                text: `✅ ${this.getFeatureName(featureKey)} ${newValue ? 'ENABLED' : 'DISABLED'}`
            });

            // Refresh the feature toggles view
            await bot.deleteMessage(chatId, messageId);
            await this.showFeatureToggles({ chat: { id: chatId } });
        } else {
            await bot.answerCallbackQuery(callbackQuery.id, {
                text: '❌ Failed to update setting'
            });
        }
    }

    // Handle message editing
    static async handleMessageEdit(callbackQuery, messageKey) {
        const chatId = callbackQuery.message.chat.id;
        const userId = callbackQuery.from.id;
        const messageId = callbackQuery.message.message_id;

        const messageLabels = {
            'welcome_message': 'Welcome Message',
            'start_message': 'Start Message',
            'reg_start': 'Registration Start Message',
            'reg_name_saved': 'Name Saved Message',
            'reg_phone_saved': 'Phone Saved Message',
            'reg_success': 'Registration Success Message'
        };

        const currentValue = await ConfigService.get(messageKey);

        // Store editing state
        editingState.set(userId, { type: 'message', key: messageKey });

        await bot.editMessageText(
            `✏️ Editing: *${messageLabels[messageKey]}*\n\n` +
            `Current value:\n${currentValue}\n\n` +
            `Please enter the new message:\n\n` +
            `Use \\\\n for new lines.\nType /cancel to cancel.`,
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '❌ Cancel', callback_data: 'cancel_edit' }]
                    ]
                }
            }
        );

        await bot.answerCallbackQuery(callbackQuery.id);
    }

    // Handle numeric input for financial settings
    static async handleNumericInput(msg, settingKey, value) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (isNaN(value)) {
            await bot.sendMessage(chatId, '❌ Please enter a valid number.');
            return;
        }

        const numericValue = parseInt(value);
        if (numericValue < 0) {
            await bot.sendMessage(chatId, '❌ Please enter a positive number.');
            return;
        }

        const success = await ConfigService.set(settingKey, numericValue);
        
        if (success) {
            // Refresh the live config
            await refreshConfig();
            
            await bot.sendMessage(chatId, 
                `✅ Setting updated successfully!\n\n` +
                `New value: ${numericValue}`
            );
            // Clear editing state
            editingState.delete(userId);
            // Return to settings dashboard
            await this.showSettingsDashboard(msg);
        } else {
            await bot.sendMessage(chatId, '❌ Failed to update setting. Please try again.');
        }
    }

    // Handle message text input
    static async handleMessageInput(msg, messageKey, text) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        const success = await ConfigService.set(messageKey, text);
        
        if (success) {
            // Refresh the live config
            await refreshConfig();
            
            await bot.sendMessage(chatId, 
                `✅ Message updated successfully!\n\n` +
                `New message:\n${text}`
            );
            // Clear editing state
            editingState.delete(userId);
            // Return to settings dashboard
            await this.showSettingsDashboard(msg);
        } else {
            await bot.sendMessage(chatId, '❌ Failed to update message. Please try again.');
        }
    }

    // Handle button text editing
    static async handleButtonEdit(callbackQuery, category) {
        const chatId = callbackQuery.message.chat.id;
        const messageId = callbackQuery.message.message_id;

        const buttonCategories = {
            'main_menu': {
                title: 'Main Menu Buttons',
                buttons: [
                    { key: 'btn_register', label: 'Register Button' },
                    { key: 'btn_profile', label: 'Profile Button' },
                    { key: 'btn_invite', label: 'Invite Button' },
                    { key: 'btn_help', label: 'Help Button' }
                ]
            },
            'registration': {
                title: 'Registration Buttons',
                buttons: [
                    { key: 'btn_confirm_reg', label: 'Confirm Registration' },
                    { key: 'btn_cancel_reg', label: 'Cancel Registration' },
                    { key: 'btn_share_phone', label: 'Share Phone' },
                    { key: 'btn_upload_screenshot', label: 'Upload Screenshot' }
                ]
            }
            // Add more categories as needed
        };

        const categoryData = buttonCategories[category];
        if (!categoryData) {
            await bot.answerCallbackQuery(callbackQuery.id, { text: 'Invalid category' });
            return;
        }

        const config = await ConfigService.getMultiple(categoryData.buttons.map(b => b.key));

        let buttonsText = `🔧 Editing: *${categoryData.title}*\n\nCurrent values:\n\n`;
        
        categoryData.buttons.forEach(button => {
            buttonsText += `• ${button.label}: ${config[button.key]}\n`;
        });

        buttonsText += `\nClick any button to edit its text:`;

        const inlineKeyboard = [];
        categoryData.buttons.forEach(button => {
            inlineKeyboard.push([
                { 
                    text: `${button.label} (${config[button.key]})`, 
                    callback_data: `edit_button:${button.key}` 
                }
            ]);
        });

        inlineKeyboard.push([
            { text: '🔙 Back to Button Management', callback_data: 'button_management_back' }
        ]);

        await bot.editMessageText(buttonsText, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: inlineKeyboard }
        });

        await bot.answerCallbackQuery(callbackQuery.id);
    }

    // Handle individual button text edit
    static async handleIndividualButtonEdit(callbackQuery, buttonKey) {
        const chatId = callbackQuery.message.chat.id;
        const userId = callbackQuery.from.id;
        const messageId = callbackQuery.message.message_id;

        const currentValue = await ConfigService.get(buttonKey);

        // Store editing state
        editingState.set(userId, { type: 'button', key: buttonKey });

        await bot.editMessageText(
            `✏️ Editing Button Text\n\n` +
            `Current text: ${currentValue}\n\n` +
            `Please enter the new button text:\n\n` +
            `Type /cancel to cancel editing.`,
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '❌ Cancel', callback_data: 'cancel_edit' }]
                    ]
                }
            }
        );

        await bot.answerCallbackQuery(callbackQuery.id);
    }

    // Handle button text input
    static async handleButtonInput(msg, buttonKey, text) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        const success = await ConfigService.set(buttonKey, text);
        
        if (success) {
            // Refresh the live config
            await refreshConfig();
            
            await bot.sendMessage(chatId, 
                `✅ Button text updated successfully!\n\n` +
                `New text: ${text}`
            );
            // Clear editing state
            editingState.delete(userId);
            // Return to button management
            await this.showButtonManagement(msg);
        } else {
            await bot.sendMessage(chatId, '❌ Failed to update button text. Please try again.');
        }
    }

    // Reset settings - FIXED VERSION
    static async handleResetSettings(msg) {
        const chatId = msg.chat.id;

        const resetText = 
            `🔄 *RESET SETTINGS*\n\n` +
            `Choose what you want to reset:\n\n` +
            `• Reset All Settings: All settings to default values\n` +
            `• Reset Financial Only: Only financial settings\n` +
            `• Reset Features Only: Only feature toggles\n` +
            `• Reset Messages Only: Only messages and texts`;

        const options = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🔄 Reset All Settings', callback_data: 'reset_all_settings' },
                        { text: '💰 Reset Financial', callback_data: 'reset_financial' }
                    ],
                    [
                        { text: '⚙️ Reset Features', callback_data: 'reset_features' },
                        { text: '📝 Reset Messages', callback_data: 'reset_messages' }
                    ],
                    [
                        { text: '❌ Cancel', callback_data: 'settings_back' }
                    ]
                ]
            },
            parse_mode: 'Markdown'
        };

        await bot.sendMessage(chatId, resetText, options);
    }

    // Handle reset actions - FIXED VERSION
    static async handleResetAction(callbackQuery, resetType) {
        const chatId = callbackQuery.message.chat.id;
        const messageId = callbackQuery.message.message_id;

        try {
            let success = false;
            let message = '';

            switch (resetType) {
                case 'all':
                    success = await ConfigService.resetToDefault();
                    message = '✅ All settings reset to default values!';
                    break;
                case 'financial':
                    // Reset only financial settings
                    const financialKeys = ['registration_fee', 'referral_reward', 'min_referrals_withdraw', 'min_withdrawal_amount'];
                    for (const key of financialKeys) {
                        await ConfigService.resetToDefault(key);
                    }
                    success = true;
                    message = '✅ Financial settings reset to defaults!';
                    break;
                case 'features':
                    // Reset only feature toggles
                    const featureKeys = ['registration_enabled', 'referral_enabled', 'withdrawal_enabled', 'tutorial_enabled', 'maintenance_mode'];
                    for (const key of featureKeys) {
                        await ConfigService.resetToDefault(key);
                    }
                    success = true;
                    message = '✅ Feature toggles reset to defaults!';
                    break;
                case 'messages':
                    // Reset only messages
                    const messageKeys = [
                        'welcome_message', 'start_message', 'reg_start', 'reg_name_saved', 
                        'reg_phone_saved', 'reg_success', 'maintenance_message',
                        'registration_disabled_message', 'referral_disabled_message',
                        'withdrawal_disabled_message', 'tutorials_disabled_message'
                    ];
                    for (const key of messageKeys) {
                        await ConfigService.resetToDefault(key);
                    }
                    success = true;
                    message = '✅ Messages reset to defaults!';
                    break;
            }

            if (success) {
                // Refresh the live config
                await refreshConfig();
                
                await bot.answerCallbackQuery(callbackQuery.id, { text: message });
                // Delete the reset message and show settings dashboard
                await bot.deleteMessage(chatId, messageId);
                await this.showSettingsDashboard({ chat: { id: chatId } });
            } else {
                await bot.answerCallbackQuery(callbackQuery.id, { 
                    text: '❌ Failed to reset settings' 
                });
            }
        } catch (error) {
            console.error('Reset error:', error);
            await bot.answerCallbackQuery(callbackQuery.id, { 
                text: '❌ Error resetting settings' 
            });
        }
    }

    // View all configuration
    static async handleViewAllConfig(msg) {
        const chatId = msg.chat.id;
        const config = await ConfigService.getAll();

        let configText = `📊 *ALL CONFIGURATION SETTINGS*\n\n`;

        // Group by category
        const categories = {
            '💰 Financial': [
                'registration_fee', 'referral_reward', 
                'min_referrals_withdraw', 'min_withdrawal_amount'
            ],
            '⚙️ Features': [
                'registration_enabled', 'referral_enabled', 
                'withdrawal_enabled', 'tutorial_enabled', 'maintenance_mode'
            ],
            '📝 Messages': [
                'welcome_message', 'start_message', 'reg_start',
                'reg_name_saved', 'reg_phone_saved', 'reg_success'
            ]
        };

        for (const [category, keys] of Object.entries(categories)) {
            configText += `*${category}:*\n`;
            keys.forEach(key => {
                configText += `• ${key}: ${config[key]}\n`;
            });
            configText += '\n';
        }

        // Truncate if too long
        if (configText.length > 4000) {
            configText = configText.substring(0, 4000) + '\n\n... (truncated)';
        }

        await bot.sendMessage(chatId, configText, { parse_mode: 'Markdown' });
    }

    // Get feature name for display
    static getFeatureName(featureKey) {
        const names = {
            'registration_enabled': 'Registration System',
            'referral_enabled': 'Referral System',
            'withdrawal_enabled': 'Withdrawal System',
            'tutorial_enabled': 'Tutorial System',
            'maintenance_mode': 'Maintenance Mode'
        };
        return names[featureKey] || featureKey;
    }

    // Check if user is in editing mode
    static getEditingState(userId) {
        return editingState.get(userId);
    }

    // Clear editing state
    static clearEditingState(userId) {
        editingState.delete(userId);
    }
}

module.exports = SettingsHandler;
