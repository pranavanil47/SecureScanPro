import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Filter, List, Puzzle, Code, Copy, ChevronDown, ChevronUp } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Vulnerability, SbomComponent } from "@shared/schema";

interface ResultsTabsProps {
  vulnerabilities: Vulnerability[];
  sbomComponents: SbomComponent[];
}

export default function ResultsTabs({ vulnerabilities, sbomComponents }: ResultsTabsProps) {
  const [activeTab, setActiveTab] = useState("sbom");
  const [expandedFindings, setExpandedFindings] = useState<Set<number>>(new Set());

  const toggleFinding = (findingId: number) => {
    const newExpanded = new Set(expandedFindings);
    if (newExpanded.has(findingId)) {
      newExpanded.delete(findingId);
    } else {
      newExpanded.add(findingId);
    }
    setExpandedFindings(newExpanded);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const exportToCsv = (data: any[], filename: string) => {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape quotes and wrap in quotes if contains comma/quotes/newlines
          if (value && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value || '';
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportScaFindings = () => {
    const scaData = vulnerabilities
      .filter(v => v.type === 'sca')
      .map(v => ({
        Severity: v.severity,
        Title: v.title,
        Description: v.description || '',
        Component: v.component || '',
        Version: v.version || '',
        CVE: v.cve || '',
        'CVSS Score': v.cvssScore || '',
        'File Path': v.filePath || '',
        CWE: v.cwe || '',
        'Fix Available': v.fixAvailable ? 'Yes' : 'No'
      }));
    
    exportToCsv(scaData, 'sca-findings.csv');
  };

  const exportSastFindings = () => {
    const sastData = vulnerabilities
      .filter(v => v.type === 'sast')
      .map(v => ({
        Severity: v.severity,
        Title: v.title,
        Description: v.description || '',
        'File Path': v.filePath || '',
        'Line Number': v.lineNumber || '',
        'End Line Number': v.endLineNumber || '',
        CWE: v.cwe || '',
        CVE: v.cve || ''
      }));
    
    exportToCsv(sastData, 'sast-findings.csv');
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeColor = (type: string) => {
    return type === "direct" 
      ? "bg-blue-100 text-blue-800"
      : "bg-purple-100 text-purple-800";
  };

  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case "critical":
        return "bg-red-100 text-red-800";
      case "high": 
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const scaVulnerabilities = vulnerabilities.filter(v => v.type === "sca");
  const sastVulnerabilities = vulnerabilities.filter(v => v.type === "sast");

  return (
    <Card>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="border-b border-gray-200">
          <TabsList className="w-full justify-start h-auto p-0 bg-transparent">
            <TabsTrigger 
              value="sbom" 
              className="border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary py-4 px-6 text-sm font-medium"
            >
              <List className="w-4 h-4 mr-2" />
              SBOM
            </TabsTrigger>
            <TabsTrigger 
              value="sca"
              className="border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary py-4 px-6 text-sm font-medium"
            >
              <Puzzle className="w-4 h-4 mr-2" />
              SCA Analysis
            </TabsTrigger>
            <TabsTrigger 
              value="sast"
              className="border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary py-4 px-6 text-sm font-medium"
            >
              <Code className="w-4 h-4 mr-2" />
              SAST Findings
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="sbom" className="p-6 mt-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Software Bill of Materials
            </h2>
            <div className="flex space-x-3">
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              <Button size="sm" className="bg-primary hover:bg-blue-700">
                <Download className="w-4 h-4 mr-2" />
                Export SBOM
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Component</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>License</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Risk Level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sbomComponents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-neutral dark:text-gray-400 py-8">
                      No components found in the scan results
                    </TableCell>
                  </TableRow>
                ) : (
                  sbomComponents.map((component) => (
                    <TableRow key={component.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <TableCell>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {component.name}
                          </div>
                          <div className="text-sm text-neutral dark:text-gray-400">
                            {component.ecosystem}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-900 dark:text-white">
                        {component.version}
                      </TableCell>
                      <TableCell className="text-sm text-gray-900 dark:text-white">
                        {component.license}
                      </TableCell>
                      <TableCell>
                        <Badge className={getTypeColor(component.type)}>
                          {component.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRiskColor(component.riskLevel)}>
                          {component.riskLevel}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="sca" className="p-6 mt-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Software Composition Analysis
            </h2>
            <div className="flex space-x-3">
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filter by Severity
              </Button>
              <Button 
                size="sm" 
                className="bg-primary hover:bg-blue-700"
                onClick={exportScaFindings}
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vulnerability</TableHead>
                  <TableHead>Component</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>CVSS Score</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scaVulnerabilities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-neutral dark:text-gray-400 py-8">
                      No vulnerabilities found in dependencies
                    </TableCell>
                  </TableRow>
                ) : (
                  scaVulnerabilities.map((vuln) => (
                    <TableRow key={vuln.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <TableCell>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {vuln.cve || vuln.title}
                          </div>
                          <div className="text-sm text-neutral dark:text-gray-400">
                            {vuln.description}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-900 dark:text-white">
                        {vuln.component}@{vuln.version}
                      </TableCell>
                      <TableCell>
                        <Badge className={getSeverityColor(vuln.severity)}>
                          {vuln.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-900 dark:text-white">
                        {vuln.cvssScore || "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge className={vuln.fixAvailable ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                          {vuln.fixAvailable ? "Fix Available" : "Open"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="sast" className="p-6 mt-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Static Application Security Testing
            </h2>
            <div className="flex space-x-3">
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filter by Rule
              </Button>
              <Button 
                size="sm" 
                className="bg-primary hover:bg-blue-700"
                onClick={exportSastFindings}
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {sastVulnerabilities.length === 0 ? (
              <div className="text-center text-neutral dark:text-gray-400 py-8">
                No SAST findings detected
              </div>
            ) : (
              sastVulnerabilities.map((finding) => (
                <div 
                  key={finding.id}
                  className={`bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border-l-4 ${
                    finding.severity === "critical" ? "border-red-500" :
                    finding.severity === "high" ? "border-orange-500" :
                    finding.severity === "medium" ? "border-yellow-500" :
                    "border-green-500"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <Badge className={`${getSeverityColor(finding.severity)} mr-3`}>
                          {finding.severity}
                        </Badge>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                          {finding.title}
                        </h3>
                      </div>
                      <p className="text-sm text-neutral dark:text-gray-400 mb-2">
                        {finding.description}
                      </p>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center text-xs text-neutral dark:text-gray-400">
                          <Code className="w-3 h-3 mr-1" />
                          <span className="mr-4">
                            {finding.filePath}
                            {finding.lineNumber && `:${finding.lineNumber}`}
                            {finding.endLineNumber && finding.endLineNumber !== finding.lineNumber && `-${finding.endLineNumber}`}
                          </span>
                          {finding.cwe && (
                            <>
                              <span className="mr-1">•</span>
                              <span>{finding.cwe}</span>
                            </>
                          )}
                        </div>
                        {finding.codeSnippet && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => toggleFinding(finding.id)}
                            className="text-primary hover:text-blue-700 text-xs h-6 px-2"
                          >
                            {expandedFindings.has(finding.id) ? (
                              <>
                                <ChevronUp className="w-3 h-3 mr-1" />
                                Hide Code
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3 h-3 mr-1" />
                                Show Code
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                      
                      {finding.codeSnippet && expandedFindings.has(finding.id) && (
                        <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-900 rounded-md border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                              Vulnerable Code
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(finding.codeSnippet!)}
                              className="h-6 px-2 text-xs"
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              Copy
                            </Button>
                          </div>
                          <pre className="text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded border overflow-x-auto">
                            <code className="text-gray-800 dark:text-gray-200">
                              {finding.codeSnippet}
                            </code>
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
