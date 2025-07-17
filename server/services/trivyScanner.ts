import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { storage } from "../storage";
import type { InsertVulnerability, InsertSbomComponent } from "@shared/schema";

export class TrivyScanner {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(process.cwd(), "temp");
    this.ensureTempDir();
  }

  private async ensureTempDir() {
    try {
      await fs.access(this.tempDir);
    } catch {
      await fs.mkdir(this.tempDir, { recursive: true });
    }
  }

  async extractZip(zipPath: string, extractPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const unzip = spawn("unzip", ["-q", "-o", zipPath, "-d", extractPath]);
      
      unzip.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Unzip failed with code ${code}`));
        }
      });

      unzip.on("error", reject);
    });
  }

  async scanRepository(scanId: number, zipPath: string): Promise<void> {
    try {
      await storage.updateScanStatus(scanId, "scanning", 10);

      // Extract ZIP file
      const extractPath = path.join(this.tempDir, `scan_${scanId}`);
      await fs.mkdir(extractPath, { recursive: true });
      await this.extractZip(zipPath, extractPath);
      
      await storage.updateScanStatus(scanId, "scanning", 25);

      // Run Trivy scans
      await Promise.all([
        this.runSbomScan(scanId, extractPath),
        this.runVulnerabilityScan(scanId, extractPath),
        this.runSecretScan(scanId, extractPath)
      ]);

      await storage.updateScanStatus(scanId, "scanning", 90);
      await storage.completeScan(scanId);

      // Cleanup
      await this.cleanup(extractPath, zipPath);

    } catch (error) {
      console.error("Scan failed:", error);
      await storage.updateScanStatus(scanId, "failed", 0);
      throw error;
    }
  }

  private async runSbomScan(scanId: number, repoPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const trivy = spawn("trivy", [
        "fs",
        "--format", "json",
        "--list-all-pkgs",
        repoPath
      ]);

      let output = "";
      trivy.stdout.on("data", (data) => {
        output += data.toString();
      });

      trivy.on("close", async (code) => {
        if (code === 0) {
          try {
            await this.processSbomResults(scanId, output);
            resolve();
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error(`Trivy SBOM scan failed with code ${code}`));
        }
      });

      trivy.on("error", reject);
    });
  }

  private async runVulnerabilityScan(scanId: number, repoPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const trivy = spawn("trivy", [
        "fs",
        "--format", "json",
        "--security-checks", "vuln",
        repoPath
      ]);

      let output = "";
      trivy.stdout.on("data", (data) => {
        output += data.toString();
      });

      trivy.on("close", async (code) => {
        if (code === 0) {
          try {
            await this.processVulnerabilityResults(scanId, output, "sca");
            resolve();
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error(`Trivy vulnerability scan failed with code ${code}`));
        }
      });

      trivy.on("error", reject);
    });
  }

  private async runSecretScan(scanId: number, repoPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const trivy = spawn("trivy", [
        "fs",
        "--format", "json",
        "--security-checks", "secret",
        repoPath
      ]);

      let output = "";
      trivy.stdout.on("data", (data) => {
        output += data.toString();
      });

      trivy.on("close", async (code) => {
        if (code === 0) {
          try {
            await this.processSecretResults(scanId, output);
            resolve();
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error(`Trivy secret scan failed with code ${code}`));
        }
      });

      trivy.on("error", reject);
    });
  }

  private async processSbomResults(scanId: number, output: string): Promise<void> {
    if (!output.trim()) return;

    try {
      const results = JSON.parse(output);
      
      if (results.Results) {
        for (const result of results.Results) {
          if (result.Packages) {
            for (const pkg of result.Packages) {
              const component: InsertSbomComponent = {
                scanId,
                name: pkg.Name || pkg.PkgName || "unknown",
                version: pkg.Version || "unknown",
                license: pkg.Licenses?.join(", ") || "unknown",
                type: "direct", // Trivy doesn't distinguish, defaulting
                ecosystem: this.getEcosystem(result.Type),
                riskLevel: "low", // Default, could be enhanced with additional logic
              };

              await storage.createSbomComponent(component);
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to process SBOM results:", error);
    }
  }

  private async processVulnerabilityResults(scanId: number, output: string, type: string): Promise<void> {
    if (!output.trim()) return;

    try {
      const results = JSON.parse(output);
      
      if (results.Results) {
        for (const result of results.Results) {
          if (result.Vulnerabilities) {
            for (const vuln of result.Vulnerabilities) {
              const vulnerability: InsertVulnerability = {
                scanId,
                type,
                severity: vuln.Severity?.toLowerCase() || "low",
                title: vuln.Title || vuln.VulnerabilityID || "Unknown Vulnerability",
                description: vuln.Description,
                component: vuln.PkgName,
                version: vuln.InstalledVersion,
                cve: vuln.VulnerabilityID,
                cvssScore: vuln.CVSS?.nvd?.V3Score?.toString() || vuln.CVSS?.redhat?.V3Score?.toString(),
                filePath: result.Target,
                lineNumber: null,
                cwe: vuln.CweIDs?.join(", "),
                fixAvailable: !!vuln.FixedVersion,
              };

              await storage.createVulnerability(vulnerability);
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to process vulnerability results:", error);
    }
  }

  private async processSecretResults(scanId: number, output: string): Promise<void> {
    if (!output.trim()) return;

    try {
      const results = JSON.parse(output);
      
      if (results.Results) {
        for (const result of results.Results) {
          if (result.Secrets) {
            for (const secret of result.Secrets) {
              const vulnerability: InsertVulnerability = {
                scanId,
                type: "sast",
                severity: "high", // Secrets are generally high severity
                title: `${secret.RuleID}: ${secret.Title}`,
                description: `Secret detected: ${secret.Match}`,
                component: null,
                version: null,
                cve: null,
                cvssScore: null,
                filePath: result.Target,
                lineNumber: secret.StartLine,
                cwe: "CWE-798", // Hardcoded credentials
                fixAvailable: false,
              };

              await storage.createVulnerability(vulnerability);
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to process secret results:", error);
    }
  }

  private getEcosystem(type: string): string {
    const typeMap: { [key: string]: string } = {
      "npm": "npm",
      "yarn": "npm", 
      "pip": "pypi",
      "pipenv": "pypi",
      "poetry": "pypi",
      "maven": "maven",
      "gradle": "maven",
      "go": "go",
      "composer": "packagist",
      "cargo": "crates.io",
      "nuget": "nuget",
      "gem": "rubygems",
    };

    return typeMap[type?.toLowerCase()] || type || "unknown";
  }

  private async cleanup(extractPath: string, zipPath: string): Promise<void> {
    try {
      await fs.rm(extractPath, { recursive: true, force: true });
      await fs.rm(zipPath, { force: true });
    } catch (error) {
      console.error("Cleanup failed:", error);
    }
  }
}
