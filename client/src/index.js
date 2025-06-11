import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from '@mui/material/styles'; // لاستيراد الثيم
import CssBaseline from '@mui/material/CssBaseline'; // لإعادة ضبط CSS في المتصفحات
import theme from './theme'; // استيراد الثيم الذي أنشأناه

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline /> {/* يطبق إعادة ضبط CSS الأساسية من MUI */}
      <App />
    </ThemeProvider>
  </React.StrictMode>
);