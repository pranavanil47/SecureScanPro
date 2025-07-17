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

      // Run security scans
      await Promise.all([
        this.runSbomScan(scanId, extractPath),
        this.runVulnerabilityScan(scanId, extractPath),
        this.runSemgrepScan(scanId, extractPath)
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

  private async runSemgrepScan(scanId: number, repoPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const semgrep = spawn("semgrep", [
        "--config=auto",
        "--json",
        "--no-git-ignore",
        "--skip-unknown-extensions",
        repoPath
      ]);

      let output = "";
      let errorOutput = "";
      
      semgrep.stdout.on("data", (data) => {
        output += data.toString();
      });

      semgrep.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });

      semgrep.on("close", async (code) => {
        // Semgrep returns non-zero exit codes when findings are found, so we accept codes 0-2
        if (code === 0 || code === 1 || code === 2) {
          try {
            await this.processSemgrepResults(scanId, output);
            resolve();
          } catch (error) {
            reject(error);
          }
        } else {
          console.error("Semgrep stderr:", errorOutput);
          reject(new Error(`Semgrep scan failed with code ${code}: ${errorOutput}`));
        }
      });

      semgrep.on("error", reject);
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

  private async processSemgrepResults(scanId: number, output: string): Promise<void> {
    if (!output.trim()) return;

    try {
      const results = JSON.parse(output);
      
      if (results.results) {
        for (const finding of results.results) {
          // Extract code snippet by reading the actual file
          const codeSnippet = await this.extractCodeSnippet(
            finding.path, 
            finding.start?.line, 
            finding.end?.line
          );
          
          const vulnerability: InsertVulnerability = {
            scanId,
            type: "sast",
            severity: this.mapSemgrepSeverity(finding.extra?.severity),
            title: finding.extra?.message || finding.check_id || "SAST Finding",
            description: finding.extra?.shortlink ? 
              `${finding.extra.message}\n\nMore info: ${finding.extra.shortlink}` : 
              finding.extra?.message || "Static analysis security finding",
            component: null,
            version: null,
            cve: finding.extra?.references?.find((ref: string) => ref.includes('CVE')) || null,
            cvssScore: null,
            filePath: finding.path,
            lineNumber: finding.start?.line || null,
            endLineNumber: finding.end?.line || null,
            cwe: finding.extra?.cwe?.join(", ") || null,
            fixAvailable: false,
            codeSnippet: codeSnippet,
          };

          await storage.createVulnerability(vulnerability);
        }
      }
    } catch (error) {
      console.error("Failed to process Semgrep results:", error);
    }
  }

  private async extractCodeSnippet(filePath: string, startLine?: number, endLine?: number): Promise<string | null> {
    if (!startLine || !this.extractPath) return null;

    try {
      // Convert absolute path to relative from scan directory
      const relativePath = filePath.startsWith('/') ? 
        path.basename(filePath) : filePath;
      
      const fullPath = path.join(this.extractPath, relativePath);
      console.log(`Extracting code from: ${fullPath} (lines ${startLine}-${endLine || startLine})`);
      
      const content = await fs.readFile(fullPath, 'utf-8');
      const lines = content.split('\n');
      
      const start = Math.max(0, (startLine - 1) - 2); // Include 2 lines before
      const end = Math.min(lines.length, (endLine || startLine) + 2); // Include 2 lines after
      
      const snippet = lines.slice(start, end)
        .map((line, index) => {
          const lineNum = start + index + 1;
          const isVulnerable = lineNum >= startLine && lineNum <= (endLine || startLine);
          const prefix = isVulnerable ? '▶ ' : '  ';
          return `${prefix}${lineNum.toString().padStart(3)}: ${line}`;
        })
        .join('\n');

      return snippet;
    } catch (error) {
      console.error("Failed to extract code snippet:", error);
      return null;
    }
  }

  private mapSemgrepSeverity(severity: string): string {
    if (!severity) return "medium";
    
    switch (severity.toLowerCase()) {
      case "error":
        return "high";
      case "warning":
        return "medium";
      case "info":
        return "low";
      default:
        return "medium";
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
