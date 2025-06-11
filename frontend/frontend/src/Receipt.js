// frontend/src/components/Receipt.js
import React from 'react';
import './Receipt.css'; // ملف CSS خاص بالطباعة

const Receipt = ({ orderDetails, onClose }) => {
    if (!orderDetails) return null;

    return (
        <div className="receipt-container">
            <div className="receipt-content">
                <button className="close-print-button" onClick={onClose}>إغلاق</button>
                <button className="print-button" onClick={() => window.print()}>طباعة الفاتورة</button>

                <div className="invoice-header">
                    <h2>LO-oCal Coffe Sho_Op</h2>
                    <p>Email: [bnmalik7993663@gmail.com]</p>
                    <p>Mobile: [0096876367655]</p>
                    <p>Date: {new Date(orderDetails.orderDate).toLocaleString()}</p>
                    <p>Order NO.: {orderDetails._id}</p>
                    {orderDetails.orderedBy && orderDetails.orderedBy.username && (
                        <p>Cashaier: {orderDetails.orderedBy.username}</p>
                    )}
                    <hr />
                </div>

                <div className="invoice-body">
                    <h3>تفاصيل الطلب:</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>المنتج</th>
                                <th>الكمية</th>
                                <th>السعر</th>
                                <th>الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orderDetails.items.map(item => (
                                <tr key={item._id}>
                                    <td>{item.name}</td>
                                    <td>{item.quantity}</td>
                                    <td>{item.price.toFixed(2)}</td>
                                    <td>{(item.price * item.quantity).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <hr />
                </div>

                <div className="invoice-footer">
                    <p>الإجمالي الفرعي: {orderDetails.totalAmount.toFixed(2)} ريال</p>
                    {/* يمكنك إضافة الضرائب أو الخصومات هنا */}
                    <h3> Total Price : {orderDetails.totalAmount.toFixed(2)} ريال</h3>
                    <p>شكرًا لزيارتكم!</p>

                </div>
            </div>
        </div>
    );
};

export default Receipt;