import { useRef, useEffect, useState } from "react";
import { type Document, type TextField } from "@shared/schema";
import TextFieldComponent from "./text-field";
import { loadPDFPage } from "@/lib/pdf-utils";

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
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfImageUrl, setPdfImageUrl] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const scale = zoomLevel / 100;

  // Load and render PDF when document changes
  useEffect(() => {
    if (document.mimeType === 'application/pdf') {
      setIsLoadingPdf(true);
      
      // Fetch the PDF file and convert to canvas
      fetch(`/api/documents/${document.id}/file`)
        .then(response => response.blob())
        .then(blob => {
          const file = new File([blob], document.originalName, { type: 'application/pdf' });
          return loadPDFPage(file);
        })
        .then(({ canvas, width, height }) => {
          // Convert canvas to image URL for background
          const imageUrl = canvas.toDataURL('image/png');
          setPdfImageUrl(imageUrl);
          setIsLoadingPdf(false);
        })
        .catch(error => {
          console.error('Error loading PDF:', error);
          setIsLoadingPdf(false);
        });
    } else {
      // For images, clear PDF state
      setPdfImageUrl(null);
      setIsLoadingPdf(false);
    }
  }, [document.id, document.mimeType]);

  const handleCanvasClick = (e: React.MouseEvent) => {
    // Only deselect if clicking directly on the canvas, not on text fields
    if (e.target === e.currentTarget) {
      onSelectField(null);
    }
  };

  // Determine background style based on file type
  const getBackgroundStyle = () => {
    if (document.mimeType === 'application/pdf') {
      if (isLoadingPdf) {
        return {
          backgroundColor: '#f5f5f5',
          backgroundImage: 'none',
        };
      } else if (pdfImageUrl) {
        return {
          backgroundImage: `url(${pdfImageUrl})`,
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        };
      }
    }
    
    // For image files, use the file URL directly
    return {
      backgroundImage: `url(/api/documents/${document.id}/file)`,
      backgroundSize: 'contain',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    };
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
            ...getBackgroundStyle(),
          }}
          onClick={handleCanvasClick}
          data-testid="document-canvas"
        >
          {/* Loading overlay for PDFs */}
          {isLoadingPdf && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-90">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                <p className="text-sm text-gray-600">Loading PDF...</p>
              </div>
            </div>
          )}

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