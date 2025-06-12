import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, TextField, Table, TableBody, TableCell, TableHead, TableRow, Box
} from '@mui/material';

const OrderDetailsDialog = ({ open, order, onClose, onDelete, onSave }) => {
  const [editMode, setEditMode] = useState(false);
  const [editOrder, setEditOrder] = useState(order);

  React.useEffect(() => {
    setEditOrder(order);
    setEditMode(false);
  }, [order]);

  if (!order) return null;

  const handleChange = (field, value) => {
    setEditOrder(prev => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (idx, field, value) => {
    setEditOrder(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === idx ? { ...item, [field]: value } : item)
    }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>تفاصيل الطلب</DialogTitle>
      <DialogContent>
        <Typography variant="subtitle1">رقم الطلب: {order._id}</Typography>
        <Typography variant="subtitle2">التاريخ: {new Date(order.orderDate || order.createdAt).toLocaleString()}</Typography>
        <Typography variant="subtitle2">الكاشير: {order.orderedBy?.username || '-'}</Typography>
        <Typography variant="subtitle2">الحالة: {editMode ? (
          <TextField size="small" value={editOrder.status || ''} onChange={e => handleChange('status', e.target.value)} />
        ) : (order.status || '-')}</Typography>
        <Box mt={2}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>المنتج</TableCell>
                <TableCell>الكمية</TableCell>
                <TableCell>السعر</TableCell>
                <TableCell>الإجمالي</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {order.items.map((item, idx) => (
                <TableRow key={item._id || idx}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>
                    {editMode ? (
                      <TextField
                        type="number"
                        size="small"
                        value={editOrder.items[idx].quantity}
                        onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))}
                        inputProps={{ min: 1 }}
                        style={{ width: 60 }}
                      />
                    ) : item.quantity}
                  </TableCell>
                  <TableCell>
                    {editMode ? (
                      <TextField
                        type="number"
                        size="small"
                        value={editOrder.items[idx].price}
                        onChange={e => handleItemChange(idx, 'price', Number(e.target.value))}
                        inputProps={{ min: 0 }}
                        style={{ width: 80 }}
                      />
                    ) : item.price}
                  </TableCell>
                  <TableCell>{(item.price * item.quantity).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
        <Box mt={2}>
          <Typography>الإجمالي: {order.totalAmount} ريال</Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        {editMode ? (
          <>
            <Button onClick={() => { setEditMode(false); setEditOrder(order); }}>إلغاء</Button>
            <Button color="primary" variant="contained" onClick={() => onSave(editOrder)}>حفظ التعديلات</Button>
          </>
        ) : (
          <>
            <Button onClick={onClose}>إغلاق</Button>
            <Button color="error" onClick={() => onDelete(order._id)}>حذف</Button>
            <Button color="primary" variant="contained" onClick={() => setEditMode(true)}>تعديل</Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default OrderDetailsDialog;
