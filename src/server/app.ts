import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { getDatabase } from '../db/connection.js';
import { createApiRouter } from './routes/api-router.js';

export function createApp(dbPath?: string) {
  const app = express();
  const db = getDatabase(dbPath);

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // Mount API router
  app.use('/api', createApiRouter(db));

  // Serve static dist in production
  const distPath = path.resolve(process.cwd(), 'dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.use((req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}
