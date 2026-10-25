import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/index.js';
import { openApiSpec } from './openapi/spec.js';
import { generalApiLimiter } from './middlewares/rateLimiter.js';
import { errorHandler } from './middlewares/errorHandler.js';

// Route imports
import { authRoutes } from './modules/auth/authRoutes.js';
import { ownerRoutes } from './modules/owners/ownerRoutes.js';
import { dogRoutes } from './modules/dogs/dogRoutes.js';
import { bookingRoutes } from './modules/bookings/bookingRoutes.js';
import { statusRoutes } from './modules/status/statusRoutes.js';
import { avatarRoutes } from './modules/avatars/avatarRoutes.js';
import { dashboardRoutes } from './modules/dashboard/dashboardRoutes.js';
import { settingsRoutes } from './modules/settings/settingsRoutes.js';
import { auditRoutes } from './modules/audit/auditRoutes.js';
import { backupRoutes } from './modules/backups/backupRoutes.js';

export const app = express();

// Security and utility middlewares
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(generalApiLimiter);

// OpenAPI Swagger UI Documentation
app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
app.get('/api/v1/docs.json', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(openApiSpec);
});

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    time: new Date().toISOString(),
    timezone: config.hotelTimezone
  });
});

// Mount versioned API routes
const apiRouter = express.Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/owners', ownerRoutes);
apiRouter.use('/dogs', dogRoutes);
apiRouter.use('/bookings', bookingRoutes);
apiRouter.use('/statuses', statusRoutes);
apiRouter.use('/avatars', avatarRoutes);
apiRouter.use('/dashboard', dashboardRoutes);
apiRouter.use('/settings', settingsRoutes);
apiRouter.use('/audit', auditRoutes);
apiRouter.use('/backups', backupRoutes);

app.use('/api/v1', apiRouter);

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`
    }
  });
});

// Global Error Handler
app.use(errorHandler);
