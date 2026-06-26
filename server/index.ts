import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createGatewayMiddleware } from '@barry.jiang/dingtalk-aiapp-infra';
import { need_login } from './_core/auth.js';
import contactsRoutes from './official-apis/contactsRoutes.js';
import {createTokenInjectionMiddleware} from "./_core/tokenInjection.js";
import deptRoutes from './official-apis/deptRoutes.js';
import storageRoutes from './official-apis/storageRoutes.js';
// Import more routes here
import modelRoutes from './routes/modelRoutes.js';
import vendorApiKeyRoutes from './routes/vendorApiKeyRoutes.js';
import logRoutes from './routes/logRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import routingRoutes from './routes/routingRoutes.js';
import publicProxyRoutes from './routes/publicProxyRoutes.js';
import accessKeyRoutes from './routes/accessKeyRoutes.js';
import proxyLogRoutes from './routes/proxyLogRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(cookieParser());

// Storage upload route must be registered BEFORE express.json() and createGatewayMiddleware(),
// because body-parsing middleware consumes the request stream, which breaks multer's
// multipart/form-data parsing (causes "Unexpected end of form" error).
app.use('/api/storage', need_login, storageRoutes);

app.use(express.json({ type: ['application/json', 'text/plain'] }));
app.use(createGatewayMiddleware());

// Token injection must run BEFORE express.static,
// otherwise static middleware serves index.html directly and skips injection.
app.use(createTokenInjectionMiddleware());

app.use(express.static(path.join(__dirname, '..')));

// 公开代理接口（不需要钉钉登录，使用平台访问密钥认证）
// 必须在 need_login 之前注册，否则会被登录中间件拦截返回 302
app.use('/api/public', publicProxyRoutes);

app.use('/api', need_login);

// 健康检查接口（免登）
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/contacts', contactsRoutes);
app.use('/api/depts', deptRoutes);

app.use('/api/models', modelRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/usage', dashboardRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/routing-rules', routingRoutes);
app.use('/api/proxy', routingRoutes);

// 平台访问密钥管理（需要钉钉登录）
app.use('/api/access-keys', accessKeyRoutes);

// 代理调用日志（需要钉钉登录）
app.use('/api/proxy-logs', proxyLogRoutes);

// default route (don't modify)
app.get('*', (req, res) => {
  res.sendFile('index.html', { root: path.join(__dirname, '..') });
});


app.listen(9000, () => {
  console.log('Server running on http://localhost:9000');
});
