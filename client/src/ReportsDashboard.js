import React, { useState, useEffect, useCallback } from 'react';
import {
    Container, Box, Typography, Paper, Grid, Card, CardContent, CircularProgress, Alert,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField
} from '@mui/material';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? '/api' // هذا للتشغيل على Vercel، حيث تكون الواجهة الأمامية والخلفية على نفس النطاق
  : 'http://localhost:5000/api'; // للتشغيل المحلي

// دوال التصدير
function exportProductSalesPDF(filteredProductSales) {
    const doc = new jsPDF();
    doc.text('تقرير المبيعات حسب المنتج', 14, 14);
    doc.autoTable({
        head: [['المنتج', 'الكمية', 'الإيراد']],
        body: filteredProductSales.map(item => [item.productName, item.totalQuantitySold, item.totalSales]),
        startY: 20,
    });
    doc.save('تقرير-المنتجات.pdf');
}
function exportProductSalesExcel(filteredProductSales) {
    const ws = XLSX.utils.json_to_sheet(filteredProductSales.map(item => ({
        'المنتج': item.productName,
        'الكمية': item.totalQuantitySold,
        'الإيراد': item.totalSales
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'تقرير المنتجات');
    XLSX.writeFile(wb, 'تقرير-المنتجات.xlsx');
}
function exportEmployeeSalesPDF(filteredEmployeeSales) {
    const doc = new jsPDF();
    doc.text('تقرير المبيعات حسب الموظف', 14, 14);
    doc.autoTable({
        head: [['الموظف', 'الدور', 'إجمالي المبيعات']],
        body: filteredEmployeeSales.map(item => [item.employeeName, item.employeeRole, item.totalSales]),
        startY: 20,
    });
    doc.save('تقرير-الموظفين.pdf');
}
function exportEmployeeSalesExcel(filteredEmployeeSales) {
    const ws = XLSX.utils.json_to_sheet(filteredEmployeeSales.map(item => ({
        'الموظف': item.employeeName,
        'الدور': item.employeeRole,
        'إجمالي المبيعات': item.totalSales
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'تقرير الموظفين');
    XLSX.writeFile(wb, 'تقرير-الموظفين.xlsx');
}

const ReportsDashboard = ({ token, userRole }) => {
    const [dailySales, setDailySales] = useState(null);
    const [productSales, setProductSales] = useState([]);
    const [employeeSales, setEmployeeSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
    // فلاتر متقدمة
    const [productSearch, setProductSearch] = useState('');
    const [productCategory, setProductCategory] = useState('all');
    const [employeeSearch, setEmployeeSearch] = useState('');
    // استخراج الفئات من بيانات المنتجات
    const productCategories = ['all', ...Array.from(new Set(productSales.map(p => p.category).filter(Boolean)))];
    const employeeNames = ['all', ...Array.from(new Set(employeeSales.map(e => e.employeeName).filter(Boolean)))];

    // متغيرات الفرز والترقيم لتقرير الموظفين
    const [employeeSortField, setEmployeeSortField] = useState('employeeName');
    const [employeeSortDir, setEmployeeSortDir] = useState('asc');
    const [employeePage, setEmployeePage] = useState(0);
    const PAGE_SIZE = 10;

    // فر�� بيانات الموظفين
    const sortedEmployeeSales = [...employeeSales]
      .filter(item =>
        employeeSearch === '' || item.employeeName === employeeSearch || item.employeeName.toLowerCase().includes(employeeSearch.toLowerCase())
      )
      .sort((a, b) => {
        let valA = a[employeeSortField];
        let valB = b[employeeSortField];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return employeeSortDir === 'asc' ? -1 : 1;
        if (valA > valB) return employeeSortDir === 'asc' ? 1 : -1;
        return 0;
      });
    // ترقيم الصفحات
    const pagedEmployeeSales = sortedEmployeeSales.slice(employeePage * PAGE_SIZE, (employeePage + 1) * PAGE_SIZE);

    const fetchReport = useCallback(async (url, setData) => {
        try {
            const response = await fetch(url, {
                headers: { 'x-auth-token': token }
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.msg || `HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setData(data);
        } catch (err) {
            console.error('Error fetching report:', err);
            setError('فشل جلب التقرير: ' + err.message);
        }
    }, [token]); // تعتمد على token فقط

    const fetchAllReports = useCallback(async () => {
        if (!token || (userRole !== 'admin' && userRole !== 'manager')) {
            setError('ليس لديك صلاحية لعرض التقارير.');
            setLoading(false);
            return;
        }
        setLoading(true);
        setError('');
        try {
            await Promise.all([
                fetchReport(`${API_BASE_URL}/reports/daily-sales?date=${selectedDate}`, setDailySales),
                fetchReport(`${API_BASE_URL}/reports/product-sales`, setProductSales),
                fetchReport(`${API_BASE_URL}/reports/employee-sales`, setEmployeeSales)
            ]);
        } catch (err) {
            // الأخطاء يتم التعامل معها داخل fetchReport
        } finally {
            setLoading(false);
        }
    }, [token, userRole, selectedDate, fetchReport]); // تعتمد على selectedDate و fetchReport الآن

    useEffect(() => {
        fetchAllReports();
    }, [fetchAllReports]); // تعتمد على fetchAllReports

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    if (error && userRole !== 'admin' && userRole !== 'manager') return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;


    return (
        <Container maxWidth="lg" sx={{ mt: 4, p: 3, boxShadow: 3, borderRadius: 2, bgcolor: 'background.paper' }}>
            <Typography variant="h4" gutterBottom>لوحة التقارير</Typography>

            {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}

            <Grid container spacing={3} sx={{ mb: 4 }}>
                {/* تقرير المبيعات اليومية */}
                <Grid item xs={12} md={4}>
                    <Card variant="outlined">
                        <CardContent>
                            <Typography variant="h6" component="div" gutterBottom>
                                تقرير المبيعات اليومية
                            </Typography>
                            <TextField
                                label="تاريخ التقرير"
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                fullWidth
                                margin="normal"
                                InputLabelProps={{
                                    shrink: true,
                                }}
                            />
                            <Typography variant="body1">
                                إجمالي مبيعات اليوم: <strong>{dailySales ? dailySales.totalSales.toFixed(2) : 0} جنيه</strong>
                            </Typography>
                            <Typography variant="body1">
                                عدد الطلبات اليومية: <strong>{dailySales ? dailySales.totalOrders : 0}</strong>
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* تقرير المبيعات حسب المنتج */}
                <Grid item xs={12} md={4}>
                    <Card variant="outlined">
                        <CardContent>
                            <Typography variant="h6" component="div" gutterBottom>
                                المبيعات حسب المنتج
                            </Typography>
                            {/* فلاتر المنتجات */}
                            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                                <TextField
                                    label="بحث عن منتج"
                                    variant="outlined"
                                    size="small"
                                    value={productSearch}
                                    onChange={e => setProductSearch(e.target.value)}
                                    sx={{ flex: 2 }}
                                />
                                <TextField
                                    select
                                    label="الفئة"
                                    variant="outlined"
                                    size="small"
                                    value={productCategory}
                                    onChange={e => setProductCategory(e.target.value)}
                                    sx={{ flex: 1, minWidth: 120 }}
                                >
                                    {productCategories.map(cat => (
                                        <option key={cat} value={cat}>{cat === 'all' ? 'الكل' : cat}</option>
                                    ))}
                                </TextField>
                                {/* أزرار التصدير */}
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <button onClick={() => exportProductSalesPDF()} style={{padding: '6px 12px', borderRadius: 4, border: '1px solid #1976d2', background: '#1976d2', color: '#fff', fontWeight: 'bold', cursor: 'pointer'}}>PDF</button>
                                    <button onClick={() => exportProductSalesExcel()} style={{padding: '6px 12px', borderRadius: 4, border: '1px solid #43a047', background: '#43a047', color: '#fff', fontWeight: 'bold', cursor: 'pointer'}}>Excel</button>
                                </Box>
                            </Box>
                            {productSales.length === 0 ? <Typography>لا توجد بيانات.</Typography> : (
                                <TableContainer component={Paper} elevation={0}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>المنتج</TableCell>
                                                <TableCell align="right">الكمية</TableCell>
                                                <TableCell align="right">الإيراد</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {productSales
                                                .filter(item =>
                                                    (productCategory === 'all' || item.category === productCategory) &&
                                                    item.productName.toLowerCase().includes(productSearch.toLowerCase())
                                                )
                                                .map((item) => (
                                                    <TableRow key={item._id}>
                                                        <TableCell>{item.productName}</TableCell>
                                                        <TableCell align="right">{item.totalQuantitySold}</TableCell>
                                                        <TableCell align="right"> {(item.totalSales)?.toFixed(2) ?? '0.00'}</TableCell>
                                                    </TableRow>
                                                ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                            {/* رسم بياني لمبيعات المنتجات */}
                            {productSales.length > 0 && (
                              <Box sx={{ mt: 3 }}>
                                <Typography variant="subtitle1" sx={{ mb: 1 }}>مخطط الكميات المباعة حسب المنتج</Typography>
                                <Bar
                                  data={{
                                    labels: productSales
                                      .filter(item =>
                                        (productCategory === 'all' || item.category === productCategory) &&
                                        item.productName.toLowerCase().includes(productSearch.toLowerCase())
                                      )
                                      .map(item => item.productName),
                                    datasets: [
                                      {
                                        label: 'الكمية المباعة',
                                        data: productSales
                                          .filter(item =>
                                            (productCategory === 'all' || item.category === productCategory) &&
                                            item.productName.toLowerCase().includes(productSearch.toLowerCase())
                                          )
                                          .map(item => item.totalQuantitySold),
                                        backgroundColor: '#1976d2',
                                      },
                                      {
                                        label: 'الإيراد',
                                        data: productSales
                                          .filter(item =>
                                            (productCategory === 'all' || item.category === productCategory) &&
                                            item.productName.toLowerCase().includes(productSearch.toLowerCase())
                                          )
                                          .map(item => item.totalSales),
                                        backgroundColor: '#43a047',
                                      }
                                    ]
                                  }}
                                  options={{
                                    responsive: true,
                                    plugins: {
                                      legend: { position: 'top' },
                                      title: { display: false }
                                    },
                                    indexAxis: 'y',
                                    scales: {
                                      x: { beginAtZero: true }
                                    }
                                  }}
                                  height={220}
                                />
                              </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* تقرير المبيعات حسب الموظف */}
                <Grid item xs={12} md={4}>
                    <Card variant="outlined">
                        <CardContent>
                            <Typography variant="h6" component="div" gutterBottom>
                                المبيعات حسب الموظف
                            </Typography>
                            {/* فلاتر الموظفين */}
                            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                                <TextField
                                    label="بحث عن موظف"
                                    variant="outlined"
                                    size="small"
                                    value={employeeSearch}
                                    onChange={e => setEmployeeSearch(e.target.value)}
                                    sx={{ flex: 2 }}
                                />
                                <TextField
                                    select
                                    label="اسم الموظف"
                                    variant="outlined"
                                    size="small"
                                    value={employeeNames.includes(employeeSearch) ? employeeSearch : 'all'}
                                    onChange={e => setEmployeeSearch(e.target.value === 'all' ? '' : e.target.value)}
                                    sx={{ flex: 1, minWidth: 120 }}
                                >
                                    {employeeNames.map(name => (
                                        <option key={name} value={name}>{name === 'all' ? 'الكل' : name}</option>
                                    ))}
                                </TextField>
                                {/* أزرار التصدير */}
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <button onClick={() => exportEmployeeSalesPDF()} style={{padding: '6px 12px', borderRadius: 4, border: '1px solid #1976d2', background: '#1976d2', color: '#fff', fontWeight: 'bold', cursor: 'pointer'}}>PDF</button>
                                    <button onClick={() => exportEmployeeSalesExcel()} style={{padding: '6px 12px', borderRadius: 4, border: '1px solid #43a047', background: '#43a047', color: '#fff', fontWeight: 'bold', cursor: 'pointer'}}>Excel</button>
                                </Box>
                            </Box>
                            {pagedEmployeeSales.length === 0 ? <Typography>لا توجد بيانات.</Typography> : (
                                <TableContainer component={Paper} elevation={0}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell onClick={() => {
                                                  setEmployeeSortField('employeeName');
                                                  setEmployeeSortDir(employeeSortField === 'employeeName' && employeeSortDir === 'asc' ? 'desc' : 'asc');
                                                }} style={{cursor:'pointer'}}>الموظف</TableCell>
                                                <TableCell align="right" onClick={() => {
                                                  setEmployeeSortField('employeeRole');
                                                  setEmployeeSortDir(employeeSortField === 'employeeRole' && employeeSortDir === 'asc' ? 'desc' : 'asc');
                                                }} style={{cursor:'pointer'}}>الدور</TableCell>
                                                <TableCell align="right" onClick={() => {
                                                  setEmployeeSortField('totalSales');
                                                  setEmployeeSortDir(employeeSortField === 'totalSales' && employeeSortDir === 'asc' ? 'desc' : 'asc');
                                                }} style={{cursor:'pointer'}}>إجمالي المبيعات</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {pagedEmployeeSales.map((item) => (
                                                <TableRow key={item.employeeName}>
                                                    <TableCell>{item.employeeName}</TableCell>
                                                    <TableCell align="right">{item.employeeRole}</TableCell>
                                                    <TableCell align="right">
                                                        {(item.totalSales)?.toFixed(2) ?? '0.00'}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                            {/* ترقيم صفحات */}
                            {Math.ceil(sortedEmployeeSales.length / PAGE_SIZE) > 1 && (
                              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1, gap: 1 }}>
                                <button onClick={() => setEmployeePage(p => Math.max(0, p - 1))} disabled={employeePage === 0}>السابق</button>
                                <span>صفحة {employeePage + 1} من {Math.ceil(sortedEmployeeSales.length / PAGE_SIZE)}</span>
                                <button onClick={() => setEmployeePage(p => Math.min(Math.ceil(sortedEmployeeSales.length / PAGE_SIZE) - 1, p + 1))} disabled={employeePage === Math.ceil(sortedEmployeeSales.length / PAGE_SIZE) - 1}>التالي</button>
                              </Box>
                            )}
                            {/* رسم بياني لمبيعات الموظفين */}
                            {employeeSales.length > 0 && (
                              <Box sx={{ mt: 3 }}>
                                <Typography variant="subtitle1" sx={{ mb: 1 }}>مخطط إجمالي المبيعات حسب الموظف</Typography>
                                <Bar
                                  data={{
                                    labels: employeeSales
                                      .filter(item =>
                                        (employeeSearch === '' || item.employeeName === employeeSearch || item.employeeName.toLowerCase().includes(employeeSearch.toLowerCase()))
                                      )
                                      .map(item => item.employeeName),
                                    datasets: [
                                      {
                                        label: 'إجمالي المبيعات',
                                        data: employeeSales
                                          .filter(item =>
                                            (employeeSearch === '' || item.employeeName === employeeSearch || item.employeeName.toLowerCase().includes(employeeSearch.toLowerCase()))
                                          )
                                          .map(item => item.totalSales),
                                        backgroundColor: '#1976d2',
                                      }
                                    ]
                                  }}
                                  options={{
                                    responsive: true,
                                    plugins: {
                                      legend: { position: 'top' },
                                      title: { display: false }
                                    },
                                    indexAxis: 'y',
                                    scales: {
                                      x: { beginAtZero: true }
                                    }
                                  }}
                                  height={220}
                                />
                              </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Container>
    );
};

export default ReportsDashboard;