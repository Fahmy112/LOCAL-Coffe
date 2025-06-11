// Backend/routes/products.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // تأكد من وجود ملف الـ middleware هذا
const Product = require('../models/Product');
const Ingredient = require('../models/Ingredient'); // ستحتاج لهذا إذا كنت تدير المكونات
const { check, validationResult } = require('express-validator');

// @route   GET /api/products
// @desc    Get all products (public or authenticated to allow stock view)
// @access  Public (or Private, depending on requirements)
// تم تعديله ليقوم بتضمين بيانات المكونات المطلوبة إذا كنت تريد عرضها في الفرونت إند
router.get('/', auth, async (req, res) => {
    try {
        let products;
        if (req.user && (req.user.role === 'admin' || req.user.role === 'manager')) {
            // للمدراء والمسؤولين، جلب المنتجات مع بيانات المكونات
            products = await Product.find().populate('ingredients.ingredientId', 'name unit').sort({ name: 1 });
        } else {
            // للكاشير أو المستخدمين العاديين، جلب المنتجات بدون تفاصيل المخزون الحساسة أو المكونات
            // في هذا المثال، سنرجع كل المنتجات لأن الواجهة الأمامية (App.js) لا تحتاج تفاصيل المكونات لعرض قائمة الكاشير
            products = await Product.find().sort({ name: 1 });
        }
        res.json(products);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/products
// @desc    Add new product
// @access  Private (Admin or Manager)
router.post(
    '/',
    [
        auth, // يتطلب توثيق
        check('name', 'اسم المنتج مطلوب').not().isEmpty(),
        check('price', 'السعر مطلوب ويجب أن يكون رقمًا موجبًا').isFloat({ min: 0 }),
        check('category', 'الفئة مطلوبة').not().isEmpty(),
        check('stock', 'الكمية في المخزون مطلوبة ويجب أن تكون رقمًا موجبًا أو صفرًا').isInt({ min: 0 }),
        check('ingredients', 'المكونات يجب أن تكون مصفوفة صالحة').optional().isArray(),
        check('ingredients.*.ingredientId', 'معرف المكون مطلوب').optional().isMongoId(),
        check('ingredients.*.quantityUsed', 'كمية المكون المستخدمة مطلوبة ويجب أن تكون رقمًا موجبًا').optional().isFloat({ min: 0 }),
        check('ingredients.*.unit', 'وحدة قياس المكون مطلوبة').optional().not().isEmpty(),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // تحقق من الصلاحيات: المدير أو المسؤول فقط يمكنه إضافة المنتجات
        if (req.user.role !== 'admin' && req.user.role !== 'manager') {
            return res.status(403).json({ msg: 'ليس لديك صلاحية لإضافة منتجات' });
        }

        const { name, price, category, description, image, stock, ingredients } = req.body;

        try {
            // التحقق مما إذا كان المنتج موجودًا بالفعل
            let product = await Product.findOne({ name });
            if (product) {
                return res.status(400).json({ msg: 'المنتج بهذا الاسم موجود بالفعل' });
            }

            // تحقق من أن كل ingredientId موجود بالفعل في قاعدة بيانات المكونات (اختياري لكن موصى به)
            if (ingredients && ingredients.length > 0) {
                for (let i = 0; i < ingredients.length; i++) {
                    const ing = await Ingredient.findById(ingredients[i].ingredientId);
                    if (!ing) {
                        return res.status(400).json({ msg: `المكون بالمعرف ${ingredients[i].ingredientId} غير موجود.` });
                    }
                }
            }


            product = new Product({
                name,
                price,
                category,
                description,
                image,
                stock,
                ingredients: ingredients || [] // تأكد من أنها مصفوفة أو فارغة
            });

            await product.save();
            res.json(product);

        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    }
);

// @route   PUT /api/products/:id
// @desc    Update a product
// @access  Private (Admin or Manager)
router.put(
    '/:id',
    [
        auth, // يتطلب توثيق
        check('name', 'اسم المنتج مطلوب').not().isEmpty(),
        check('price', 'السعر مطلوب ويجب أن يكون رقمًا موجبًا').isFloat({ min: 0 }),
        check('category', 'الفئة مطلوبة').not().isEmpty(),
        check('stock', 'الكمية في المخزون مطلوبة ويجب أن تكون رقمًا موجبًا أو صفرًا').isInt({ min: 0 }),
        check('ingredients', 'المكونات يجب أن تكون مصفوفة صالحة').optional().isArray(),
        check('ingredients.*.ingredientId', 'معرف المكون مطلوب').optional().isMongoId(),
        check('ingredients.*.quantityUsed', 'كمية المكون المستخدمة مطلوبة ويجب أن تكون رقمًا موجبًا').optional().isFloat({ min: 0 }),
        check('ingredients.*.unit', 'وحدة قياس المكون مطلوبة').optional().not().isEmpty(),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // تحقق من الصلاحيات: المدير أو المسؤول فقط يمكنه تعديل المنتجات
        if (req.user.role !== 'admin' && req.user.role !== 'manager') {
            return res.status(403).json({ msg: 'ليس لديك صلاحية لتعديل المنتجات' });
        }

        const { name, price, category, description, image, stock, ingredients } = req.body;

        // بناء كائن المنتج المراد تحديثه
        const productFields = {
            name,
            price,
            category,
            description: description || '',
            image: image || 'https://via.placeholder.com/150',
            stock,
            ingredients: ingredients || []
        };

        try {
            let product = await Product.findById(req.params.id);
            if (!product) {
                return res.status(404).json({ msg: 'المنتج غير موجود' });
            }

            // التحقق إذا كان الاسم الجديد موجودًا لمنتج آخر (إذا تم تغيير الاسم)
            if (name && name !== product.name) {
                const existingProduct = await Product.findOne({ name });
                if (existingProduct && String(existingProduct._id) !== req.params.id) {
                    return res.status(400).json({ msg: 'اسم المنتج هذا مستخدم بالفعل من قبل منتج آخر.' });
                }
            }

            // تحقق من أن كل ingredientId موجود بالفعل في قاعدة بيانات المكونات (اختياري لكن موصى به)
            if (ingredients && ingredients.length > 0) {
                for (let i = 0; i < ingredients.length; i++) {
                    const ing = await Ingredient.findById(ingredients[i].ingredientId);
                    if (!ing) {
                        return res.status(400).json({ msg: `المكون بالمعرف ${ingredients[i].ingredientId} غير موجود.` });
                    }
                }
            }

            product = await Product.findByIdAndUpdate(
                req.params.id,
                { $set: productFields },
                { new: true }
            );

            res.json(product);

        } catch (err) {
            console.error(err.message);
            if (err.kind === 'ObjectId') {
                return res.status(404).json({ msg: 'المنتج غير موجود' });
            }
            res.status(500).send('Server Error');
        }
    }
);

// @route   DELETE /api/products/:id
// @desc    Delete a product
// @access  Private (Admin or Manager)
router.delete('/:id', auth, async (req, res) => {
    try {
        // تحقق من الصلاحيات: المدير أو المسؤول فقط يمكنه حذف المنتجات
        if (req.user.role !== 'admin' && req.user.role !== 'manager') {
            return res.status(403).json({ msg: 'ليس لديك صلاحية لحذف المنتجات' });
        }

        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ msg: 'المنتج غير موجود' });
        }

        await Product.deleteOne({ _id: req.params.id }); // استخدام deleteOne أو findByIdAndDelete
        res.json({ msg: 'تم حذف المنتج' });

    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'المنتج غير موجود' });
        }
        res.status(500).send('Server Error');
    }
});

module.exports = router;