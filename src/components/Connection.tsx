import React from 'react';
import type { Connection as ConnectionType, Card } from '../types';

interface ConnectionProps {
  connection: ConnectionType;
  cards: Card[];
  isSelected: boolean;
  onClick: (connectionId: string) => void;
}

const Connection: React.FC<ConnectionProps> = ({
  connection,
  cards,
  isSelected,
  onClick,
}) => {
  // Find source and target cards
  const sourceCard = cards.find(card => card.id === connection.sourceCardId);
  const targetCard = cards.find(card => card.id === connection.targetCardId);

  if (!sourceCard || !targetCard) {
    return null;
  }

  // Find source and target ports
  const sourcePort = sourceCard.outputPorts.find(port => port.id === connection.sourcePortId);
  const targetPort = targetCard.inputPorts.find(port => port.id === connection.targetPortId);

  if (!sourcePort || !targetPort) {
    return null;
  }

  // Helper function to get actual port position from DOM
  const getPortPosition = (cardId: string, portId: string) => {
    const portElement = document.querySelector(`[data-card-id="${cardId}"][data-port-id="${portId}"]`);
    if (portElement) {
      const rect = portElement.getBoundingClientRect();
      const canvas = document.querySelector('.canvas-container') as HTMLElement;
      if (canvas) {
        const canvasRect = canvas.getBoundingClientRect();
        return {
          x: rect.left + rect.width / 2 - canvasRect.left,
          y: rect.top + rect.height / 2 - canvasRect.top,
        };
      }
    }
    return null;
  };

  // Try to get actual positions from DOM first, fallback to calculation
  const actualSourcePos = getPortPosition(sourceCard.id, sourcePort.id);
  const actualTargetPos = getPortPosition(targetCard.id, targetPort.id);

  // Calculate positions based on card type and port layout
  let sourceX: number;
  let sourceY: number;
  let targetX: number;
  let targetY: number;

  // Use DOM-based positioning if available, otherwise fallback to calculation
  if (actualSourcePos) {
    sourceX = actualSourcePos.x;
    sourceY = actualSourcePos.y;
  } else {
    // Output ports are always on the right side, positioned from bottom
    const sourceOutputIndex = sourceCard.outputPorts.indexOf(sourcePort);
    
    // Check if source card is JsonPreviewCard or PrintArrayCard (output cards)
    const isSourceOutputCard = sourceCard.name.toLowerCase().includes('print') || 
                              sourceCard.name.toLowerCase().includes('json') ||
                              sourceCard.definitionId === 'print-array' ||
                              sourceCard.definitionId === 'json-preview';
    
    if (isSourceOutputCard) {
      // For JsonPreviewCard and PrintArrayCard, calculate position more accurately
      // Card structure: header (~40px) + input ports section (~60px) + resize controls (~40px) + editor (300px default) + status bar (~30px)
      // Output ports use: bottom: ${20 + (card.outputPorts.length - 1 - index) * 25}px, right: '-6px'
      sourceX = sourceCard.position.x + 400; // Card max-width is 400px, so right edge
      
      const baseCardHeight = 40; // header
      const inputSectionHeight = 60; // input ports section  
      const resizeControlsHeight = 40; // resize controls
      const editorHeight = 300; // default editor height (could be dynamic)
      const statusBarHeight = 30; // status bar
      const totalCardHeight = baseCardHeight + inputSectionHeight + resizeControlsHeight + editorHeight + statusBarHeight;
      
      const portBottomOffset = 20 + (sourceCard.outputPorts.length - 1 - sourceOutputIndex) * 25;
      sourceY = sourceCard.position.y + totalCardHeight - portBottomOffset;
    } else {
      // For regular cards, output ports are positioned from the bottom
      sourceX = sourceCard.position.x + 200; // Right edge of card
      
      // Calculate card height - regular cards have a minimum height of 120px
      const cardHeight = 120; // minHeight from Card component
      const portBottomOffset = 20 + (sourceCard.outputPorts.length - 1 - sourceOutputIndex) * 25;
      sourceY = sourceCard.position.y + cardHeight - portBottomOffset;
    }
  }

  if (actualTargetPos) {
    targetX = actualTargetPos.x;
    targetY = actualTargetPos.y;
  } else {
    // Input port positioning depends on card type
    // Check if target card is PrintArrayCard or JsonPreviewCard (output cards with inline input ports)
    const isOutputCard = targetCard.name.toLowerCase().includes('print') || 
                        targetCard.name.toLowerCase().includes('json') ||
                        targetCard.definitionId === 'print-array' ||
                        targetCard.definitionId === 'json-preview';
    
    if (isOutputCard) {
      // For output cards, input ports are inside the card body (above editor)
      // Position them in the input ports section
      const targetInputIndex = targetCard.inputPorts.indexOf(targetPort);
      targetX = targetCard.position.x + 50 + (targetInputIndex * 60); // Inside the card, spaced horizontally
      targetY = targetCard.position.y + 80; // Below header, in the input section
    } else {
      // For regular cards, input ports are on the left side, positioned from top
      const targetInputIndex = targetCard.inputPorts.indexOf(targetPort);
      targetX = targetCard.position.x; // Left edge of card
      targetY = targetCard.position.y + 40 + targetInputIndex * 25; // From top
    }
  }

  // Create a curved path
  const controlPoint1X = sourceX + (targetX - sourceX) * 0.5;
  const controlPoint1Y = sourceY;
  const controlPoint2X = sourceX + (targetX - sourceX) * 0.5;
  const controlPoint2Y = targetY;

  const pathData = `M ${sourceX} ${sourceY} C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${targetX} ${targetY}`;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(connection.id);
  };

  return (
    <g className={`connection ${isSelected ? 'selected' : ''}`} style={{ pointerEvents: 'auto' }}>
      {/* Connection path */}
      <path
        d={pathData}
        fill="none"
        stroke={isSelected ? '#10b981' : '#6b7280'}
        strokeWidth={isSelected ? 3 : 2}
        className="connection-path"
        onClick={handleClick}
        style={{ cursor: 'pointer', pointerEvents: 'auto' }}
      />
      
      {/* Connection hit area (invisible wider path for easier clicking) */}
      <path
        d={pathData}
        fill="none"
        stroke="transparent"
        strokeWidth="10"
        className="connection-hit-area"
        onClick={handleClick}
        style={{ cursor: 'pointer', pointerEvents: 'auto' }}
      />
      
      {/* Arrow at the end */}
      <defs>
        <marker
          id={`arrowhead-${connection.id}`}
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3, 0 6"
            fill={isSelected ? '#10b981' : '#6b7280'}
          />
        </marker>
      </defs>
      
      <path
        d={pathData}
        fill="none"
        stroke={isSelected ? '#10b981' : '#6b7280'}
        strokeWidth={isSelected ? 3 : 2}
        markerEnd={`url(#arrowhead-${connection.id})`}
        className="connection-arrow"
        onClick={handleClick}
        style={{ cursor: 'pointer', pointerEvents: 'auto' }}
      />
    </g>
  );
};

export default Connection;
