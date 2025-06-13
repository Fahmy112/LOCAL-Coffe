import React, { useState, useEffect, useCallback } from 'react';
import {
    Container, Box, Typography, Paper, Grid, Card, CardContent, CircularProgress, Alert,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button
} from '@mui/material';
import OrderDetailsDialog from './OrderDetailsDialog';

const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? '/api'
  : 'http://localhost:5000/api';

const ReportsDashboard = ({ token, userRole }) => {
    const [orders, setOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderDialogOpen, setOrderDialogOpen] = useState(false);
    const [error, setError] = useState('');
    // --- فلترة وبحث ---
    const [reportType, setReportType] = useState('daily'); // 'daily' or 'monthly'
    const [selectedDay, setSelectedDay] = useState(new Date().toISOString().split('T')[0]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [cashierFilter, setCashierFilter] = useState('all');

    const fetchOrders = useCallback(async () => {
        setLoadingOrders(true);
        setError('');
        try {
            // بناء الاستعلام بناءً على الفلاتر
            let query = [];
            if (reportType === 'daily') query.push(`date=${selectedDay}`);
            if (reportType === 'monthly') query.push(`month=${selectedMonth}`);
            if (statusFilter && statusFilter !== 'all') query.push(`status=${encodeURIComponent(statusFilter)}`);
            if (cashierFilter && cashierFilter !== 'all') query.push(`cashier=${encodeURIComponent(cashierFilter)}`);
            if (searchTerm && searchTerm.trim() !== '') query.push(`search=${encodeURIComponent(searchTerm)}`);
            const url = `${API_BASE_URL}/orders${query.length ? '?' + query.join('&') : ''}`;
            const response = await fetch(url, {
                headers: { 'x-auth-token': token }
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.msg || `HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setOrders(data);
        } catch (err) {
            setError('فشل جلب الطلبات: ' + err.message);
        } finally {
            setLoadingOrders(false);
        }
    }, [token, reportType, selectedDay, selectedMonth, statusFilter, cashierFilter, searchTerm]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    if (loadingOrders) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    if (error) return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;

    // استخراج الكاشيرين من الطلبات
    const cashierList = ['all', ...Array.from(new Set(orders.map(o => o.orderedBy?.username).filter(Boolean)))];

    // فلترة الطلبات حسب البحث والفلاتر
    const filteredOrders = orders.filter(order => {
        const matchesSearch =
            searchTerm.trim() === '' ||
            order._id.includes(searchTerm) ||
            (order.orderedBy?.username && order.orderedBy.username.includes(searchTerm));
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
        const matchesCashier = cashierFilter === 'all' || order.orderedBy?.username === cashierFilter;
        // فلترة حسب اليوم أو الشهر
        let matchesDate = true;
        if (reportType === 'daily') {
            const orderDate = new Date(order.orderDate || order.createdAt).toISOString().slice(0, 10);
            matchesDate = orderDate === selectedDay;
        } else if (reportType === 'monthly') {
            const orderMonth = new Date(order.orderDate || order.createdAt).toISOString().slice(0, 7);
            matchesDate = orderMonth === selectedMonth;
        }
        return matchesSearch && matchesStatus && matchesCashier && matchesDate;
    });

    return (
        <React.Fragment>
            <Container maxWidth="lg" sx={{ mt: 4, p: 3, boxShadow: 3, borderRadius: 2, bgcolor: 'background.paper' }}>
                <Typography variant="h4" gutterBottom>تقرير الطلبات التفصيلي</Typography>
                {/* واجهة الفلترة والبحث */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                    <Box>
                        <label>
                            <input type="radio" value="daily" checked={reportType === 'daily'} onChange={() => setReportType('daily')} /> يومي
                        </label>
                        <label style={{ marginLeft: 12 }}>
                            <input type="radio" value="monthly" checked={reportType === 'monthly'} onChange={() => setReportType('monthly')} /> شهري
                        </label>
                    </Box>
                    {reportType === 'daily' ? (
                        <input type="date" value={selectedDay} onChange={e => setSelectedDay(e.target.value)} />
                    ) : (
                        <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
                    )}
                    <input
                        type="text"
                        placeholder="بحث برقم الطلب أو الكاشير"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ padding: 6, borderRadius: 4, border: '1px solid #ccc', minWidth: 180 }}
                    />
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                        <option value="all">كل الحالات</option>
                        <option value="مكتمل">مكتمل</option>
                        <option value="ملغي">ملغي</option>
                        <option value="قيد التنفيذ">قيد التنفيذ</option>
                    </select>
                    <select value={cashierFilter} onChange={e => setCashierFilter(e.target.value)}>
                        {cashierList.map(cashier => (
                            <option key={cashier} value={cashier}>{cashier === 'all' ? 'كل الكاشيرين' : cashier}</option>
                        ))}
                    </select>
                </Box>
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12}>
                        <Card variant="outlined">
                            <CardContent>
                                {filteredOrders.length === 0 ? <Typography>لا توجد طلبات.</Typography> : (
                                    <TableContainer component={Paper} elevation={0}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>رقم الطلب</TableCell>
                                                    <TableCell>التاريخ</TableCell>
                                                    <TableCell>الكاشير</TableCell>
                                                    <TableCell>الإجمالي</TableCell>
                                                    <TableCell>الحالة</TableCell>
                                                    <TableCell>تفاصيل</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {filteredOrders.map(order => (
                                                    <TableRow key={order._id}>
                                                        <TableCell>{order._id}</TableCell>
                                                        <TableCell>{order.orderDate ? new Date(order.orderDate).toLocaleString() : (order.createdAt ? new Date(order.createdAt).toLocaleString() : '')}</TableCell>
                                                        <TableCell>{order.orderedBy?.username || '-'}</TableCell>
                                                        <TableCell>{order.totalAmount}</TableCell>
                                                        <TableCell>{order.status || '-'}</TableCell>
                                                        <TableCell>
                                                            <Button size="small" variant="outlined" onClick={() => { setSelectedOrder(order); setOrderDialogOpen(true); }}>تفاصيل</Button>
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
            <OrderDetailsDialog
                open={orderDialogOpen}
                order={selectedOrder}
                onClose={() => setOrderDialogOpen(false)}
                onDelete={async (orderId) => {
                    if (window.confirm('هل أنت متأكد من حذف هذا الطلب؟')) {
                        try {
                            const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
                                method: 'DELETE',
                                headers: { 'x-auth-token': token }
                            });
                            if (!response.ok) throw new Error('فشل حذف الطلب');
                            setOrders(orders => orders.filter(o => o._id !== orderId));
                            setOrderDialogOpen(false);
                        } catch (err) {
                            setError('فشل حذف الطلب: ' + err.message);
                        }
                    }
                }}
                onSave={async (editedOrder) => {
                    try {
                        const response = await fetch(`${API_BASE_URL}/orders/${editedOrder._id}`, {
                            method: 'PUT',
                            headers: {
                                'x-auth-token': token,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(editedOrder)
                        });
                        if (!response.ok) throw new Error('فشل تعديل الطلب');
                        const updated = await response.json();
                        setOrders(orders => orders.map(o => o._id === updated._id ? updated : o));
                        setOrderDialogOpen(false);
                    } catch (err) {
                        setError('فشل تعديل الطلب: ' + err.message);
                    }
                }}
            />
        </React.Fragment>
    );
};

export default ReportsDashboard;
