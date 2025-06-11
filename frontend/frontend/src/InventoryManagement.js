// frontend/src/InventoryManagement.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Box, Button, TextField, Dialog, DialogActions,
  DialogContent, DialogTitle, FormControl, InputLabel, Select, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton,
  Alert, CircularProgress // لإضافة رسائل التنبيه وحالة التحميل
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove'; // لإضافة/إزالة حقول المكونات

const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? '/api' // هذا للتشغيل على Vercel، حيث تكون الواجهة الأمامية والخلفية على نفس النطاق
  : 'http://localhost:5000/api'; // للتشغيل المحلي

const InventoryManagement = ({ token, userRole }) => {
  const [products, setProducts] = useState([]); // المنتجات التي يتم عرضها في الجدول
  const [ingredientsList, setIngredientsList] = useState([]); // قائمة المكونات المتاحة للاختيار منها
  const [openDialog, setOpenDialog] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: '',
    description: '',
    image: '',
    stock: '',
    ingredients: [] // لتخزين المكونات المرتبطة بالمنتج
  });
  const [dialogTitle, setDialogTitle] = useState('');
  const [loading, setLoading] = useState(true); // حالة التحميل
  const [error, setError] = useState(''); // رسائل الخطأ
  const [successMessage, setSuccessMessage] = useState(''); // رسائل النجاح

  // جلب المنتجات
  const fetchProducts = useCallback(async () => {
    if (!token) {
        setLoading(false);
        return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/products`, {
        headers: { 'x-auth-token': token }
      });
      if (response.status === 401 || response.status === 403) {
        setError('جلسة المستخدم انتهت أو ليس لديك صلاحية. يرجى تسجيل الدخول مرة أخرى.');
        setLoading(false);
        // يمكن إضافة منطق لإعادة التوجيه لصفحة تسجيل الدخول هنا في App.js
        return;
      }
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('حدث خطأ أثناء جلب المنتجات.');
    } finally {
        setLoading(false);
    }
  }, [token]);

  // جلب قائمة المكونات المتاحة (لاستخدامها في نموذج إضافة/تعديل المنتجات)
  const fetchIngredientsList = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/ingredients`, {
        headers: { 'x-auth-token': token }
      });
      if (response.ok) {
        const data = await response.json();
        setIngredientsList(data);
      } else {
        console.error('Failed to fetch ingredients list:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching ingredients list:', error);
    }
  }, [token]);


  useEffect(() => {
    if (userRole === 'admin' || userRole === 'manager') {
      fetchProducts();
      fetchIngredientsList(); // جلب قائمة المكونات عند تحميل المكون
    } else {
      setError('ليس لديك صلاحية لعرض أو إدارة المخزون.');
      setLoading(false);
    }
  }, [fetchProducts, fetchIngredientsList, userRole]);

  // فتح نافذة إضافة منتج جديد
  const handleAddProduct = () => {
    setCurrentProduct(null);
    setFormData({ name: '', price: '', category: '', description: '', image: '', stock: '', ingredients: [] });
    setDialogTitle('إضافة منتج جديد');
    setOpenDialog(true);
    setError('');
    setSuccessMessage('');
  };

  // فتح نافذة تعديل منتج موجود
  const handleEditProduct = (product) => {
    setCurrentProduct(product);
    setFormData({
      name: product.name,
      price: product.price,
      category: product.category,
      description: product.description || '',
      image: product.image || '',
      stock: product.stock,
      // تأكد أن المكونات تنسخ بشكل صحيح، خاصة إذا كانت تحتوي على ObjectIDs
      ingredients: product.ingredients.map(ing => ({
        ingredientId: ing.ingredientId._id || ing.ingredientId, // قد يكون ObjectID أو الكائن الممتلئ
        name: ing.ingredientId.name || '', // اسم المكون لعرضه
        quantityUsed: ing.quantityUsed,
        unit: ing.unit
      }))
    });
    setDialogTitle('تعديل المنتج');
    setOpenDialog(true);
    setError('');
    setSuccessMessage('');
  };

  // إغلاق نافذة الإدخال
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentProduct(null); // مسح المنتج الحالي عند الإغلاق
  };

  // معالجة تغييرات حقول النموذج
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // معالجة تغييرات حقول المكونات داخل النموذج
  const handleIngredientChange = (index, field, value) => {
    const updatedIngredients = [...formData.ingredients];
    if (field === 'ingredientId') {
        const selectedIngredient = ingredientsList.find(ing => ing._id === value);
        updatedIngredients[index] = {
            ...updatedIngredients[index],
            ingredientId: value,
            name: selectedIngredient ? selectedIngredient.name : '',
            unit: selectedIngredient ? selectedIngredient.unit : '' // جلب الوحدة من المكون المحدد
        };
    } else {
        updatedIngredients[index] = { ...updatedIngredients[index], [field]: value };
    }
    setFormData({ ...formData, ingredients: updatedIngredients });
  };

  // إضافة حقل مكون جديد إلى النموذج
  const handleAddIngredientField = () => {
    setFormData({
      ...formData,
      ingredients: [...formData.ingredients, { ingredientId: '', quantityUsed: 0, unit: '' }]
    });
  };

  // إزالة حقل مكون من النموذج
  const handleRemoveIngredientField = (index) => {
    const updatedIngredients = formData.ingredients.filter((_, i) => i !== index);
    setFormData({ ...formData, ingredients: updatedIngredients });
  };


  // إرسال النموذج (إضافة أو تعديل)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    const method = currentProduct ? 'PUT' : 'POST';
    const url = currentProduct ? `${API_BASE_URL}/products/${currentProduct._id}` : `${API_BASE_URL}/products`;

    // تهيئة البيانات لإرسالها إلى الـ Backend
    const dataToSend = {
      ...formData,
      price: Number(formData.price), // تحويل السعر لرقم
      stock: Number(formData.stock), // تحويل المخزون لرقم
      // التأكد من أن المكونات ترسل بالصيغة الصحيحة (فقط ingredientId, quantityUsed, unit)
      ingredients: formData.ingredients.map(ing => ({
        ingredientId: ing.ingredientId,
        quantityUsed: Number(ing.quantityUsed),
        unit: ing.unit
      }))
    };

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify(dataToSend),
      });

      const result = await response.json(); // تغيير الاسم لتجنب تضارب مع "data" العامة

      if (response.ok) {
        setSuccessMessage(currentProduct ? 'تم تعديل المنتج بنجاح!' : 'تم إضافة المنتج بنجاح!');
        fetchProducts(); // إعادة جلب المنتجات لتحديث القائمة
        handleCloseDialog(); // إغلاق النافذة
      } else {
        const errorMsg = result.msg || (result.errors && result.errors.length > 0 ? result.errors.map(err => err.msg).join(', ') : 'حدث خطأ غير معروف.');
        setError(errorMsg);
      }
    } catch (error) {
      console.error('Error saving product:', error);
      setError('حدث خطأ في الشبكة أثناء حفظ المنتج.');
    } finally {
        setLoading(false);
    }
  };

  // حذف منتج
  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('هل أنت متأكد أنك تريد حذف هذا المنتج؟')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
        method: 'DELETE',
        headers: { 'x-auth-token': token }
      });

      const result = await response.json();

      if (response.ok) {
        setSuccessMessage('تم حذف المنتج بنجاح!');
        fetchProducts(); // إعادة جلب المنتجات لتحديث القائمة
      } else {
        setError(result.msg || 'حدث خطأ أثناء حذف المنتج.');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      setError('حدث خطأ في الشبكة أثناء حذف المنتج.');
    } finally {
        setLoading(false);
    }
  };

  // عرض رسالة صلاحية الدخول إذا لم يكن المستخدم مديرًا أو مسؤولاً
  if (userRole !== 'admin' && userRole !== 'manager') {
    return (
      <Container sx={{ mt: 4 }}>
        <Typography variant="h5" color="error" align="center">
          ليس لديك صلاحية للوصول إلى إدارة المخزون.
        </Typography>
      </Container>
    );
  }

  // إذا كان لا يزال يحمل البيانات، أظهر مؤشر التحميل
  if (loading && products.length === 0) { // فقط إذا لم يكن هناك منتجات بعد
    return (
      <Container sx={{ mt: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>جاري تحميل المنتجات...</Typography>
      </Container>
    );
  }


  return (
    <Container sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h2">إدارة المخزون (المنتجات)</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddProduct}
        >
          أضف منتج جديد
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>الاسم</TableCell>
              <TableCell>الفئة</TableCell>
              <TableCell align="right">السعر (ريال)</TableCell>
              <TableCell align="right">المخزون</TableCell>
              <TableCell>الصورة</TableCell>
              <TableCell align="center">الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  لا توجد منتجات في المخزون حاليًا.
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product._id}>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell align="right">{product.price.toFixed(2)}</TableCell>
                  <TableCell align="right">{product.stock}</TableCell>
                  <TableCell>
                    <img src={product.image || 'https://via.placeholder.com/50'} alt={product.name} style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: '4px' }} />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton color="primary" onClick={() => handleEditProduct(product)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton color="secondary" onClick={() => handleDeleteProduct(product._id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* نموذج إضافة/تعديل المنتج */}
      <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="sm">
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="اسم المنتج"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.name}
            onChange={handleChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="price"
            label="السعر"
            type="number"
            fullWidth
            variant="outlined"
            value={formData.price}
            onChange={handleChange}
            inputProps={{ step: "0.01", min: "0" }}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
            <InputLabel>الفئة</InputLabel>
            <Select
              name="category"
              value={formData.category}
              onChange={handleChange}
              label="الفئة"
            >
              <MenuItem value=""><em>اختر فئة</em></MenuItem>
              <MenuItem value="قهوة">قهوة</MenuItem>
              <MenuItem value="معجنات">معجنات</MenuItem>
              <MenuItem value="سندويتشات">سندويتشات</MenuItem>
              <MenuItem value="حلويات">حلويات</MenuItem>
              <MenuItem value="مشروبات باردة">مشروبات باردة</MenuItem>
              <MenuItem value="وجبات">وجبات</MenuItem>
              <MenuItem value="مقليات">مقليات</MenuItem>
              {/* أضف المزيد من الفئات هنا حسب الحاجة */}
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            name="description"
            label="الوصف (اختياري)"
            type="text"
            fullWidth
            multiline
            rows={2}
            variant="outlined"
            value={formData.description}
            onChange={handleChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="image"
            label="رابط الصورة (اختياري)"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.image}
            onChange={handleChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="stock"
            label="المخزون"
            type="number"
            fullWidth
            variant="outlined"
            value={formData.stock}
            onChange={handleChange}
            inputProps={{ min: "0" }}
            sx={{ mb: 2 }}
          />

          {/* قسم إدارة المكونات */}
          <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>المكونات المطلوبة لهذا المنتج:</Typography>
          {formData.ingredients.map((ing, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
              <FormControl variant="outlined" sx={{ flex: 3 }}>
                <InputLabel>المكون</InputLabel>
                <Select
                  value={ing.ingredientId}
                  onChange={(e) => handleIngredientChange(index, 'ingredientId', e.target.value)}
                  label="المكون"
                >
                  <MenuItem value=""><em>اختر مكون</em></MenuItem>
                  {ingredientsList.map((ingredient) => (
                    <MenuItem key={ingredient._id} value={ingredient._id}>
                      {ingredient.name} ({ingredient.unit})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="الكمية"
                type="number"
                value={ing.quantityUsed}
                onChange={(e) => handleIngredientChange(index, 'quantityUsed', e.target.value)}
                inputProps={{ min: "0" }}
                sx={{ flex: 1.5 }}
              />
              <TextField
                 label="الوحدة"
                 value={ing.unit}
                 onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                 sx={{ flex: 1.5 }}
                 disabled // الوحدة يتم جلبها تلقائيًا من المكون المختار
              />
              <IconButton color="error" onClick={() => handleRemoveIngredientField(index)}>
                <RemoveIcon />
              </IconButton>
            </Box>
          ))}
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleAddIngredientField}
            sx={{ mt: 1 }}
            fullWidth
          >
            أضف مكون
          </Button>

        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="secondary">
            إلغاء
          </Button>
          <Button onClick={handleSubmit} color="primary" variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : (currentProduct ? 'حفظ التعديلات' : 'إضافة')}
        </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default InventoryManagement;