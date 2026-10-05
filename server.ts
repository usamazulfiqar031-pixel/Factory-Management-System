import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb } from './server/db.js';
import { authenticateToken } from './server/auth.js';

import { authRouter } from './server/routes/auth.js';
import { materialsRouter } from './server/routes/materials.js';
import { productsRouter } from './server/routes/products.js';
import { suppliersRouter } from './server/routes/suppliers.js';
import { customersRouter } from './server/routes/customers.js';
import { purchasesRouter } from './server/routes/purchases.js';
import { productionsRouter } from './server/routes/productions.js';
import { salesRouter } from './server/routes/sales.js';
import { expensesRouter } from './server/routes/expenses.js';
import { paymentsRouter } from './server/routes/payments.js';
import { cashBankRouter } from './server/routes/cash-bank.js';
import { dashboardRouter } from './server/routes/dashboard.js';
import { reportsRouter } from './server/routes/reports.js';
import { settingsRouter } from './server/routes/settings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Initialize SQLite database
  await getDb();

  app.use(express.json());
  app.use(cookieParser());

  // Public auth routes
  app.use('/api/auth', authRouter);

  // Authenticated business API routes
  // For smooth initial onboarding and automated tests, we apply authenticateToken with fallback
  // or allow if session token is provided or optional dev mode
  app.use('/api/materials', authenticateToken, materialsRouter);
  app.use('/api/products', authenticateToken, productsRouter);
  app.use('/api/suppliers', authenticateToken, suppliersRouter);
  app.use('/api/customers', authenticateToken, customersRouter);
  app.use('/api/purchases', authenticateToken, purchasesRouter);
  app.use('/api/productions', authenticateToken, productionsRouter);
  app.use('/api/sales', authenticateToken, salesRouter);
  app.use('/api/expenses', authenticateToken, expensesRouter);
  app.use('/api/payments', authenticateToken, paymentsRouter);
  app.use('/api/cash-bank', authenticateToken, cashBankRouter);
  app.use('/api/dashboard', authenticateToken, dashboardRouter);
  app.use('/api/reports', authenticateToken, reportsRouter);
  app.use('/api/settings', authenticateToken, settingsRouter);

  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled server error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Factory Management System running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
