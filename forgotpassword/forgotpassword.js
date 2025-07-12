const express = require('express');
const router = express.Router();
const User = require("../models/User"); // Adjust the path as needed
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

require('dotenv').config();

router.post('/request-password-reset', async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    // Generate a six-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationCode = verificationCode;
    await user.save();

    // Send email
    const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: 'ahmedfaheem3006@gmail.com',
            pass: process.env.EMAIL_PASS,
        },
        secure: false, 
        tls: {
            rejectUnauthorized: false, 
        },
    });
    

    const mailOptions = {
        to: user.email,
        from: 'ahmedfaheem3006@gmail.com',
        subject: 'Password Reset Code',
        text: `Your verification code is: ${verificationCode}`,
    };

    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            console.error('Error sending email:', err);  // Log the full error details
            return res.status(500).json({ message: 'Error sending email' });
        } else {
            console.log('Email sent:', info.response);  // Log success info if email is sent
            res.status(200).json({ message: 'Verification code sent to ' + user.email });
        }
    });
    
});

router.post('/verify-code', async (req, res) => {
    const { email, code } = req.body; 

    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    console.log('User found:', user);

    if (!user) {
        return res.status(400).json({ message: 'User not found' });
    }

    console.log('Stored verification code:', user.verificationCode); 
    if (user.verificationCode !== code) {
        return res.status(400).json({ message: 'Invalid verification code' });
    }


    user.verificationCode = undefined; 
    await user.save();

    res.status(200).json({ message: 'Code verified successfully' });
});


router.post('/reset-password', async (req, res) => {
    const { email , password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    user.password = password; 
    user.password = await bcrypt.hash(password, 10);
    user.verificationCode = undefined;
    await user.save();

    res.status(200).json({ message: 'Password has been reset successfully!' });
});


module.exports = router;