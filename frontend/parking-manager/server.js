const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

// Allow self-signed certificates (development only)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const app = express();
const PORT = process.env.PORT || 8080;

// Backend URLs from environment variables
const backendConfig = {
  lisbon: process.env.REACT_APP_LISBON_API_URL || 'http://10.0.1.4:3001',
  madrid: process.env.REACT_APP_MADRID_API_URL || 'https://10.0.1.5:3002',
  paris: process.env.REACT_APP_PARIS_API_URL || 'https://10.0.1.6:3003'
};

console.log('Frontend server with proxy running on port', PORT);
console.log('Backend Configuration:', backendConfig);

// Create proxy middleware
const createProxy = (target) => createProxyMiddleware({
  target,
  changeOrigin: true,
  secure: false, // Accept self-signed certificates
  logLevel: 'warn',
  pathRewrite: (pathReq) => pathReq.replace(/^\/api\/(lisbon|madrid|paris)/, '/api')
});

// Proxy endpoints
app.use('/api/lisbon', createProxy(backendConfig.lisbon));
app.use('/api/madrid', createProxy(backendConfig.madrid));
app.use('/api/paris', createProxy(backendConfig.paris));

// Disable CSP entirely (allow all sources)
app.use((req, res, next) => {
  res.removeHeader('Content-Security-Policy');
  res.removeHeader('X-Content-Security-Policy');
  res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;");
  next();
});

// Serve static files from the build directory
app.use(express.static(path.join(__dirname, 'build')));

// Handle React routing - return index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Frontend server with proxy running on port ${PORT}`);
});
