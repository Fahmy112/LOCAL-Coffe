// Backend/routes/users.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // تأكد من وجود ملف الـ middleware هذا
const User = require('../models/User'); // استيراد موديل المستخدم

// @route   GET /api/users
// @desc    Get all users (for admin/manager)
// @access  Private (Admin or Manager)
router.get('/', auth, async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
        return res.status(403).json({ msg: 'ليس لديك صلاحية لعرض المستخدمين.' });
    }
    try {
        const users = await User.find().select('-password'); // لا ترجع كلمات المرور
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// يمكنك إضافة مسارات لتعديل/حذف المستخدمين هنا إذا لزم الأمر
module.exports = router;