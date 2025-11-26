const db = require('../config/firebase');

const getUser = async (userId) => {
    try {
        const userDoc = await db.collection('users').doc(userId.toString()).get();
        return userDoc.exists ? userDoc.data() : null;
    } catch (error) {
        console.error('Error getting user:', error);
        return null;
    }
};

const setUser = async (userId, userData) => {
    try {
        await db.collection('users').doc(userId.toString()).set(userData, { merge: true });
    } catch (error) {
        console.error('Error setting user:', error);
    }
};

const getAllUsers = async () => {
    try {
        const snapshot = await db.collection('users').get();
        const users = {};
        snapshot.forEach(doc => {
            users[doc.id] = doc.data();
        });
        return users;
    } catch (error) {
        console.error('Error getting all users:', error);
        return {};
    }
};

const getVerifiedUsers = async () => {
    try {
        const snapshot = await db.collection('users').where('isVerified', '==', true).get();
        const users = [];
        snapshot.forEach(doc => {
            users.push({ id: doc.id, ...doc.data() });
        });
        return users;
    } catch (error) {
        console.error('Error getting verified users:', error);
        return [];
    }
};

// Add to users.js

const deleteUser = async (userId) => {
    try {
        await db.collection('users').doc(userId.toString()).delete();
        return true;
    } catch (error) {
        console.error('Error deleting user:', error);
        return false;
    }
};

const getUsersByDateRange = async (startDate, endDate) => {
    try {
        const snapshot = await db.collection('users')
            .where('joinedAt', '>=', startDate)
            .where('joinedAt', '<=', endDate)
            .get();
        
        const users = {};
        snapshot.forEach(doc => {
            users[doc.id] = doc.data();
        });
        return users;
    } catch (error) {
        console.error('Error getting users by date range:', error);
        return {};
    }
};



const getUserReferrals = async (referrerId) => {
    try {
        const snapshot = await db.collection('users').where('referrerId', '==', referrerId.toString()).get();
        const referrals = [];
        snapshot.forEach(doc => {
            referrals.push({ id: doc.id, ...doc.data() });
        });
        return referrals;
    } catch (error) {
        console.error('Error getting referrals:', error);
        return [];
    }
};

const getTopReferrers = async (limit = 10) => {
    try {
        const snapshot = await db.collection('users').orderBy('referralCount', 'desc').limit(limit).get();
        const topReferrers = [];
        snapshot.forEach(doc => {
            topReferrers.push({ id: doc.id, ...doc.data() });
        });
        return topReferrers;
    } catch (error) {
        console.error('Error getting top referrers:', error);
        return [];
    }
};

module.exports = {
    getUser,
    setUser,
    getAllUsers,
    getVerifiedUsers,
    getUserReferrals,
    getTopReferrers,
    deleteUser,
    getUsersByDateRange
};


