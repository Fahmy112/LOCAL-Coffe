// Backend/models/Product.js
const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true // تأكد أن اسم المنتج فريد
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    category: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    image: {
        type: String, // رابط الصورة
        default: 'https://via.placeholder.com/150' // صورة افتراضية
    },
    stock: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    ingredients: [ // قائمة المكونات المطلوبة لهذا المنتج
        {
            ingredientId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Ingredient' // يشير إلى موديل المكونات
            },
            quantityUsed: { // الكمية المستخدمة من هذا المكون لصنع وحدة واحدة من المنتج
                type: Number,
                required: true,
                min: 0
            },
            unit: { // وحدة القياس لهذا المكون في المنتج (مثال: جرام، مل، قطعة)
                type: String,
                required: true
            }
        }
    ],
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Product', ProductSchema);