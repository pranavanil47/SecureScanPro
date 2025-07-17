import { 
  scans, 
  vulnerabilities, 
  sbomComponents,
  type Scan, 
  type InsertScan,
  type Vulnerability,
  type InsertVulnerability,
  type SbomComponent,
  type InsertSbomComponent,
  type ScanResults,
  type ScanSummary
} from "@shared/schema";

export interface IStorage {
  // Scan operations
  createScan(scan: InsertScan): Promise<Scan>;
  getScan(id: number): Promise<Scan | undefined>;
  updateScanStatus(id: number, status: string, progress?: number): Promise<void>;
  completeScan(id: number): Promise<void>;
  
  // Vulnerability operations
  createVulnerability(vulnerability: InsertVulnerability): Promise<Vulnerability>;
  getVulnerabilitiesByScan(scanId: number): Promise<Vulnerability[]>;
  
  // SBOM operations
  createSbomComponent(component: InsertSbomComponent): Promise<SbomComponent>;
  getSbomComponentsByScan(scanId: number): Promise<SbomComponent[]>;
  
  // Combined results
  getScanResults(scanId: number): Promise<ScanResults | undefined>;
}

export class MemStorage implements IStorage {
  private scans: Map<number, Scan>;
  private vulnerabilities: Map<number, Vulnerability>;
  private sbomComponents: Map<number, SbomComponent>;
  private currentScanId: number;
  private currentVulnId: number;
  private currentSbomId: number;

  constructor() {
    this.scans = new Map();
    this.vulnerabilities = new Map();
    this.sbomComponents = new Map();
    this.currentScanId = 1;
    this.currentVulnId = 1;
    this.currentSbomId = 1;
  }

  async createScan(insertScan: InsertScan): Promise<Scan> {
    const id = this.currentScanId++;
    const scan: Scan = { 
      id, 
      filename: insertScan.filename,
      status: insertScan.status || "uploading",
      progress: insertScan.progress || 0,
      createdAt: new Date(),
      completedAt: null
    };
    this.scans.set(id, scan);
    return scan;
  }

  async getScan(id: number): Promise<Scan | undefined> {
    return this.scans.get(id);
  }

  async updateScanStatus(id: number, status: string, progress?: number): Promise<void> {
    const scan = this.scans.get(id);
    if (scan) {
      scan.status = status;
      if (progress !== undefined) {
        scan.progress = progress;
      }
      this.scans.set(id, scan);
    }
  }

  async completeScan(id: number): Promise<void> {
    const scan = this.scans.get(id);
    if (scan) {
      scan.status = "completed";
      scan.progress = 100;
      scan.completedAt = new Date();
      this.scans.set(id, scan);
    }
  }

  async createVulnerability(insertVuln: InsertVulnerability): Promise<Vulnerability> {
    const id = this.currentVulnId++;
    const vulnerability: Vulnerability = { 
      id,
      scanId: insertVuln.scanId,
      type: insertVuln.type,
      severity: insertVuln.severity,
      title: insertVuln.title,
      description: insertVuln.description || null,
      component: insertVuln.component || null,
      version: insertVuln.version || null,
      cve: insertVuln.cve || null,
      cvssScore: insertVuln.cvssScore || null,
      filePath: insertVuln.filePath || null,
      lineNumber: insertVuln.lineNumber || null,
      endLineNumber: insertVuln.endLineNumber || null,
      cwe: insertVuln.cwe || null,
      fixAvailable: insertVuln.fixAvailable || null,
      codeSnippet: insertVuln.codeSnippet || null,
    };
    this.vulnerabilities.set(id, vulnerability);
    return vulnerability;
  }

  async getVulnerabilitiesByScan(scanId: number): Promise<Vulnerability[]> {
    return Array.from(this.vulnerabilities.values()).filter(v => v.scanId === scanId);
  }

  async createSbomComponent(insertComponent: InsertSbomComponent): Promise<SbomComponent> {
    const id = this.currentSbomId++;
    const component: SbomComponent = { 
      id,
      scanId: insertComponent.scanId,
      name: insertComponent.name,
      version: insertComponent.version,
      license: insertComponent.license || null,
      type: insertComponent.type,
      ecosystem: insertComponent.ecosystem || null,
      riskLevel: insertComponent.riskLevel || "low",
    };
    this.sbomComponents.set(id, component);
    return component;
  }

  async getSbomComponentsByScan(scanId: number): Promise<SbomComponent[]> {
    return Array.from(this.sbomComponents.values()).filter(c => c.scanId === scanId);
  }

  async getScanResults(scanId: number): Promise<ScanResults | undefined> {
    const scan = await this.getScan(scanId);
    if (!scan) return undefined;

    const vulnerabilities = await this.getVulnerabilitiesByScan(scanId);
    const sbomComponents = await this.getSbomComponentsByScan(scanId);

    const summary: ScanSummary = {
      critical: vulnerabilities.filter(v => v.severity === "critical").length,
      high: vulnerabilities.filter(v => v.severity === "high").length,
      medium: vulnerabilities.filter(v => v.severity === "medium").length,
      low: vulnerabilities.filter(v => v.severity === "low").length,
      dependencies: sbomComponents.length,
    };

    return {
      scan,
      summary,
      vulnerabilities,
      sbomComponents,
    };
  }
}

export const storage = new MemStorage();
