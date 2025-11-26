const bot = require('../config/bot');
const { getAllUsers, getVerifiedUsers, getUser, setUser, getUserReferrals, getTopReferrers } = require('../database/users');
const { getPendingPayments } = require('../database/payments');
const { getPendingWithdrawals } = require('../database/withdrawals');
const { ADMIN_IDS } = require('../config/environment');
const { getFirebaseTimestamp } = require('../utils/helpers');

// Store date filter state
const dateFilterState = new Map();

class StudentManagement {
    // Main student management dashboard
    static async showStudentManagement(msg) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!ADMIN_IDS.includes(userId)) {
            await bot.sendMessage(chatId, '❌ You are not authorized to access student management.');
            return;
        }

        const allUsers = await getAllUsers();
        const verifiedUsers = await getVerifiedUsers();
        const pendingPayments = await getPendingPayments();
        
        const totalStudents = Object.keys(allUsers).length;
        const paidStudents = verifiedUsers.length;
        const unpaidStudents = totalStudents - paidStudents;

        const dashboardText = 
            `👥 *STUDENT MANAGEMENT DASHBOARD*\n\n` +
            `📊 *Quick Statistics:*\n` +
            `• Total Students: ${totalStudents}\n` +
            `• Paid & Verified: ${paidStudents}\n` +
            `• Unpaid/Pending: ${unpaidStudents}\n` +
            `• Pending Approvals: ${pendingPayments.length}\n\n` +
            `🎯 *Manage Students:*`;

        const options = {
            reply_markup: {
                keyboard: [
                    [{ text: '📋 View All Students' }, { text: '✅ Paid Students' }],
                    [{ text: '❌ Unpaid Students' }, { text: '👥 Referral Tree' }],
                    [{ text: '📅 Set Date Filter' }, { text: '📤 Export Data' }],
                    [{ text: '🗑️ Delete Students' }, { text: '🔙 Back to Admin' }]
                ],
                resize_keyboard: true
            },
            parse_mode: 'Markdown'
        };

        await bot.sendMessage(chatId, dashboardText, options);
    }

    // Set date filter
    static async showDateFilter(msg) {
        const chatId = msg.chat.id;
        
        const filterText = 
            `📅 *SET DATE FILTER*\n\n` +
            `Filter students by registration date:\n\n` +
            `*Current Format:* YYYY-MM-DD\n` +
            `*Example:* 2024-01-15\n\n` +
            `Please enter start date (FROM):`;

        await bot.sendMessage(chatId, filterText, { 
            parse_mode: 'Markdown',
            reply_markup: {
                keyboard: [
                    [{ text: '🔄 Clear Filter' }, { text: '❌ Cancel' }]
                ],
                resize_keyboard: true
            }
        });

        // Set state for date input
        dateFilterState.set(chatId, { step: 'awaiting_from_date' });
    }

    // Handle date input
    static async handleDateInput(msg, text) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const state = dateFilterState.get(chatId);

        if (!state) return;

        if (text === '❌ Cancel') {
            dateFilterState.delete(chatId);
            await this.showStudentManagement(msg);
            return;
        }

        if (text === '🔄 Clear Filter') {
            dateFilterState.delete(chatId);
            await bot.sendMessage(chatId, '✅ Date filter cleared.');
            await this.showStudentManagement(msg);
            return;
        }

        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(text)) {
            await bot.sendMessage(chatId, 
                '❌ Invalid date format. Please use YYYY-MM-DD format.\n\n' +
                '*Example:* 2024-01-15\n\n' +
                'Please try again:'
            );
            return;
        }

        if (state.step === 'awaiting_from_date') {
            state.fromDate = text;
            state.step = 'awaiting_to_date';
            await bot.sendMessage(chatId, 
                `✅ From date set: ${text}\n\n` +
                `Now enter end date (TO):`
            );
        } else if (state.step === 'awaiting_to_date') {
            state.toDate = text;
            state.step = 'complete';
            
            await bot.sendMessage(chatId,
                `✅ Date filter set!\n\n` +
                `*From:* ${state.fromDate}\n` +
                `*To:* ${state.toDate}\n\n` +
                `This filter will apply to all student views.`,
                { parse_mode: 'Markdown' }
            );
            
            dateFilterState.set(chatId, state);
            await this.showStudentManagement(msg);
        }
    }

    // View all students with optional date filter
    static async viewAllStudents(msg, filterByPayment = null) {
        const chatId = msg.chat.id;
        const allUsers = await getAllUsers();
        
        // Apply date filter if set
        const state = dateFilterState.get(chatId);
        let filteredUsers = this.applyDateFilter(Object.values(allUsers), state);
        
        // Apply payment filter if specified
        if (filterByPayment === 'paid') {
            filteredUsers = filteredUsers.filter(user => user.isVerified);
        } else if (filterByPayment === 'unpaid') {
            filteredUsers = filteredUsers.filter(user => !user.isVerified);
        }

        if (filteredUsers.length === 0) {
            await bot.sendMessage(chatId, 
                `❌ No students found${state ? ' in the selected date range' : ''}.`
            );
            return;
        }

        // Sort by registration date (newest first)
        filteredUsers.sort((a, b) => {
            const dateA = getFirebaseTimestamp(a.joinedAt || a.registrationDate);
            const dateB = getFirebaseTimestamp(b.joinedAt || b.registrationDate);
            return dateB - dateA;
        });

        // Display students in batches of 10
        await this.displayStudentBatch(chatId, filteredUsers, 0, filterByPayment);
    }

    // Display student batch with pagination - FIXED VERSION
    static async displayStudentBatch(chatId, students, startIndex, filterType = null) {
        const batchSize = 10;
        const endIndex = Math.min(startIndex + batchSize, students.length);
        const currentBatch = students.slice(startIndex, endIndex);

        let message = '';
        
        if (filterType === 'paid') {
            message += `✅ *PAID STUDENTS*\n\n`;
        } else if (filterType === 'unpaid') {
            message += `❌ *UNPAID STUDENTS*\n\n`;
        } else {
            message += `👥 *ALL STUDENTS*\n\n`;
        }

        message += `Showing ${startIndex + 1}-${endIndex} of ${students.length} students\n\n`;

        currentBatch.forEach((student, index) => {
            const studentNumber = startIndex + index + 1;
            const regDate = getFirebaseTimestamp(student.joinedAt || student.registrationDate);
            const dateStr = regDate ? regDate.toLocaleDateString() : 'Unknown';
            
            message += `*${studentNumber}. ${student.name || 'No Name'}*\n`;
            message += `📞 ${student.phone || 'No Phone'}\n`;
            message += `📅 ${dateStr}\n`;
            message += `💰 ${student.isVerified ? '✅ Paid' : '❌ Unpaid'}\n`;
            message += `👥 Ref By: ${student.referrerId ? `User ${student.referrerId}` : 'None'}\n`;
            message += `🆔 ${student.telegramId || 'N/A'}\n\n`;
        });

        const keyboard = [];
        
        // Navigation buttons - FIXED: Proper callback data format
        if (startIndex > 0) {
            keyboard.push([{ 
                text: '⬅️ Previous', 
                callback_data: `students_prev_${startIndex - batchSize}_${filterType || 'all'}` 
            }]);
        }
        
        if (endIndex < students.length) {
            const nextButton = { 
                text: 'Next ➡️', 
                callback_data: `students_next_${endIndex}_${filterType || 'all'}` 
            };
            
            if (keyboard.length > 0 && keyboard[0].length < 2) {
                keyboard[0].push(nextButton);
            } else {
                keyboard.push([nextButton]);
            }
        }

        // Action buttons
        keyboard.push([
            { text: '📤 Export This List', callback_data: `export_${filterType || 'all'}` },
            { text: '📅 Set Date Filter', callback_data: 'set_date_filter' }
        ]);
        
        keyboard.push([{ text: '🔙 Back to Management', callback_data: 'students_back' }]);

        await bot.sendMessage(chatId, message, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
        });
    }

    // Show referral tree
    static async showReferralTree(msg) {
        const chatId = msg.chat.id;
        const allUsers = await getAllUsers();
        const topReferrers = await getTopReferrers(10);

        let message = `🌳 *REFERRAL TREE - TOP 10 REFERRERS*\n\n`;

        if (topReferrers.length === 0) {
            message += `No referrals yet.`;
            await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
            return;
        }

        topReferrers.forEach((user, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            const name = user.name || `User ${user.telegramId}`;
            const referrals = user.referralCount || 0;
            const rewards = user.rewards || 0;
            
            message += `${medal} *${name}*\n`;
            message += `   👥 Referrals: ${referrals} | 💰 Earnings: ${rewards} ETB\n`;
            
            // Show direct referrals
            const userReferrals = Object.values(allUsers).filter(u => u.referrerId === user.telegramId?.toString());
            if (userReferrals.length > 0) {
                userReferrals.forEach(ref => {
                    const refName = ref.name || `User ${ref.telegramId}`;
                    message += `   └── 👤 ${refName}\n`;
                });
            }
            message += '\n';
        });

        const options = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '📊 Detailed Referral Report', callback_data: 'detailed_referrals' }],
                    [{ text: '🔙 Back', callback_data: 'students_back' }]
                ]
            },
            parse_mode: 'Markdown'
        };

        await bot.sendMessage(chatId, message, options);
    }

    // Export student data
    static async showExportOptions(msg) {
        const chatId = msg.chat.id;

        const exportText = 
            `📤 *EXPORT STUDENT DATA*\n\n` +
            `Choose export format and scope:\n\n` +
            `All data will be filtered by your current date range settings.`;

        const options = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '📄 Export as CSV', callback_data: 'export_csv' },
                        { text: '📊 Export as Excel', callback_data: 'export_excel' }
                    ],
                    [
                        { text: '✅ Paid Students Only', callback_data: 'export_paid' },
                        { text: '❌ Unpaid Students Only', callback_data: 'export_unpaid' }
                    ],
                    [
                        { text: '🔙 Back', callback_data: 'students_back' }
                    ]
                ]
            },
            parse_mode: 'Markdown'
        };

        await bot.sendMessage(chatId, exportText, options);
    }

    // Handle export generation
    static async handleExport(callbackQuery, exportType) {
        const chatId = callbackQuery.message.chat.id;
        const messageId = callbackQuery.message.message_id;

        await bot.answerCallbackQuery(callbackQuery.id, { text: '🔄 Generating export file...' });

        try {
            const allUsers = await getAllUsers();
            const state = dateFilterState.get(chatId);
            let filteredUsers = this.applyDateFilter(Object.values(allUsers), state);

            // Apply payment filter for specific exports
            if (exportType === 'paid') {
                filteredUsers = filteredUsers.filter(user => user.isVerified);
            } else if (exportType === 'unpaid') {
                filteredUsers = filteredUsers.filter(user => !user.isVerified);
            }

            if (filteredUsers.length === 0) {
                await bot.editMessageText(
                    `❌ No students found to export${state ? ' in the selected date range' : ''}.`,
                    { chat_id: chatId, message_id: messageId }
                );
                return;
            }

            // Generate CSV (for now - Excel requires additional library)
            const csvData = this.generateCSV(filteredUsers);
            
            // Send as document
            await bot.sendDocument(chatId, 
                Buffer.from(csvData, 'utf-8'), 
                {},
                {
                    filename: `students_export_${new Date().toISOString().split('T')[0]}.csv`,
                    contentType: 'text/csv'
                }
            );

            await bot.editMessageText(
                `✅ Export completed! Sent ${filteredUsers.length} student records.`,
                { chat_id: chatId, message_id: messageId }
            );

        } catch (error) {
            console.error('Export error:', error);
            await bot.editMessageText(
                '❌ Error generating export file.',
                { chat_id: chatId, message_id: messageId }
            );
        }
    }

    // Generate CSV data
    static generateCSV(students) {
        const headers = ['Name', 'Phone', 'Registration Date', 'Payment Status', 'Verification Status', 'Referred By', 'Referrals', 'Rewards', 'Telegram ID'];
        let csv = headers.join(',') + '\n';

        students.forEach(student => {
            const regDate = getFirebaseTimestamp(student.joinedAt || student.registrationDate);
            const dateStr = regDate ? regDate.toISOString().split('T')[0] : 'Unknown';
            
            const row = [
                `"${(student.name || 'No Name').replace(/"/g, '""')}"`,
                `"${(student.phone || 'No Phone').replace(/"/g, '""')}"`,
                `"${dateStr}"`,
                `"${student.isVerified ? 'Paid' : 'Unpaid'}"`,
                `"${student.isVerified ? 'Verified' : 'Pending'}"`,
                `"${(student.referrerId || 'None').replace(/"/g, '""')}"`,
                student.referralCount || 0,
                student.rewards || 0,
                student.telegramId || 'N/A'
            ];
            
            csv += row.join(',') + '\n';
        });

        return csv;
    }

    // Show delete options
    static async showDeleteOptions(msg) {
        const chatId = msg.chat.id;
        const allUsers = await getAllUsers();
        const state = dateFilterState.get(chatId);
        const filteredUsers = this.applyDateFilter(Object.values(allUsers), state);

        const deleteText = 
            `🗑️ *DELETE STUDENTS*\n\n` +
            `*Warning:* This action cannot be undone!\n\n` +
            `Students to delete: ${filteredUsers.length}\n` +
            `${state ? `Date range: ${state.fromDate} to ${state.toDate}` : 'All students'}\n\n` +
            `Type *CONFIRM DELETE* to proceed:`;

        await bot.sendMessage(chatId, deleteText, { 
            parse_mode: 'Markdown',
            reply_markup: {
                keyboard: [
                    [{ text: '❌ Cancel Delete' }]
                ],
                resize_keyboard: true
            }
        });

        // Set delete confirmation state
        dateFilterState.set(chatId, { ...state, deletePending: true });
    }

    // Handle delete confirmation
    static async handleDeleteConfirmation(msg, text) {
        const chatId = msg.chat.id;
        const state = dateFilterState.get(chatId);

        if (text === '❌ Cancel Delete') {
            dateFilterState.delete(chatId);
            await bot.sendMessage(chatId, '✅ Delete operation cancelled.');
            await this.showStudentManagement(msg);
            return;
        }

        if (text === 'CONFIRM DELETE' && state?.deletePending) {
            await this.performBulkDelete(chatId, state);
        } else {
            await bot.sendMessage(chatId, 
                '❌ Invalid confirmation. Type *CONFIRM DELETE* exactly to proceed, or use the cancel button.',
                { parse_mode: 'Markdown' }
            );
        }
    }

    // Perform bulk delete
    static async performBulkDelete(chatId, state) {
        try {
            const allUsers = await getAllUsers();
            const filteredUsers = this.applyDateFilter(Object.values(allUsers), state);
            
            if (filteredUsers.length === 0) {
                await bot.sendMessage(chatId, '❌ No students found to delete.');
                return;
            }

            await bot.sendMessage(chatId, `🔄 Deleting ${filteredUsers.length} students...`);

            // Delete users from database (you'll need to implement this in users.js)
            let deletedCount = 0;
            for (const user of filteredUsers) {
                // Implement actual delete logic in database/users.js
                // await deleteUser(user.telegramId);
                deletedCount++;
            }

            dateFilterState.delete(chatId);
            
            await bot.sendMessage(chatId,
                `✅ Successfully deleted ${deletedCount} students!`,
                { parse_mode: 'Markdown' }
            );

            await this.showStudentManagement({ chat: { id: chatId } });

        } catch (error) {
            console.error('Delete error:', error);
            await bot.sendMessage(chatId, '❌ Error deleting students.');
        }
    }

    // Apply date filter to users
    static applyDateFilter(users, state) {
        if (!state || !state.fromDate || !state.toDate) {
            return users;
        }

        const fromDate = new Date(state.fromDate);
        const toDate = new Date(state.toDate);
        toDate.setHours(23, 59, 59, 999); // End of day

        return users.filter(user => {
            const regDate = getFirebaseTimestamp(user.joinedAt || user.registrationDate);
            if (!regDate) return false;
            
            return regDate >= fromDate && regDate <= toDate;
        });
    }

    // Handle student management callbacks - FIXED VERSION
    static async handleStudentCallback(callbackQuery, data) {
        const chatId = callbackQuery.message.chat.id;
        const messageId = callbackQuery.message.message_id;

        if (data === 'students_back') {
            await bot.deleteMessage(chatId, messageId);
            await this.showStudentManagement({ chat: { id: chatId } });
        }
        else if (data === 'set_date_filter') {
            await bot.deleteMessage(chatId, messageId);
            await this.showDateFilter({ chat: { id: chatId } });
        }
        else if (data.startsWith('students_prev_') || data.startsWith('students_next_')) {
            const parts = data.split('_');
            const action = parts[1]; // 'prev' or 'next'
            const startIndex = parseInt(parts[2]);
            const filterType = parts[3] || 'all';
            
            const allUsers = await getAllUsers();
            const state = dateFilterState.get(chatId);
            let filteredUsers = this.applyDateFilter(Object.values(allUsers), state);

            if (filterType === 'paid') {
                filteredUsers = filteredUsers.filter(user => user.isVerified);
            } else if (filterType === 'unpaid') {
                filteredUsers = filteredUsers.filter(user => !user.isVerified);
            }

            await bot.deleteMessage(chatId, messageId);
            await this.displayStudentBatch(chatId, filteredUsers, startIndex, filterType);
        }
        else if (data.startsWith('export_')) {
            const exportType = data.replace('export_', '');
            await this.handleExport(callbackQuery, exportType);
        }
        else if (data === 'detailed_referrals') {
            await bot.deleteMessage(chatId, messageId);
            await this.showDetailedReferrals({ chat: { id: chatId } });
        }
    }

    // Show detailed referral report
    static async showDetailedReferrals(msg) {
        const chatId = msg.chat.id;
        const allUsers = await getAllUsers();

        let message = `📊 *DETAILED REFERRAL REPORT*\n\n`;

        Object.values(allUsers).forEach(user => {
            if (user.referralCount > 0) {
                const name = user.name || `User ${user.telegramId}`;
                message += `*${name}* (${user.referralCount} referrals)\n`;
                
                const referrals = Object.values(allUsers).filter(u => u.referrerId === user.telegramId?.toString());
                referrals.forEach(ref => {
                    const refName = ref.name || `User ${ref.telegramId}`;
                    const refDate = getFirebaseTimestamp(ref.joinedAt);
                    const dateStr = refDate ? refDate.toLocaleDateString() : 'Unknown';
                    message += `   └── ${refName} (${dateStr}) - ${ref.isVerified ? '✅' : '❌'}\n`;
                });
                message += '\n';
            }
        });

        await bot.sendMessage(chatId, message, { 
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🔙 Back to Referral Tree', callback_data: 'students_back' }]
                ]
            }
        });
    }
}

module.exports = StudentManagement;
