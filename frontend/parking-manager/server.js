const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const port = process.env.PORT || 8080;

const backendConfig = {
  lisbon: process.env.BACKEND_LISBON_URL || 'http://10.0.1.4:3001',
  madrid: process.env.BACKEND_MADRID_URL || 'http://10.0.1.5:3002',
  paris: process.env.BACKEND_PARIS_URL || 'http://10.0.1.6:3003'
};

const createProxy = (target) => createProxyMiddleware({
  target,
  changeOrigin: true,
  logLevel: 'warn',
  pathRewrite: (pathReq) => pathReq.replace(/^\/api\/(lisbon|madrid|paris)/, '')
});

app.use('/api/lisbon', createProxy(backendConfig.lisbon));
app.use('/api/madrid', createProxy(backendConfig.madrid));
app.use('/api/paris', createProxy(backendConfig.paris));

app.use(express.static(path.join(__dirname, 'build')));

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(port, () => {
  console.log(`Frontend proxy server listening on port ${port}`);
});
