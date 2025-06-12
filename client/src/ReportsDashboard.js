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

    const fetchOrders = useCallback(async () => {
        setLoadingOrders(true);
        setError('');
        try {
            const response = await fetch(`${API_BASE_URL}/orders`, {
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
    }, [token]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    if (loadingOrders) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    if (error) return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;

    return (
        <>
            <Container maxWidth="lg" sx={{ mt: 4, p: 3, boxShadow: 3, borderRadius: 2, bgcolor: 'background.paper' }}>
                <Typography variant="h4" gutterBottom>تقرير الطلبات التفصيلي</Typography>
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12}>
                        <Card variant="outlined">
                            <CardContent>
                                {orders.length === 0 ? <Typography>لا توجد طلبات.</Typography> : (
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
                                                {orders.map(order => (
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
        </>
    );
};

export default ReportsDashboard;
