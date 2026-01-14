import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { authMiddleware } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";
import routes from "./routes/index.js";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(morgan("combined"));
const corsOrigins = process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"];
app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));
app.use(express.json());

// Auth middleware (sets req.context)
app.use(authMiddleware);

// API routes
app.use("/api/v1", routes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "Endpoint not found",
    },
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`[API] Server running on port ${PORT}`);
  console.log(`[API] Health check: http://localhost:${PORT}/api/v1/health`);
});

export default app;
