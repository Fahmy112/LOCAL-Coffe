/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useCallback } from 'react';
import './App.css'; // تأكد من تحديث هذا الملف بالتنسيقات الجديدة
import { Button, Typography, Container, Box, TextField, FormControl, InputLabel, Select, MenuItem,
  Card, CardContent,CardActions,  IconButton, Grid, Tabs, Tab } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';


// استيراد المكونات الأخرى
import ReportsDashboard from './ReportsDashboard';
import InventoryManagement from './InventoryManagement';
import Receipt from './Receipt';

// Theme is now defined and provided in index.js

// --- تعريف المكونات الفرعية (Sub-Components Definition) ---
// تم نقل LoginScreen و RegisterUserScreen خارج مكون App
// لحل مشكلة تحذير ESLint "unused-vars" ولتحسين هيكلة الكود.

/**
 * مكون شاشة تسجيل الدخول.
 * @param {object} props - خصائص المكون.
 * @param {function} props.onLogin - دالة يتم استدعاؤها عند محاولة تسجيل الدخول.
 */
const LoginScreen = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onLogin(username, password);
  };

  return (
    <Container maxWidth="xs" sx={{ mt: 8 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          p: 4,
          borderRadius: 2,
          boxShadow: 3,
          bgcolor: 'background.paper',
        }}
      >
        <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
          تسجيل الدخول
        </Typography>
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="username"
            label="اسم المستخدم"
            name="username"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="كلمة المرور"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mb: 3 }}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            sx={{ mt: 1, mb: 2 }}
          >
            دخول
          </Button>
        </form>
      </Box>
    </Container>
  );
};

/**
 * مكون شاشة تسجيل مستخدم جديد (للمدير/المسؤول فقط).
 * @param {object} props - خصائص المكون.
 * @param {function} props.onRegister - دالة يتم استدعاؤها عند محاولة تسجيل مستخدم.
 */
const RegisterUserScreen = ({ onRegister }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('cashier'); // الافتراضي: كاشير

  const handleSubmit = (e) => {
    e.preventDefault();
    onRegister(username, password, role);
    setUsername('');
    setPassword('');
    setRole('cashier');
  };

  return (
    <Box sx={{ mt: 2, p: 3, border: '1px solid #e0e0e0', borderRadius: 2, bgcolor: 'background.paper' }}>
      <Typography variant="h6" gutterBottom>تسجيل مستخدم جديد</Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          margin="normal"
          required
          fullWidth
          label="اسم المستخدم"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          label="كلمة المرور"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          sx={{ mb: 2 }}
        />
        <FormControl fullWidth margin="normal" sx={{ mb: 3 }}>
          <InputLabel id="role-label">الدور</InputLabel>
          <Select
            labelId="role-label"
            id="role"
            value={role}
            label="الدور"
            onChange={(e) => setRole(e.target.value)}
          >
            <MenuItem value="cashier">كاشير</MenuItem>
            <MenuItem value="manager">مدير</MenuItem>
            <MenuItem value="admin">مسؤول</MenuItem>
          </Select>
        </FormControl>
        <Button
          type="submit"
          variant="contained"
          color="secondary"
          fullWidth
        >
          تسجيل
        </Button>
      </form>
    </Box>
  );
};

// --- المكون الرئيسي للتطبيق (App Component) ---
function App() {
  // --- حالات المكون (Component States) ---
  const [products, setProducts] = useState([]); // جميع المنتجات
  const [filteredProducts, setFilteredProducts] = useState([]); // المنتجات بعد التصفية بالفئة
  const [categories, setCategories] = useState([]); // قائمة الفئات المتاحة
  const [selectedCategory, setSelectedCategory] = useState('all'); // الفئة المختارة حاليًا

  // قائمة الفئات الثابتة (تظهر دائمًا)
  const staticCategories = [
    'وجبات خفيفة'
  ];
  const [cart, setCart] = useState([]);
  const [total, setTotal] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showLogin, setShowLogin] = useState(true);
  const [showReports, setShowReports] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? '/api' // هذا للتشغيل على Vercel، حيث تكون الواجهة الأمامية والخلفية على نفس النطاق
  : 'http://localhost:5000/api'; // للتشغيل المحلي

  // --- تأثيرات المكون (Component Effects) ---

  // 1. التحقق من حالة التوثيق عند تحميل التطبيق
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`${API_BASE_URL}/auth/user`, {
        headers: { 'x-auth-token': token }
      })
        .then(response => {
          if (response.ok) {
            return response.json();
          } else {
            localStorage.removeItem('token');
            throw new Error('Invalid token');
          }
        })
        .then(userData => {
          setIsAuthenticated(true);
          setUser(userData);
          setShowLogin(false);
          fetchProducts(token); // جلب المنتجات والفئات بعد التوثيق
        })
        .catch(error => {
          console.error('Authentication check failed:', error);
          setIsAuthenticated(false);
          setUser(null);
          setShowLogin(true);
        });
    }
  // eslint-disable-next-line no-use-before-define, react-hooks/exhaustive-deps
  },[]);

  // 2. تحديث الإجمالي عند تغيير سلة المشتريات
  useEffect(() => {
    const newTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    setTotal(newTotal);
  }, [cart]);

  // 3. تصفية المنتجات عند تغيير الفئة المختارة أو تحديث قائمة المنتجات
  useEffect(() => {
    const byCategory = selectedCategory === 'all'
      ? products
      : products.filter(product => product.category === selectedCategory);
  
    const bySearch = searchTerm.trim() === ''
      ? byCategory
      : byCategory.filter(product =>
          product.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
  
    setFilteredProducts(bySearch);
  }, [selectedCategory, products, searchTerm]);
  


  // --- استدعاءات API (API Calls) ---

  /**
   * جلب المنتجات من الواجهة الخلفية.
   * @param {string} token - توكن المصادقة.
   */
  const fetchProducts = useCallback((token) => {
    if (!token) {
      console.warn('No token provided for fetching products.');
      return;
    }

    fetch(`${API_BASE_URL}/products`, {
      headers: {
        'x-auth-token': token
      }
    })
      .then(response => {
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('token');
          setIsAuthenticated(false);
          setUser(null);
          setShowLogin(true);
          alert('جلسة المستخدم انتهت أو ليس لديك صلاحية. يرجى تسجيل الدخول مرة أخرى.');
          return;
        }
        return response.json();
      })
      .then(data => {
        if (data) {
          setProducts(data);
          // استخراج الفئات الفريدة من المنتجات ودمجها مع الفئات الثابتة
          const uniqueCategories = Array.from(new Set([
            ...staticCategories,
            ...data.map(p => p.category)
          ]));
          setCategories(['all', ...uniqueCategories]);
        }
      })
      .catch(error => console.error('Error fetching products:', error));
  }, []); // لا يوجد تبعيات داخل useCallback لتجنب إعادة الإنشاء غير الضرورية

  // --- إدارة سلة المشتريات (Cart Management) ---

  /**
   * إضافة منتج إلى سلة المشتريات.
   * @param {object} product - تفاصيل المنتج المراد إضافته.
   */
  const addToCart = (product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item._id === product._id);
      if (existingItem) {
        return prevCart.map(item =>
          item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        return [...prevCart, { ...product, quantity: 1 }];
      }
    });
  };

  /**
   * زيادة كمية منتج معين في السلة.
   * @param {string} id - معرّف المنتج.
   */
  const increaseQuantity = (id) => {
    setCart(prevCart =>
      prevCart.map(item =>
        item._id === id ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
  };

  /**
   * تقليل كمية منتج معين في السلة.
   * @param {string} id - معرّف المنتج.
   */
  const decreaseQuantity = (id) => {
    setCart(prevCart =>
      prevCart.map(item =>
        item._id === id ? { ...item, quantity: item.quantity - 1 } : item
      ).filter(item => item.quantity > 0)
    );
  };

  /**
   * إرسال طلب الشراء إلى الواجهة الخلفية.
   */
  const placeOrder = async () => {
    if (cart.length === 0) {
      alert('السلة فارغة!');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      alert('يرجى تسجيل الدخول أولاً.');
      return;
    }

    const orderDetails = {
      items: cart.map(item => ({
        productId: item._id,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      })),
      totalAmount: total
    };

    try {
      const response = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify(orderDetails),
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        setIsAuthenticated(false);
        setUser(null);
        setShowLogin(true);
        alert('جلسة المستخدم انتهت أو ليس لديك صلاحية. يرجى تسجيل الدخول مرة أخرى.');
        return;
      }

      const data = await response.json();

      if (response.ok) {
        alert('تم استلام الطلب بنجاح! رقم الطلب: ' + data._id);
        setCart([]);
        setTotal(0);

        const orderResponse = await fetch(`${API_BASE_URL}/orders/${data._id}`, {
          headers: { 'x-auth-token': token }
        });
        const fullOrderData = await orderResponse.json();
        if (orderResponse.ok) {
          setLastOrder(fullOrderData);
          setShowReceipt(true);
        } else {
          console.error('Failed to fetch full order details for printing:', fullOrderData);
          alert('تم استلام الطلب، ولكن فشل جلب تفاصيل الطباعة.');
        }

      } else {
        alert(data.msg || 'حدث خطأ أثناء إرسال الطلب.');
      }
    } catch (error) {
      console.error('Error placing order:', error);
      alert('حدث خطأ أثناء إرسال الطلب.');
    }
  };

  // --- إدارة المصادقة والتفويض (Authentication & Authorization) ---

  /**
   * دالة تسجيل الدخول.
   * @param {string} username - اسم المستخدم.
   * @param {string} password - كلمة المرور.
   */
  const handleLogin = async (username, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.token);
        setIsAuthenticated(true);
        setUser(data.user);
        setShowLogin(false);
        fetchProducts(data.token);
        setShowReports(false);
        setShowInventory(false);
      } else {
        alert(data.msg || 'فشل تسجيل الدخول.');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('حدث خطأ أثناء تسجيل الدخول.');
    }
  };

  /**
   * دالة تسجيل الخروج.
   */
  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setUser(null);
    setCart([]);
    setTotal(0);
    setShowLogin(true);
    setShowReports(false);
    setShowInventory(false);
    setShowReceipt(false);
    setLastOrder(null);
    alert('تم تسجيل الخروج بنجاح.');
  };

  /**
   * دالة لتسجيل مستخدم جديد (للمدير/المسؤول فقط).
   * @param {string} username - اسم المستخدم الجديد.
   * @param {string} password - كلمة المرور للمستخدم الجديد.
   * @param {string} role - دور المستخدم الجديد (cashier, manager, admin).
   */
  const handleRegisterUser = async (username, password, role) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('يجب أن تكون مديرًا أو مسؤولًا لتسجيل مستخدمين جدد.');
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({ username, password, role }),
      });
      const data = await response.json();
      if (response.ok) {
        alert(data.msg || 'تم تسجيل المستخدم بنجاح.');
      } else {
        alert(data.msg || 'فشل تسجيل المستخدم.');
      }
    } catch (error) {
      console.error('Register user error:', error);
      alert('حدث خطأ أثناء تسجيل المستخدم.');
    }
  };

  // --- منطق العرض الرئيسي (Main Render Logic) ---

  // إذا لم يكن المستخدم مسجل الدخول، اعرض شاشة الدخول فقط
  if (showLogin) {
    return (
      <LoginScreen onLogin={handleLogin} />
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>برنامج الكاشير</h1>
        {isAuthenticated && user && (
          <div className="user-info">
            <span>مرحبًا، {user.username} ({user.role})</span>
            {(user.role === 'admin' || user.role === 'manager') && (
              <>
                <button className="header-button" onClick={() => {
                  setShowReports(prev => !prev);
                  setShowInventory(false);
                }}>
                  {showReports ? 'العودة للكاشير' : 'التقارير'}
                </button>
                <button className="header-button" onClick={() => {
                  setShowInventory(prev => !prev);
                  setShowReports(false);
                }}>
                  {showInventory ? 'العودة للكاشير' : 'المخزون'}
                </button>
              </>
            )}
            <button onClick={handleLogout} className="logout-button">تسجيل خروج</button>
          </div>
        )}
      </header>

      {/* عرض المكونات بناءً على الـ State */}
      {showReports ? (
        <ReportsDashboard token={localStorage.getItem('token')} userRole={user?.role} />
      ) : showInventory ? (
        <InventoryManagement token={localStorage.getItem('token')} userRole={user?.role} />
      ) : (
        // هذا هو العرض الافتراضي (شاشة الكاشير الرئيسية)
        <div className="main-layout">
          {/* قسم عرض المنتجات */}
          <div className="products-section">
            <Typography variant="h2" gutterBottom>قائمة الطعام</Typography>
            {/* تبويبات الفئات */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs
                value={selectedCategory}
                onChange={(event, newValue) => setSelectedCategory(newValue)}
                variant="scrollable"
                scrollButtons="auto"
                aria-label="product categories"
              >
                {categories.map((category) => (
                  <Tab
                    key={category}
                    value={category}
                    label={category === 'all' ? 'الكل' : category}
                  />
                ))}
              </Tabs>
                </Box>
                <Box sx={{ mb: 2 }}>
                <TextField
                  label="بحث عن منتج"
                  variant="outlined"
                  fullWidth
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </Box>


            <Grid container spacing={3}>
              {filteredProducts.length === 0 ? (
                <Grid item xs={12}>
                  <Typography variant="h6" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
                    لا توجد منتجات في هذه الفئة.
                  </Typography>
                </Grid>
              ) : (
                filteredProducts.map(product => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={product._id}>
                    <Card sx={{ p: 1, minHeight: 150 }}>
                      <CardContent sx={{ pb: 1 }}>
                        <Typography gutterBottom variant="h6" component="div">
                          {product.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {product.description || 'لا يوجد وصف لهذا المنتج.'}
                        </Typography>
                        <Typography variant="subtitle1" color="primary" sx={{ mt: 1 }}>
                          {product.price} ريال
                        </Typography>
                      </CardContent>
                      <CardActions sx={{ justifyContent: 'flex-end', p: 1 }}>
                        <Button
                          variant="contained"
                          color="primary"
                          startIcon={<AddIcon />}
                          onClick={() => addToCart(product)}
                          sx={{ borderRadius: 2, fontSize: '0.8rem', px: 2 }}
                        >
                          أضف
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))
              )}
            </Grid>
          </div>

          {/* قسم سلة المشتريات */}
          <div className="cart-section">
            <Typography variant="h2" gutterBottom>سلة المشتريات</Typography>
            {cart.length === 0 ? (
              <Typography variant="body1" color="text.secondary">السلة فارغة.</Typography>
            ) : (
              <>
                <ul className="cart-list">
                  {cart.map(item => (
                    <Box component="li" key={item._id} sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      p: 1,
                      borderBottom: '1px solid #eee',
                      '&:last-child': { borderBottom: 'none' }
                    }}>
                      <Typography variant="body1">
                        {item.name} ({item.price} ريال) x {item.quantity}
                      </Typography>
                      <Box className="cart-item-actions">
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); decreaseQuantity(item._id); }}>
                          <RemoveIcon />
                        </IconButton>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); increaseQuantity(item._id); }}>
                          <AddIcon />
                        </IconButton>
                      </Box>
                    </Box>
                  ))}
                </ul>
                <Box className="cart-summary" sx={{
                  mt: 2,
                  pt: 2,
                  borderTop: '1px solid #ccc',
                  position: 'sticky',
                  bottom: 0,
                  background: '#fff',
                  zIndex: 10,
                  boxShadow: '0 -2px 8px rgba(0,0,0,0.07)'
                }}>
                  <Typography variant="h4" gutterBottom sx={{ textAlign: 'center' }}>
                    الإجمالي: {total} ريال
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    size="large"
                    onClick={placeOrder}
                    sx={{
                      mt: 2,
                      fontWeight: 'bold',
                      fontSize: '1.3rem',
                      py: 2,
                      borderRadius: 3,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
                    }}
                  >
                    إرسال الطلب
                  </Button>
                </Box>
              </>
            )}
          </div>
        </div>
      )}

      {/* قسم إدارة المستخدمين (مرئي فقط للمسؤولين/المدراء) */}
      {(isAuthenticated && user && (user.role === 'admin' || user.role === 'manager') && !showReports && !showInventory) && (
        <Box sx={{ mt: 4, p: 3, border: '1px solid #e0e0e0', borderRadius: 2, bgcolor: 'background.paper' }}>
          <Typography variant="h3" gutterBottom>إدارة المستخدمين</Typography>
          <RegisterUserScreen onRegister={handleRegisterUser} />
        </Box>
      )}

      {/* عرض الإيصال إذا كان موجودًا ومطلوبًا */}
      {showReceipt && (
        <Receipt
          orderDetails={lastOrder}
          onClose={() => {
            setShowReceipt(false);
            setLastOrder(null);
          }}
        />
      )}
    </div>
  );
}

export default App;