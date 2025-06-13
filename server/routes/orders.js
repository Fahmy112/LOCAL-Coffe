// Backend/routes/orders.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Order = require('../models/Order');
const Product = require('../models/Product'); // لاسترداد تفاصيل المنتج إذا لزم الأمر

// @route   POST /api/orders
// @desc    Place a new order
// @access  Private (Cashier, Manager, Admin)
router.post(
    '/',
    auth, // يتطلب توثيق أي مستخدم لوضع طلب
    async (req, res) => {
        const { items, totalAmount } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ msg: 'الطلب يجب أن يحتوي على عناصر.' });
        }

        try {
            // تحقق من توفر المخزون قبل إنشاء الطلب
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const product = await Product.findById(item.productId);
                if (!product) {
                    return res.status(404).json({ msg: `المنتج ${item.name} غير موجود.` });
                }
                if (product.stock < item.quantity) {
                    return res.status(400).json({ msg: `المخزون غير كافٍ للمنتج: ${product.name}. المتوفر: ${product.stock}` });
                }
                // تحديث المخزون بعد التأكد من توفره
                product.stock -= item.quantity;
                await product.save();
            }

            const newOrder = new Order({
                items,
                totalAmount,
                orderedBy: req.user.id // من الـ middleware
            });

            const order = await newOrder.save();
            res.json(order);

        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    }
);

// @route   GET /api/orders
// @desc    Get all orders (for admin/manager) with filters
// @access  Private (Admin or Manager)
router.get('/', auth, async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
        return res.status(403).json({ msg: 'ليس لديك صلاحية لعرض الطلبات.' });
    }
    try {
        const { date, month, status, cashier, search } = req.query;
        let query = {};
        // فلترة حسب اليوم
        if (date) {
            const start = new Date(date);
            start.setUTCHours(0, 0, 0, 0);
            const end = new Date(date);
            end.setUTCHours(23, 59, 59, 999);
            query["$and"] = [
                { createdAt: { $gte: start, $lte: end } }
            ];
        }
        // فلترة حسب الشهر
        if (month) {
            const [year, mon] = month.split('-');
            const start = new Date(Number(year), Number(mon) - 1, 1);
            const end = new Date(Number(year), Number(mon), 1);
            query["$and"] = query["$and"] || [];
            query["$and"].push({ createdAt: { $gte: start, $lt: end } });
        }
        // فلترة حسب الحالة
        if (status) {
            query.status = status;
        }
        // فلترة حسب الكاشير
        if (cashier) {
            // سنبحث باسم المستخدم في orderedBy
            const users = await require('../models/User').find({ username: cashier });
            if (users.length > 0) {
                query.orderedBy = users[0]._id;
            } else {
                // إذا لم يوجد كاشير بهذا الاسم، أرجع نتائج فارغة
                return res.json([]);
            }
        }
        // فلترة بالبحث
        if (search) {
            // بحث برقم الطلب أو اسم الكاشير
            const users = await require('../models/User').find({ username: { $regex: search, $options: 'i' } });
            const userIds = users.map(u => u._id);
            query["$or"] = [
                { _id: search },
                { orderedBy: { $in: userIds } }
            ];
        }
        // جلب الطلبات وترتيبها حسب التاريخ وتضمين معلومات المستخدم
        const orders = await Order.find(query)
                                   .populate('orderedBy', 'username role')
                                   .sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/orders/:id
// @desc    Get single order by ID
// @access  Private (Admin, Manager, or Cashier if it's their order)
router.get('/:id', auth, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate('orderedBy', 'username role');

        if (!order) {
            return res.status(404).json({ msg: 'الطلب غير موجود.' });
        }

        // السماح للمدير أو المسؤول بالوصول لأي طلب، أو الكاشير للوصول لطلباته
        if (req.user.role === 'admin' || req.user.role === 'manager' || String(order.orderedBy._id) === req.user.id) {
            res.json(order);
        } else {
            return res.status(403).json({ msg: 'ليس لديك صلاحية لعرض هذا الطلب.' });
        }
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'الطلب غير موجود.' });
        }
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/orders/:id
// @desc    Update an order (admin/manager only)
// @access  Private
router.put('/:id', auth, async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
        return res.status(403).json({ msg: 'ليس لديك صلاحية لتعديل الطلبات.' });
    }
    try {
        const updatedOrder = await Order.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        if (!updatedOrder) {
            return res.status(404).json({ msg: 'الطلب غير موجود.' });
        }
        res.json(updatedOrder);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/orders/:id
// @desc    Delete an order (admin/manager only)
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
        return res.status(403).json({ msg: 'ليس لديك صلاحية لحذف الطلبات.' });
    }
    try {
        const deletedOrder = await Order.findByIdAndDelete(req.params.id);
        if (!deletedOrder) {
            return res.status(404).json({ msg: 'الطلب غير موجود.' });
        }
        res.json({ msg: 'تم حذف الطلب بنجاح.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;