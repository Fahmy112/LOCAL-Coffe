import React, { useState, useEffect, useCallback } from 'react';
import {
    Container, Box, Typography, Paper, Grid, Card, CardContent, CircularProgress, Alert,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField
} from '@mui/material';

const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? '/api' // هذا للتشغيل على Vercel، حيث تكون الواجهة الأمامية والخلفية على نفس النطاق
  : 'http://localhost:5000/api'; // للتشغيل المحلي

const ReportsDashboard = ({ token, userRole }) => {
    const [dailySales, setDailySales] = useState(null);
    const [productSales, setProductSales] = useState([]);
    const [employeeSales, setEmployeeSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD

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
                                            {productSales.map((item) => (
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
                            {employeeSales.length === 0 ? <Typography>لا توجد بيانات.</Typography> : (
                                <TableContainer component={Paper} elevation={0}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>الموظف</TableCell>
                                                <TableCell align="right">الدور</TableCell>
                                                <TableCell align="right">إجمالي المبيعات</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {employeeSales.map((item) => (
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
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Container>
    );
};

export default ReportsDashboard;