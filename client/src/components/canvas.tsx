import { useRef, useEffect } from "react";
import { type Document, type TextField } from "@shared/schema";
import TextFieldComponent from "./text-field";

interface CanvasProps {
  document: Document;
  textFields: TextField[];
  selectedField: TextField | null;
  zoomLevel: number;
  onSelectField: (field: TextField | null) => void;
  onUpdateFieldPosition: (id: string, x: number, y: number) => void;
  onUpdateFieldSize: (id: string, width: number, height: number) => void;
}

export default function Canvas({
  document,
  textFields,
  selectedField,
  zoomLevel,
  onSelectField,
  onUpdateFieldPosition,
  onUpdateFieldSize,
}: CanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const scale = zoomLevel / 100;

  const handleCanvasClick = (e: React.MouseEvent) => {
    // Only deselect if clicking directly on the canvas, not on text fields
    if (e.target === e.currentTarget) {
      onSelectField(null);
    }
  };

  return (
    <div className="flex-1 canvas-area overflow-auto p-8 relative" data-testid="canvas-area">
      <div className="max-w-4xl mx-auto relative">
        <div
          ref={canvasRef}
          className="document-preview bg-white rounded-lg shadow-lg relative overflow-hidden"
          style={{
            width: (document.width || 612) * scale,
            height: (document.height || 792) * scale,
            backgroundImage: `url(/api/documents/${document.id}/file)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
          onClick={handleCanvasClick}
          data-testid="document-canvas"
        >
          {/* Text fields overlay */}
          {textFields.map((field) => (
            <TextFieldComponent
              key={field.id}
              field={field}
              isSelected={selectedField?.id === field.id}
              zoomLevel={zoomLevel}
              onSelect={() => onSelectField(field)}
              onUpdatePosition={(x, y) => onUpdateFieldPosition(field.id, x, y)}
              onUpdateSize={(width, height) => onUpdateFieldSize(field.id, width, height)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
