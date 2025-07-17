import { Search, Check, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface ScanningProgressProps {
  scanId: number;
  status: string;
  progress: number;
}

export default function ScanningProgress({ status, progress }: ScanningProgressProps) {
  const getStepStatus = (step: string) => {
    const steps = ["uploading", "scanning"];
    const currentStepIndex = steps.indexOf(status);
    const stepIndex = steps.indexOf(step);
    
    if (stepIndex < currentStepIndex) return "completed";
    if (stepIndex === currentStepIndex) return "active";
    return "pending";
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardContent className="p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Search className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Scanning Repository
          </h2>
          <p className="text-neutral">
            Analyzing your code for security vulnerabilities...
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900">
              Extracting ZIP file
            </span>
            {getStepStatus("uploading") === "completed" ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : getStepStatus("uploading") === "active" ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
            ) : (
              <Clock className="w-4 h-4 text-gray-300" />
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900">
              Running Trivy scan
            </span>
            {getStepStatus("scanning") === "completed" ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : getStepStatus("scanning") === "active" ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
            ) : (
              <Clock className="w-4 h-4 text-gray-300" />
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${status === "scanning" ? "text-gray-900" : "text-neutral"}`}>
              Generating SBOM
            </span>
            <Clock className="w-4 h-4 text-gray-300" />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral">
              Analyzing dependencies
            </span>
            <Clock className="w-4 h-4 text-gray-300" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium text-gray-900">Overall Progress</span>
            <span className="text-neutral">{progress}%</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>
      </CardContent>
    </Card>
  );
}
