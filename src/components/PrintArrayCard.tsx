import React, { useState, useCallback, useEffect, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import Port from './Port';
import type { Card as CardType } from '../types';

interface PrintArrayCardProps {
  card: CardType;
  onPositionChange: (cardId: string, position: { x: number; y: number }) => void;
  onPortValueChange: (cardId: string, portId: string, value: unknown) => void;
  onConnectionStart: (cardId: string, portId: string, portType: 'input' | 'output') => void;
  onConnectionEnd: (cardId: string, portId: string, portType: 'input' | 'output') => void;
  onSelect: (cardId: string, isMultiSelect: boolean) => void;
  isConnecting: boolean;
}

const PrintArrayCard: React.FC<PrintArrayCardProps> = ({
  card,
  onPositionChange,
  onPortValueChange,
  onConnectionStart,
  onConnectionEnd,
  onSelect,
  isConnecting,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [editorHeight, setEditorHeight] = useState(300);
  const [jsonString, setJsonString] = useState('[]');
  const [cardWidth, setCardWidth] = useState(400);
  const [cardHeight, setCardHeight] = useState(500);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStartPos, setResizeStartPos] = useState({ x: 0, y: 0 });
  const [resizeStartSize, setResizeStartSize] = useState({ width: 0, height: 0 });

  console.log('🔍 PrintArrayCard render - ports:', {
    inputPorts: card.inputPorts?.length || 0,
    outputPorts: card.outputPorts?.length || 0
  });

  // Get the array data from input port
  const arrayInputPort = card.inputPorts.find(port => port.name === 'array');
  const arrayData = useMemo(() => {
    // First check if there's data from a connection (execution result)
    const portValue = arrayInputPort?.value;
    if (portValue && Array.isArray(portValue)) {
      return portValue as Array<Record<string, unknown>>;
    }
    // Fallback to empty array
    return [];
  }, [arrayInputPort?.value]);

  useEffect(() => {
    try {
      setJsonString(JSON.stringify(arrayData, null, 2));
    } catch {
      setJsonString('Error: Invalid JSON data');
    }
  }, [arrayData]);

  // Update editor height when card height changes
  useEffect(() => {
    const headerHeight = 40;
    const resizeControlsHeight = 48;
    const footerHeight = 40;
    const bottomPaddingHeight = 20; // New bottom padding area
    const minEditorHeight = 150;
    
    const availableHeight = cardHeight - headerHeight - resizeControlsHeight - footerHeight - bottomPaddingHeight;
    const newEditorHeight = Math.max(minEditorHeight, availableHeight);
    
    if (newEditorHeight !== editorHeight) {
      setEditorHeight(newEditorHeight);
    }
  }, [cardHeight, editorHeight]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only allow dragging from the header
    if (!(e.target as Element).closest('.card-header')) return;
    
    setIsDragging(true);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStartPos({ x: e.clientX, y: e.clientY });
    setResizeStartSize({ width: cardWidth, height: cardHeight });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const canvas = document.querySelector('.canvas-container') as HTMLElement;
      if (!canvas) return;
      
      const canvasRect = canvas.getBoundingClientRect();
      const newPosition = {
        x: Math.max(0, e.clientX - canvasRect.left - dragOffset.x),
        y: Math.max(0, e.clientY - canvasRect.top - dragOffset.y)
      };
      
      onPositionChange(card.id, newPosition);
    } else if (isResizing) {
      const deltaX = e.clientX - resizeStartPos.x;
      const deltaY = e.clientY - resizeStartPos.y;
      
      setCardWidth(Math.max(200, resizeStartSize.width + deltaX));
      setCardHeight(Math.max(300, resizeStartSize.height + deltaY));
    }
  }, [isDragging, isResizing, dragOffset, resizeStartPos, resizeStartSize, onPositionChange, card.id]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  // Add global mouse event listeners when dragging or resizing
  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(card.id, e.ctrlKey || e.metaKey);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(card.id, e.ctrlKey || e.metaKey);
    }
  };

  const handleResize = (direction: 'up' | 'down') => {
    const increment = 50;
    if (direction === 'up' && cardHeight > 300) {
      setCardHeight(cardHeight - increment);
    } else if (direction === 'down' && cardHeight < 800) {
      setCardHeight(cardHeight + increment);
    }
  };

  return (
    <div
      className={`card ${card.isSelected ? 'selected' : ''}`}
      style={{ 
        position: 'absolute',
        left: card.position.x,
        top: card.position.y,
        width: `${cardWidth}px`,
        height: `${cardHeight}px`,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {/* Card Header */}
      <div className="card-header">
        <h3 className="card-title">
          {card.name} ({arrayData.length} items)
        </h3>
        <button
          type="button"
          className="expand-button"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>

      {/* Card Body */}
      {isExpanded && (
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 100px)' }}>
          {/* Resize Controls */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '8px',
              padding: '8px',
              backgroundColor: '#252526',
              borderBottom: '1px solid #3c3c3c',
            }}
          >
            <button
              onClick={() => handleResize('up')}
              disabled={cardHeight <= 300}
              style={{
                background: '#007acc',
                border: 'none',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '3px',
                fontSize: '12px',
                cursor: 'pointer',
                opacity: cardHeight <= 300 ? 0.5 : 1,
              }}
            >
              ↑ Smaller
            </button>
            <span style={{ color: '#cccccc', fontSize: '12px', alignSelf: 'center' }}>
              {cardHeight}px
            </span>
            <button
              onClick={() => handleResize('down')}
              disabled={cardHeight >= 800}
              style={{
                background: '#007acc',
                border: 'none',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '3px',
                fontSize: '12px',
                cursor: 'pointer',
                opacity: cardHeight >= 800 ? 0.5 : 1,
              }}
            >
              ↓ Larger
            </button>
          </div>

          {/* JSON Editor */}
          <div style={{ height: `${editorHeight}px`, overflow: 'hidden', flex: 1 }}>
            <Editor
              height="100%"
              defaultLanguage="json"
              value={jsonString}
              theme="vs-dark"
              options={{
                readOnly: true,
                minimap: { enabled: editorHeight > 300 },
                scrollBeyondLastLine: false,
                fontSize: 13,
                fontFamily: 'Consolas, "Courier New", monospace',
                lineNumbers: 'on',
                wordWrap: 'on',
                folding: true,
                bracketPairColorization: { enabled: true },
                automaticLayout: true,
                scrollbar: {
                  vertical: 'auto',
                  horizontal: 'auto',
                  verticalScrollbarSize: 10,
                  horizontalScrollbarSize: 10,
                },
              }}
            />
          </div>
        </div>
      )}

      {/* Footer with Ports */}
      <div
        style={{
          backgroundColor: '#111827',
          padding: '8px 16px 8px 12px', // Extra right padding for resize handle clearance
          borderRadius: '0 0 12px 12px',
          paddingBottom: '18px', // Extra space for resize handle
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          minHeight: '40px',
          gap: '8px',
        }}
      >
        {/* Input Ports - Left Side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
          {card.inputPorts.map((port, index) => {
            port.showDisplayValue = false;
            return (
              <div
                key={port.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  position: 'absolute',
                  left: '-20px', // Position at the left edge of the card
		  bottom: '5px',
                  top: `${index * 24}px`, // Stack multiple ports vertically
                  zIndex: 10,
                }}
              >
                <Port
                  port={port}
                  cardId={card.id}
                  onConnectionStart={onConnectionStart}
                  onConnectionEnd={onConnectionEnd}
                  onPortValueChange={onPortValueChange}
                  isConnecting={isConnecting}
                />
              </div>
            );
          })}
        </div>

        {/* Center Status */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          flex: 1,
          justifyContent: 'center',
          minWidth: 0, // Allow flex shrinking
        }}>
          <span style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>Array Print</span>
          <span style={{ fontSize: '10px' }}>•</span>
          <span style={{ fontSize: '10px', whiteSpace: 'nowrap' }}>
            {arrayData.length} items • {jsonString.length} chars
          </span>
        </div>

        {/* Output Ports - Right Side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
          {card.outputPorts.map((port, index) => (
            <div
              key={port.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                position: 'absolute',
                right: '-25px', // Position at the right edge of the card
		bottom: '5px',
                top: `${index * 24}px`, // Stack multiple ports vertically
                zIndex: 10,
              }}
            >
              <Port
                port={port}
                cardId={card.id}
                onConnectionStart={onConnectionStart}
                onConnectionEnd={onConnectionEnd}
                onPortValueChange={onPortValueChange}
                isConnecting={isConnecting}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Bottom padding area for resize handle */}
      <div
        style={{
          height: '20px',
          position: 'relative',
          backgroundColor: 'transparent',
        }}
      >
        {/* Resize Handle */}
        <button
          type="button"
          onMouseDown={handleResizeMouseDown}
          style={{
            position: 'absolute',
            bottom: '19px',
            right: '0px',
            width: '20px',
            height: '20px',
            background: '#111827',
            cursor: 'se-resize',
            borderRadius: '0 0 12px 0',
            border: '2px solid #111827',
            borderTop: 'none',
            borderLeft: 'none',
            zIndex: 21,
            padding: 0,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
          }}
          title="Drag to resize"
          aria-label="Resize card"
          >
            <div
              style={{
                width: '0',
                height: '0',
                borderLeft: '6px solid transparent',
                borderBottom: '6px solid #9ca3af',
                marginRight: '2px',
                marginBottom: '2px',
              }}
            />
          </button>
      </div>
    </div>
  );
};

export default PrintArrayCard;
