import { createTheme } from '@mui/material/styles';
import { arEG } from '@mui/material/locale'; // لاستخدام اللغة العربية في مكونات MUI

// استيراد خط Cairo مباشرة
import '@fontsource/cairo/400.css';
import '@fontsource/cairo/700.css';

const theme = createTheme({
    palette: {
        primary: {
            main: '#4caf50', // لون أخضر جذاب
        },
        secondary: {
            main: '#ff9800', // لون برتقالي ثانوي
        },
        background: {
            default: '#f0f2f5', // خلفية فاتحة للتطبيق
            paper: '#ffffff', // خلفية بيضاء للعناصر (البطاقات، النماذج)
        },
    },
    typography: {
        fontFamily: 'Cairo, sans-serif', // استخدام خط Cairo
        h1: {
            fontSize: '2.5rem',
            fontWeight: 700,
        },
        h2: {
            fontSize: '2rem',
            fontWeight: 600,
        },
        h3: {
            fontSize: '1.75rem',
            fontWeight: 500,
        },
    },
    direction: 'rtl', // هام جداً: توجيه من اليمين لليسار
    components: {
        MuiButton: { // تخصيص أزرار MUI بشكل افتراضي
            styleOverrides: {
                root: {
                    borderRadius: '8px', // زوايا مستديرة للأزرار
                    textTransform: 'none', // لا تحول النص إلى حروف كبيرة
                },
            },
        },
        MuiTextField: { // تخصيص حقول الإدخال
            defaultProps: {
                variant: 'outlined', // حقول إدخال بحدود خارجية افتراضيًا
                size: 'small', // حجم صغير افتراضيًا
            },
        },
    },
}, arEG); // تفعيل اللغة العربية لمكونات MUI

export default theme;