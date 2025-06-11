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
// @desc    Get all orders (for admin/manager)
// @access  Private (Admin or Manager)
router.get('/', auth, async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
        return res.status(403).json({ msg: 'ليس لديك صلاحية لعرض الطلبات.' });
    }
    try {
        // جلب الطلبات وترتيبها حسب التاريخ وتضمين معلومات المستخدم
        const orders = await Order.find()
                                   .populate('orderedBy', 'username role') // جلب اسم ودور المستخدم الذي قام بالطلب
                                   .sort({ orderDate: -1 }); // أحدث الطلبات أولاً
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

module.exports = router;