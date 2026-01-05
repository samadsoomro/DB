import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import { registerRoutes } from "./routes.js";
import { storage } from "./storage.js";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db.js";

const app = express();
app.use(express.json({ limit: '1024mb' }));
app.use(express.urlencoded({ extended: false, limit: '1024mb' }));

// Health check endpoint for early debugging
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    env: app.get("env"),
    dbConfigured: !!process.env.DATABASE_URL,
    timestamp: new Date().toISOString()
  });
});

// Set up sessions with PostgresStore
let sessionStore;
try {
  const PostgresStore = connectPgSimple(session);
  sessionStore = new PostgresStore({
    pool: pool,
    createTableIfMissing: true,
    tableName: 'session'
  });
  console.log("[SERVER] PostgresSessionStore initialized.");
} catch (error) {
  console.error("[SERVER] Failed to initialize PostgresSessionStore, falling back to MemoryStore:", error);
  // Optional: Fallback to MemoryStore if Postgres fails (not recommended for production but better than 500)
}

app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || "gcmn-library-secret-2024",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 86400000,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    },
  })
);

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";
      console.log(logLine);
    }
  });

  next();
});

// Register routes synchronously so the app is ready when imported by Vercel
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

// Setup static files and Vite (Vite is development only)
const uploadDir = path.join(process.cwd(), "server", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use("/server/uploads", express.static(uploadDir));

if (app.get("env") === "development") {
  (async () => {
    const vitePath = "./vi" + "te.js";
    try {
      const { setupVite } = await import(vitePath);
      await setupVite(app, server);
    } catch (e) {
      console.error("[SERVER] Failed to load Vite:", e);
    }
  })();
} else {
  const distPath = path.resolve(process.cwd(), "dist");
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.use("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
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
