import { useState, useEffect } from "react";
import { type Document, type TextField } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface SidebarProps {
  selectedDocument: Document | null;
  textFields: TextField[];
  selectedField: TextField | null;
  onAddTextField: () => void;
  onSelectField: (field: TextField) => void;
  onUpdateField: (id: string, updates: Partial<TextField>) => void;
  onDeleteField: (id: string) => void;
  onExportPDF: () => void;
  isExporting: boolean;
}

export default function Sidebar({
  selectedDocument,
  textFields,
  selectedField,
  onAddTextField,
  onSelectField,
  onUpdateField,
  onDeleteField,
  onExportPDF,
  isExporting,
}: SidebarProps) {
  const [fieldName, setFieldName] = useState("");
  const [fieldWidth, setFieldWidth] = useState("");
  const [fieldHeight, setFieldHeight] = useState("");

  useEffect(() => {
    if (selectedField) {
      setFieldName(selectedField.name);
      setFieldWidth(selectedField.width.toString());
      setFieldHeight(selectedField.height.toString());
    } else {
      setFieldName("");
      setFieldWidth("");
      setFieldHeight("");
    }
  }, [selectedField]);

  const handleUpdateField = (property: string, value: string | number) => {
    if (!selectedField) return;
    onUpdateField(selectedField.id, { [property]: value });
  };

  const handleNameChange = (value: string) => {
    setFieldName(value);
    handleUpdateField('name', value);
  };

  const handleWidthChange = (value: string) => {
    setFieldWidth(value);
    const width = parseFloat(value);
    if (!isNaN(width) && width > 0) {
      handleUpdateField('width', width);
    }
  };

  const handleHeightChange = (value: string) => {
    setFieldHeight(value);
    const height = parseFloat(value);
    if (!isNaN(height) && height > 0) {
      handleUpdateField('height', height);
    }
  };

  return (
    <div className="w-80 bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <h1 className="text-2xl font-bold text-foreground mb-2">PDF Form Creator</h1>
        <p className="text-sm text-muted-foreground">Upload documents and add fillable text fields</p>
      </div>

      {/* Tools Section */}
      {selectedDocument && (
        <div className="p-6 flex-1">
          <h2 className="text-lg font-semibold mb-4">Tools</h2>
          
          {/* Add Text Field Button */}
          <Button
            onClick={onAddTextField}
            className="w-full mb-6 flex items-center justify-center gap-2"
            data-testid="button-add-field"
          >
            <i className="fas fa-plus"></i>
            Add Text Field
          </Button>
          
          {/* Field Properties Panel */}
          {selectedField && (
            <Card className="mb-6">
              <CardContent className="p-4">
                <h3 className="font-medium mb-3">Field Properties</h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="field-name" className="text-sm font-medium text-muted-foreground">
                      Field Name
                    </Label>
                    <Input
                      id="field-name"
                      type="text"
                      value={fieldName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="Enter field name"
                      className="mt-1"
                      data-testid="input-field-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="field-width" className="text-sm font-medium text-muted-foreground">
                      Width
                    </Label>
                    <Input
                      id="field-width"
                      type="number"
                      value={fieldWidth}
                      onChange={(e) => handleWidthChange(e.target.value)}
                      placeholder="120"
                      className="mt-1"
                      data-testid="input-field-width"
                    />
                  </div>
                  <div>
                    <Label htmlFor="field-height" className="text-sm font-medium text-muted-foreground">
                      Height
                    </Label>
                    <Input
                      id="field-height"
                      type="number"
                      value={fieldHeight}
                      onChange={(e) => handleHeightChange(e.target.value)}
                      placeholder="30"
                      className="mt-1"
                      data-testid="input-field-height"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Fields List */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-3">
                Text Fields{" "}
                <span className="text-xs text-muted-foreground" data-testid="text-field-count">
                  ({textFields.length})
                </span>
              </h3>
              <div className="space-y-2">
                {textFields.map((field) => (
                  <div
                    key={field.id}
                    className={`flex items-center justify-between p-2 rounded border cursor-pointer transition-colors ${
                      selectedField?.id === field.id
                        ? 'bg-primary/10 border-primary/30'
                        : 'bg-background border-border hover:border-primary/50'
                    }`}
                    onClick={() => onSelectField(field)}
                    data-testid={`field-item-${field.id}`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <i className="fas fa-grip-vertical text-muted-foreground text-xs"></i>
                      <span className="text-sm truncate">{field.name}</span>
                    </div>
                    <button
                      className="text-destructive hover:text-destructive/80 text-xs p-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteField(field.id);
                      }}
                      data-testid={`button-delete-field-${field.id}`}
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                ))}
                {textFields.length === 0 && (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    No text fields added yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Export Section */}
      {selectedDocument && (
        <div className="p-6 border-t border-border">
          <Button
            onClick={onExportPDF}
            disabled={isExporting}
            className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2 mb-3"
            data-testid="button-export-pdf"
          >
            <i className="fas fa-download"></i>
            {isExporting ? "Exporting..." : "Download Fillable PDF"}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Fields will be invisible and fillable in the exported PDF
          </p>
        </div>
      )}
    </div>
  );
}
