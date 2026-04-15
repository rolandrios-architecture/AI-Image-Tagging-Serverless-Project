import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const config = {
    plugins: [react()],
  };

  // Add a dev-only middleware to accept error logs from the frontend and append to docs/ERRORS.txt
  if (command === 'serve') {
    config.server = config.server || {};

    // Dev proxy: forward requests under `/images` to the API origin so
    // frontend calls to `/images/{fileName}` during development are proxied
    // to the live API and avoid CORS / origin issues.
    config.server.proxy = config.server.proxy || {};
    config.server.proxy['/images'] = {
      target: 'https://6iy1nvu4cl.execute-api.us-east-1.amazonaws.com',
      changeOrigin: true,
      secure: true,
    };

    // Use configureServer hook instead of deprecated setup
    config.configureServer = (server) => {
      server.middlewares.use(async (req, res, next) => {
        if (req.method === 'POST' && req.url === '/__log_error') {
          try {
            let body = '';
            for await (const chunk of req) body += chunk;
            const data = JSON.parse(body || '{}');
            // Use project-relative path for docsPath (no process)
            const docsPath = path.resolve('.', 'docs', 'ERRORS.txt');
            const lines = [];
            const time = new Date().toISOString();
            lines.push(`${time} — ${data.title || 'Error'}`);
            if (data.context) lines.push(`Context: ${data.context}`);
            if (data.message) lines.push(`Message: ${data.message}`);
            if (data.stack) lines.push(`Stack:\n${data.stack}`);
            lines.push('---\n');
            fs.appendFileSync(docsPath, lines.join('\n') + '\n', 'utf8');
            res.statusCode = 200;
            res.end(JSON.stringify({ ok: true }));
            return;
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: String(e) }));
            return;
          }
        }
        next();
      });
    };
  }

  return config;
});
