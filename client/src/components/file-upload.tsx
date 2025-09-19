import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { type Document } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface FileUploadProps {
  onDocumentUploaded: (document: Document) => void;
}

export default function FileUpload({ onDocumentUploaded }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/documents", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Upload failed");
      }

      return response.json();
    },
    onSuccess: (document: Document) => {
      onDocumentUploaded(document);
      toast({ title: "Document uploaded successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Upload failed", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      });
    },
  });

  const handleFileSelect = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast({ 
        title: "File too large", 
        description: "Maximum file size is 10MB",
        variant: "destructive" 
      });
      return;
    }

    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg'];
    if (!allowedTypes.includes(file.type)) {
      toast({ 
        title: "Invalid file type", 
        description: "Only PDF, PNG, and JPG files are supported",
        variant: "destructive" 
      });
      return;
    }

    uploadMutation.mutate(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">PDF Form Creator</h2>
        <p className="text-sm text-muted-foreground mb-6">Upload documents and add fillable text fields</p>
        
        <div
          className={`file-drop-zone rounded-lg p-8 text-center cursor-pointer transition-all ${
            isDragOver ? 'border-primary bg-primary/5' : 'border-border'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => document.getElementById('file-input')?.click()}
          data-testid="file-drop-zone"
        >
          <i className="fas fa-cloud-upload-alt text-4xl text-muted-foreground mb-4"></i>
          <p className="text-sm font-medium text-foreground mb-2">
            {uploadMutation.isPending ? "Uploading..." : "Drop files here or click to browse"}
          </p>
          <p className="text-xs text-muted-foreground mb-4">Supports PDF, PNG, JPG (Max 10MB)</p>
          <Button
            disabled={uploadMutation.isPending}
            data-testid="button-choose-file"
          >
            {uploadMutation.isPending ? "Uploading..." : "Choose File"}
          </Button>
          <input
            id="file-input"
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFileInputChange}
            data-testid="input-file"
          />
        </div>
      </CardContent>
    </Card>
  );
}
