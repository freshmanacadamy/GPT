const admin = require('firebase-admin');
const db = require('../config/firebase');

const addPayment = async (paymentData) => {
    try {
        const docRef = await db.collection('payments').add({
            ...paymentData,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error('Error adding payment:', error);
        return null;
    }
};

const getPendingPayments = async () => {
    try {
        const snapshot = await db.collection('payments').where('status', '==', 'pending').get();
        const payments = [];
        snapshot.forEach(doc => {
            payments.push({ id: doc.id, ...doc.data() });
        });
        return payments;
    } catch (error) {
        console.error('Error getting pending payments:', error);
        return [];
    }
};

module.exports = {
    addPayment,
    getPendingPayments
};
