const getFirebaseTimestamp = (timestamp) => {
    if (!timestamp) return null;
    if (timestamp.toDate) return timestamp.toDate();
    if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
    return new Date(timestamp);
};

const validatePhoneNumber = (phone) => {
    return phone.startsWith('+') && phone.length >= 10;
};

const validateName = (name) => {
    return name && name.length >= 2 && name.length <= 50;
};

const formatCurrency = (amount) => {
    return `${amount} ETB`;
};

module.exports = {
    getFirebaseTimestamp,
    validatePhoneNumber,
    validateName,
    formatCurrency
};
