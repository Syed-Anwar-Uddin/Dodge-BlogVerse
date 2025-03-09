const express = require('express');
const router = express.Router();
const User = require('../models/User');
const twilio = require('twilio');

// Initialize Twilio client
const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

// Store OTPs temporarily (in production, use Redis or similar)
const otpStore = new Map();

// Generate 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Route to initiate forgot password process
router.post('/forgot-password', async (req, res) => {
    try {
        const { phone } = req.body;
        
        // Find user by phone
        const user = await User.findOne({ phone });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate OTP
        const otp = generateOTP();
        
        // Store OTP with expiry (5 minutes)
        otpStore.set(phone, {
            otp,
            expiry: Date.now() + 5 * 60 * 1000
        });

        // Send OTP via Twilio
        await client.messages.create({
            body: `Your OTP for password reset is: ${otp}`,
            to: phone,
            from: process.env.TWILIO_PHONE_NUMBER
        });

        res.json({ message: 'OTP sent successfully' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Error sending OTP' });
    }
});

// Route to verify OTP
router.post('/verify-otp', async (req, res) => {
    try {
        const { phone, otp } = req.body;

        // Check if OTP exists and is valid
        const storedOTP = otpStore.get(phone);
        if (!storedOTP || storedOTP.otp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        // Check if OTP is expired
        if (Date.now() > storedOTP.expiry) {
            otpStore.delete(phone);
            return res.status(400).json({ message: 'OTP expired' });
        }

        // Generate reset token
        const resetToken = require('crypto').randomBytes(32).toString('hex');
        
        // Save reset token to user
        await User.findOneAndUpdate(
            { phone },
            {
                resetToken,
                resetTokenExpiry: Date.now() + 15 * 60 * 1000 // 15 minutes
            }
        );

        // Clear OTP
        otpStore.delete(phone);

        res.json({ resetToken });
    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({ message: 'Error verifying OTP' });
    }
});

// Route to reset password
router.post('/reset-password', async (req, res) => {
    try {
        const { resetToken, newPassword } = req.body;

        // Find user by reset token and check expiry
        const user = await User.findOne({
            resetToken,
            resetTokenExpiry: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }

        // Hash new password
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password and clear reset token
        user.password = hashedPassword;
        user.resetToken = undefined;
        user.resetTokenExpiry = undefined;
        await user.save();

        res.json({ message: 'Password reset successful' });
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ message: 'Error resetting password' });
    }
});

module.exports = router;
