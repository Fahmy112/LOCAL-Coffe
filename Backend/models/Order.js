// Backend/models/Order.js
const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    items: [
        {
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product', // يشير إلى موديل المنتج
                required: true
            },
            name: {
                type: String,
                required: true
            },
            price: {
                type: Number,
                required: true
            },
            quantity: {
                type: Number,
                required: true,
                min: 1
            }
        }
    ],
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    orderDate: {
        type: Date,
        default: Date.now
    },
    orderedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // يشير إلى موديل المستخدم الذي أجرى الطلب
        required: true
    }
});

module.exports = mongoose.model('Order', OrderSchema);
