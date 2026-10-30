import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';
import { env, allowedOrigins } from './config/env.js';
import { validateOrigin } from './middleware/origin.js';
import { authenticate, requireRole } from './middleware/auth.js';
import { errorHandler } from './middleware/error.js';
import { asyncRoute as a } from './utils/async.js';
import authRouter from './modules/auth/index.js';
import productsRouter from './modules/products/index.js';
import productImagesRouter from './modules/products/images.js';
import adminProductsRouter from './modules/products/admin.js';
import { categoriesRouter, adminCategoriesRouter } from './modules/categories/index.js';
import ordersRouter from './modules/orders/index.js';
import adminOrdersRouter from './modules/orders/admin.js';
import paymentsRouter from './modules/payments/index.js';
import cashierRouter from './modules/cashier/index.js';
import inventoryRouter from './modules/inventory/index.js';
import usersRouter from './modules/users/index.js';
import customersRouter from './modules/users/customers.js';
import { publicShippingRouter, adminShippingRouter } from './modules/shipping/index.js';
import dashboardRouter from './modules/dashboard/index.js';
import reportsRouter from './modules/reports/index.js';

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(validateOrigin);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '2mb' }));
app.use(cookieParser());

const globalLimit = rateLimit({
  windowMs: 60000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
app.use(globalLimit);

const sendHealth = (_req: express.Request, res: express.Response) => {
  res.json({ data: { status: 'ok', env: env.NODE_ENV } });
};
app.get('/api/health', sendHealth);
app.use('/api/media/products', productImagesRouter);
app.get('/', (_req, res) => {
  res.json({ data: { name: 'BagDaily API', status: 'ok', app: allowedOrigins[0], health: '/api/health' } });
});

app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/shipping', publicShippingRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/orders', paymentsRouter);
app.use('/api/payments', paymentsRouter);
const adminGuard = [a(authenticate), requireRole('admin')];
// Keep old admin bookmarks/API clients working, with the same admin-only boundary.
app.use('/api/cashier/orders', adminGuard, adminOrdersRouter);
app.use('/api/cashier', cashierRouter);

app.use('/api/admin/orders', adminGuard, adminOrdersRouter);
app.use('/api/admin/products', adminGuard, adminProductsRouter);
app.use('/api/admin/categories', adminGuard, adminCategoriesRouter);
app.use('/api/admin/inventory', adminGuard, inventoryRouter);
app.use('/api/admin/users', adminGuard, usersRouter);
app.use('/api/admin/customers', adminGuard, customersRouter);
app.use('/api/admin/shipping', adminGuard, adminShippingRouter);
app.use('/api/admin/dashboard', adminGuard, dashboardRouter);
app.use('/api/admin/reports', adminGuard, reportsRouter);

app.use((_req, res) => {
  res.status(404).json({
    data: null,
    error: { code: 'ENDPOINT_NOT_FOUND', message: 'API endpoint does not exist' },
  });
});

app.use(errorHandler);

export default app;
