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
  const [cardWidth, setCardWidth] = useState(400);
  const [cardHeight, setCardHeight] = useState(500);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStartPos, setResizeStartPos] = useState({ x: 0, y: 0 });
  const [resizeStartSize, setResizeStartSize] = useState({ width: 0, height: 0 });

  console.log('🔍 JsonPreviewCard render - ports:', {
    inputPorts: card.inputPorts?.length || 0,
    outputPorts: card.outputPorts?.length || 0
  });

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
          {card.name} ({getDataType()})
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
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 80px)' }}>
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
          backgroundColor: '#007acc',
          padding: '8px 12px',
          color: 'white',
          fontSize: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          borderRadius: '0 0 10px 10px',
          minHeight: '40px',
        }}
      >
        {/* Input Ports */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {card.inputPorts.map((port) => (
            <div
              key={port.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: '-20px',
                  top: '50%',
                  transform: 'translateY(-50%)',
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
              <span style={{ fontSize: '11px', fontWeight: '500' }}>{port.name}</span>
            </div>
          ))}
        </div>

        {/* Center Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>JSON Preview</span>
          <span>•</span>
          <span>{getDataType()} • {jsonString.length} chars</span>
        </div>

        {/* Output Ports */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {card.outputPorts.map((port) => (
            <div
              key={port.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                position: 'relative',
              }}
            >
              <span style={{ fontSize: '11px', fontWeight: '500' }}>{port.name}</span>
              <div
                style={{
                  position: 'absolute',
                  right: '-20px',
                  top: '50%',
                  transform: 'translateY(-50%)',
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
            </div>
          ))}
        </div>
      </div>

      {/* Resize Handle */}
      <button
        type="button"
        onMouseDown={handleResizeMouseDown}
        style={{
          position: 'absolute',
          bottom: '0px',
          right: '0px',
          width: '15px',
          height: '15px',
          background: '#6b7280',
          cursor: 'nw-resize',
          borderRadius: '0 0 10px 0',
          border: '2px solid #374151',
          borderTop: 'none',
          borderLeft: 'none',
          zIndex: 20,
          padding: 0,
        }}
        title="Drag to resize"
        aria-label="Resize card"
      >
        <div
          style={{
            position: 'absolute',
            bottom: '2px',
            right: '2px',
            width: '0',
            height: '0',
            borderLeft: '8px solid transparent',
            borderBottom: '8px solid #9ca3af',
          }}
        />
      </button>
    </div>
  );
};

export default JsonPreviewCard;
