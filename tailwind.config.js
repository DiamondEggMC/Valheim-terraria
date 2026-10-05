import tailwindAnimate from 'tailwindcss-animate';

export default {
    content: [
        './index.html',
        './pages/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './app/**/*.{ts,tsx}',
        './src/**/*.{ts,tsx}',
        './node_modules/streamdown/dist/**/*.js'
    ],
    prefix: '',
    theme: {
        extend: {
            colors: {
                border: 'hsl(var(--border))',
            }
        }
    },
    plugins: [tailwindAnimate]
};
