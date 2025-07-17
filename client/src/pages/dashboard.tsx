import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import UploadSection from "@/components/upload-section";
import ScanningProgress from "@/components/scanning-progress";
import ResultsDashboard from "@/components/results-dashboard";
import { Shield, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ScanResults } from "@shared/schema";

export default function Dashboard() {
  const [currentScanId, setCurrentScanId] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);

  const { data: scanStatus } = useQuery({
    queryKey: ["/api/scans", currentScanId, "status"],
    enabled: !!currentScanId && !showResults,
    refetchInterval: 2000, // Poll every 2 seconds during scanning
  });

  const { data: scanResults } = useQuery<ScanResults>({
    queryKey: ["/api/scans", currentScanId, "results"],
    enabled: !!currentScanId && scanStatus?.status === "completed",
  });

  const handleScanStarted = (scanId: number) => {
    setCurrentScanId(scanId);
    setShowResults(false);
  };

  const handleNewScan = () => {
    setCurrentScanId(null);
    setShowResults(false);
  };

  // Show results when scan is completed
  if (scanStatus?.status === "completed" && scanResults && !showResults) {
    setShowResults(true);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Shield className="text-primary text-2xl mr-2" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">SecureScan</span>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#" className="text-gray-900 dark:text-white hover:text-primary px-3 py-2 rounded-md text-sm font-medium">
                Dashboard
              </a>
              <a href="#" className="text-neutral dark:text-gray-300 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">
                History
              </a>
              <a href="#" className="text-neutral dark:text-gray-300 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">
                Settings
              </a>
            </nav>
            <Button onClick={handleNewScan} className="bg-primary text-white hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              New Scan
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!currentScanId && (
          <UploadSection onScanStarted={handleScanStarted} />
        )}

        {currentScanId && !showResults && (
          <ScanningProgress 
            scanId={currentScanId}
            status={scanStatus?.status || "uploading"}
            progress={scanStatus?.progress || 0}
          />
        )}

        {showResults && scanResults && (
          <ResultsDashboard 
            results={scanResults}
            onNewScan={handleNewScan}
          />
        )}
      </main>
    </div>
  );
}
