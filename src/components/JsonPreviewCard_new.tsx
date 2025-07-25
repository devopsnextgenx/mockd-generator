import React, { useState, useCallback, useEffect, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import Port from './Port';
import type { Card as CardType } from '../types';

interface JsonPreviewCardProps {
  card: CardType;
  onPositionChange: (cardId: string, position: { x: number; y: number }) => void;
  onPortValueChange: (cardId: string, portId: string, value: unknown) => void;
  onConnectionStart: (cardId: string, portId: string, portType: 'input' | 'output') => void;
  onConnectionEnd: (cardId: string, portId: string, portType: 'input' | 'output') => void;
  onSelect: (cardId: string, isMultiSelect: boolean) => void;
  isConnecting: boolean;
}

const JsonPreviewCard: React.FC<JsonPreviewCardProps> = ({
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
  const [jsonString, setJsonString] = useState('{}');

  // Get the data from input port
  const dataInputPort = card.inputPorts.find(port => port.name === 'data');
  const inputData = useMemo(() => {
    const portValue = dataInputPort?.value;
    if (portValue !== undefined && portValue !== null) {
      return portValue;
    }
    return {};
  }, [dataInputPort?.value]);

  useEffect(() => {
    try {
      setJsonString(JSON.stringify(inputData, null, 2));
    } catch {
      setJsonString('Error: Invalid JSON data');
    }
  }, [inputData]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!(e.target as Element).closest('.json-preview-header')) return;
    
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

  const handleResize = (direction: 'up' | 'down') => {
    const increment = 50;
    if (direction === 'up' && editorHeight > 150) {
      setEditorHeight(editorHeight - increment);
    } else if (direction === 'down' && editorHeight < 600) {
      setEditorHeight(editorHeight + increment);
    }
  };

  const getDataType = () => {
    if (Array.isArray(inputData)) {
      return `Array (${inputData.length} items)`;
    } else if (typeof inputData === 'object' && inputData !== null) {
      return `Object (${Object.keys(inputData).length} keys)`;
    }
    return typeof inputData;
  };

  return (
    <div
      className={`json-preview-card ${card.isSelected ? 'selected' : ''}`}
      style={{ 
        position: 'absolute',
        left: card.position.x,
        top: card.position.y,
        minWidth: '400px',
        width: '500px',
        border: '2px solid #007acc',
        backgroundColor: '#1e1e1e',
        borderRadius: '6px',
        zIndex: 100,
        cursor: isDragging ? 'grabbing' : 'grab',
        overflow: 'hidden',
      }}
    >
      {/* Draggable header */}
      <button
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        className="json-preview-header"
        style={{
          width: '100%',
          padding: '12px 16px',
          backgroundColor: '#2d2d30',
          border: 'none',
          borderBottom: '1px solid #3c3c3c',
          color: '#cccccc',
          cursor: isDragging ? 'grabbing' : 'grab',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
        aria-label={`JSON Preview Card: ${card.name}`}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '12px',
              height: '12px',
              backgroundColor: '#007acc',
              borderRadius: '50%',
            }}
          />
          <span style={{ fontSize: '14px', fontWeight: '500' }}>
            {card.name} ({getDataType()})
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          style={{
            background: 'none',
            border: 'none',
            color: '#cccccc',
            fontSize: '16px',
            cursor: 'pointer',
            padding: '4px',
          }}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? '−' : '+'}
        </button>
      </button>

      {/* Card Body */}
      {isExpanded && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
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

          {/* Status Bar */}
          <div
            style={{
              backgroundColor: '#007acc',
              padding: '4px 12px',
              color: 'white',
              fontSize: '12px',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>JSON Preview</span>
            <span>{getDataType()} • {jsonString.length} chars</span>
          </div>
        </div>
      )}

      {/* Input Ports */}
      <div className="ports-section input-ports">
        {card.inputPorts.map((port, index) => (
          <div
            key={port.id}
            className="port-wrapper input-port"
            style={{
              position: 'absolute',
              left: '-6px',
              top: `${50 + index * 25}px`,
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

      {/* Output Ports */}
      <div className="ports-section output-ports">
        {card.outputPorts.map((port, index) => (
          <div
            key={port.id}
            className="port-wrapper output-port"
            style={{
              position: 'absolute',
              right: '-6px',
              bottom: `${20 + (card.outputPorts.length - 1 - index) * 25}px`,
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

export default JsonPreviewCard;
