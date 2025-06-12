// Backend/routes/reports.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // Middleware for authentication
const Order = require('../models/Order');     // Order model
const Product = require('../models/Product'); // Product model
const User = require('../models/User');       // User model

// @route   GET /api/reports/daily-sales
// @desc    Get daily sales report for a specific date
// @access  Private (Admin or Manager)
router.get('/daily-sales', auth, async (req, res) => {
    // Check user role for authorization
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
        return res.status(403).json({ msg: 'ليس لديك صلاحية لعرض تقارير المبيعات اليومية.' });
    }

    const { date } = req.query; // Expecting date in YYYY-MM-DD format from frontend

    if (!date) {
        return res.status(400).json({ msg: 'التاريخ مطلوب لتقرير المبيعات اليومية.' });
    }

    try {
        // Parse the date to get start and end of the day
        const startOfDay = new Date(date);
        startOfDay.setUTCHours(0, 0, 0, 0); // Start of the day in UTC

        const endOfDay = new Date(date);
        endOfDay.setUTCHours(23, 59, 59, 999); // End of the day in UTC

        // Ensure proper timezone handling if your dates are stored differently
        // For simplicity, assuming dates are stored in UTC or are compared correctly.

        const dailyOrders = await Order.find({
            orderDate: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        }).populate('items.productId'); // Populate product details for items in order

        let totalSales = 0;
        let totalOrders = dailyOrders.length;
        const productsSold = {};

        dailyOrders.forEach(order => {
            totalSales += order.totalAmount;
            order.items.forEach(item => {
                const productId = item.productId ? item.productId._id.toString() : 'unknown';
                const productName = item.name;

                if (!productsSold[productId]) {
                    productsSold[productId] = {
                        name: productName,
                        quantity: 0,
                        totalPrice: 0
                    };
                }
                productsSold[productId].quantity += item.quantity;
                productsSold[productId].totalPrice += item.price * item.quantity;
            });
        });

        const detailedProductsSold = Object.values(productsSold);

        res.json({
            date: date,
            totalSales: totalSales,
            totalOrders: totalOrders,
            productsSold: detailedProductsSold
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'حدث خطأ في الخادم أثناء جلب تقرير المبيعات اليومية.' });
    }
});

// @route   GET /api/reports/product-sales
// @desc    Get overall product sales report
// @access  Private (Admin or Manager)
router.get('/product-sales', auth, async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
        return res.status(403).json({ msg: 'ليس لديك صلاحية لعرض تقارير مبيعات المنتجات.' });
    }

    try {
        const orders = await Order.find().populate('items.productId');

        const productSales = {};
        orders.forEach(order => {
            order.items.forEach(item => {
                const productId = item.productId ? item.productId._id.toString() : 'Unknown Product ID';
                const productName = item.name; // Use item.name from the order for consistency

                if (productSales[productId]) {
                    productSales[productId].totalSales += item.price * item.quantity;
                    productSales[productId].totalQuantitySold += item.quantity;
                } else {
                    productSales[productId] = {
                        productName: productName,
                        totalSales: item.price * item.quantity,
                        totalQuantitySold: item.quantity
                    };
                }
            });
        });

        const report = Object.values(productSales).sort((a, b) => b.totalSales - a.totalSales); // Sort by total sales

        res.json(report);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'حدث خطأ في الخادم أثناء جلب تقرير مبيعات المنتجات.' });
    }
});

// @route   GET /api/reports/employee-sales
// @desc    Get overall employee sales report
// @access  Private (Admin or Manager)
router.get('/employee-sales', auth, async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
        return res.status(403).json({ msg: 'ليس لديك صلاحية لعرض تقارير مبيعات الموظفين.' });
    }

    try {
        // Aggregate orders by the 'orderedBy' field (User ID)
        const employeeSales = await Order.aggregate([
            {
                $group: {
                    _id: '$orderedBy',
                    totalSales: { $sum: '$totalAmount' },
                    numberOfOrders: { $sum: 1 }
                }
            },
            {
                $lookup: { // Join with User collection to get employee details
                    from: 'users', // Collection name in MongoDB (usually lowercase plural of model name)
                    localField: '_id',
                    foreignField: '_id',
                    as: 'employeeInfo'
                }
            },
            {
                $unwind: '$employeeInfo' // Deconstruct the array created by $lookup
            },
            {
                $project: { // Shape the output
                    _id: 0, // Exclude _id
                    employeeId: '$_id',
                    employeeName: '$employeeInfo.username',
                    employeeRole: '$employeeInfo.role',
                    totalSales: '$totalSales',
                    numberOfOrders: '$numberOfOrders'
                }
            },
            {
                $sort: { totalSales: -1 } // Sort by total sales descending
            }
        ]);

        res.json(employeeSales);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'حدث خطأ في الخادم أثناء جلب تقرير مبيعات الموظفين.' });
    }
});

// @route   GET /api/reports/orders
// @desc    Get all orders for a specific day
// @access  Private (Admin or Manager)
router.get('/orders', auth, async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
        return res.status(403).json({ msg: 'ليس لديك صلاحية لعرض أوردرات اليوم.' });
    }
    const { date } = req.query;
    if (!date) return res.status(400).json({ msg: 'يرجى تحديد التاريخ' });
    try {
        const start = new Date(date);
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setUTCHours(23, 59, 59, 999);

        // جرب البحث بالحقلين
        const ordersByCreatedAt = await Order.find({
            createdAt: { $gte: start, $lte: end }
        }).sort({ createdAt: -1 });

        const ordersByOrderDate = await Order.find({
            orderDate: { $gte: start, $lte: end }
        }).sort({ orderDate: -1 });

        console.log('ordersByCreatedAt:', ordersByCreatedAt.length);
        console.log('ordersByOrderDate:', ordersByOrderDate.length);

        // أرجع النتائج غير الفارغة
        if (ordersByCreatedAt.length > 0) return res.json(ordersByCreatedAt);
        if (ordersByOrderDate.length > 0) return res.json(ordersByOrderDate);

        return res.json([]); // لا يوجد أوردرات في هذا اليوم
    } catch (err) {
        console.error('orders report error:', err);
        res.status(500).json({ msg: 'خطأ في السيرفر' });
    }
});

module.exports = router;