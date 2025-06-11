// server.js
require('dotenv').config();
console.log('Server starting...'); // سجل في بداية الملف
console.log('JWT_SECRET loaded:', process.env.JWT_SECRET);
const express = require('express');
const cors = require('cors');
// Removed body-parser as express.json() is sufficient
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


// استيراد مسارات الـ API
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products'); // <--- NEW: استيراد مسارات المنتجات
const orderRoutes = require('./routes/orders'); // <--- NEW: استيراد مسارات الطلبات
const ingredientRoutes = require('./routes/ingredients'); // <--- NEW: استيراد مسارات المكونات
const reportRoutes = require('./routes/reports');


// استيراد الموديلات والمسارات
const Product = require('./models/Product'); // <--- NEW: استيراد موديل المنتج
const Ingredient = require('./models/Ingredient'); // <--- NEW: استيراد موديل المكونات (إذا كان موجوداً)
const User = require('./models/User'); // <--- NEW: استيراد موديل المستخدم
const Order = require('./models/Order'); // <--- NEW: استيراد موديل الطلب
const app = express();
const port = 5000;


console.log('Middlewares configuration...'); // سجل قبل استخدام Middlewares
// --- Middlewares ---
app.use(cors());
app.use(express.json()); // Use only express.json() for parsing JSON bodies

console.log('Attempting to connect to MongoDB...'); // سجل قبل الاتصال بقاعدة البيانات
// --- Database Connection ---
const dbURI = process.env.MONGO_URI || 'mongodb://localhost:27017/restaurant_pos';
mongoose.connect(dbURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => {
        console.log('MongoDB Connected Successfully!'); // سجل عند نجاح الاتصال
        console.log('Connected to MongoDB!');
        // Initialize sample data after successful connection
        initSampleData();
})
.catch(err => {
    console.error('MongoDB connection error:', err); // سجل أي خطأ في الاتصال
    // من المهم هنا عدم السماح للخادم بالاستمرار إذا لم يتمكن من الاتصال بقاعدة البيانات
    // يمكن إرسال إشارة للعملية بالخروج أو عدم معالجة الطلبات
    process.exit(1); // إيقاف العملية إذا فشل الاتصال بقاعدة البيانات
});

// --- JWT Secret (IMPORTANT: Change this in production!) ---
const jwtSecret = process.env.JWT_SECRET || 'YOUR_SUPER_SECRET_COMPLEX_KEY_HERE_1234567890'; // Use env variable in production
process.env.JWT_SECRET = jwtSecret; // Make it available in middleware

// --- API Routes ---
console.log('Registering API routes...'); // سجل قبل تسجيل المسارات
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes); // <--- NEW: استخدام مسارات المنتجات
app.use('/api/orders', orderRoutes);
app.use('/api/ingredients', ingredientRoutes);
app.use('/api/reports', reportRoutes);

// --- Sample Data Initialization (إبقائها هنا للتسهيل مؤقتًا) ---
async function initSampleData() {
    console.log('Checking for existing sample data...'); // سجل داخل دالة initSampleData
    try {
        // التحقق مما إذا كانت هناك بيانات موجودة بالفعل
        const existingUsers = await User.countDocuments();
        const existingProducts = await Product.countDocuments();
        const existingIngredients = await Ingredient.countDocuments();

        if (existingUsers === 0) {
            console.log('No sample data found, initializing...');
            const salt = await bcrypt.genSalt(10);
            const hashedPasswordAdmin = await bcrypt.hash('admin@12345', salt);
            const hashedPasswordManager = await bcrypt.hash('admin@12345', salt);
            const hashedPasswordCashier = await bcrypt.hash('admin@12345', salt);
            const hashedPasswordEhap = await bcrypt.hash('admin@12345', salt);

            await User.insertMany([
                { username: 'admin', password: hashedPasswordAdmin, role: 'admin' },
                { username: 'Ehap', password: hashedPasswordEhap, role: 'admin' },
                { username: 'manager', password: hashedPasswordManager, role: 'manager' }
            ]);
            console.log('Sample users added!');
        }

        if (existingIngredients === 0) {
            const [
                coffeeBean, milk, sugar, flour, cheese, tomatoSauce, beefPatty, burgerBun, lettuce, potato
            ] = await Ingredient.insertMany([
                { name: 'حبوب قهوة', stock: 5000, unit: 'جرام' },
                { name: 'حليب', stock: 10000, unit: 'مل' },
                { name: 'سكر', stock: 2000, unit: 'جرام' },
                { name: 'دقيق', stock: 5000, unit: 'جرام' },
                { name: 'جبنة', stock: 3000, unit: 'جرام' },
                { name: 'صلصة طماطم', stock: 2000, unit: 'مل' },
                { name: 'قطعة لحم برجر', stock: 50, unit: 'قطعة' },
                { name: 'خبز برجر', stock: 50, unit: 'قطعة' },
                { name: 'خس', stock: 1000, unit: 'جرام' }, // بالجرام بدلاً من الورقات
                { name: 'بطاطس', stock: 10000, unit: 'جرام' }
            ]);
            console.log('Sample ingredients added!');
        }
        // Ensure products are inserted if missing, regardless of ingredients
        if (existingProducts === 0) {
            // If ingredients were just inserted, fetch them again
            const ingredients = await Ingredient.find({});
            const getIngredient = name => ingredients.find(i => i.name.includes(name));
            await Product.insertMany([
                { name: 'قهوة اسبريسو', price: 20, category: 'قهوة', image: 'https://via.placeholder.com/150/8B4513/FFFFFF?text=Espresso', ingredients: [{ ingredientId: getIngredient('حبوب قهوة')._id, quantityUsed: 20, unit: 'جرام' }] },
                { name: 'لاتيه', price: 35, category: 'قهوة', image: 'https://via.placeholder.com/150/A52A2A/FFFFFF?text=Latte', ingredients: [{ ingredientId: getIngredient('حبوب قهوة')._id, quantityUsed: 20, unit: 'جرام' }, { ingredientId: getIngredient('حليب')._id, quantityUsed: 200, unit: 'مل' }] },
                { name: 'كابوتشينو', price: 35, category: 'قهوة', image: 'https://via.placeholder.com/150/DEB887/000000?text=Cappuccino', ingredients: [{ ingredientId: getIngredient('حبوب قهوة')._id, quantityUsed: 20, unit: 'جرام' }, { ingredientId: getIngredient('حليب')._id, quantityUsed: 150, unit: 'مل' }] },
                { name: 'كرواسون', price: 15, category: 'معجنات', image: 'https://via.placeholder.com/150/FFD700/000000?text=Croissant', ingredients: [{ ingredientId: getIngredient('دقيق')._id, quantityUsed: 100, unit: 'جرام' }] },
                { name: 'بيتزا مارجريتا', price: 50, category: 'وجبات', image: 'https://via.placeholder.com/150/FF0000/FFFFFF?text=Pizza', ingredients: [
                    { ingredientId: getIngredient('دقيق')._id, quantityUsed: 200, unit: 'جرام' },
                    { ingredientId: getIngredient('جبنة')._id, quantityUsed: 150, unit: 'جرام' },
                    { ingredientId: getIngredient('صلصة طماطم')._id, quantityUsed: 100, unit: 'مل' }
                ]},
                { name: 'برجر لحم', price: 60, category: 'وجبات', image: 'https://via.placeholder.com/150/0000FF/FFFFFF?text=Burger', ingredients: [
                    { ingredientId: getIngredient('قطعة لحم برجر')._id, quantityUsed: 1, unit: 'قطعة' },
                    { ingredientId: getIngredient('خبز برجر')._id, quantityUsed: 1, unit: 'قطعة' },
                    { ingredientId: getIngredient('خس')._id, quantityUsed: 10, unit: 'جرام' }
                ]},
                { name: 'بطاطس مقلية', price: 25, category: 'مقليات', image: 'https://via.placeholder.com/150/FFFF00/000000?text=Fries', ingredients: [
                    { ingredientId: getIngredient('بطاطس')._id, quantityUsed: 250, unit: 'جرام' }
                ]},
                { name: 'عصير برتقال', price: 30, category: 'مشروبات', image: 'https://via.placeholder.com/150/FFA500/FFFFFF?text=Juice' }
            ]);
            console.log('Sample products added!');
        }
        if (existingUsers !== 0 && existingIngredients !== 0 && existingProducts !== 0) {
            console.log('Sample data (users, ingredients, products) already exists, skipping initialization.');
        }

    } catch (err) {
        console.error('Error initializing sample data:', err);
    }
}


// Sample data initialization is now called after DB connection


// Server port
// const PORT = process.env.PORT || 5000;
module.exports = app;
// app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

// *** ملاحظة هامة: يجب أن تكون موديلات User, Order, Ingredient موجودة أو معرفة في ملفات منفصلة
// لتجنب الأخطاء في server.js عند استخدامها في initSampleData.
// تأكد من أن لديك ملفات مثل:
// models/User.js
// models/Order.js
// models/Ingredient.js
// بنفس طريقة models/Product.js