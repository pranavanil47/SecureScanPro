import SummaryCards from "./summary-cards";
import ResultsTabs from "./results-tabs";
import { Button } from "@/components/ui/button";
import { RotateCcw, Download } from "lucide-react";
import type { ScanResults } from "@shared/schema";

interface ResultsDashboardProps {
  results: ScanResults;
  onNewScan: () => void;
}

export default function ResultsDashboard({ results, onNewScan }: ResultsDashboardProps) {
  const handleExport = async () => {
    try {
      const response = await fetch(`/api/scans/${results.scan.id}/export`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scan_${results.scan.id}_report.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div>
      <SummaryCards summary={results.summary} />
      <ResultsTabs 
        vulnerabilities={results.vulnerabilities}
        sbomComponents={results.sbomComponents}
      />
      
      <div className="mt-8 flex justify-center space-x-4">
        <Button 
          variant="outline" 
          onClick={onNewScan}
          className="px-6 py-3"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Scan Another Repository
        </Button>
        <Button 
          onClick={handleExport}
          className="bg-green-600 hover:bg-green-700 px-6 py-3"
        >
          <Download className="w-4 h-4 mr-2" />
          Download Full Report
        </Button>
      </div>
    </div>
  );
}
