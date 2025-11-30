// Add at the top of handlers/settings.js
const environment = require('../config/environment'); // ✅ FIXED: Import environment

// In your button input handler:
async function handleButtonInput(msg, key, newText) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    try {
        // Save to Firebase
        await environment.ConfigService.set(key, newText);
        
        // ✅ FIXED: Refresh the live config immediately
        await environment.refreshConfig();
        
        SettingsHandler.clearEditingState(userId);
        
        await bot.sendMessage(chatId, `✅ Button text updated to: "${newText}"`);
        await showButtonManagement(msg);
        
    } catch (error) {
        console.error('Error updating button text:', error);
        await bot.sendMessage(chatId, '❌ Failed to update button text.');
    }
}

// In your message input handler:
async function handleMessageInput(msg, key, newMessage) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    try {
        // Save to Firebase
        await environment.ConfigService.set(key, newMessage);
        
        // ✅ FIXED: Refresh the live config immediately
        await environment.refreshConfig();
        
        SettingsHandler.clearEditingState(userId);
        
        await bot.sendMessage(chatId, `✅ Message updated!`);
        await showMessageManagement(msg);
        
    } catch (error) {
        console.error('Error updating message:', error);
        await bot.sendMessage(chatId, '❌ Failed to update message.');
    }
}

// In your financial input handler:
async function handleNumericInput(msg, key, value) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    try {
        const numericValue = parseInt(value);
        if (isNaN(numericValue)) {
            await bot.sendMessage(chatId, '❌ Please enter a valid number.');
            return;
        }

        // Save to Firebase
        await environment.ConfigService.set(key, numericValue);
        
        // ✅ FIXED: Refresh the live config immediately
        await environment.refreshConfig();
        
        SettingsHandler.clearEditingState(userId);
        
        await bot.sendMessage(chatId, `✅ ${key.replace(/_/g, ' ').toUpperCase()} updated to: ${numericValue}`);
        await showFinancialSettings(msg);
        
    } catch (error) {
        console.error('Error updating financial setting:', error);
        await bot.sendMessage(chatId, '❌ Failed to update setting.');
    }
}
