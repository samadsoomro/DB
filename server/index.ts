import express, { type Request, Response, NextFunction } from "express";
import cookieSession from "cookie-session"; // Use cookie-session for serverless compatibility
import { createServer } from "http";
import path from "path";
import fs from "fs"; // Still needed for dist check locally, but not for uploads
import { registerRoutes } from "./routes.js";

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));
app.set("trust proxy", 1); // Specific for Vercel/proxies to allow secure cookies

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    env: app.get("env"),
    timestamp: new Date().toISOString()
  });
});

// Use cookie-session instead of express-session + MemoryStore
app.use(
  cookieSession({
    name: 'session',
    keys: [process.env.SESSION_SECRET || 'gcmn-library-secret-key-replaced-with-env'],
    maxAge: 24 * 60 * 60 * 1000,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? 'none' : 'lax' // 'none' required for cross-site if needed, but 'lax' usually fine
  })
);

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  const method = req.method;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      console.log(`${method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

// Register routes synchronously
registerRoutes(app);

// Error handling
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  console.error(`[SERVER ERROR] ${status}: ${message}`, err);
  res.status(status).json({ message });
});

const server = createServer(app);
server.timeout = 600000;

// Replaced local upload serving with Supabase logic in routes.ts
// Removed app.use("/server/uploads", ...)

if (app.get("env") === "development") {
  (async () => {
    const vitePath = "./vi" + "te.js"; // Avoids Vercel analysis scanning this import
    try {
      const { setupVite } = await import(vitePath);
      await setupVite(app, server);
    } catch (e) {
      console.error("[SERVER] Failed to load Vite:", e);
    }
  })();
  // On Vercel, static files are handled by the platform.
  // We only serve static files locally or in a traditional VPS setup.
  if (!process.env.VERCEL) {
    const distPath = path.resolve(process.cwd(), "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.use("*", (_req, res) => {
        res.sendFile(path.resolve(distPath, "index.html"));
      });
    }
  }
}

// Local server start
if (!process.env.VERCEL) {
  const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
  server.listen({ port, host: "0.0.0.0" }, () => {
    console.log(`[SERVER] Ready on port ${port}`);
  });
}

export { app };
