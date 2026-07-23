import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    build: {
        chunkSizeWarningLimit: 1500,
        rollupOptions: {
            output: {
                manualChunks: {
                    'react-vendor': ['react', 'react-dom', 'react-router-dom'],
                    'supabase': ['@supabase/supabase-js'],
                    'export': ['xlsx', 'jspdf', 'jspdf-autotable'],
                },
            },
        },
    },
});
