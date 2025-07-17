import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const scans = pgTable("scans", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  status: text("status").notNull().default("uploading"), // uploading, scanning, completed, failed
  progress: integer("progress").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const vulnerabilities = pgTable("vulnerabilities", {
  id: serial("id").primaryKey(),
  scanId: integer("scan_id").notNull().references(() => scans.id),
  type: text("type").notNull(), // sca, sast
  severity: text("severity").notNull(), // critical, high, medium, low
  title: text("title").notNull(),
  description: text("description"),
  component: text("component"),
  version: text("version"),
  cve: text("cve"),
  cvssScore: text("cvss_score"),
  filePath: text("file_path"),
  lineNumber: integer("line_number"),
  cwe: text("cwe"),
  fixAvailable: boolean("fix_available").default(false),
});

export const sbomComponents = pgTable("sbom_components", {
  id: serial("id").primaryKey(),
  scanId: integer("scan_id").notNull().references(() => scans.id),
  name: text("name").notNull(),
  version: text("version").notNull(),
  license: text("license"),
  type: text("type").notNull(), // direct, transitive
  ecosystem: text("ecosystem"), // npm, pypi, maven, etc.
  riskLevel: text("risk_level").notNull().default("low"), // low, medium, high, critical
});

export const insertScanSchema = createInsertSchema(scans).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertVulnerabilitySchema = createInsertSchema(vulnerabilities).omit({
  id: true,
});

export const insertSbomComponentSchema = createInsertSchema(sbomComponents).omit({
  id: true,
});

export type InsertScan = z.infer<typeof insertScanSchema>;
export type Scan = typeof scans.$inferSelect;
export type InsertVulnerability = z.infer<typeof insertVulnerabilitySchema>;
export type Vulnerability = typeof vulnerabilities.$inferSelect;
export type InsertSbomComponent = z.infer<typeof insertSbomComponentSchema>;
export type SbomComponent = typeof sbomComponents.$inferSelect;

// Response types for API
export type ScanSummary = {
  critical: number;
  high: number;
  medium: number;
  low: number;
  dependencies: number;
};

export type ScanResults = {
  scan: Scan;
  summary: ScanSummary;
  vulnerabilities: Vulnerability[];
  sbomComponents: SbomComponent[];
};
