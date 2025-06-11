// Backend/models/Ingredient.js
const mongoose = require('mongoose');

const IngredientSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    stock: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    unit: { // وحدة القياس (مثل: جرام، مل، قطعة، كجم)
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Ingredient', IngredientSchema);