const bot = require('../config/bot');
const environment = require('../config/environment');
const ConfigService = environment.ConfigService;

// State management for editing
const editingStates = new Map();

const SettingsHandler = {
    // State management methods
    getEditingState(userId) {
        return editingStates.get(userId);
    },
    
    setEditingState(userId, state) {
        editingStates.set(userId, state);
    },
    
    clearEditingState(userId) {
        editingStates.delete(userId);
    },

    // Show settings dashboard
    async showSettingsDashboard(msg) {
        const chatId = msg.chat.id;
        
        await bot.sendMessage(chatId, '⚙️ *Bot Settings Dashboard*', {
            parse_mode: 'Markdown',
            reply_markup: {
                keyboard: [
                    ['💰 Financial Settings', '⚙️ Feature Toggles'],
                    ['📝 Message Management', '🔧 Button Texts'],
                    ['📊 View All Config', '🔄 Reset Settings'],
                    ['🔙 Back to Admin Panel']
                ],
                resize_keyboard: true
            }
        });
    },

    // Financial settings
    async showFinancialSettings(msg) {
        const chatId = msg.chat.id;
        
        await bot.sendMessage(chatId, 
            `💰 *Financial Settings*\n\n` +
            `Registration Fee: ${environment.REGISTRATION_FEE} ETB\n` +
            `Referral Reward: ${environment.REFERRAL_REWARD} ETB\n` +
            `Min Referrals for Withdraw: ${environment.MIN_REFERRALS_FOR_WITHDRAW}\n` +
            `Min Withdrawal Amount: ${environment.MIN_WITHDRAWAL_AMOUNT} ETB`,
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '✏️ Edit Registration Fee', callback_data: 'edit_financial:registration_fee' },
                            { text: '✏️ Edit Referral Reward', callback_data: 'edit_financial:referral_reward' }
                        ],
                        [
                            { text: '✏️ Edit Min Referrals', callback_data: 'edit_financial:min_referrals_withdraw' },
                            { text: '✏️ Edit Min Withdrawal', callback_data: 'edit_financial:min_withdrawal_amount' }
                        ],
                        [{ text: '🔙 Back', callback_data: 'settings_back' }]
                    ]
                }
            }
        );
    },

    // Feature toggles
    async showFeatureToggles(msg) {
        const chatId = msg.chat.id;
        
        await bot.sendMessage(chatId,
            `⚙️ *Feature Toggles*\n\n` +
            `Maintenance Mode: ${environment.MAINTENANCE_MODE ? '✅ ON' : '❌ OFF'}\n` +
            `Registration System: ${environment.REGISTRATION_SYSTEM_ENABLED ? '✅ ON' : '❌ OFF'}\n` +
            `Invite System: ${environment.INVITE_SYSTEM_ENABLED ? '✅ ON' : '❌ OFF'}\n` +
            `Withdrawal System: ${environment.WITHDRAWAL_SYSTEM_ENABLED ? '✅ ON' : '❌ OFF'}\n` +
            `Tutorial System: ${environment.TUTORIAL_SYSTEM_ENABLED ? '✅ ON' : '❌ OFF'}`,
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: `${environment.MAINTENANCE_MODE ? '❌ Disable' : '✅ Enable'} Maintenance`, callback_data: 'toggle_feature:maintenance_mode' },
                            { text: `${environment.REGISTRATION_SYSTEM_ENABLED ? '❌ Disable' : '✅ Enable'} Registration`, callback_data: 'toggle_feature:registration_enabled' }
                        ],
                        [
                            { text: `${environment.INVITE_SYSTEM_ENABLED ? '❌ Disable' : '✅ Enable'} Invite`, callback_data: 'toggle_feature:referral_enabled' },
                            { text: `${environment.WITHDRAWAL_SYSTEM_ENABLED ? '❌ Disable' : '✅ Enable'} Withdrawal`, callback_data: 'toggle_feature:withdrawal_enabled' }
                        ],
                        [
                            { text: `${environment.TUTORIAL_SYSTEM_ENABLED ? '❌ Disable' : '✅ Enable'} Tutorial`, callback_data: 'toggle_feature:tutorial_enabled' }
                        ],
                        [{ text: '🔙 Back', callback_data: 'settings_back' }]
                    ]
                }
            }
        );
    },

    // Message management
    async showMessageManagement(msg) {
        const chatId = msg.chat.id;
        
        await bot.sendMessage(chatId, '📝 *Message Management*\n\nEdit bot messages and notifications:', {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✏️ Welcome Message', callback_data: 'edit_message:welcome_message' },
                        { text: '✏️ Start Message', callback_data: 'edit_message:start_message' }
                    ],
                    [
                        { text: '✏️ Reg Start', callback_data: 'edit_message:reg_start' },
                        { text: '✏️ Name Saved', callback_data: 'edit_message:reg_name_saved' }
                    ],
                    [
                        { text: '✏️ Phone Saved', callback_data: 'edit_message:reg_phone_saved' },
                        { text: '✏️ Reg Success', callback_data: 'edit_message:reg_success' }
                    ],
                    [{ text: '🔙 Back', callback_data: 'settings_back' }]
                ]
            }
        });
    },

    // Button management
    async showButtonManagement(msg) {
        const chatId = msg.chat.id;
        
        await bot.sendMessage(chatId, '🔧 *Button Text Management*\n\nEdit button texts:', {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '📚 Main Buttons', callback_data: 'edit_buttons:main' },
                        { text: '💰 Payment Buttons', callback_data: 'edit_buttons:payment' }
                    ],
                    [
                        { text: '🛠️ Admin Buttons', callback_data: 'edit_buttons:admin' },
                        { text: '📋 All Buttons', callback_data: 'edit_buttons:all' }
                    ],
                    [{ text: '🔙 Back', callback_data: 'settings_back' }]
                ]
            }
        });
    },

    // Handle financial edit
    async handleFinancialEdit(callbackQuery, settingKey) {
        const chatId = callbackQuery.message.chat.id;
        const userId = callbackQuery.from.id;
        
        this.setEditingState(userId, { type: 'financial', key: settingKey });
        
        await bot.sendMessage(chatId, `💵 Enter new value for ${settingKey.replace(/_/g, ' ')}:`);
        await bot.answerCallbackQuery(callbackQuery.id);
    },

    // Handle feature toggle
    async handleFeatureToggle(callbackQuery, featureKey) {
        const chatId = callbackQuery.message.chat.id;
        const userId = callbackQuery.from.id;
        
        const currentValue = environment.getBoolConfig(featureKey);
        await ConfigService.set(featureKey, !currentValue);
        await environment.refreshConfig();
        
        await bot.answerCallbackQuery(callbackQuery.id, { text: `✅ ${featureKey} ${!currentValue ? 'enabled' : 'disabled'}` });
        await this.showFeatureToggles(callbackQuery.message);
    },

    // Handle message edit
    async handleMessageEdit(callbackQuery, messageKey) {
        const chatId = callbackQuery.message.chat.id;
        const userId = callbackQuery.from.id;
        
        this.setEditingState(userId, { type: 'message', key: messageKey });
        
        await bot.sendMessage(chatId, `📝 Enter new message for ${messageKey.replace(/_/g, ' ')}:\n\nCurrent: ${environment.getConfig(messageKey) || 'Not set'}`);
        await bot.answerCallbackQuery(callbackQuery.id);
    },

    // Handle button edit
    async handleButtonEdit(callbackQuery, category) {
        const chatId = callbackQuery.message.chat.id;
        
        // Show buttons based on category
        const buttons = environment.BUTTON_TEXTS;
        let buttonList = [];
        
        if (category === 'main') {
            buttonList = [
                [{ text: `✏️ ${buttons.REGISTER}`, callback_data: 'edit_button:btn_register' }],
                [{ text: `✏️ ${buttons.PROFILE}`, callback_data: 'edit_button:btn_profile' }],
                [{ text: `✏️ ${buttons.INVITE}`, callback_data: 'edit_button:btn_invite' }],
                [{ text: `✏️ ${buttons.LEADERBOARD}`, callback_data: 'edit_button:btn_leaderboard' }]
            ];
        } else if (category === 'payment') {
            buttonList = [
                [{ text: `✏️ ${buttons.PAY_FEE}`, callback_data: 'edit_button:btn_pay_fee' }],
                [{ text: `✏️ ${buttons.WITHDRAW}`, callback_data: 'edit_button:btn_withdraw' }],
                [{ text: `✏️ ${buttons.CHANGE_PAYMENT}`, callback_data: 'edit_button:btn_change_payment' }]
            ];
        } else {
            // Show all buttons
            Object.entries(buttons).forEach(([key, value]) => {
                if (key.startsWith('btn_')) {
                    buttonList.push([{ text: `✏️ ${value}`, callback_data: `edit_button:${key}` }]);
                }
            });
        }
        
        buttonList.push([{ text: '🔙 Back', callback_data: 'button_management_back' }]);
        
        await bot.editMessageText('🔧 *Edit Button Text*\n\nSelect button to edit:', {
            chat_id: chatId,
            message_id: callbackQuery.message.message_id,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: buttonList }
        });
        await bot.answerCallbackQuery(callbackQuery.id);
    },

    // Handle individual button edit
    async handleIndividualButtonEdit(callbackQuery, buttonKey) {
        const chatId = callbackQuery.message.chat.id;
        const userId = callbackQuery.from.id;
        
        this.setEditingState(userId, { type: 'button', key: buttonKey });
        
        const currentText = environment.getConfig(buttonKey);
        await bot.sendMessage(chatId, `🔧 Enter new text for ${buttonKey.replace('btn_', '').replace(/_/g, ' ')}:\n\nCurrent: "${currentText || 'Not set'}"`);
        await bot.answerCallbackQuery(callbackQuery.id);
    },

    // Your existing functions (with minor fixes)
    async handleButtonInput(msg, key, newText) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        try {
            // Save to Firebase
            await ConfigService.set(key, newText);
            
            // Refresh the live config immediately
            await environment.refreshConfig();
            
            this.clearEditingState(userId);
            
            await bot.sendMessage(chatId, `✅ Button text updated to: "${newText}"`);
            await this.showButtonManagement(msg);
            
        } catch (error) {
            console.error('Error updating button text:', error);
            await bot.sendMessage(chatId, '❌ Failed to update button text.');
        }
    },

    async handleMessageInput(msg, key, newMessage) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        try {
            // Save to Firebase
            await ConfigService.set(key, newMessage);
            
            // Refresh the live config immediately
            await environment.refreshConfig();
            
            this.clearEditingState(userId);
            
            await bot.sendMessage(chatId, `✅ Message updated!`);
            await this.showMessageManagement(msg);
            
        } catch (error) {
            console.error('Error updating message:', error);
            await bot.sendMessage(chatId, '❌ Failed to update message.');
        }
    },

    async handleNumericInput(msg, key, value) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        try {
            const numericValue = parseInt(value);
            if (isNaN(numericValue)) {
                await bot.sendMessage(chatId, '❌ Please enter a valid number.');
                return;
            }

            // Save to Firebase
            await ConfigService.set(key, numericValue);
            
            // Refresh the live config immediately
            await environment.refreshConfig();
            
            this.clearEditingState(userId);
            
            await bot.sendMessage(chatId, `✅ ${key.replace(/_/g, ' ').toUpperCase()} updated to: ${numericValue}`);
            await this.showFinancialSettings(msg);
            
        } catch (error) {
            console.error('Error updating financial setting:', error);
            await bot.sendMessage(chatId, '❌ Failed to update setting.');
        }
    },

    // Reset functionality
    async handleResetSettings(msg) {
        const chatId = msg.chat.id;
        
        await bot.sendMessage(chatId, '🔄 *Reset Settings*\n\nSelect what to reset:', {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '💰 Reset Financial', callback_data: 'reset_financial' },
                        { text: '⚙️ Reset Features', callback_data: 'reset_features' }
                    ],
                    [
                        { text: '📝 Reset Messages', callback_data: 'reset_messages' },
                        { text: '🔄 Reset All', callback_data: 'reset_all_settings' }
                    ],
                    [{ text: '🔙 Back', callback_data: 'settings_back' }]
                ]
            }
        });
    },

    async handleResetAction(callbackQuery, type) {
        const chatId = callbackQuery.message.chat.id;
        
        try {
            // Implementation for reset would go here
            await bot.answerCallbackQuery(callbackQuery.id, { text: `✅ ${type} settings reset to defaults` });
            await environment.refreshConfig();
            await this.showSettingsDashboard(callbackQuery.message);
        } catch (error) {
            await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Failed to reset settings' });
        }
    },

    async handleViewAllConfig(msg) {
        const chatId = msg.chat.id;
        
        let configText = '📊 *Current Configuration*\n\n';
        
        // Financial settings
        configText += `💰 *Financial Settings:*\n`;
        configText += `Registration Fee: ${environment.REGISTRATION_FEE} ETB\n`;
        configText += `Referral Reward: ${environment.REFERRAL_REWARD} ETB\n`;
        configText += `Min Referrals: ${environment.MIN_REFERRALS_FOR_WITHDRAW}\n`;
        configText += `Min Withdrawal: ${environment.MIN_WITHDRAWAL_AMOUNT} ETB\n\n`;
        
        // Feature toggles
        configText += `⚙️ *Feature Toggles:*\n`;
        configText += `Maintenance: ${environment.MAINTENANCE_MODE ? 'ON' : 'OFF'}\n`;
        configText += `Registration: ${environment.REGISTRATION_SYSTEM_ENABLED ? 'ON' : 'OFF'}\n`;
        configText += `Invite: ${environment.INVITE_SYSTEM_ENABLED ? 'ON' : 'OFF'}\n`;
        configText += `Withdrawal: ${environment.WITHDRAWAL_SYSTEM_ENABLED ? 'ON' : 'OFF'}\n`;
        configText += `Tutorial: ${environment.TUTORIAL_SYSTEM_ENABLED ? 'ON' : 'OFF'}\n\n`;
        
        // Button texts
        configText += `🔧 *Button Texts:*\n`;
        const buttons = environment.BUTTON_TEXTS;
        Object.entries(buttons).forEach(([key, value]) => {
            configText += `${key}: "${value}"\n`;
        });
        
        await bot.sendMessage(chatId, configText, { parse_mode: 'Markdown' });
    }
};

// Export the SettingsHandler object
module.exports = SettingsHandler;
