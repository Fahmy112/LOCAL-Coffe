// Backend/routes/ingredients.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // تأكد من وجود ملف الـ middleware هذا
const Ingredient = require('../models/Ingredient');
const { check, validationResult } = require('express-validator');

// @route   GET /api/ingredients
// @desc    Get all ingredients
// @access  Private (Admin or Manager for full details)
router.get('/', auth, async (req, res) => {
    // يمكن لأي مستخدم مصادق عليه رؤية قائمة المكونات (مثلاً لاختيارها في المنتجات)
    // ولكن ربما تحتاج صلاحيات أعلى لإدارة المخزون الفعلي.
    // في هذا المثال، سنسمح بالوصول للجميع ولكن معلومات المخزون ستكون محمية في الواجهة الأمامية.
    try {
        const ingredients = await Ingredient.find().sort({ name: 1 });
        res.json(ingredients);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/ingredients
// @desc    Add new ingredient
// @access  Private (Admin or Manager)
router.post(
    '/',
    [
        auth,
        check('name', 'اسم المكون مطلوب').not().isEmpty(),
        check('stock', 'الكمية في المخزون مطلوبة ويجب أن تكون رقمًا موجبًا أو صفرًا').isInt({ min: 0 }),
        check('unit', 'وحدة القياس مطلوبة').not().isEmpty()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        if (req.user.role !== 'admin' && req.user.role !== 'manager') {
            return res.status(403).json({ msg: 'ليس لديك صلاحية لإضافة مكونات.' });
        }

        const { name, stock, unit } = req.body;

        try {
            let ingredient = await Ingredient.findOne({ name });
            if (ingredient) {
                return res.status(400).json({ msg: 'المكون بهذا الاسم موجود بالفعل.' });
            }

            ingredient = new Ingredient({
                name,
                stock,
                unit
            });

            await ingredient.save();
            res.json(ingredient);

        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    }
);

// @route   PUT /api/ingredients/:id
// @desc    Update an ingredient
// @access  Private (Admin or Manager)
router.put(
    '/:id',
    [
        auth,
        check('name', 'اسم المكون مطلوب').not().isEmpty(),
        check('stock', 'الكمية في المخزون مطلوبة ويجب أن تكون رقمًا موجبًا أو صفرًا').isInt({ min: 0 }),
        check('unit', 'وحدة القياس مطلوبة').not().isEmpty()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        if (req.user.role !== 'admin' && req.user.role !== 'manager') {
            return res.status(403).json({ msg: 'ليس لديك صلاحية لتعديل المكونات.' });
        }

        const { name, stock, unit } = req.body;
        const ingredientFields = { name, stock, unit };

        try {
            let ingredient = await Ingredient.findById(req.params.id);
            if (!ingredient) {
                return res.status(404).json({ msg: 'المكون غير موجود.' });
            }

            // التحقق إذا كان الاسم الجديد موجودًا لمكون آخر (إذا تم تغيير الاسم)
            if (name && name !== ingredient.name) {
                const existingIngredient = await Ingredient.findOne({ name });
                if (existingIngredient && String(existingIngredient._id) !== req.params.id) {
                    return res.status(400).json({ msg: 'اسم المكون هذا مستخدم بالفعل من قبل مكون آخر.' });
                }
            }

            ingredient = await Ingredient.findByIdAndUpdate(
                req.params.id,
                { $set: ingredientFields },
                { new: true }
            );

            res.json(ingredient);

        } catch (err) {
            console.error(err.message);
            if (err.kind === 'ObjectId') {
                return res.status(404).json({ msg: 'المكون غير موجود.' });
            }
            res.status(500).send('Server Error');
        }
    }
);

// @route   DELETE /api/ingredients/:id
// @desc    Delete an ingredient
// @access  Private (Admin or Manager)
router.delete('/:id', auth, async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
        return res.status(403).json({ msg: 'ليس لديك صلاحية لحذف المكونات.' });
    }
    try {
        const ingredient = await Ingredient.findById(req.params.id);
        if (!ingredient) {
            return res.status(404).json({ msg: 'المكون غير موجود.' });
        }

        await Ingredient.deleteOne({ _id: req.params.id });
        res.json({ msg: 'تم حذف المكون.' });

    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'المكون غير موجود.' });
        }
        res.status(500).send('Server Error');
    }
});

module.exports = router;
