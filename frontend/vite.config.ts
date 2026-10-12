import { defineConfig, type ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';

const nativeApiProxy: ProxyOptions = {
  target: process.env.VITE_API_TARGET || `http://127.0.0.1:${process.env.BACKEND_PORT || process.env.PORT || 3013}`,
  changeOrigin: true,
  configure(proxy) {
    proxy.on('proxyReq', (upstream, request, response) => {
      if (!(request.url?.startsWith('/api/runtime-ai/') || request.url?.startsWith('/api/agent-workflow/runs'))) return;
      response.once('close', () => { if ('writableEnded' in response && !response.writableEnded) upstream.destroy(); });
    });
  },
};
export default defineConfig({ plugins: [react()], server: { proxy: { '/api': nativeApiProxy } }, preview: { proxy: { '/api': nativeApiProxy } } });
