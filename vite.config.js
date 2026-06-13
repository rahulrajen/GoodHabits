import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true
  },
  plugins: [
    react(),
    {
      name: 'local-json-db',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/api/db') {
            const dbPath = path.resolve(process.cwd(), 'db.json');
            
            if (req.method === 'GET') {
              if (!fs.existsSync(dbPath)) {
                // Initialize default database configuration
                const defaultDb = {
                  profiles: {
                    default: {
                      habits: [
                        { id: '1', text: 'Hydrate (Drink 2L Water)', points: 5, icon: '💧', category: 'Health' },
                        { id: '2', text: 'Read 10 Pages of a Book', points: 10, icon: '📚', category: 'Mind' },
                        { id: '3', text: '30-minute Workout', points: 15, icon: '💪', category: 'Fitness' },
                        { id: '4', text: '10-minute Meditation', points: 10, icon: '🧘', category: 'Mind' },
                        { id: '5', text: 'Eat a Healthy Meal', points: 10, icon: '🥗', category: 'Health' }
                      ],
                      dailyTarget: 35,
                      history: {},
                      streak: 0,
                      lastActive: ''
                    }
                  },
                  currentProfile: 'default'
                };
                fs.writeFileSync(dbPath, JSON.stringify(defaultDb, null, 2), 'utf-8');
              }
              const data = fs.readFileSync(dbPath, 'utf-8');
              res.setHeader('Content-Type', 'application/json');
              res.end(data);
            } else if (req.method === 'POST') {
              let body = '';
              req.on('data', chunk => {
                body += chunk.toString();
              });
              req.on('end', () => {
                try {
                  // Validate JSON before saving
                  JSON.parse(body);
                  fs.writeFileSync(dbPath, body, 'utf-8');
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true }));
                } catch (e) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Invalid JSON body' }));
                }
              });
            }
          } else {
            next();
          }
        });
      }
    }
  ],
  base: './',
})
