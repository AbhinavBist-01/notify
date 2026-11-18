import { Router } from 'express';
import { notificationController } from './notification.controller.js';
import { requireApiKey } from '../../middleware/auth.js';

export const notificationRouter = Router();

// Protect all notification routes with API key
notificationRouter.use(requireApiKey);

notificationRouter.post('/', (req, res, next) => {
  notificationController.create(req, res, next);
});

notificationRouter.get('/:id', (req, res, next) => {
  notificationController.getById(req, res, next);
});
