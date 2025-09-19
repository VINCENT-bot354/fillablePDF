import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type Document, type TextField } from "@shared/schema";
import FileUpload from "@/components/file-upload";
import Sidebar from "@/components/sidebar";
import Canvas from "@/components/canvas";

export default function FormCreator() {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [selectedField, setSelectedField] = useState<TextField | null>(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: textFields = [], refetch: refetchFields } = useQuery<TextField[]>({
    queryKey: ["/api/documents", selectedDocument?.id, "text-fields"],
    enabled: !!selectedDocument?.id,
  });

  const createFieldMutation = useMutation({
    mutationFn: async (fieldData: any) => {
      const response = await apiRequest("POST", "/api/text-fields", fieldData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", selectedDocument?.id, "text-fields"] });
      toast({ title: "Text field added successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to add text field", variant: "destructive" });
    },
  });

  const updateFieldMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<TextField> }) => {
      const response = await apiRequest("PATCH", `/api/text-fields/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", selectedDocument?.id, "text-fields"] });
    },
  });

  const deleteFieldMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/text-fields/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", selectedDocument?.id, "text-fields"] });
      setSelectedField(null);
      toast({ title: "Text field deleted" });
    },
  });

  const exportPDFMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await fetch(`/api/documents/${documentId}/export`, {
        method: "POST",
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Export failed");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedDocument?.originalName?.replace(/\.[^/.]+$/, "")}_fillable.pdf` || "document_fillable.pdf";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({ title: "PDF exported successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to export PDF", variant: "destructive" });
    },
  });

  const addTextField = () => {
    if (!selectedDocument) return;

    const newField = {
      documentId: selectedDocument.id,
      name: `Field ${textFields.length + 1}`,
      x: 100,
      y: 100,
      width: 150,
      height: 35,
      required: false,
    };

    createFieldMutation.mutate(newField);
  };

  const updateFieldPosition = (id: string, x: number, y: number) => {
    updateFieldMutation.mutate({ id, updates: { x, y } });
  };

  const updateFieldSize = (id: string, width: number, height: number) => {
    updateFieldMutation.mutate({ id, updates: { width, height } });
  };

  const updateFieldProperties = (id: string, updates: Partial<TextField>) => {
    updateFieldMutation.mutate({ id, updates });
  };

  const deleteField = (id: string) => {
    deleteFieldMutation.mutate(id);
  };

  const exportPDF = () => {
    if (!selectedDocument) return;
    exportPDFMutation.mutate(selectedDocument.id);
  };

  const zoomIn = () => setZoomLevel(Math.min(zoomLevel + 25, 200));
  const zoomOut = () => setZoomLevel(Math.max(zoomLevel - 25, 25));
  const fitToScreen = () => setZoomLevel(100);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        selectedDocument={selectedDocument}
        textFields={textFields}
        selectedField={selectedField}
        onAddTextField={addTextField}
        onSelectField={setSelectedField}
        onUpdateField={updateFieldProperties}
        onDeleteField={deleteField}
        onExportPDF={exportPDF}
        isExporting={exportPDFMutation.isPending}
      />
      
      <div className="flex-1 flex flex-col">
        {!selectedDocument ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-md w-full">
              <FileUpload onDocumentUploaded={setSelectedDocument} />
            </div>
          </div>
        ) : (
          <>
            <div className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold" data-testid="document-name">
                  {selectedDocument.originalName}
                </h2>
                <div className="text-sm text-muted-foreground">
                  Page 1 of 1 • {Math.round((selectedDocument.width || 612) / 72 * 10) / 10}" × {Math.round((selectedDocument.height || 792) / 72 * 10) / 10}"
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                  <button 
                    className="p-2 hover:bg-background rounded text-sm"
                    onClick={zoomOut}
                    data-testid="button-zoom-out"
                  >
                    <i className="fas fa-minus"></i>
                  </button>
                  <span className="px-3 py-2 text-sm font-medium" data-testid="text-zoom-level">
                    {zoomLevel}%
                  </span>
                  <button 
                    className="p-2 hover:bg-background rounded text-sm"
                    onClick={zoomIn}
                    data-testid="button-zoom-in"
                  >
                    <i className="fas fa-plus"></i>
                  </button>
                </div>
                <button 
                  className="p-2 hover:bg-muted rounded text-sm"
                  onClick={fitToScreen}
                  data-testid="button-fit-screen"
                >
                  <i className="fas fa-expand-arrows-alt"></i>
                </button>
              </div>
            </div>
            
            <Canvas
              document={selectedDocument}
              textFields={textFields}
              selectedField={selectedField}
              zoomLevel={zoomLevel}
              onSelectField={setSelectedField}
              onUpdateFieldPosition={updateFieldPosition}
              onUpdateFieldSize={updateFieldSize}
            />
          </>
        )}
      </div>
    </div>
  );
}
