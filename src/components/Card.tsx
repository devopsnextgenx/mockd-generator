import React, { useState, useCallback } from 'react';
import Port from './Port';
import type { Card as CardType, CardProperty } from '../types';

interface CardProps {
  card: CardType;
  onPositionChange: (cardId: string, position: { x: number; y: number }) => void;
  onPropertyChange: (cardId: string, propertyName: string, value: string | number | boolean | string[]) => void;
  onPortValueChange: (cardId: string, portId: string, value: unknown) => void;
  onConnectionStart: (cardId: string, portId: string, portType: 'input' | 'output') => void;
  onConnectionEnd: (cardId: string, portId: string, portType: 'input' | 'output') => void;
  onSelect: (cardId: string, isMultiSelect: boolean) => void;
  isConnecting: boolean;
}

const Card: React.FC<CardProps> = ({
  card,
  onPositionChange,
  onPropertyChange,
  onPortValueChange,
  onConnectionStart,
  onConnectionEnd,
  onSelect,
  isConnecting,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

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
      x: Math.max(0, Math.min(e.clientX - canvasRect.left - dragOffset.x, canvasRect.width - 200)),
      y: Math.max(0, Math.min(e.clientY - canvasRect.top - dragOffset.y, canvasRect.height - 120))
    };
    
    onPositionChange(card.id, newPosition);
  }, [isDragging, dragOffset, onPositionChange, card.id]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add global mouse event listeners when dragging
  React.useEffect(() => {
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

  const handlePropertyChange = (property: CardProperty, value: string | number | boolean) => {
    onPropertyChange(card.id, property.name, value);
  };

  const renderPropertyInput = (property: CardProperty) => {
    switch (property.type) {
      case 'string':
        return (
          <input
            type="text"
            value={String(property.value)}
            onChange={(e) => handlePropertyChange(property, e.target.value)}
            className="property-input"
          />
        );
      case 'number':
        return (
          <input
            type="number"
            value={Number(property.value)}
            onChange={(e) => handlePropertyChange(property, Number(e.target.value))}
            className="property-input"
          />
        );
      case 'boolean':
        return (
          <input
            type="checkbox"
            checked={Boolean(property.value)}
            onChange={(e) => handlePropertyChange(property, e.target.checked)}
            className="property-input"
          />
        );
      case 'select':
        return (
          <select
            value={String(property.value)}
            onChange={(e) => handlePropertyChange(property, e.target.value)}
            className="property-input"
          >
            {property.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      default:
        return null;
    }
  };

  return (
      <div
        className={`card ${card.isSelected ? 'selected' : ''}`}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label={`Card: ${card.name}`}
        style={{ 
          position: 'absolute',
          left: card.position.x,
          top: card.position.y,
          minWidth: '220px',
          minHeight: '140px',
          border: '2px solid #10b981',
          backgroundColor: '#1f2937',
          zIndex: 100,
          cursor: isDragging ? 'grabbing' : 'grab',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Card Header */}
        <div className="card-header" style={{
          padding: '8px 12px',
          borderBottom: '1px solid #374151',
          backgroundColor: '#111827',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          minHeight: '40px'
        }}>
          <h3 className="card-title" style={{
            margin: 0,
            fontSize: '0.9rem',
            color: '#f9fafb',
            fontWeight: '600'
          }}>
            {card.name} [{card.id}]
          </h3>
          <button
            type="button"
            className="expand-button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            aria-label={isExpanded ? 'Collapse card' : 'Expand card'}
            style={{
              background: 'none',
              border: '1px solid #374151',
              color: '#d1d5db',
              width: '24px',
              height: '24px',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isExpanded ? '−' : '+'}
          </button>
        </div>

        {/* Card Body - Properties */}
        <div className="card-body" style={{
          flex: 1,
          padding: isExpanded ? '12px' : '8px',
          backgroundColor: '#1f2937',
          overflow: 'auto'
        }}>
          {isExpanded && card.properties.length > 0 && (
            <div className="properties-section">
              <h4 style={{ 
                margin: '0 0 8px 0', 
                fontSize: '0.8rem', 
                color: '#9ca3af',
                fontWeight: '500'
              }}>
                Properties
              </h4>
              {card.properties.map((property) => (
                <div key={property.name} className="property-item" style={{
                  marginBottom: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <label className="property-label" style={{
                    fontSize: '0.7rem',
                    color: '#d1d5db',
                    fontWeight: '500'
                  }}>
                    {property.name}
                  </label>
                  {renderPropertyInput(property)}
                  {property.description && (
                    <span className="property-description" style={{
                      fontSize: '0.65rem',
                      color: '#6b7280',
                      fontStyle: 'italic'
                    }}>
                      {property.description}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          {!isExpanded && (
            <div style={{
              fontSize: '0.7rem',
              color: '#6b7280',
              textAlign: 'center'
            }}>
              Click + to expand properties
            </div>
          )}
        </div>

        {/* Card Footer - Ports */}
        <div className="card-footer" style={{
          position: 'relative',
          minHeight: '50px',
          borderTop: '1px solid #374151',
          backgroundColor: '#111827',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px'
        }}>
          {/* Input Ports - Left side */}
          <div className="input-ports-section" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            alignItems: 'flex-start'
          }}>
            {card.inputPorts.map((port, index) => (
              <div
                key={port.id}
                className="port-wrapper input-port"
                style={{
                  position: 'absolute',
                  left: '-8px',
                  top: `${8 + index * 28}px`,
                  zIndex: 15
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

          {/* Center space for visual balance */}
          <div style={{
            flex: 1,
            textAlign: 'center',
            fontSize: '0.65rem',
            color: '#4b5563'
          }}>
            {card.inputPorts.length > 0 && card.outputPorts.length > 0 && '⟷'}
          </div>

          {/* Output Ports - Right side */}
          <div className="output-ports-section" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            alignItems: 'flex-end'
          }}>
            {card.outputPorts.map((port, index) => (
              <div
                key={port.id}
                className="port-wrapper output-port"
                style={{
                  position: 'absolute',
                  right: '-8px',
                  top: `${8 + index * 28}px`,
                  zIndex: 15
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
      </div>
  );
};

export default Card;
