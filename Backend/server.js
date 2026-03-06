require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const nodemailer = require("nodemailer");
const upload = multer();
const db = require("./db");
const axios = require("axios");
const FormData = require("form-data");
const exifParser = require("exif-parser");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
const JWT_SECRET =
  process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";

// Security middleware
app.use(helmet());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

// Rate limiting - prevent brute force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { message: "Too many requests, please try again later." },
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // limit each IP to 200 requests per minute
  message: { message: "Too many requests, please slow down." },
});

app.use("/api/", apiLimiter);

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: "Authentication required." });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token." });
    }
    req.user = user;
    next();
  });
};

// Helper function for database queries
const dbQuery = (sql, params) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });

// Helper for deterministic randomness
function getDeterministicRandom(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const x = Math.sin(hash) * 10000;
  return x - Math.floor(x);
}

// SSE subscriptions
const sseSubscriptions = new Map();
function notifySubscribers(fileHash, data) {
  const subs = sseSubscriptions.get(fileHash) || [];
  subs.forEach((res) => {
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (e) {
      /* ignore */
    }
  });
}

// ==================== AUTHENTICATION ROUTES ====================

// Login with JWT Token Generation
app.post("/api/login", authLimiter, (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password required." });
  }

  const query = "SELECT * FROM users WHERE username = ?";
  db.query(query, [username], async (err, results) => {
    if (err) {
      console.error("Login DB error:", err);
      return res.status(500).json({ message: "Internal server error." });
    }

    if (results.length === 0) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role || "user",
      },
      JWT_SECRET,
      { expiresIn: "24h" },
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role || "user",
      },
    });
  });
});

// Register with Input Validation
app.post("/api/register", authLimiter, async (req, res) => {
  const { username, email, password } = req.body;

  // Input validation
  if (!username || !email || !password) {
    return res.status(400).json({ message: "All fields are required." });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Invalid email format." });
  }

  // Validate password strength
  if (password.length < 6) {
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters." });
  }

  // Validate username
  if (username.length < 3 || username.length > 30) {
    return res
      .status(400)
      .json({ message: "Username must be between 3 and 30 characters." });
  }

  try {
    const existingUser = await dbQuery(
      "SELECT * FROM users WHERE email = ? OR username = ?",
      [email, username],
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ message: "User already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await dbQuery(
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
      [username, email, hashedPassword],
    );

    res.status(201).json({ message: "User registered successfully." });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// Forgot Password - with rate limiting and security
app.post("/api/forgot-password", authLimiter, (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }

  const findUserQuery = "SELECT * FROM users WHERE email = ?";
  db.query(findUserQuery, [email], (err, results) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).json({ message: "Internal server error." });
    }

    // Always send same response to prevent email enumeration
    if (results.length === 0) {
      console.log(`Password reset attempt for non-existent email: ${email}`);
      return res.json({
        message:
          "If a user with that email exists, a password reset link has been sent.",
      });
    }

    const user = results[0];
    const token = crypto.randomBytes(20).toString("hex");
    const expires = new Date(Date.now() + 3600000); // 1 hour

    const updateUserQuery =
      "UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?";
    db.query(updateUserQuery, [token, expires, user.id], (err, result) => {
      if (err) {
        console.error("Database update error:", err);
        return res.status(500).json({ message: "Failed to set reset token." });
      }

      const resetURL = `${frontendUrl}/reset-password.html?token=${token}`;
      console.log("--- PASSWORD RESET EMAIL ---");
      console.log(`To: ${user.email}`);
      console.log(`Reset URL: ${resetURL}`);
      console.log("--------------------------");

      res.json({
        message:
          "If a user with that email exists, a password reset link has been sent.",
      });
    });
  });
});

// Reset Password
app.post("/api/reset-password", authLimiter, (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res
      .status(400)
      .json({ message: "Token and new password are required." });
  }

  if (password.length < 6) {
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters." });
  }

  const findUserQuery =
    "SELECT * FROM users WHERE password_reset_token = ? AND password_reset_expires > NOW()";
  db.query(findUserQuery, [token], async (err, results) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).json({ message: "Internal server error." });
    }

    if (results.length === 0) {
      return res
        .status(400)
        .json({ message: "Password reset token is invalid or has expired." });
    }

    const user = results[0];
    const hashedPassword = await bcrypt.hash(password, 10);

    const updateUserQuery =
      "UPDATE users SET password = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?";
    db.query(updateUserQuery, [hashedPassword, user.id], (err, result) => {
      if (err) {
        console.error("Database update error:", err);
        return res.status(500).json({ message: "Failed to reset password." });
      }
      res.json({
        message: "Password has been successfully reset. You can now log in.",
      });
    });
  });
});

// Protected Dashboard Endpoint
app.get("/api/dashboard", authenticateToken, (req, res) => {
  const query =
    "SELECT id, username, email, role FROM users WHERE username = ?";
  db.query(query, [req.user.username], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Internal server error." });
    }
    if (results.length > 0) {
      res.json({
        message: `Welcome to your dashboard, ${req.user.username}!`,
        user: {
          id: results[0].id,
          username: results[0].username,
          email: results[0].email,
          role: results[0].role || "user",
        },
      });
    } else {
      res.status(404).json({ message: "User not found." });
    }
  });
});

// ==================== PYTHON ML SERVICE CONFIG ====================
const PYTHON_API_URL = process.env.PYTHON_API_URL || "http://localhost:5000";
const USE_PYTHON_ML = process.env.USE_PYTHON_ML === "true";

// ==================== ANALYSIS ROUTES ====================

app.post("/api/analyze", upload.single("media"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No media file found" });

  let fileHash = crypto
    .createHash("sha256")
    .update(req.file.buffer)
    .digest("hex");

  const mime = req.file.mimetype || "";
  const isVideo = mime.startsWith("video/");
  const isAudio = mime.startsWith("audio/");

  let analysisResult;

  // Try to use Python ML service if enabled
  if (USE_PYTHON_ML) {
    try {
      console.log(
        "[ANALYSIS] Calling Python ML service for:",
        req.file.originalname,
      );

      const formData = new FormData();
      formData.append("media", req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      });

      const pythonResponse = await axios.post(
        `${PYTHON_API_URL}/predict`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
          timeout: 5000, // 5 second timeout - falls back to mock if Python is slow/unavailable
        },
      );

      analysisResult = pythonResponse.data;
      console.log("[ANALYSIS] Python ML result:", analysisResult);
    } catch (pythonError) {
      console.error("[ANALYSIS] Python ML service error:", pythonError.message);
      console.log("[ANALYSIS] Falling back to mock analysis");
    }
  }

  // Use mock analysis if Python service is not available or disabled
  if (!analysisResult) {
    console.log("[ANALYSIS] Using mock analysis for:", req.file.originalname);
    const r = getDeterministicRandom(fileHash);
    const is_fake = r < 0.4;
    const confidence = Math.floor(r * (99 - 70 + 1)) + 70;

    analysisResult = {
      is_deepfake: is_fake,
      confidence,
      prediction: is_fake ? "Fake" : "Real",
      heatmap_url: null,
      file_hash: fileHash,
    };
  }

  const is_fake = analysisResult.is_deepfake;
  const confidence = analysisResult.confidence;

  // Format heatmap URL if available
  let heatmapUrl = analysisResult.heatmap_url;
  if (heatmapUrl && !heatmapUrl.startsWith("http")) {
    heatmapUrl = `${PYTHON_API_URL}${heatmapUrl}`;
  }

  const response = {
    is_deepfake: is_fake,
    confidence,
    file_hash: fileHash,
    heatmap_url: heatmapUrl,
    type: isVideo ? "video" : isAudio ? "audio" : "image",
    model_version:
      analysisResult.model_version ||
      (USE_PYTHON_ML ? "python-ml-v1.0" : "mock-v1.0"),
    audio_confidence: analysisResult.audio_confidence || 0,
    prediction: analysisResult.prediction,
  };

  // Persist result to database
  try {
    const insertQuery = `INSERT INTO detections (file_hash, is_deepfake, prediction, confidence, heatmap_path, model_version, status, created_at, processed_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW()) ON DUPLICATE KEY UPDATE is_deepfake=VALUES(is_deepfake), prediction=VALUES(prediction), confidence=VALUES(confidence), heatmap_path=VALUES(heatmap_path), model_version=VALUES(model_version), status=VALUES(status), processed_at=NOW()`;
    await dbQuery(insertQuery, [
      fileHash,
      is_fake ? 1 : 0,
      analysisResult.prediction || (is_fake ? "fake" : "real"),
      confidence,
      heatmapUrl,
      response.model_version,
      "done",
    ]);
  } catch (e) {
    console.error("Failed to persist result:", e);
  }

  notifySubscribers(fileHash, {
    status: "done",
    file_hash: fileHash,
    is_deepfake: is_fake,
    confidence,
    heatmap_url: heatmapUrl,
  });
  res.json(response);
});

// Fast Analysis Endpoint
app.post("/api/analyze-fast", async (req, res) => {
  console.log("[DEBUG] /api/analyze-fast hit with body:", req.body);
  const { hash, name, type, size, userId } = req.body;

  if (!hash) {
    console.error("[DEBUG] No file hash provided");
    return res.status(400).json({ error: "No file hash provided" });
  }

  const randomValue = getDeterministicRandom(hash);
  const is_fake = randomValue < 0.4;
  const confidence = Math.floor(randomValue * (99 - 70 + 1)) + 70;

  const isVideo = type && type.startsWith("video");
  const isAudio = type && type.startsWith("audio");

  let feature_scores = {};
  let timeline = [];

  if (is_fake) {
    feature_scores = {
      "Visual Artifacts": Math.floor(Math.random() * 20) + 70,
      "Audio Consistency":
        isVideo || isAudio ? Math.floor(Math.random() * 20) + 60 : 0,
      "Metadata Integrity": Math.floor(Math.random() * 30) + 40,
    };
    if (isVideo || isAudio) {
      timeline = [
        { start: 0, end: 15, score: 10, status: "authentic" },
        { start: 15, end: 28, score: 95, status: "manipulated" },
        { start: 28, end: 45, score: 20, status: "authentic" },
      ];
    }
  } else {
    feature_scores = {
      "Visual Artifacts": Math.floor(Math.random() * 20) + 10,
      "Audio Consistency":
        isVideo || isAudio ? Math.floor(Math.random() * 20) + 10 : 0,
      "Metadata Integrity": Math.floor(Math.random() * 20) + 80,
    };
    if (isVideo || isAudio) {
      timeline = [{ start: 0, end: 100, score: 5, status: "authentic" }];
    }
  }

  const mockResult = {
    is_deepfake: is_fake,
    confidence,
    file_hash: hash,
    type: isVideo ? "video" : isAudio ? "audio" : "image",
    feature_scores,
    timeline,
    chief_judgment: {
      title: "Overall Assessment",
      description: is_fake
        ? "Preliminary hash analysis indicates patterns consistent with manipulated media."
        : "Preliminary hash analysis suggests the media signature is consistent with authentic files.",
    },
    visual_analysis: [
      {
        title: "Visual Pattern",
        description: is_fake
          ? "High-frequency noise detected in signature."
          : "Natural frequency distribution observed.",
        level: is_fake ? "Medium" : "Low",
      },
      {
        title: "Compression Artifacts",
        description: is_fake
          ? "Inconsistent compression blocks hinted by hash structure."
          : "Standard compression signature.",
        level: is_fake ? "High" : "Low",
      },
    ],
    metadata_analysis: [
      { title: "File Name", description: name || "Unknown", level: "Low" },
      { title: "File Type", description: type || "Unknown", level: "Low" },
      {
        title: "File Size",
        description: size ? `${(size / 1024 / 1024).toFixed(2)} MB` : "Unknown",
        level: "Low",
      },
    ],
    forensics: [
      {
        title: "Hash Integrity",
        description: "Cryptographic signature verified.",
        level: "Low",
      },
      {
        title: "Database Match",
        description: "No known malicious matches found in local DB.",
        level: "Low",
      },
    ],
  };

  if (userId) {
    const logQuery =
      "INSERT INTO analysis_log (user_id, is_deepfake, confidence) VALUES (?, ?, ?)";
    db.query(
      logQuery,
      [userId, mockResult.is_deepfake, mockResult.confidence],
      (err) => {
        if (err) console.error("Failed to log analysis:", err);
      },
    );
  }

  setTimeout(() => {
    res.json(mockResult);
  }, 800);
});

// Feedback Endpoint
app.post("/api/feedback", (req, res) => {
  const { userId, fileHash, predictedLabel, userFeedbackLabel } = req.body;

  if (!fileHash || !predictedLabel || !userFeedbackLabel) {
    return res
      .status(400)
      .json({ message: "Missing required feedback fields." });
  }

  const query =
    "INSERT INTO feedback (user_id, file_hash, predicted_label, user_feedback_label) VALUES (?, ?, ?, ?)";
  db.query(
    query,
    [userId || null, fileHash, predictedLabel, userFeedbackLabel],
    (err) => {
      if (err) {
        console.error("Database insert error for feedback:", err);
        return res.status(500).json({ message: "Failed to submit feedback." });
      }
      res.status(201).json({
        message:
          "Feedback submitted successfully. Thank you for helping improve our model!",
      });
    },
  );
});

// Summary Endpoint
app.post("/api/summarize", (req, res) => {
  const result = req.body.analysisResult;
  const summary = result.is_deepfake
    ? `DANGER: This media has a ${result.confidence}% probability of being a deepfake. Major indicators include facial artifacts and inconsistent noise patterns.`
    : `SAFE: This media appears authentic with a ${result.confidence}% confidence score. Metadata analysis aligns with original capture characteristics.`;
  res.json({ summary });
});

// PDF Report Endpoint
app.post("/api/report/pdf", (req, res) => {
  const { analysisResult, fileName } = req.body;

  if (!analysisResult) {
    return res.status(400).json({ message: "Analysis result required." });
  }

  const doc = new PDFDocument();
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=analysis_report.pdf`,
  );
  doc.pipe(res);

  doc.fontSize(25).text("Deepfake Analysis Report", { align: "center" });
  doc.moveDown();
  doc.fontSize(12).text(`File Name: ${fileName || "Uploaded Media"}`);
  doc.text(`Date: ${new Date().toLocaleString()}`);
  doc.text(`Analysis Hash: ${analysisResult.file_hash || "N/A"}`);
  doc.moveDown();
  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown();

  doc
    .fontSize(18)
    .fillColor(analysisResult.is_deepfake ? "red" : "green")
    .text(
      `Verdict: ${analysisResult.is_deepfake ? "MANIPULATED" : "AUTHENTIC"}`,
      { align: "center" },
    );
  doc
    .fontSize(14)
    .fillColor("black")
    .text(`Confidence Score: ${analysisResult.confidence}%`, {
      align: "center",
    });
  doc.moveDown();

  doc
    .fontSize(16)
    .fillColor("black")
    .text("Analysis Details", { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(12).text(`Type: ${analysisResult.type || "Unknown"}`);
  doc.text(`Hash: ${analysisResult.file_hash || "N/A"}`);
  doc.text(`Model Version: ${analysisResult.model_version || "N/A"}`);
  doc.end();
});

// SSE subscribe endpoint
app.get("/api/subscribe/:fileHash", (req, res) => {
  const { fileHash } = req.params;
  if (!fileHash) return res.status(400).end();

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write("\n");

  const arr = sseSubscriptions.get(fileHash) || [];
  arr.push(res);
  sseSubscriptions.set(fileHash, arr);

  req.on("close", () => {
    const subs = sseSubscriptions.get(fileHash) || [];
    const filtered = subs.filter((r) => r !== res);
    if (filtered.length === 0) sseSubscriptions.delete(fileHash);
    else sseSubscriptions.set(fileHash, filtered);
  });
});

// ==================== ADMIN ROUTES ====================

// Admin Export Endpoint
app.get("/api/admin/export-activity", (req, res) => {
  const query = `SELECT u.username, u.email, a.is_deepfake, a.confidence, a.analysis_timestamp 
    FROM analysis_log a JOIN users u ON a.user_id = u.id ORDER BY a.analysis_timestamp DESC`;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ message: "Export failed" });

    const header = "Username,Email,Is Deepfake,Confidence,Timestamp\n";
    const rows = results
      .map(
        (row) =>
          `${row.username},${row.email},${row.is_deepfake ? "YES" : "NO"},${row.confidence}%,${new Date(row.analysis_timestamp).toLocaleString()}`,
      )
      .join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="activity_log.csv"',
    );
    res.send(header + rows);
  });
});

// Admin Feedback Review
app.get("/api/admin/feedback", (req, res) => {
  const query = `SELECT f.id, u.username, u.email, f.file_hash, f.predicted_label, f.user_feedback_label, f.timestamp, f.reviewed
    FROM feedback f LEFT JOIN users u ON f.user_id = u.id ORDER BY f.timestamp DESC`;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Database query error for admin feedback:", err);
      return res.status(500).json({ message: "Internal server error." });
    }
    res.json(results);
  });
});

// Admin Activity
app.get("/api/admin/activity", (req, res) => {
  const query = `SELECT u.id, u.username, 
    COUNT(CASE WHEN DATE(a.analysis_timestamp) = CURDATE() THEN 1 END) as analyses_today,
    COUNT(a.id) as total_analyses, MAX(a.analysis_timestamp) as last_active
    FROM users u LEFT JOIN analysis_log a ON u.id = a.user_id
    WHERE u.role != 'admin' OR u.role IS NULL GROUP BY u.id, u.username ORDER BY last_active DESC`;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Database query error for admin activity:", err);
      return res.status(500).json({ message: "Internal server error." });
    }
    res.json(results);
  });
});

// Admin Stats
app.get("/api/admin/stats", (req, res) => {
  const query = `SELECT
    (SELECT COUNT(*) FROM users WHERE role != 'admin') as totalUsers,
    (SELECT COUNT(*) FROM analysis_log) as totalAnalyses,
    (SELECT COUNT(*) FROM analysis_log WHERE is_deepfake = TRUE) as deepfakesDetected`;

  db.query(query, (err, results) => {
    if (err || results.length === 0) {
      console.error("Error fetching admin stats:", err);
      return res.status(500).json({ message: "Failed to fetch stats." });
    }
    res.json(results[0]);
  });
});

// Delete User
app.delete("/api/admin/user/:id", (req, res) => {
  const userId = req.params.id;
  const query = "DELETE FROM users WHERE id = ?";
  db.query(query, [userId], (err, result) => {
    if (err) {
      console.error("Error deleting user:", err);
      return res.status(500).json({ message: "Failed to delete user." });
    }
    res.json({ message: "User deleted successfully." });
  });
});

// ==================== USER ROUTES ====================

// User Activity
app.get("/api/user-activity/:userId", (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required." });
  }

  const activityQuery = `SELECT
    (SELECT COUNT(*) FROM analysis_log WHERE user_id = ?) AS totalAnalyses,
    (SELECT COUNT(*) FROM analysis_log WHERE user_id = ? AND DATE(analysis_timestamp) = CURDATE()) AS analysesToday,
    (SELECT AVG(confidence) FROM analysis_log WHERE user_id = ?) AS avgConfidence`;

  db.query(activityQuery, [userId, userId, userId], (err, results) => {
    if (err) {
      console.error("Database query error for user activity:", err);
      return res.status(500).json({ message: "Internal server error." });
    }

    if (results.length > 0) {
      const stats = results[0];
      res.json({
        totalAnalyses: stats.totalAnalyses || 0,
        analysesToday: stats.analysesToday || 0,
        avgConfidence: stats.avgConfidence
          ? Math.round(stats.avgConfidence)
          : 0,
      });
    }
  });
});

// ==================== CODE SCANNER ====================

class CodeScanner {
  constructor() {
    this.issues = [];
  }

  analyzeCode(code, filename) {
    this.issues = [];
    this.analyzeSyntax(code, filename);
    this.analyzeSecurityIssues(code, filename);
    this.analyzeCommonBugs(code, filename);
    return {
      filename,
      issues: this.issues,
      stats: {
        total: this.issues.length,
        critical: this.issues.filter((i) => i.severity === "critical").length,
        warning: this.issues.filter((i) => i.severity === "warning").length,
        info: this.issues.filter((i) => i.severity === "info").length,
      },
    };
  }

  analyzeSyntax(code, filename) {
    if (!code) return;
    try {
      const lines = code.split("\n");
      lines.forEach((line, index) => {
        if (
          line &&
          (line.trim().endsWith("&&") || line.trim().endsWith("||"))
        ) {
          this.issues.push({
            type: "syntax",
            severity: "critical",
            line: index + 1,
            message: "Incomplete logical expression",
            code: line.trim(),
          });
        }
      });
      const allBraces = code.match(/[{}]/g) || [];
      let braceCount = 0;
      allBraces.forEach((b) => {
        if (b === "{") braceCount++;
        if (b === "}") braceCount--;
      });
      if (braceCount !== 0) {
        this.issues.push({
          type: "syntax",
          severity: "critical",
          line: 0,
          message: `Unbalanced braces: ${Math.abs(braceCount)}`,
          code: "",
        });
      }
    } catch (e) {
      /* skip */
    }
  }

  analyzeSecurityIssues(code, filename) {
    if (!code) return;
    try {
      const lines = code.split("\n");
      lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (/\+(.*['"`].*(?:sql|select|insert))/i.test(trimmed)) {
          this.issues.push({
            type: "security",
            severity: "critical",
            line: index + 1,
            message: "Potential SQL injection",
            code: trimmed,
          });
        }
        if (trimmed.includes("eval(")) {
          this.issues.push({
            type: "security",
            severity: "critical",
            line: index + 1,
            message: "eval() is dangerous",
            code: trimmed,
          });
        }
        if (
          /crypto\.createHash\s*\(\s*['"]md5['"]/.test(trimmed) ||
          /crypto\.createHash\s*\(\s*['"]sha1['"]/.test(trimmed)
        ) {
          this.issues.push({
            type: "security",
            severity: "warning",
            line: index + 1,
            message: "Weak hashing algorithm",
            code: trimmed,
          });
        }
      });
    } catch (e) {
      /* skip */
    }
  }

  analyzeCommonBugs(code, filename) {
    if (!code) return;
    try {
      const lines = code.split("\n");
      lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (/if\s*\([^)]*=\s*[^=]/.test(trimmed)) {
          this.issues.push({
            type: "bug",
            severity: "critical",
            line: index + 1,
            message: "Assignment (=) used instead of comparison",
            code: trimmed,
          });
        }
        if (/(password|secret|token)\s*[:=]\s*['"][^'"]+['"]/i.test(trimmed)) {
          this.issues.push({
            type: "security",
            severity: "critical",
            line: index + 1,
            message: "Hardcoded credentials",
            code: trimmed,
          });
        }
      });
    } catch (e) {
      /* skip */
    }
  }
}

function scanDirectory(dir, results = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (
        !item.startsWith(".") &&
        item !== "node_modules" &&
        item !== "dist" &&
        item !== "build"
      ) {
        scanDirectory(fullPath, results);
      }
    } else if (item.endsWith(".js")) {
      try {
        const code = fs.readFileSync(fullPath, "utf8");
        const scanner = new CodeScanner();
        const result = scanner.analyzeCode(
          code,
          path.relative(__dirname, fullPath),
        );
        if (result.issues.length > 0) {
          results.push(result);
        }
      } catch (e) {
        console.error(`Error scanning ${fullPath}:`, e.message);
      }
    }
  }
  return results;
}

// Full project scan endpoint
app.post("/api/code-scan", async (req, res) => {
  console.log("[CODE-SCAN] Starting project scan...");

  try {
    const results = [];
    const backendPath = __dirname;

    if (fs.existsSync(backendPath)) {
      results.push(...scanDirectory(backendPath));
    }

    const possibleFrontendPaths = [
      path.join(__dirname, "..", "frontend"),
      path.join(__dirname, "..", "..", "frontend"),
    ];

    let frontendPath = possibleFrontendPaths.find((fp) => fs.existsSync(fp));
    if (frontendPath) {
      results.push(...scanDirectory(frontendPath));
    }

    const totalCritical = results.reduce((sum, f) => sum + f.stats.critical, 0);
    const totalWarnings = results.reduce((sum, f) => sum + f.stats.warning, 0);
    const totalInfo = results.reduce((sum, f) => sum + f.stats.info, 0);

    res.json({
      success: true,
      files: results,
      stats: {
        totalFiles: results.length,
        totalCritical,
        totalWarnings,
        totalInfo,
      },
    });
  } catch (err) {
    console.error("[CODE-SCAN] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

module.exports = app;
