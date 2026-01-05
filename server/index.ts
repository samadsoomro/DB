import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import { registerRoutes } from "./routes";
import { storage } from "./storage";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    isAdmin?: boolean;
    isLibraryCard?: boolean;
  }
}

const app = express();
app.use(express.json({ limit: '1024mb' }));
app.use(express.urlencoded({ extended: false, limit: '1024mb' }));

const MemoryStore = (await import("memorystore")).default(session);

app.use(
  session({
    cookie: { maxAge: 86400000 },
    store: new MemoryStore({
      checkPeriod: 86400000,
    }),
    resave: false,
    saveUninitialized: false,
    secret: process.env.SESSION_SECRET || "gcmn-library-secret-2024",
  })
);

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

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      console.log(logLine);
    }
  });

  next();
});

(async () => {
  // Database initialization is handled by the pool connection in db.ts
  // Register routes
  registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  const server = createServer(app);
  server.timeout = 600000;
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;

  // Serve static files from the uploads directory
  const uploadDir = path.join(process.cwd(), "server", "uploads");
  app.use("/server/uploads", express.static(uploadDir));

  if (app.get("env") === "development") {
    // Dynamic import to avoid bundling vite in production
    // Obfuscate path to prevent bundler from tracing it
    const vitePath = "./vite";
    const { setupVite } = await import(vitePath);
    await setupVite(app, server);
  } else {
    // Standard static file serving for production
    const distPath = path.resolve(process.cwd(), "dist"); // Vercel build output usually goes to 'dist'

    // Check if dist exists, but don't crash if not (Vercel might handle it differently)
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.use("*", (_req, res) => {
        res.sendFile(path.resolve(distPath, "index.html"));
      });
    }
  }

  if (!process.env.VERCEL) {
    const port = 5000;
    server.listen(
      {
        port,
        host: "0.0.0.0",
      },
      () => {
        console.log(`serving on port ${port}`);
      }
    );
  }
})();

export { app };
