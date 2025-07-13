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
          minWidth: '200px',
          minHeight: '120px',
          border: '2px solid #10b981', // Make cards highly visible for testing
          backgroundColor: '#1f2937',
          zIndex: 100, // Ensure they appear on top
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
      >
        {/* Card Header */}
        <div className="card-header">
          <h3 className="card-title">
            {card.name}
          </h3>
          <button
            type="button"
            className="expand-button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            aria-label={isExpanded ? 'Collapse card' : 'Expand card'}
          >
            {isExpanded ? '−' : '+'}
          </button>
        </div>

        {/* Card Body - Properties */}
        {isExpanded && (
          <div className="card-body">
            <div className="properties-section">
              <h4>Properties</h4>
              {card.properties.map((property) => (
                <div key={property.name} className="property-item">
                  <label className="property-label">
                    {property.name}
                  </label>
                  {renderPropertyInput(property)}
                  {property.description && (
                    <span className="property-description">
                      {property.description}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input Ports - Left side */}
        <div className="ports-section input-ports">
          {card.inputPorts.map((port, index) => (
            <div
              key={port.id}
              className="port-wrapper input-port"
              style={{
                position: 'absolute',
                left: '-6px',
                top: `${40 + index * 25}px`, // Start from top of card body, space them out
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

export default Card;
