import crypto from 'crypto';

/**
 * Generates a secure hash for an email using the admin secret key
 * @param {string} email - The email to hash
 * @returns {string} The hex string of the hash
 */
export const generateAdminHash = (email) => {
    const secret = process.env.ADMIN_SECRET_KEY;
    if (!secret) {
        throw new Error('ADMIN_SECRET_KEY is not defined in environment variables');
    }

    return crypto
        .createHmac('sha256', secret)
        .update(email.toLowerCase().trim())
        .digest('hex');
};

/**
 * Verifies if an email corresponds to an admin by checking against stored hashes
 * @param {string} email - The email to verify
 * @returns {boolean} True if the email is an admin email
 */
export const verifyAdminEmail = (email) => {
    try {
        const adminHashes = (process.env.ADMIN_HASHES || '').split(',').filter(Boolean);
        if (adminHashes.length === 0) return false;

        const emailHash = generateAdminHash(email);
        return adminHashes.includes(emailHash);
    } catch (error) {
        console.error('Admin verification error:', error.message);
        return false;
    }
};

/**
 * Verifies the admin password
 * @param {string} password - The password to check
 * @returns {boolean} True if password matches
 */
export const verifyAdminPassword = (password) => {
    const adminPassword = process.env.ADMIN_PASSWORD;
    return adminPassword && password === adminPassword;
};
