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
        
        const currentValue = environment.getConfig(settingKey) || environment[settingKey.toUpperCase()];
        await bot.sendMessage(chatId, 
            `💵 Enter new value for ${settingKey.replace(/_/g, ' ')}:\n\n` +
            `Current: ${currentValue}`
        );
        await bot.answerCallbackQuery(callbackQuery.id, { text: 'Ready for input...' });
    },

    // Handle feature toggle - FIXED VERSION
    async handleFeatureToggle(callbackQuery, featureKey) {
        try {
            console.log('🔵 Feature toggle requested:', featureKey);
            
            const currentValue = environment.getBoolConfig(featureKey);
            const newValue = !currentValue;
            
            console.log('🔄 Toggling:', { featureKey, currentValue, newValue });
            
            // Save to Firebase
            await ConfigService.set(featureKey, newValue);
            
            // Refresh config from database
            await environment.refreshConfig();
            
            await bot.answerCallbackQuery(callbackQuery.id, { 
                text: `✅ ${featureKey.replace(/_/g, ' ')} ${newValue ? 'enabled' : 'disabled'}` 
            });
            
            // Update the feature toggles display
            await this.showFeatureToggles(callbackQuery.message);
            
        } catch (error) {
            console.error('❌ Feature toggle error:', error);
            await bot.answerCallbackQuery(callbackQuery.id, { 
                text: '❌ Failed to update setting' 
            });
        }
    },

    // Handle message edit - FIXED VERSION
    async handleMessageEdit(callbackQuery, messageKey) {
        try {
            console.log('🔵 Message edit requested:', messageKey);
            
            const chatId = callbackQuery.message.chat.id;
            const userId = callbackQuery.from.id;
            
            // Set editing state
            this.setEditingState(userId, { type: 'message', key: messageKey });
            
            // Get current message
            const currentMessage = environment.getConfig(messageKey) || 'Not set';
            
            // Send prompt message
            await bot.sendMessage(chatId, 
                `📝 *Enter new ${messageKey.replace(/_/g, ' ')}:*\n\n` +
                `Current message:\n${currentMessage}\n\n` +
                `Type your new message below:`,
                { parse_mode: 'Markdown' }
            );
            
            await bot.answerCallbackQuery(callbackQuery.id, { 
                text: 'Ready for your new message...' 
            });
            
        } catch (error) {
            console.error('❌ Message edit error:', error);
            await bot.answerCallbackQuery(callbackQuery.id, { 
                text: '❌ Failed to start editing' 
            });
        }
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
        await bot.sendMessage(chatId, 
            `🔧 Enter new text for ${buttonKey.replace('btn_', '').replace(/_/g, ' ')}:\n\n` +
            `Current: "${currentText || 'Not set'}"`
        );
        await bot.answerCallbackQuery(callbackQuery.id, { text: 'Ready for input...' });
    },

    // Handle button input
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

    // Handle message input
    async handleMessageInput(msg, key, newMessage) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        try {
            // Save to Firebase
            await ConfigService.set(key, newMessage);
            
            // Refresh the live config immediately
            await environment.refreshConfig();
            
            this.clearEditingState(userId);
            
            await bot.sendMessage(chatId, `✅ Message updated successfully!`);
            await this.showMessageManagement(msg);
            
        } catch (error) {
            console.error('Error updating message:', error);
            await bot.sendMessage(chatId, '❌ Failed to update message.');
        }
    },

    // Handle numeric input
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

    // Reset functionality - FIXED VERSION
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

    // Handle reset action - FIXED VERSION
    async handleResetAction(callbackQuery, type) {
        try {
            console.log('🔵 Reset action requested:', type);
            
            const resetData = {};
            
            // Define default values based on type
            if (type === 'financial' || type === 'all') {
                resetData.registration_fee = 500;
                resetData.referral_reward = 30;
                resetData.min_referrals_withdraw = 4;
                resetData.min_withdrawal_amount = 120;
            }
            
            if (type === 'features' || type === 'all') {
                resetData.maintenance_mode = false;
                resetData.registration_enabled = true;
                resetData.referral_enabled = true;
                resetData.withdrawal_enabled = true;
                resetData.tutorial_enabled = true;
            }
            
            if (type === 'messages' || type === 'all') {
                // Reset messages to empty (will use defaults)
                resetData.welcome_message = '';
                resetData.start_message = '';
                resetData.reg_start = '';
                resetData.reg_name_saved = '';
                resetData.reg_phone_saved = '';
                resetData.reg_success = '';
            }
            
            // Reset button texts if it's "all"
            if (type === 'all') {
                resetData.btn_register = '';
                resetData.btn_profile = '';
                resetData.btn_invite = '';
                resetData.btn_withdraw = '';
                resetData.btn_help = '';
                resetData.btn_rules = '';
                resetData.btn_leaderboard = '';
                resetData.btn_pay_fee = '';
                resetData.btn_confirm_reg = '';
                resetData.btn_cancel_reg = '';
                resetData.btn_homepage = '';
                resetData.btn_share_phone = '';
                resetData.btn_upload_screenshot = '';
                resetData.btn_change_payment = '';
                resetData.btn_my_referrals = '';
                resetData.btn_admin_panel = '';
                resetData.btn_manage_students = '';
                resetData.btn_review_payments = '';
                resetData.btn_student_stats = '';
                resetData.btn_broadcast = '';
                resetData.btn_bot_settings = '';
                resetData.btn_message_settings = '';
                resetData.btn_feature_toggle = '';
            }
            
            console.log('🔄 Resetting data:', resetData);
            
            // Save all reset values to Firebase
            for (const [key, value] of Object.entries(resetData)) {
                await ConfigService.set(key, value);
            }
            
            // Refresh config
            await environment.refreshConfig();
            
            await bot.answerCallbackQuery(callbackQuery.id, { 
                text: `✅ ${type} settings reset to defaults` 
            });
            
            // Go back to settings dashboard
            await this.showSettingsDashboard(callbackQuery.message);
            
        } catch (error) {
            console.error('❌ Reset error:', error);
            await bot.answerCallbackQuery(callbackQuery.id, { 
                text: '❌ Failed to reset settings' 
            });
        }
    },

    // View all config
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
