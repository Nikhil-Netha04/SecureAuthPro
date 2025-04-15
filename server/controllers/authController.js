import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import userModel from '../models/userModel.js';
import transporter from '../config/nodeMailer.js';
import { EMAIL_VERIFY_TEMPLATE,PASSWORD_RESET_TEMPLATE } from '../config/emailTemplates.js';
export const register = async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ success: false, message: "Missing details" });
    }

    if (!process.env.JWT_SECRET || !process.env.SENDER_EMAIL) {
        return res.status(500).json({ success: false, message: "Server misconfiguration" });
    }

    try {
        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new userModel({ name, email, password: hashedPassword });
        await user.save();

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

       
        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: email,
            subject: 'Welcome to My Website',
            text: `Hello ${name},\n\nYour account has been successfully created with email ID: ${email}.\n\nThank you for registering!`
        };

        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.error("Email Sending Error:", err);
            } else {
                console.log("Email Sent:", info.response);
            }
        });

        return res.status(201).json({ success: true, message: 'User registered successfully. Check your email.' });

    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

export const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    try {
        const user = await userModel.findOne({ email });

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return res.status(200).json({
            success: true,
            message: 'User logged in successfully',
            user: { id: user._id, name: user.name, email: user.email, token }
        });

    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

export const logout = (req, res) => {
    try {
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            path: '/'  
        });

        return res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

export const sendVerifyOtp = async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await userModel.findById(userId);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.isAccountVerified) {
            return res.status(400).json({ success: false, message: 'Already verified' });
        }

        const otp = String(Math.floor(100000 + Math.random() * 900000)); // Ensure 6-digit OTP
        user.verifyOtp = otp;
        user.verifyOtpExpireAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Expiry in 24 hours

        await user.save();

        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: user.email,
            subject: 'Account Verification OTP',
            text: `Your OTP is ${otp}. Verify your account using this OTP.`,
            html:EMAIL_VERIFY_TEMPLATE.replace("{{otp}}",otp).replace("{{email}}",user.email)
        };

        await transporter.sendMail(mailOptions)
            .then(() => res.status(200).json({ success: true, message: 'Verification OTP sent to email' }))
            .catch(error => res.status(500).json({ success: false, message: 'Failed to send OTP email', error: error.message }));

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const verifyEmail = async (req, res) => {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
        return res.status(400).json({ success: false, message: 'Missing details' });
    }

    try {
        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (!user.verifyOtp || user.verifyOtp !== otp) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        if (new Date(user.verifyOtpExpireAt) < new Date()) {
            return res.status(400).json({ success: false, message: 'OTP expired' });
        }

        user.isAccountVerified = true;
        user.verifyOtp = null;
        user.verifyOtpExpireAt = null; // Set to null instead of 0

        await user.save();

        return res.status(200).json({ success: true, message: 'Email verified successfully' });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const isAuthenticated=async(req,res)=>{
    try{
      return res.json({success:true});
    }
    catch(err)
    {
        res.status(500).json({ success: false, message: err.message }); 
    }
}

export const sendResetOtp = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, message: "Email is required" });
    }

    try {
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Generate 6-digit OTP
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        user.resetOtp = otp;
        user.resetOtpExpireAt = new Date(Date.now() + 15 * 60 * 1000); // Expiry in 15 minutes

        await user.save();

        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: user.email,
            subject: "Password Reset OTP",
            //text: `Your OTP for resetting your password is ${otp}. Use this to reset your password.`
            html:PASSWORD_RESET_TEMPLATE.replace("{{otp}}",otp).replace("{{email}}",user.email)
        };

        try {
            await transporter.sendMail(mailOptions);
            return res.status(200).json({ success: true, message: "reset  OTP sent to email" });
        } catch (emailError) {
            return res.status(500).json({ success: false, message: "Failed to reset", error: emailError.message });
        }
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};


export const resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
        return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required' });
    }

    try {
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (user.resetOtp !== otp) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        // Convert resetOtpExpireAt to a Date object before comparing
        if (new Date(user.resetOtpExpireAt) < Date.now()) {
            return res.status(400).json({ success: false, message: 'OTP expired' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.resetOtp = '';
        user.resetOtpExpireAt = null;

        await user.save();

        return res.status(200).json({ success: true, message: 'Password has been reset successfully' });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
