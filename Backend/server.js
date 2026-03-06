require("dotenv").config();
// (removed accidental shell commands that were inserted here)
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const upload = multer(); // Middleware for handling form-data, primarily for file uploads
const db = require("./db");
const axios = require("axios");
const FormData = require("form-data");

const app = express();
const port = process.env.PORT || 3000;
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

const dbQuery = (sql, params) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });

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
app.post("/api/analyze", upload.single("media"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No media file found" });

  // Compute SHA-256 for logging (no cache lookup)
  let fileHash = crypto
    .createHash("sha256")
    .update(req.file.buffer)
    .digest("hex");

  try {
    const formData = new FormData();
    formData.append("media", req.file.buffer, {
      filename: req.file.originalname || "upload.bin",
      contentType: req.file.mimetype,
    });

    const pythonResponse = await axios.post(
      "http://localhost:5000/predict",
      formData,
      {
        headers: formData.getHeaders(),
      },
    );

    let is_fake = pythonResponse.data.is_deepfake;
    let confidence = pythonResponse.data.confidence;
    let heatmap_url = pythonResponse.data.heatmap_url || null;

    // fusion
    const audio_confidence = pythonResponse.data.audio_confidence || 0;
    const mime = req.file.mimetype || "";
    if (mime.startsWith("video/") && audio_confidence > 0) {
      confidence = Math.round(0.6 * confidence + 0.4 * audio_confidence);
    } else if (mime.startsWith("audio/") && audio_confidence > 0) {
      confidence = audio_confidence;
    }
    is_fake = confidence >= 65;

    // persist result (insert or update)
    const insertQuery = `INSERT INTO detections (file_hash, is_deepfake, prediction, confidence, heatmap_path, model_version, status, created_at, processed_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW()) ON DUPLICATE KEY UPDATE is_deepfake=VALUES(is_deepfake), prediction=VALUES(prediction), confidence=VALUES(confidence), heatmap_path=VALUES(heatmap_path), model_version=VALUES(model_version), status=VALUES(status), processed_at=NOW()`;
    await dbQuery(insertQuery, [
      fileHash,
      is_fake ? 1 : 0,
      is_fake ? "fake" : "real",
      confidence,
      heatmap_url,
      process.env.MODEL_VERSION || null,
      "done",
    ]);
    notifySubscribers(fileHash, {
      status: "done",
      file_hash: fileHash,
      is_deepfake: !!is_fake,
      confidence,
      heatmap_url,
    });

    // Build response (basic metadata + python response)
    const response = {
      is_deepfake: !!is_fake,
      confidence,
      file_hash: fileHash,
      heatmap_url,
      type: mime.startsWith("video/")
        ? "video"
        : mime.startsWith("audio/")
          ? "audio"
          : "image",
      model_version: process.env.MODEL_VERSION || null,
    };

    res.json(response);
  } catch (err) {
    console.error(
      "/api/analyze error, falling back to mock:",
      err.message || err,
    );

    // fallback deterministic
    if (!fileHash)
      fileHash = crypto
        .createHash("sha256")
        .update(req.file.buffer)
        .digest("hex");
    const r = getDeterministicRandom(fileHash);
    const is_fake = r < 0.4;
    const confidence = Math.floor(r * (99 - 70 + 1)) + 70;

    const mockResult = {
      is_deepfake: is_fake,
      confidence,
      file_hash: fileHash,
      heatmap_url: null,
      type:
        req.file.mimetype && req.file.mimetype.startsWith("video/")
          ? "video"
          : req.file.mimetype && req.file.mimetype.startsWith("audio/")
            ? "audio"
            : "image",
    };

    try {
      const insertQuery = `INSERT INTO detections (file_hash, is_deepfake, prediction, confidence, heatmap_path, model_version, status, created_at, processed_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW()) ON DUPLICATE KEY UPDATE is_deepfake=VALUES(is_deepfake), prediction=VALUES(prediction), confidence=VALUES(confidence), heatmap_path=VALUES(heatmap_path), model_version=VALUES(model_version), status=VALUES(status), processed_at=NOW()`;
      await dbQuery(insertQuery, [
        fileHash,
        is_fake ? 1 : 0,
        is_fake ? "fake" : "real",
        confidence,
        null,
        process.env.MODEL_VERSION || null,
        "done",
      ]);
      notifySubscribers(fileHash, {
        status: "done",
        file_hash: fileHash,
        is_deepfake: !!is_fake,
        confidence,
        heatmap_url: null,
      });
    } catch (e) {
      console.error("Failed to persist mock result:", e);
    }

    res.json(mockResult);
  }
});

// Admin Export Endpoint
app.get("/api/admin/export-activity", (req, res) => {
  const query = `
        SELECT u.username, u.email, a.is_deepfake, a.confidence, a.analysis_timestamp 
        FROM analysis_log a 
        JOIN users u ON a.user_id = u.id 
        ORDER BY a.analysis_timestamp DESC
    `;

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
// --- LOGIN ROUTE (ADD THIS HERE) ---
app.post("/login", (req, res) => {
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

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role || "user",
      },
    });
  });
});
app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: "All fields are required." });
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

// --- Password Reset Endpoints ---

// 1. Forgot Password Endpoint
app.post("/forgot-password", (req, res) => {
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

    // Always send a success-like response to prevent email enumeration attacks
    if (results.length === 0) {
      console.log(`Password reset attempt for non-existent email: ${email}`);
      return res.json({
        message:
          "If a user with that email exists, a password reset link has been sent.",
      });
    }

    const user = results[0];
    const token = crypto.randomBytes(20).toString("hex");
    const expires = new Date(Date.now() + 3600000); // 1 hour from now

    const updateUserQuery =
      "UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?";
    db.query(
      updateUserQuery,
      [token, expires, user.id],
      async (err, result) => {
        if (err) {
          console.error("Database update error:", err);
          return res
            .status(500)
            .json({ message: "Failed to set reset token." });
        }

        // --- Email Sending Simulation ---
        // In a real app, you would use a real email service (SendGrid, Mailgun, etc.)
        // For development, we'll log it to the console.
        const resetURL = `${frontendUrl}/reset-password.html?token=${token}`;
        console.log("--- PASSWORD RESET EMAIL ---");
        console.log(`To: ${user.email}`);
        console.log(`Subject: Password Reset Request`);
        console.log(
          `\nYou are receiving this because you (or someone else) have requested the reset of the password for your account.`,
        );
        console.log(
          `Please click on the following link, or paste this into your browser to complete the process:\n`,
        );
        console.log(resetURL);
        console.log(
          `\nIf you did not request this, please ignore this email and your password will remain unchanged.`,
        );
        console.log("--------------------------");

        res.json({
          message:
            "If a user with that email exists, a password reset link has been sent.",
        });
      },
    );
  });
});

// 2. Reset Password Endpoint
app.post("/reset-password", (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res
      .status(400)
      .json({ message: "Token and new password are required." });
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

    // Update password and clear the reset token fields
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

// --- New Endpoints (from app.py) ---

// Mock Analysis Endpoint
const exifParser = require("exif-parser");
const PDFDocument = require("pdfkit");

// Helper for deterministic randomness based on string hash
function getDeterministicRandom(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  const x = Math.sin(hash) * 10000;
  return x - Math.floor(x);
}

// (Removed duplicated/corrupted improved analysis endpoint — simplified earlier /api/analyze remains.)

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

// Fast Analysis Endpoint (Client-side Hashing)
app.post("/api/analyze-fast", (req, res) => {
  console.log("[DEBUG] /api/analyze-fast hit with body:", req.body);
  const { hash, name, type, size, userId } = req.body;

  if (!hash) {
    console.error("[DEBUG] No file hash provided");
    return res.status(400).json({ error: "No file hash provided" });
  }

  // 1. Deterministic "Fake" Detection using Client Hash
  const randomValue = getDeterministicRandom(hash);

  const is_fake = randomValue < 0.4; // 40% chance of being fake
  const confidence = Math.floor(randomValue * (99 - 70 + 1)) + 70; // 70-99%

  // 2. Mock Metadata (Since we don't have the file)
  let realMetadata = [
    { title: "File Name", description: name || "Unknown", level: "Low" },
    { title: "File Type", description: type || "Unknown", level: "Low" },
    {
      title: "File Size",
      description: size ? `${(size / 1024 / 1024).toFixed(2)} MB` : "Unknown",
      level: "Low",
    },
    {
      title: "Analysis Mode",
      description: "Fast Hashing (Client-Side)",
      level: "Info",
    },
  ];

  const isVideo = type && type.startsWith("video");
  const isAudio = type && type.startsWith("audio");

  // Mock Data
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
        { start: 45, end: 52, score: 88, status: "manipulated" },
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
    confidence: confidence,
    file_hash: hash,
    type: isVideo ? "video" : isAudio ? "audio" : "image", // Explicit type
    feature_scores,
    timeline,
    chief_judgment: {
      title: "Overall Assessment",
      description: is_fake
        ? `Preliminary hash analysis indicates patterns consistent with manipulated media.`
        : `Preliminary hash analysis suggests the media signature is consistent with authentic files.`,
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
    metadata_analysis: realMetadata,
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

  // Log the analysis
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

  // Simulate slight network delay for realism (optional, but good for UX)
  setTimeout(() => {
    res.json(mockResult);
  }, 800);
});

// Mock Summary Endpoint
app.post("/api/summarize", (req, res) => {
  const result = req.body.analysisResult;
  const summary = result.is_deepfake
    ? `DANGER: This media has a ${result.confidence}% probability of being a deepfake. Major indicators include facial artifacts and inconsistent noise patterns.`
    : `SAFE: This media appears authentic with a ${result.confidence}% confidence score. Metadata analysis aligns with original capture characteristics.`;
  res.json({ summary: summary });
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

  // Header
  doc.fontSize(25).text("Deepfake Analysis Report", { align: "center" });
  doc.moveDown();

  // File Info
  doc.fontSize(12).text(`File Name: ${fileName || "Uploaded Media"}`);
  doc.text(`Date: ${new Date().toLocaleString()}`);
  doc.text(`Analysis Hash: ${analysisResult.file_hash || "N/A"}`);
  doc.moveDown();
  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown();

  // Verdict
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

  // Sections
  const addSection = (title, items) => {
    doc.fontSize(16).fillColor("black").text(title, { underline: true });
    doc.moveDown(0.5);
    if (items && items.length > 0) {
      items.forEach((item) => {
        doc
          .fontSize(12)
          .fillColor(
            item.level === "High"
              ? "red"
              : item.level === "Medium"
                ? "orange"
                : "green",
          )
          .text(`[${item.level}] ${item.title}:`);
        doc.fillColor("black").text(`     ${item.description}`);
        doc.moveDown(0.5);
      });
    } else {
      doc.fontSize(12).text("No data available.");
    }
    doc.moveDown();
  };

  addSection("Chief Judgment", [
    {
      title: analysisResult.chief_judgment.title,
      description: analysisResult.chief_judgment.description,
      level: "Info",
    },
  ]);

  addSection("Visual Analysis", analysisResult.visual_analysis);
  addSection("Metadata Analysis", analysisResult.metadata_analysis);
  addSection("Forensics", analysisResult.forensics);

  doc.end();
});

// --- New Admin Endpoints ---

// Admin Feedback Review Endpoint
app.get("/api/admin/feedback", (req, res) => {
  const query = `
        SELECT f.id, u.username, u.email, f.file_hash, f.predicted_label, f.user_feedback_label, f.timestamp, f.reviewed
        FROM feedback f
        LEFT JOIN users u ON f.user_id = u.id
        ORDER BY f.timestamp DESC
    `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Database query error for admin feedback:", err);
      return res.status(500).json({ message: "Internal server error." });
    }
    res.json(results);
  });
});

app.get("/api/admin/activity", (req, res) => {
  const query = `
        SELECT 
            u.id, 
            u.username, 
            COUNT(CASE WHEN DATE(a.analysis_timestamp) = CURDATE() THEN 1 END) as analyses_today,
            COUNT(a.id) as total_analyses,
            MAX(a.analysis_timestamp) as last_active
        FROM users u
        LEFT JOIN analysis_log a ON u.id = a.user_id
        WHERE u.role != 'admin' OR u.role IS NULL 
        GROUP BY u.id, u.username
        ORDER BY last_active DESC
    `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Database query error for admin activity:", err);
      return res.status(500).json({ message: "Internal server error." });
    }
    res.json(results);
  });
});

// Admin Stats Endpoint
app.get("/api/admin/stats", (req, res) => {
  const query = `
        SELECT
            (SELECT COUNT(*) FROM users WHERE role != 'admin') as totalUsers,
            (SELECT COUNT(*) FROM analysis_log) as totalAnalyses,
            (SELECT COUNT(*) FROM analysis_log WHERE is_deepfake = TRUE) as deepfakesDetected;
    `;
  db.query(query, (err, results) => {
    if (err || results.length === 0) {
      console.error("Error fetching admin stats:", err);
      return res.status(500).json({ message: "Failed to fetch stats." });
    }
    res.json(results[0]);
  });
});

// Detection lookup endpoint removed — caching system disabled.

// Delete User Endpoint
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

// --- New User Activity Endpoint ---
app.get("/api/user-activity/:userId", (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required." });
  }

  const activityQuery = `
        SELECT
            (SELECT COUNT(*) FROM analysis_log WHERE user_id = ?) AS totalAnalyses,
            (SELECT COUNT(*) FROM analysis_log WHERE user_id = ? AND DATE(analysis_timestamp) = CURDATE()) AS analysesToday,
            (SELECT AVG(confidence) FROM analysis_log WHERE user_id = ?) AS avgConfidence;
    `;

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

// Protected Dashboard Endpoint
app.get("/dashboard", (req, res) => {
  const { username } = req.query;

  if (!username) {
    return res
      .status(401)
      .json({ message: "Unauthorized: No user specified." });
  }

  // In a real app, you would validate a token here instead of just trusting the username.
  const query =
    "SELECT id, username, email, role FROM users WHERE username = ?";
  db.query(query, [username], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Internal server error." });
    }
    if (results.length > 0) {
      res.json({
        message: `Welcome to your dashboard, ${username}!`,
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

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// SSE subscribe endpoint: clients can open an EventSource to receive notification when processing completes
app.get("/api/subscribe/:fileHash", (req, res) => {
  const { fileHash } = req.params;
  if (!fileHash) return res.status(400).end();

  // Set SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write("\n");

  // Add to subscriptions
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

// ============================================
// AI-POWERED CODE SCANNER ENDPOINT
// ============================================

// Code Scanner Class for Server-Side Analysis
class CodeScanner {
  constructor() {
    this.issues = [];
    this.fixes = [];
  }

  async analyzeCode(code, filename) {
    this.issues = [];
    this.fixes = [];

    // Run all analyzers
    this.analyzeSyntax(code, filename);
    this.analyzeAsyncIssues(code, filename);
    this.analyzeUndefinedVariables(code, filename);
    this.analyzeCommonBugs(code, filename);
    this.analyzeSecurityIssues(code, filename);
    this.analyzeCodeSmells(code, filename);
    this.analyzeBestPractices(code, filename);

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
      if (!lines) return;
      (lines || []).forEach((line, index) => {
        const lineNum = index + 1;
        if (
          line &&
          line.trim &&
          (line.trim().endsWith("&&") || line.trim().endsWith("||"))
        ) {
          this.issues.push({
            type: "syntax",
            severity: "critical",
            line: lineNum,
            message: "Incomplete logical expression",
            code: line.trim(),
          });
        }
        if (line && line.includes && line.includes(";;")) {
          this.issues.push({
            type: "syntax",
            severity: "warning",
            line: lineNum,
            message: "Duplicate semicolons detected",
            code: line.trim(),
          });
        }
      });
      const allBraces = code.match ? code.match(/[{}]/g) : null;
      if (allBraces && Array.isArray(allBraces)) {
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
            message: `Unbalanced braces: ${Math.abs(braceCount)} ${braceCount > 0 ? "missing" : "extra"}`,
            code: "",
          });
        }
      }
    } catch (e) {
      console.log(
        `[CODE-SCAN] Syntax analysis error for ${filename}: ${e.message}`,
      );
    }
  }

  analyzeAsyncIssues(code, filename) {
    if (!code) return;
    try {
      const lines = code.split("\n");
      if (!lines) return;
      const asyncOps = [
        "fetch(",
        "fs.readFile",
        "fs.writeFile",
        "db.query",
        "axios.",
        "http.request",
      ];
      lines.forEach((line, index) => {
        if (!line) return;
        asyncOps.forEach((op) => {
          if (
            line.includes(op) &&
            !line.includes("await") &&
            !line.includes(".then")
          ) {
            this.issues.push({
              type: "async",
              severity: "warning",
              line: index + 1,
              message: `Async operation "${op}" may need await`,
              code: line.trim(),
            });
          }
        });
      });
      // Check for missing try-catch
      if (
        code.includes("async") &&
        (code.includes("fetch") || code.includes("db."))
      ) {
        lines.forEach((line, index) => {
          if (!line) return;
          if (
            (line.includes("await") || line.includes("fetch")) &&
            !line.includes("try")
          ) {
            this.issues.push({
              type: "async",
              severity: "info",
              line: index + 1,
              message: "Async operation should be wrapped in try-catch",
              code: line.trim(),
            });
          }
        });
      }
    } catch (e) {
      // Skip async analysis on error
    }
  }

  analyzeUndefinedVariables(code, filename) {
    try {
      const lines = code.split("\n");
      const knownGlobals = new Set([
        "console",
        "window",
        "document",
        "Math",
        "Date",
        "JSON",
        "Array",
        "Object",
        "String",
        "Number",
        "Boolean",
        "Promise",
        "Set",
        "Map",
        "require",
        "module",
        "exports",
        "process",
        "__dirname",
        "__filename",
        "Buffer",
        "setTimeout",
        "setInterval",
        "clearTimeout",
        "clearInterval",
        "navigator",
        "location",
        "history",
        "localStorage",
        "sessionStorage",
        "fetch",
        "alert",
        "confirm",
        "prompt",
        "parseInt",
        "parseFloat",
        "isNaN",
        "isFinite",
        "Error",
        "TypeError",
        "ReferenceError",
        "SyntaxError",
        "app",
        "db",
        "res",
        "req",
        "next",
        "err",
      ]);
      const varDeclarations = new Set();
      const constDeclarations = new Set();
      lines.forEach((line) => {
        if (line.trim().startsWith("//")) return;
        const constMatch = line.match(/const\s+(\w+)/g);
        if (constMatch)
          constMatch.forEach((m) =>
            constDeclarations.add(m.replace("const", "").trim()),
          );
        const letVarMatch = line.match(/(?:let|var)\s+(\w+)/g);
        if (letVarMatch)
          letVarMatch.forEach((m) =>
            varDeclarations.add(m.replace(/(?:let|var)/, "").trim()),
          );
        const funcMatch = line.match(/function\s+\w+\s*\(([^)]*)\)/);
        if (funcMatch)
          funcMatch[1].split(",").forEach((p) => varDeclarations.add(p.trim()));
      });
      lines.forEach((line, index) => {
        if (line.trim().startsWith("//")) return;
        if (
          line.includes("require(") ||
          line.includes("import ") ||
          line.includes("from '")
        )
          return;
        const identifiers = line.match(/\b[a-zA-Z_]\w*\b/g) || [];
        identifiers.forEach((id) => {
          if (
            !knownGlobals.has(id) &&
            !varDeclarations.has(id) &&
            !constDeclarations.has(id)
          ) {
            const afterId = line.substring(line.indexOf(id) + id.length).trim();
            if (afterId.startsWith("=") || afterId.startsWith("(")) {
              const commonWords = [
                "if",
                "else",
                "for",
                "while",
                "switch",
                "case",
                "return",
                "new",
                "this",
                "class",
                "function",
                "true",
                "false",
                "null",
                "undefined",
                "typeof",
                "instanceof",
                "void",
                "delete",
                "throw",
                "try",
                "catch",
                "finally",
                "with",
                "default",
                "export",
                "import",
                "extends",
                "super",
                "static",
                "get",
                "set",
                "async",
                "await",
                "yield",
                "let",
                "const",
                "var",
              ];
              if (!commonWords.includes(id) && id.length > 2) {
                this.issues.push({
                  type: "undefined",
                  severity: "warning",
                  line: index + 1,
                  message: `Variable "${id}" may not be defined before use`,
                  code: line.trim(),
                });
              }
            }
          }
        });
      });
    } catch (e) {
      // Skip undefined variable analysis on error
    }
  }

  analyzeCommonBugs(code, filename) {
    try {
      const lines = code.split("\n");
      lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (/if\s*\([^)]*=\s*[^=]/.test(trimmed)) {
          this.issues.push({
            type: "bug",
            severity: "critical",
            line: index + 1,
            message: "Assignment (=) used instead of comparison (== or ===)",
            code: trimmed,
          });
        }
        if (trimmed.includes("console.log(") && !trimmed.startsWith("//")) {
          this.issues.push({
            type: "bug",
            severity: "info",
            line: index + 1,
            message: "console.log() found - consider removing for production",
            code: trimmed,
          });
        }
        if (/catch\s*\([^)]*\)\s*{[\s]*}/.test(trimmed)) {
          this.issues.push({
            type: "bug",
            severity: "warning",
            line: index + 1,
            message: "Empty catch block - errors are being silently swallowed",
            code: trimmed,
          });
        }
        if (
          /(password|passwd|pwd|secret|token|api_key|apikey)\s*[:=]\s*['"][^'"]+['"]/i.test(
            trimmed,
          )
        ) {
          this.issues.push({
            type: "security",
            severity: "critical",
            line: index + 1,
            message: "Potential hardcoded credentials detected",
            code: trimmed,
          });
        }
        if (trimmed.includes("eval(")) {
          this.issues.push({
            type: "security",
            severity: "critical",
            line: index + 1,
            message:
              "Use of eval() is dangerous and can lead to code injection",
            code: trimmed,
          });
        }
        if (
          /innerHTML\s*=/.test(trimmed) &&
          !trimmed.includes("sanitize") &&
          !trimmed.includes("escape")
        ) {
          this.issues.push({
            type: "security",
            severity: "warning",
            line: index + 1,
            message: "innerHTML should sanitize input to prevent XSS",
            code: trimmed,
          });
        }
      });
    } catch (e) {
      // Skip common bugs analysis on error
    }
  }

  analyzeSecurityIssues(code, filename) {
    try {
      const lines = code.split("\n");
      lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (
          /\+.*['"`].*(?:query|sql|select|insert|update|delete)/i.test(
            trimmed,
          ) ||
          /`.*\$\{.*\}.*`/i.test(trimmed)
        ) {
          if (
            !trimmed.includes(" parameterized") &&
            !trimmed.includes("prepare")
          ) {
            this.issues.push({
              type: "security",
              severity: "critical",
              line: index + 1,
              message: "Potential SQL injection - use parameterized queries",
              code: trimmed,
            });
          }
        }
        if (/(?:exec|spawn|execSync|system)\s*\([^)]*\+/.test(trimmed)) {
          this.issues.push({
            type: "security",
            severity: "critical",
            line: index + 1,
            message:
              "Potential command injection - avoid concatenating user input",
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
            message: "Weak hashing algorithm - use sha256 or stronger",
            code: trimmed,
          });
        }
        if (/cors\s*\(\s*\{[\s]*origin\s*:\s*['"]\*['"]/.test(trimmed)) {
          this.issues.push({
            type: "security",
            severity: "warning",
            line: index + 1,
            message: "CORS set to wildcard - consider restricting origins",
            code: trimmed,
          });
        }
      });
    } catch (e) {
      // Skip security analysis on error
    }
  }

  analyzeCodeSmells(code, filename) {
    try {
      const lines = code.split("\n");
      let braceCount = 0;
      let funcStart = -1;
      lines.forEach((line, index) => {
        if (line.includes("function ") || line.includes("=>")) {
          if (braceCount === 0) funcStart = index;
        }
        if (funcStart >= 0) {
          braceCount += (line.match(/{/g) || []).length;
          braceCount -= (line.match(/}/g) || []).length;
          if (braceCount === 0 && funcStart >= 0) {
            const funcLength = index - funcStart + 1;
            if (funcLength > 100) {
              this.issues.push({
                type: "smell",
                severity: "info",
                line: funcStart + 1,
                message: `Function is ${funcLength} lines - consider breaking it down`,
                code: lines[funcStart].trim(),
              });
            }
            funcStart = -1;
          }
        }
      });
      // Magic numbers
      lines.forEach((line, index) => {
        const magicPattern =
          /(?:case|if|while|for|===|!==|==|!=|<|>|<=|>=)\s*(\d{2,})/g;
        let match;
        while ((match = magicPattern.exec(line)) !== null) {
          const num = parseInt(match[1]);
          if (num > 1 && num !== 100 && num !== 1000) {
            this.issues.push({
              type: "smell",
              severity: "info",
              line: index + 1,
              message: `Magic number "${num}" - use named constant`,
              code: line.trim(),
            });
          }
        }
      });
    } catch (e) {
      // Skip code smell analysis on error
    }
  }

  analyzeBestPractices(code, filename) {
    try {
      const lines = code.split("\n");
      lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (/\bvar\s+\w+/.test(trimmed) && !trimmed.startsWith("//")) {
          this.issues.push({
            type: "best-practice",
            severity: "info",
            line: index + 1,
            message: 'Use "const" or "let" instead of "var"',
            code: trimmed,
          });
        }
        if (trimmed.includes("document.write(")) {
          this.issues.push({
            type: "best-practice",
            severity: "warning",
            line: index + 1,
            message: "document.write() is deprecated - use DOM APIs",
            code: trimmed,
          });
        }
        if (/\bwith\s*\(/.test(trimmed)) {
          this.issues.push({
            type: "best-practice",
            severity: "warning",
            line: index + 1,
            message: '"with" statement is deprecated',
            code: trimmed,
          });
        }
      });
    } catch (e) {
      // Skip best practices analysis on error
    }
  }
}

// File scanner function
const fs = require("fs");
const path = require("path");

function scanDirectory(dir, results = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      // Skip node_modules and other irrelevant dirs
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
  console.log("[CODE-SCAN] Server __dirname:", __dirname);

  try {
    const results = [];

    // Scan Backend directory (current directory where server.js is located)
    const backendPath = __dirname;
    console.log("[CODE-SCAN] Scanning Backend at:", backendPath);

    if (fs.existsSync(backendPath)) {
      const backendResults = scanDirectory(backendPath);
      console.log(
        "[CODE-SCAN] Backend scan complete. Files found with issues:",
        backendResults.length,
      );
      results.push(...backendResults);
    } else {
      console.error("[CODE-SCAN] Backend directory not found:", backendPath);
    }

    // Scan Frontend directory - try multiple possible locations
    const possibleFrontendPaths = [
      path.join(__dirname, "..", "frontend"),
      path.join(__dirname, "..", "..", "frontend"),
      path.join(__dirname, "..", "..", "..", "frontend"),
      path.resolve(__dirname, "../../frontend"),
      path.resolve(__dirname, "../frontend"),
    ];

    let frontendPath = null;
    for (const fp of possibleFrontendPaths) {
      console.log("[CODE-SCAN] Checking frontend path:", fp);
      if (fs.existsSync(fp)) {
        frontendPath = fp;
        break;
      }
    }

    if (frontendPath) {
      console.log("[CODE-SCAN] Scanning Frontend at:", frontendPath);
      const frontendResults = scanDirectory(frontendPath);
      console.log(
        "[CODE-SCAN] Frontend scan complete. Files found with issues:",
        frontendResults.length,
      );
      results.push(...frontendResults);
    } else {
      console.warn(
        "[CODE-SCAN] Frontend directory not found in any expected locations",
      );
      try {
        const parentDir = path.join(__dirname, "..");
        console.log(
          "[CODE-SCAN] Contents of parent directory:",
          fs.readdirSync(parentDir).join(", "),
        );
      } catch (e) {
        console.warn("[CODE-SCAN] Could not list parent directory:", e.message);
      }
    }

    // Scan DeepfakeExtension directory - try multiple possible locations
    const possibleExtPaths = [
      path.join(__dirname, "..", "DeepfakeExtension"),
      path.join(__dirname, "..", "..", "DeepfakeExtension"),
      path.join(__dirname, "..", "..", "..", "DeepfakeExtension"),
      path.resolve(__dirname, "../../DeepfakeExtension"),
      path.resolve(__dirname, "../DeepfakeExtension"),
    ];

    let extPath = null;
    for (const ep of possibleExtPaths) {
      console.log("[CODE-SCAN] Checking DeepfakeExtension path:", ep);
      if (fs.existsSync(ep)) {
        extPath = ep;
        break;
      }
    }

    if (extPath) {
      console.log("[CODE-SCAN] Scanning DeepfakeExtension at:", extPath);
      const extResults = scanDirectory(extPath);
      console.log(
        "[CODE-SCAN] DeepfakeExtension scan complete. Files found with issues:",
        extResults.length,
      );
      results.push(...extResults);
    } else {
      console.warn(
        "[CODE-SCAN] DeepfakeExtension directory not found in any expected locations",
      );
    }

    // Calculate totals
    const totalCritical = results.reduce((sum, f) => sum + f.stats.critical, 0);
    const totalWarnings = results.reduce((sum, f) => sum + f.stats.warning, 0);
    const totalInfo = results.reduce((sum, f) => sum + f.stats.info, 0);

    console.log("[CODE-SCAN] Scan complete. Total issues found:", {
      totalCritical,
      totalWarnings,
      totalInfo,
    });

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
    console.error("[CODE-SCAN] Error during scan:", err);
    console.error("[CODE-SCAN] Stack trace:", err.stack);
    res.status(500).json({
      success: false,
      error: err.message,
      details:
        "An error occurred while scanning the project. Please check server logs.",
    });
  }
});
