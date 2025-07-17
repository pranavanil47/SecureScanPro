import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import { promises as fs } from "fs";
import { storage } from "./storage";
import { TrivyScanner } from "./services/trivyScanner";
import { insertScanSchema } from "@shared/schema";

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

const upload = multer({
  dest: path.join(process.cwd(), "uploads"),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype === "application/zip" || file.originalname.endsWith(".zip")) {
      cb(null, true);
    } else {
      cb(new Error("Only ZIP files are allowed"));
    }
  },
});

const trivyScanner = new TrivyScanner();

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Upload and start scan
  app.post("/api/scans/upload", upload.single("repository"), async (req: MulterRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const scanData = insertScanSchema.parse({
        filename: req.file.originalname,
        status: "uploading",
        progress: 0,
      });

      const scan = await storage.createScan(scanData);

      // Start scanning asynchronously
      trivyScanner.scanRepository(scan.id, req.file.path).catch(error => {
        console.error(`Scan ${scan.id} failed:`, error);
      });

      res.json({ scanId: scan.id });
    } catch (error) {
      console.error("Upload failed:", error);
      res.status(500).json({ message: "Upload failed" });
    }
  });

  // Get scan status
  app.get("/api/scans/:id/status", async (req, res) => {
    try {
      const scanId = parseInt(req.params.id);
      const scan = await storage.getScan(scanId);

      if (!scan) {
        return res.status(404).json({ message: "Scan not found" });
      }

      res.json({
        id: scan.id,
        status: scan.status,
        progress: scan.progress,
        filename: scan.filename,
      });
    } catch (error) {
      console.error("Failed to get scan status:", error);
      res.status(500).json({ message: "Failed to get scan status" });
    }
  });

  // Get scan results
  app.get("/api/scans/:id/results", async (req, res) => {
    try {
      const scanId = parseInt(req.params.id);
      const results = await storage.getScanResults(scanId);

      if (!results) {
        return res.status(404).json({ message: "Scan results not found" });
      }

      if (results.scan.status !== "completed") {
        return res.status(400).json({ message: "Scan not completed yet" });
      }

      res.json(results);
    } catch (error) {
      console.error("Failed to get scan results:", error);
      res.status(500).json({ message: "Failed to get scan results" });
    }
  });

  // Export scan results
  app.get("/api/scans/:id/export", async (req, res) => {
    try {
      const scanId = parseInt(req.params.id);
      const results = await storage.getScanResults(scanId);

      if (!results) {
        return res.status(404).json({ message: "Scan results not found" });
      }

      const report = {
        scan: results.scan,
        summary: results.summary,
        vulnerabilities: results.vulnerabilities,
        sbomComponents: results.sbomComponents,
        generatedAt: new Date().toISOString(),
      };

      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="scan_${scanId}_report.json"`);
      res.json(report);
    } catch (error) {
      console.error("Failed to export scan results:", error);
      res.status(500).json({ message: "Failed to export scan results" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
