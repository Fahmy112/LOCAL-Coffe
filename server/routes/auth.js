// Backend/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');

const User = require('../models/User'); // استيراد موديل المستخدم
const authMiddleware = require('../middleware/auth'); // استيراد الـ middleware للتحقق من التوكن (تأكد من المسار الصحيح)

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post(
    '/register',
    [
        check('username', 'اسم المستخدم مطلوب').not().isEmpty(),
        check('password', 'الرجاء إدخال كلمة مرور بطول 6 أحرف أو أكثر').isLength({ min: 6 }),
        check('role', 'الدور مطلوب ويجب أن يكون "admin", "manager", أو "cashier"').isIn(['admin', 'manager', 'cashier'])
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, password, role } = req.body;

        try {
            // تحقق مما إذا كان المستخدم موجودًا بالفعل
            let user = await User.findOne({ username });
            if (user) {
                return res.status(400).json({ msg: 'هذا المستخدم موجود بالفعل.' });
            }

            // إنشاء مستخدم جديد
            user = new User({
                username,
                password,
                role
            });

            // تشفير كلمة المرور
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);

            await user.save();

            // إنشاء وإرجاع JSON Web Token (JWT)
            const payload = {
                user: {
                    id: user.id,
                    role: user.role,
                    username: user.username
                }
            };

            jwt.sign(
                payload,
                process.env.JWT_SECRET,
                { expiresIn: '1h' },
                (err, token) => {
                    if (err) throw err;
                    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
                }
            );

        } catch (err) {
            console.error(err.message);
            res.status(500).json({ msg: 'حدث خطأ في الخادم.' }); // تأكد من إرجاع JSON
        }
    }
);

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post(
    '/login',
    [
        check('username', 'اسم المستخدم مطلوب').not().isEmpty(),
        check('password', 'كلمة المرور مطلوبة').exists()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, password } = req.body;

        try {
            let user = await User.findOne({ username });
            if (!user) {
                return res.status(400).json({ msg: 'اسم المستخدم أو كلمة المرور غير صحيحة.' });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ msg: 'اسم المستخدم أو كلمة المرور غير صحيحة.' });
            }

            const payload = {
                user: {
                    id: user.id,
                    role: user.role,
                    username: user.username
                }
            };

            jwt.sign(
                payload,
                process.env.JWT_SECRET,
                { expiresIn: '1h' },
                (err, token) => {
                    if (err) throw err;
                    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
                }
            );

        } catch (err) {
            console.error(err.message);
            res.status(500).json({ msg: 'حدث خطأ في الخادم.' }); // تأكد من إرجاع JSON
        }
    }
);

// @route   GET /api/auth
// @desc    Get user by token (useful for checking authenticated user)
// @access  Private
router.get('/user', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'حدث خطأ في الخادم.' }); // تأكد من إرجاع JSON
    }
});

module.exports = router;