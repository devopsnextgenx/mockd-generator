import React, { useRef, useEffect, useState } from 'react';
import Card from './Card';
import PrintArrayCard from './PrintArrayCard';
import JsonPreviewCard from './JsonPreviewCard';
import Connection from './Connection';
import type { 
  Card as CardType, 
  Connection as ConnectionType, 
  CanvasState
} from '../types';

interface CanvasProps {
  cards: CardType[];
  connections: ConnectionType[];
  canvasState: CanvasState;
  onCardPositionChange: (cardId: string, position: { x: number; y: number }) => void;
  onCardPropertyChange: (cardId: string, propertyName: string, value: string | number | boolean | string[]) => void;
  onPortValueChange: (cardId: string, portId: string, value: unknown) => void;
  onCardSelect: (cardId: string, isMultiSelect: boolean) => void;
  onConnectionSelect: (connectionId: string) => void;
  onConnectionCreate: (sourceCardId: string, sourcePortId: string, targetCardId: string, targetPortId: string) => void;
  onCanvasClick: () => void;
  onDeleteSelected: () => void;
  onCanvasDrop: (event: React.DragEvent<HTMLDivElement>) => void;
}

const Canvas: React.FC<CanvasProps> = ({
  cards,
  connections,
  canvasState,
  onCardPositionChange,
  onCardPropertyChange,
  onPortValueChange,
  onCardSelect,
  onConnectionSelect,
  onConnectionCreate,
  onCanvasClick,
  onDeleteSelected,
  onCanvasDrop,
}) => {
  console.log('🖼️ Canvas render - Cards count:', cards.length);
  console.log('🖼️ Canvas cards received:', cards.map(c => ({ name: c.name, position: c.position, id: c.id.substring(0, 8) })));
  if (cards.length > 0) {
    console.log('🖼️ First card details:', cards[0]);
  }
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  
  const [connectionState, setConnectionState] = useState<{
    isConnecting: boolean;
    sourceCardId?: string;
    sourcePortId?: string;
    sourcePortType?: 'input' | 'output';
    tempLine?: { x1: number; y1: number; x2: number; y2: number };
  }>({
    isConnecting: false,
  });

  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isDragOver, setIsDragOver] = useState(false);

  // Handle mouse move for temporary connection line
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (connectionState.isConnecting && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    };

    const handleMouseUp = () => {
      if (connectionState.isConnecting) {
        setConnectionState({ isConnecting: false });
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [connectionState.isConnecting]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && canvasState.selectedItems.length > 0) {
        onDeleteSelected();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [canvasState.selectedItems, onDeleteSelected]);

  const handleConnectionStart = (cardId: string, portId: string, portType: 'input' | 'output') => {
    // Only allow starting connections from output ports
    if (portType === 'output') {
      setConnectionState({
        isConnecting: true,
        sourceCardId: cardId,
        sourcePortId: portId,
        sourcePortType: portType,
      });
    }
  };

  const handleConnectionEnd = (cardId: string, portId: string, portType: 'input' | 'output') => {
    if (
      connectionState.isConnecting &&
      connectionState.sourceCardId &&
      connectionState.sourcePortId &&
      portType === 'input' &&
      cardId !== connectionState.sourceCardId
    ) {
      onConnectionCreate(
        connectionState.sourceCardId,
        connectionState.sourcePortId,
        cardId,
        portId
      );
    }
    setConnectionState({ isConnecting: false });
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCanvasClick();
      setConnectionState({ isConnecting: false });
    }
  };

  const handleCanvasDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    console.log('🎯 CANVAS: DRAG OVER event - mouse moving over canvas');
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleCanvasDrop = (e: React.DragEvent<HTMLDivElement>) => {
    console.log('🎯 CANVAS: DROP event received in Canvas component');
    e.preventDefault();
    setIsDragOver(false);
    console.log('🎯 CANVAS: Calling parent onCanvasDrop handler...');
    onCanvasDrop(e);
    console.log('🎯 CANVAS: Parent handler called');
  };

  const handleCanvasDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    console.log('🎯 CANVAS: DRAG LEAVE event');
    // Only set to false if we're leaving the canvas entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
      console.log('🎯 CANVAS: Left canvas area, removing drag-over state');
    }
  };

  const getTemporaryConnectionPath = () => {
    if (!connectionState.isConnecting || !connectionState.sourceCardId) {
      return null;
    }

    const sourceCard = cards.find(card => card.id === connectionState.sourceCardId);
    if (!sourceCard) return null;

    const sourcePort = sourceCard.outputPorts.find(port => port.id === connectionState.sourcePortId);
    if (!sourcePort) return null;

    // Try to get actual position from DOM first
    const portElement = document.querySelector(`[data-card-id="${connectionState.sourceCardId}"][data-port-id="${connectionState.sourcePortId}"]`);
    let sourceX: number;
    let sourceY: number;
    
    if (portElement && canvasRef.current) {
      const rect = portElement.getBoundingClientRect();
      const canvasRect = canvasRef.current.getBoundingClientRect();
      sourceX = rect.left + rect.width / 2 - canvasRect.left;
      sourceY = rect.top + rect.height / 2 - canvasRect.top;
    } else {
      // Fallback to calculation - since ports are now in footer
      const sourceOutputIndex = sourceCard.outputPorts.indexOf(sourcePort);
      
      // Check if source card is JsonPreviewCard or PrintArrayCard (output cards)
      const isSourceOutputCard = sourceCard.name.toLowerCase().includes('print') || 
                                sourceCard.name.toLowerCase().includes('json') ||
                                sourceCard.definitionId === 'print-array' ||
                                sourceCard.definitionId === 'json-preview';
      
      if (isSourceOutputCard) {
        // For JsonPreviewCard and PrintArrayCard, ports are now in footer
        // Calculate position based on footer layout
        const cardWidth = 400; // Default card width
        const footerHeight = 40; // Footer height
        const cardHeight = 500; // Default card height
        
        // Output ports are on the right side of footer, positioned with gap of 12px
        // Each port takes about 60px of space (name + port + gap)
        const portSpacing = 60;
        const startOffsetFromRight = 20; // Initial offset from right edge
        
        sourceX = sourceCard.position.x + cardWidth - startOffsetFromRight - (sourceOutputIndex * portSpacing);
        sourceY = sourceCard.position.y + cardHeight - (footerHeight / 2); // Center of footer
      } else {
        // For regular cards, output ports are still on the right side
        sourceX = sourceCard.position.x + 200; // Right edge of card
        
        // Calculate card height - regular cards have a minimum height of 120px
        const cardHeight = 120; // minHeight from Card component
        const portBottomOffset = 20 + (sourceCard.outputPorts.length - 1 - sourceOutputIndex) * 25;
        sourceY = sourceCard.position.y + cardHeight - portBottomOffset;
      }
    }

    return {
      x1: sourceX,
      y1: sourceY,
      x2: mousePosition.x,
      y2: mousePosition.y,
    };
  };

  const tempPath = getTemporaryConnectionPath();

  return (
    <div
      ref={canvasRef}
      className={`canvas canvas-container ${isDragOver ? 'drag-over' : ''}`}
      onDrop={handleCanvasDrop}
      onDragOver={handleCanvasDragOver}
      onDragLeave={handleCanvasDragLeave}
      role="application"
      aria-label="Canvas workspace"
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'auto',
        background: 'linear-gradient(180deg, #374151 0%, #1f2937 100%)',
      }}
    >
      {/* Invisible interaction layer for canvas clicks */}
      <button
        onClick={handleCanvasClick}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'transparent',
          border: 'none',
          cursor: 'default',
          zIndex: 0,
        }}
        aria-label="Canvas workspace - click to deselect items"
      />
      {/* SVG layer for connections */}
      <svg
        ref={svgRef}
        className="connections-layer"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1000,
        }}
      >
        {/* Existing connections */}
        {connections.map((connection) => (
          <Connection
            key={connection.id}
            connection={connection}
            cards={cards}
            isSelected={canvasState.selectedItems.includes(connection.id)}
            onClick={onConnectionSelect}
          />
        ))}

        {/* Temporary connection line */}
        {tempPath && (
          <line
            x1={tempPath.x1}
            y1={tempPath.y1}
            x2={tempPath.x2}
            y2={tempPath.y2}
            stroke="#6b7280"
            strokeWidth="2"
            strokeDasharray="5,5"
            style={{ pointerEvents: 'none' }}
          />
        )}
      </svg>

      {/* Cards layer */}
      <div
        className="cards-layer"
        style={{
          position: 'relative',
          zIndex: 2,
        }}
      >
        {/* Debug info */}
        <div 
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '10px',
            borderRadius: '4px',
            fontSize: '12px',
            zIndex: 1000,
            fontFamily: 'monospace',
          }}
        >
          <div>📊 Cards: {cards.length}</div>
          <div>🎯 Drag State: {isDragOver ? '🟢 ACTIVE' : '⚪ INACTIVE'}</div>
          <div>🖱️ Canvas Ready: ✅</div>
        </div>

        {cards.map((card) => {
          // Use PrintArrayCard for cards with type 'print' or name containing 'Print'
          if (card.name.toLowerCase().includes('print') || card.definitionId === 'print-array') {
            console.log('🎨 Canvas rendering PrintArrayCard:', card.name, 'ID:', card.id);
            console.log('🎨 PrintArrayCard inputPorts:', card.inputPorts);
            console.log('🎨 PrintArrayCard outputPorts:', card.outputPorts);
            return (
              <PrintArrayCard
                key={card.id}
                card={card}
                onPositionChange={onCardPositionChange}
                onPortValueChange={onPortValueChange}
                onConnectionStart={handleConnectionStart}
                onConnectionEnd={handleConnectionEnd}
                onSelect={onCardSelect}
                isConnecting={connectionState.isConnecting}
              />
            );
          }

          // Use JsonPreviewCard for JSON preview cards
          if (card.name.toLowerCase().includes('json') || card.definitionId === 'json-preview') {
            console.log('🎨 Canvas rendering JsonPreviewCard:', card.name, 'ID:', card.id);
            console.log('🎨 JsonPreviewCard inputPorts:', card.inputPorts);
            console.log('🎨 JsonPreviewCard outputPorts:', card.outputPorts);
            return (
              <JsonPreviewCard
                key={card.id}
                card={card}
                onPositionChange={onCardPositionChange}
                onPortValueChange={onPortValueChange}
                onConnectionStart={handleConnectionStart}
                onConnectionEnd={handleConnectionEnd}
                onSelect={onCardSelect}
                isConnecting={connectionState.isConnecting}
              />
            );
          }

          // Default Card component for other card types
          return (
            <Card
              key={card.id}
              card={card}
              onPositionChange={onCardPositionChange}
              onPropertyChange={onCardPropertyChange}
              onPortValueChange={onPortValueChange}
              onConnectionStart={handleConnectionStart}
              onConnectionEnd={handleConnectionEnd}
              onSelect={onCardSelect}
              isConnecting={connectionState.isConnecting}
            />
          );
        })}
      </div>
    </div>
  );
};

export default Canvas;
