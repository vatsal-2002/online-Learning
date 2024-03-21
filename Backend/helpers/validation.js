const validateName = (name, fieldName) => {
    const isValid = /^[a-zA-Z]+$/.test(name);

    if (!isValid) {
        return {
            isValid: false,
            error: `${fieldName} should only contain alphabets.`,
        };
    }

    return { isValid: true };
};

const isEmailValid = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const validateEmail = (email) => ({
    isValid: isEmailValid(email),
    error: 'Invalid email format.',
});

module.exports = {
    validateName,
    validateEmail,
};
