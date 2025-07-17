import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { CloudUpload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface UploadSectionProps {
  onScanStarted: (scanId: number) => void;
}

export default function UploadSection({ onScanStarted }: UploadSectionProps) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("repository", file);
      
      const response = await apiRequest("POST", "/api/scans/upload", formData);
      return response.json();
    },
    onSuccess: (data) => {
      onScanStarted(data.scanId);
      toast({
        title: "Upload successful",
        description: "Your repository is being scanned...",
      });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (file: File) => {
    if (!file.name.endsWith('.zip')) {
      toast({
        title: "Invalid file type",
        description: "Please select a ZIP file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 100MB.",
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className="mb-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Repository Security Analysis
        </h1>
        <p className="text-lg text-neutral max-w-2xl mx-auto">
          Upload your repository as a ZIP file to perform comprehensive security scanning with Trivy integration
        </p>
      </div>

      <Card className="max-w-md mx-auto">
        <CardContent className="p-8">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              dragActive
                ? "border-primary bg-blue-50"
                : "border-gray-300 hover:border-primary"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <CloudUpload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Upload Repository
            </h3>
            <p className="text-sm text-neutral mb-4">
              Select a ZIP file containing your repository
            </p>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".zip"
              onChange={handleInputChange}
            />
            <Button 
              disabled={uploadMutation.isPending}
              className="bg-primary text-white hover:bg-blue-700"
            >
              {uploadMutation.isPending ? "Uploading..." : "Choose File"}
            </Button>
          </div>
          <div className="mt-4 text-xs text-neutral text-center">
            <p>Supported formats: ZIP files up to 100MB</p>
            <p>Common repositories: Git, SVN, Mercurial</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
