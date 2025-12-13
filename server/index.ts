import express, { Request, Response } from 'express';
import { join } from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(join(import.meta.dir, '../public')));

// API Routes
app.get('/api/countries', (_req: Request, res: Response) => {
  // TODO: Implement country list endpoint
  res.json({ countries: [] });
});

app.post('/api/score', (req: Request, res: Response) => {
  // TODO: Implement score tracking
  res.json({ success: true });
});

// Serve Vue app
app.get('*', (_req: Request, res: Response) => {
  res.sendFile(join(import.meta.dir, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
