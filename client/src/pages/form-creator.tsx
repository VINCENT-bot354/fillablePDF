import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type Document, type TextField } from "@shared/schema";
import FileUpload from "@/components/file-upload";
import Sidebar from "@/components/sidebar";
import Canvas from "@/components/canvas";

interface UndoAction {
  type: 'create' | 'update' | 'delete';
  fieldId: string;
  data?: any;
  previousData?: any;
}

export default function FormCreator() {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [selectedField, setSelectedField] = useState<TextField | null>(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
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
    onSuccess: (newField) => {
      // Add to undo stack
      setUndoStack(prev => [...prev, { type: 'create', fieldId: newField.id }]);
      queryClient.invalidateQueries({ queryKey: ["/api/documents", selectedDocument?.id, "text-fields"] });
      toast({ title: "Text field added successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to add text field", variant: "destructive" });
    },
  });

  const updateFieldMutation = useMutation({
    mutationFn: async ({ id, updates, previousData }: { id: string; updates: Partial<TextField>; previousData?: TextField }) => {
      const response = await apiRequest("PATCH", `/api/text-fields/${id}`, updates);
      return response.json();
    },
    onSuccess: (updatedField, variables) => {
      // Add to undo stack if we have previous data
      if (variables.previousData) {
        setUndoStack(prev => [...prev, { 
          type: 'update', 
          fieldId: updatedField.id, 
          data: variables.updates,
          previousData: variables.previousData
        }]);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/documents", selectedDocument?.id, "text-fields"] });
    },
  });

  const deleteFieldMutation = useMutation({
    mutationFn: async ({ id, fieldData }: { id: string; fieldData: TextField }) => {
      const response = await apiRequest("DELETE", `/api/text-fields/${id}`);
      return response.json();
    },
    onSuccess: (result, variables) => {
      // Add to undo stack
      setUndoStack(prev => [...prev, { 
        type: 'delete', 
        fieldId: variables.id, 
        previousData: variables.fieldData 
      }]);
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
      font: "Arial" as const,
    };

    createFieldMutation.mutate(newField);
  };

  const updateFieldPosition = (id: string, x: number, y: number) => {
    const field = textFields.find(f => f.id === id);
    updateFieldMutation.mutate({ id, updates: { x, y }, previousData: field });
  };

  const updateFieldSize = (id: string, width: number, height: number) => {
    const field = textFields.find(f => f.id === id);
    updateFieldMutation.mutate({ id, updates: { width, height }, previousData: field });
  };

  const updateFieldProperties = (id: string, updates: Partial<TextField>) => {
    const field = textFields.find(f => f.id === id);
    updateFieldMutation.mutate({ id, updates, previousData: field });
  };

  const deleteField = (id: string) => {
    const fieldToDelete = textFields.find(f => f.id === id);
    if (fieldToDelete) {
      deleteFieldMutation.mutate({ id, fieldData: fieldToDelete });
    }
  };

  // Undo functionality
  const undoLastAction = async () => {
    if (undoStack.length === 0) return;

    const lastAction = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1)); // Remove last action from stack

    try {
      if (lastAction.type === 'create') {
        // Undo create by deleting the field
        await apiRequest("DELETE", `/api/text-fields/${lastAction.fieldId}`);
      } else if (lastAction.type === 'delete') {
        // Undo delete by recreating the field
        await apiRequest("POST", "/api/text-fields", lastAction.previousData);
      } else if (lastAction.type === 'update') {
        // Undo update by reverting to previous data
        const revertData = {
          x: lastAction.previousData.x,
          y: lastAction.previousData.y,
          width: lastAction.previousData.width,
          height: lastAction.previousData.height,
          name: lastAction.previousData.name
        };
        await apiRequest("PATCH", `/api/text-fields/${lastAction.fieldId}`, revertData);
      }

      queryClient.invalidateQueries({ queryKey: ["/api/documents", selectedDocument?.id, "text-fields"] });
      toast({ title: "Action undone successfully" });
    } catch (error) {
      toast({ title: "Failed to undo action", variant: "destructive" });
      // Restore the action to the stack if it failed
      setUndoStack(prev => [...prev, lastAction]);
    }
  };

  // Restart functionality
  const restartForm = async () => {
    if (!selectedDocument || textFields.length === 0) return;

    try {
      // Delete all text fields
      await Promise.all(textFields.map(field => 
        apiRequest("DELETE", `/api/text-fields/${field.id}`)
      ));

      // Clear undo stack and selected field
      setUndoStack([]);
      setSelectedField(null);
      
      queryClient.invalidateQueries({ queryKey: ["/api/documents", selectedDocument.id, "text-fields"] });
      toast({ title: "Form restarted - all fields cleared" });
    } catch (error) {
      toast({ title: "Failed to restart form", variant: "destructive" });
    }
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
        onUndo={undoLastAction}
        onRestart={restartForm}
        canUndo={undoStack.length > 0}
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
