import React, { useState, useEffect, useCallback } from 'react';
import {
    Container, Box, Typography, Paper, Grid, Card, CardContent, CircularProgress, Alert,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button
} from '@mui/material';
import * as XLSX from 'xlsx';
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
    const [reportType, setReportType] = useState('all'); // 'all' or 'daily' or 'monthly'
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
            // إذا كان reportType === 'all' لا ترسل date ولا month
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
                    <Box component="div">
                        <label>
                            <input type="radio" value="all" checked={reportType === 'all'} onChange={() => setReportType('all')} /> الكل
                        </label>
                        <label style={{ marginLeft: 12 }}>
                            <input type="radio" value="daily" checked={reportType === 'daily'} onChange={() => setReportType('daily')} /> يومي
                        </label>
                        <label style={{ marginLeft: 12 }}>
                            <input type="radio" value="monthly" checked={reportType === 'monthly'} onChange={() => setReportType('monthly')} /> شهري
                        </label>
                    </Box>
                    {reportType === 'daily' ? (
                        <input type="date" value={selectedDay} onChange={e => setSelectedDay(e.target.value)} />
                    ) : reportType === 'monthly' ? (
                        <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
                    ) : null}
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
                                <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                                    <Box>
                                        <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold', display: 'inline', mr: 3 }}>
                                            عدد الطلبات: {filteredOrders.length}
                                        </Typography>
                                        <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold', display: 'inline' }}>
                                            إجمالي الحساب: {filteredOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0).toLocaleString()} ريال
                                        </Typography>
                                    </Box>
                                    <Button
                                        variant="contained"
                                        color="success"
                                        onClick={() => {
                                            const totalAmount = filteredOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
                                            const data = [
                                                { 'عدد الطلبات': filteredOrders.length, 'إجمالي الحساب': totalAmount },
                                                {}, // صف فارغ للفصل
                                                ...filteredOrders.flatMap(order => [
                                                    {
                                                        'رقم الطلب': order._id,
                                                        'التاريخ': order.orderDate ? new Date(order.orderDate).toLocaleString() : (order.createdAt ? new Date(order.createdAt).toLocaleString() : ''),
                                                        'الكاشير': order.orderedBy?.username || '-',
                                                        'الإجمالي': order.totalAmount,
                                                        'الحالة': order.status || '-',
                                                        'تفاصيل المنتج': ''
                                                    },
                                                    ...order.items.map(item => ({
                                                        'رقم الطلب': '',
                                                        'التاريخ': '',
                                                        'الكاشير': '',
                                                        'الإجمالي': '',
                                                        'الحالة': '',
                                                        'تفاصيل المنتج': `${item.name} | الكمية: ${item.quantity} | السعر: ${item.price} | الإجمالي: ${(item.price * item.quantity).toFixed(2)}`
                                                    }))
                                                ])
                                            ];
                                            const ws = XLSX.utils.json_to_sheet(data, { skipHeader: false });
                                            const wb = XLSX.utils.book_new();
                                            XLSX.utils.book_append_sheet(wb, ws, 'الطلبات');
                                            let fileName = 'طلبات';
                                            if (reportType === 'daily') fileName += `-${selectedDay}`;
                                            else if (reportType === 'monthly') fileName += `-${selectedMonth}`;
                                            XLSX.writeFile(wb, `${fileName}.xlsx`);
                                        }}
                                    >
                                        تصدير Excel
                                    </Button>
                                </Box>
                                {filteredOrders.length === 0 ? <Typography>لا توجد طلبات.</Typography> : (
                                    <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 500, overflow: 'auto' }}>
                                        <Table size="small" sx={{ minWidth: 800, borderCollapse: 'separate', borderSpacing: 0 }}>
                                            <TableHead>
                                                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                                                    <TableCell sx={{ fontWeight: 'bold', borderBottom: '2px solid #1976d2' }}>رقم الطلب</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold', borderBottom: '2px solid #1976d2' }}>التاريخ</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold', borderBottom: '2px solid #1976d2' }}>الكاشير</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold', borderBottom: '2px solid #1976d2' }}>الإجمالي</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold', borderBottom: '2px solid #1976d2' }}>الحالة</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold', borderBottom: '2px solid #1976d2' }}>تفاصيل</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {filteredOrders.map(order => (
                                                    <React.Fragment key={order._id}>
                                                        <TableRow
                                                            sx={{
                                                                bgcolor:
                                                                    order.status === 'مكتمل' ? '#e8f5e9' :
                                                                    order.status === 'ملغي' ? '#ffebee' :
                                                                    order.status === 'قيد التنفيذ' ? '#fffde7' : 'inherit',
                                                                fontWeight: 'bold',
                                                                borderBottom: '2px solid #1976d2'
                                                            }}
                                                        >
                                                            <TableCell sx={{ fontWeight: 'bold' }}>{order._id}</TableCell>
                                                            <TableCell>{order.orderDate ? new Date(order.orderDate).toLocaleString() : (order.createdAt ? new Date(order.createdAt).toLocaleString() : '')}</TableCell>
                                                            <TableCell>{order.orderedBy?.username || '-'}</TableCell>
                                                            <TableCell>{order.totalAmount}</TableCell>
                                                            <TableCell>{order.status || '-'}</TableCell>
                                                            <TableCell>
                                                                <Button size="small" variant="outlined" onClick={() => { setSelectedOrder(order); setOrderDialogOpen(true); }}>تفاصيل</Button>
                                                            </TableCell>
                                                        </TableRow>
                                                        {/* تفاصيل المنتجات */}
                                                        {order.items && order.items.length > 0 && order.items.map((item, idx) => (
                                                            <TableRow key={order._id + '-item-' + idx} sx={{ bgcolor: '#fafafa' }}>
                                                                <TableCell colSpan={2} sx={{ pl: 6, fontSize: '0.95em', color: '#1976d2' }}>{item.name}</TableCell>
                                                                <TableCell sx={{ fontSize: '0.95em' }}>الكمية: {item.quantity}</TableCell>
                                                                <TableCell sx={{ fontSize: '0.95em' }}>السعر: {item.price}</TableCell>
                                                                <TableCell sx={{ fontSize: '0.95em' }}>الإجمالي: {(item.price * item.quantity).toFixed(2)}</TableCell>
                                                                <TableCell />
                                                            </TableRow>
                                                        ))}
                                                    </React.Fragment>
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
