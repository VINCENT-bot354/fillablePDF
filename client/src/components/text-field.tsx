import { useState, useRef, useEffect } from "react";
import { type TextField } from "@shared/schema";

interface TextFieldComponentProps {
  field: TextField;
  isSelected: boolean;
  zoomLevel: number;
  onSelect: () => void;
  onUpdatePosition: (x: number, y: number) => void;
  onUpdateSize: (width: number, height: number) => void;
}

export default function TextFieldComponent({
  field,
  isSelected,
  zoomLevel,
  onSelect,
  onUpdatePosition,
  onUpdateSize,
}: TextFieldComponentProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<'se' | 'e' | 's' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 });

  const fieldRef = useRef<HTMLDivElement>(null);

  const scale = zoomLevel / 100;

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = (e.clientX - dragStart.x) / scale;
        const deltaY = (e.clientY - dragStart.y) / scale;
        const newX = Math.max(0, initialPosition.x + deltaX);
        const newY = Math.max(0, initialPosition.y + deltaY);
        onUpdatePosition(newX, newY);
      } else if (isResizing && resizeDirection) {
        const deltaX = (e.clientX - dragStart.x) / scale;
        const deltaY = (e.clientY - dragStart.y) / scale;
        
        let newWidth = initialSize.width;
        let newHeight = initialSize.height;

        if (resizeDirection === 'se' || resizeDirection === 'e') {
          newWidth = Math.max(50, initialSize.width + deltaX);
        }
        if (resizeDirection === 'se' || resizeDirection === 's') {
          newHeight = Math.max(20, initialSize.height + deltaY);
        }

        onUpdateSize(newWidth, newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeDirection(null);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = isDragging ? 'move' : 
        resizeDirection === 'se' ? 'se-resize' :
        resizeDirection === 'e' ? 'e-resize' : 's-resize';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, isResizing, dragStart, initialPosition, initialSize, resizeDirection, scale, onUpdatePosition, onUpdateSize]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect();

    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialPosition({ x: field.x, y: field.y });
  };

  const handleResizeMouseDown = (e: React.MouseEvent, direction: 'se' | 'e' | 's') => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    setResizeDirection(direction);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialSize({ width: field.width, height: field.height });
  };

  return (
    <div
      ref={fieldRef}
      className={`absolute cursor-move transition-all duration-150 ${
        isSelected 
          ? 'border-2 border-primary shadow-lg shadow-primary/20' 
          : 'border-2 border-black hover:border-primary hover:shadow-md hover:shadow-primary/10'
      }`}
      style={{
        left: field.x * scale,
        top: field.y * scale,
        width: field.width * scale,
        height: field.height * scale,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        minWidth: 50 * scale,
        minHeight: 20 * scale,
      }}
      onMouseDown={handleMouseDown}
      data-testid={`text-field-${field.id}`}
    >
      <div className="w-full h-full flex items-center px-2 text-sm text-gray-600 pointer-events-none overflow-hidden">
        {field.name}
      </div>
      
      {isSelected && (
        <>
          {/* Southeast resize handle */}
          <div
            className="absolute bottom-0 right-0 w-2 h-2 bg-primary border border-white cursor-se-resize transform translate-x-1 translate-y-1"
            onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
            data-testid="resize-handle-se"
          />
          
          {/* East resize handle */}
          <div
            className="absolute top-1/2 right-0 w-1.5 h-5 bg-primary border border-white cursor-e-resize transform translate-x-1 -translate-y-1/2"
            onMouseDown={(e) => handleResizeMouseDown(e, 'e')}
            data-testid="resize-handle-e"
          />
          
          {/* South resize handle */}
          <div
            className="absolute bottom-0 left-1/2 w-5 h-1.5 bg-primary border border-white cursor-s-resize transform translate-y-1 -translate-x-1/2"
            onMouseDown={(e) => handleResizeMouseDown(e, 's')}
            data-testid="resize-handle-s"
          />
        </>
      )}
    </div>
  );
}
