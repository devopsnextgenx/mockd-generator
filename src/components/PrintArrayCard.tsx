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

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const canvas = document.querySelector('.canvas-container') as HTMLElement;
    if (!canvas) return;
    
    const canvasRect = canvas.getBoundingClientRect();
    const newPosition = {
      x: Math.max(0, Math.min(e.clientX - canvasRect.left - dragOffset.x, canvasRect.width - 400)),
      y: Math.max(0, Math.min(e.clientY - canvasRect.top - dragOffset.y, canvasRect.height - 200))
    };
    
    onPositionChange(card.id, newPosition);
  }, [isDragging, dragOffset, onPositionChange, card.id]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add global mouse event listeners when dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

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
    if (direction === 'up' && editorHeight > 150) {
      setEditorHeight(editorHeight - increment);
    } else if (direction === 'down' && editorHeight < 600) {
      setEditorHeight(editorHeight + increment);
    }
  };

  return (
    <div
      className={`card ${card.isSelected ? 'selected' : ''}`}
      style={{ 
        position: 'absolute',
        left: card.position.x,
        top: card.position.y,
        minWidth: '200px',
        maxWidth: '400px',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Print Array Card: ${card.name}`}
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
        <div className="card-body">
          {/* Input Ports Section - Above Editor */}
          <div className="input-ports-section" style={{ 
            padding: '8px 16px', 
            borderBottom: '1px solid #3c3c3c',
            backgroundColor: '#252526'
          }}>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>
              Input Data:
            </div>
            {card.inputPorts.map((port) => {
              port.showDisplayValue = false;
              return (
              <div
                key={port.id}
                className="port-wrapper input-port"
                style={{
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                  marginRight: '16px',
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
            )})}
          </div>

          {/* JSON Editor */}
          <div style={{ height: `${editorHeight}px`, overflow: 'hidden' }}>
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

          {/* Resize Controls */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '8px',
              padding: '8px',
              backgroundColor: '#252526',
              borderTop: '1px solid #3c3c3c',
            }}
          >
            <button
              onClick={() => handleResize('up')}
              disabled={editorHeight <= 150}
              style={{
                background: '#007acc',
                border: 'none',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '3px',
                fontSize: '12px',
                cursor: 'pointer',
                opacity: editorHeight <= 150 ? 0.5 : 1,
              }}
            >
              ↑ Shrink
            </button>
            <span style={{ color: '#cccccc', fontSize: '12px', alignSelf: 'center' }}>
              {editorHeight}px
            </span>
            <button
              onClick={() => handleResize('down')}
              disabled={editorHeight >= 600}
              style={{
                background: '#007acc',
                border: 'none',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '3px',
                fontSize: '12px',
                cursor: 'pointer',
                opacity: editorHeight >= 600 ? 0.5 : 1,
              }}
            >
              ↓ Expand
            </button>
          </div>
        </div>
      )}

      {/* Output Ports - Right side */}
      <div className="ports-section output-ports">
        {card.outputPorts.map((port, index) => (
          <div
            key={port.id}
            className="port-wrapper output-port"
            style={{
              position: 'absolute',
              right: '-6px',
              bottom: `${20 + (card.outputPorts.length - 1 - index) * 25}px`, // Start from bottom, space them out
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
  );
};

export default PrintArrayCard;
