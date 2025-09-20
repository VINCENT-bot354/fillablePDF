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

  // Use current position/size during active operations, otherwise use server values
  const [currentPosition, setCurrentPosition] = useState({ x: field.x, y: field.y });
  const [currentSize, setCurrentSize] = useState({ width: field.width, height: field.height });

  const fieldRef = useRef<HTMLDivElement>(null);
  const scale = zoomLevel / 100;

  // Update current state when field props change, but only when not actively dragging/resizing
  useEffect(() => {
    if (!isDragging && !isResizing) {
      setCurrentPosition({ x: field.x, y: field.y });
      setCurrentSize({ width: field.width, height: field.height });
    }
  }, [field.x, field.y, field.width, field.height, isDragging, isResizing]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = (e.clientX - dragStart.x) / scale;
        const deltaY = (e.clientY - dragStart.y) / scale;
        const newX = Math.max(0, initialPosition.x + deltaX);
        const newY = Math.max(0, initialPosition.y + deltaY);
        setCurrentPosition({ x: newX, y: newY });
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

        setCurrentSize({ width: newWidth, height: newHeight });
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches.length === 1) {
        const touch = e.touches[0];
        const deltaX = (touch.clientX - dragStart.x) / scale;
        const deltaY = (touch.clientY - dragStart.y) / scale;
        const newX = Math.max(0, initialPosition.x + deltaX);
        const newY = Math.max(0, initialPosition.y + deltaY);
        setCurrentPosition({ x: newX, y: newY });
      } else if (isResizing && resizeDirection && e.touches.length === 1) {
        const touch = e.touches[0];
        const deltaX = (touch.clientX - dragStart.x) / scale;
        const deltaY = (touch.clientY - dragStart.y) / scale;

        let newWidth = initialSize.width;
        let newHeight = initialSize.height;

        if (resizeDirection === 'se' || resizeDirection === 'e') {
          newWidth = Math.max(50, initialSize.width + deltaX);
        }
        if (resizeDirection === 'se' || resizeDirection === 's') {
          newHeight = Math.max(20, initialSize.height + deltaY);
        }

        setCurrentSize({ width: newWidth, height: newHeight });
      }
    };

    const handleEnd = () => {
      if (isDragging) {
        onUpdatePosition(currentPosition.x, currentPosition.y);
        setIsDragging(false);
      } else if (isResizing) {
        onUpdateSize(currentSize.width, currentSize.height);
        setIsResizing(false);
        setResizeDirection(null);
      }
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleEnd);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = isDragging ? 'move' : 
        resizeDirection === 'se' ? 'se-resize' :
        resizeDirection === 'e' ? 'e-resize' : 's-resize';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, isResizing, dragStart, initialPosition, initialSize, resizeDirection, scale, currentPosition, currentSize, onUpdatePosition, onUpdateSize]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isSelected) {
      onSelect();
    } else {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setInitialPosition({ x: currentPosition.x, y: currentPosition.y });
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isSelected) {
      onSelect();
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX, y: touch.clientY });
      setInitialPosition({ x: currentPosition.x, y: currentPosition.y });
    }
  };

  const handleResizeMouseDown = (e: React.MouseEvent, direction: 'se' | 'e' | 's') => {
    e.preventDefault();
    e.stopPropagation();

    setIsResizing(true);
    setResizeDirection(direction);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialSize({ width: currentSize.width, height: currentSize.height });
  };

  const handleResizeTouchStart = (e: React.TouchEvent, direction: 'se' | 'e' | 's') => {
    e.preventDefault();
    e.stopPropagation();

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsResizing(true);
      setResizeDirection(direction);
      setDragStart({ x: touch.clientX, y: touch.clientY });
      setInitialSize({ width: currentSize.width, height: currentSize.height });
    }
  };

  return (
    <div
      ref={fieldRef}
      className={`absolute transition-all duration-150 touch-none select-none ${
        isSelected 
          ? 'border-2 border-primary shadow-lg shadow-primary/20 cursor-move' 
          : 'border-2 border-black hover:border-primary hover:shadow-md hover:shadow-primary/10 cursor-pointer'
      }`}
      style={{
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        userSelect: 'none',
        WebkitTouchCallout: 'none',
        left: currentPosition.x * scale,
        top: currentPosition.y * scale,
        width: currentSize.width * scale,
        height: currentSize.height * scale,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        minWidth: 50 * scale,
        minHeight: 20 * scale,
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      data-testid={`text-field-${field.id}`}
    >
      <div 
        className="w-full h-full flex items-center px-2 text-sm text-gray-600 pointer-events-none overflow-hidden select-none"
        style={{ 
          fontFamily: field.fontFamily === 'Zapf Chancery' ? 'Zapf Chancery, cursive' : 
                      field.fontFamily === 'Vivaldi' ? 'Vivaldi, cursive' : 
                      'Arial, sans-serif'
        }}
      >
        {field.name}
      </div>

      {isSelected && (
        <>
          <div
            className="absolute bottom-0 right-0 w-2 h-2 bg-primary border border-white cursor-se-resize transform translate-x-1 translate-y-1 touch-none"
            onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
            onTouchStart={(e) => handleResizeTouchStart(e, 'se')}
            data-testid="resize-handle-se"
          />

          <div
            className="absolute top-1/2 right-0 w-1.5 h-5 bg-primary border border-white cursor-e-resize transform translate-x-1 -translate-y-1/2 touch-none"
            onMouseDown={(e) => handleResizeMouseDown(e, 'e')}
            onTouchStart={(e) => handleResizeTouchStart(e, 'e')}
            data-testid="resize-handle-e"
          />

          <div
            className="absolute bottom-0 left-1/2 w-5 h-1.5 bg-primary border border-white cursor-s-resize transform translate-y-1 -translate-x-1/2 touch-none"
            onMouseDown={(e) => handleResizeMouseDown(e, 's')}
            onTouchStart={(e) => handleResizeTouchStart(e, 's')}
            data-testid="resize-handle-s"
          />
        </>
      )}
    </div>
  );
}