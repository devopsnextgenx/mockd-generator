import React, { useState } from 'react';
import type { Port as PortType } from '../types';

interface PortProps {
  port: PortType;
  cardId: string;
  onConnectionStart: (cardId: string, portId: string, portType: 'input' | 'output') => void;
  onConnectionEnd: (cardId: string, portId: string, portType: 'input' | 'output') => void;
  onPortValueChange?: (cardId: string, portId: string, value: unknown) => void;
  isConnecting: boolean;
}

const Port: React.FC<PortProps> = ({
  port,
  cardId,
  onConnectionStart,
  onConnectionEnd,
  onPortValueChange,
  isConnecting
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(
    port.value?.toString() || port.defaultValue?.toString() || ''
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onConnectionStart(cardId, port.id, port.type);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isConnecting) {
      onConnectionEnd(cardId, port.id, port.type);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (port.type === 'input' && !port.connected && onPortValueChange) {
      setIsEditing(true);
      const currentValue = port.value !== null && port.value !== undefined 
        ? getDisplayValue(port.value)
        : getDisplayValue(port.defaultValue);
      setEditValue(currentValue);
    }
  };

  const handleEditFinish = () => {
    if (onPortValueChange && editValue !== '') {
      let parsedValue: unknown;
      
      // Parse based on dataType
      switch (port.dataType) {
        case 'number':
          parsedValue = Number(editValue) || 0;
          break;
        case 'boolean':
          parsedValue = editValue.toLowerCase() === 'true';
          break;
        case 'array':
          try {
            parsedValue = JSON.parse(editValue);
          } catch {
            parsedValue = [];
          }
          break;
        default:
          parsedValue = editValue;
      }
      
      onPortValueChange(cardId, port.id, parsedValue);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditFinish();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(port.value?.toString() || '');
    }
  };

  const portClass = `port ${port.type} ${port.connected ? 'connected' : ''}`;
  const portColor = port.type === 'input' ? '#3b82f6' : '#ef4444'; // blue for input, red for output

  const getDisplayValue = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    return '';
  };

  const displayValue = port.value !== null && port.value !== undefined 
    ? getDisplayValue(port.value)
    : getDisplayValue(port.defaultValue);

  return (
    <div className={`port-container ${port.type}`}>
      <button
        type="button"
        className={portClass}
        data-card-id={cardId}
        data-port-id={port.id}
        style={{
          backgroundColor: port.connected ? portColor : '#374151',
          borderColor: portColor,
        }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        title={`${port.name} (${port.dataType})`}
        aria-label={`${port.type} port: ${port.name}`}
      />
      {isEditing ? (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleEditFinish}
          onKeyDown={handleKeyDown}
          className="port-edit-input"
          autoFocus
          style={{
            fontSize: '0.7rem',
            padding: '2px 4px',
            border: '1px solid #3b82f6',
            borderRadius: '3px',
            background: '#1f2937',
            color: '#f9fafb',
            width: '60px',
          }}
        />
      ) : (
        <button
          type="button"
          className="port-label-button"
          onDoubleClick={handleDoubleClick}
          style={{
            background: 'none',
            border: 'none',
            color: 'inherit',
            font: 'inherit',
            cursor: port.type === 'input' && !port.connected ? 'pointer' : 'default',
            padding: 0,
          }}
        >
          <span className="port-label">
            {port.name}
            {port.type === 'input' && displayValue && port.showDisplayValue && (
              <span style={{ color: '#10b981', fontWeight: 'bold' }}>: {displayValue}</span>
            )}
          </span>
        </button>
      )}
    </div>
  );
};

export default Port;
