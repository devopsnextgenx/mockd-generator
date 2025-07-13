import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Form, Card as BootstrapCard, Badge } from 'react-bootstrap';
import { v4 as uuidv4 } from 'uuid';
import Canvas from './components/Canvas';
import { executors } from './utils/executors';
import type { 
  Pipeline, 
  Card, 
  Connection, 
  CanvasState, 
  CardDefinition,
  ExecutionResult
} from './types';
import './App.css';

const App: React.FC = () => {
  const [pipeline, setPipeline] = useState<Pipeline>({
    id: uuidv4(),
    name: 'New Pipeline',
    description: '',
    cards: [],
    connections: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const [canvasState, setCanvasState] = useState<CanvasState>({
    zoom: 1,
    offset: { x: 0, y: 0 },
    selectedItems: [],
    dragState: {
      isDragging: false,
      startPosition: { x: 0, y: 0 },
      currentPosition: { x: 0, y: 0 },
    },
  });

  const [cardDefinitions, setCardDefinitions] = useState<CardDefinition[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResults, setExecutionResults] = useState<ExecutionResult[]>([]);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  // Load card definitions
  useEffect(() => {
    const loadCardDefinitions = async () => {
      try {
        console.log('🔄 Loading card definitions...');
        const response = await fetch('/cards.json');
        const definitions = await response.json();
        console.log('📦 Raw definitions:', definitions);
        const definitionArray = Object.values(definitions) as CardDefinition[];
        console.log('📋 Definition array:', definitionArray);
        setCardDefinitions(definitionArray);
        console.log('✅ Card definitions loaded:', definitionArray.length, 'cards');
        console.log('📋 Available definitions:', definitionArray.map(d => d.id));
        const printArrayDef = definitionArray.find(d => d.id === 'print-array');
        console.log('🖨️ Print Array definition:', printArrayDef);
      } catch (error) {
        console.error('❌ Failed to load card definitions:', error);
      }
    };

    loadCardDefinitions();
  }, []);

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    setDebugLogs(prev => [...prev.slice(-4), logMessage]); // Keep last 5 logs
    console.log(`🐛 ${logMessage}`);
  };

  const createCard = (definitionId: string, position?: { x: number; y: number }) => {
    console.log('🎯 createCard called with:', definitionId);
    const definition = cardDefinitions.find(def => def.id === definitionId);
    if (!definition) {
      console.error('❌ Definition not found for ID:', definitionId);
      return;
    }

    console.log('✅ Found definition:', definition.name);
    console.log('📋 Definition inputPorts:', definition.inputPorts);
    console.log('📋 Definition outputPorts:', definition.outputPorts);

    // Generate a visible position within the canvas area
    const canvasWidth = 800; // Approximate canvas width
    const canvasHeight = 600; // Approximate canvas height
    const cardWidth = 200;
    const cardHeight = 150;
    
    const randomX = position?.x ?? Math.random() * (canvasWidth - cardWidth) + 50;
    const randomY = position?.y ?? Math.random() * (canvasHeight - cardHeight) + 50;

    console.log('📍 Card position:', { x: randomX, y: randomY });

    const cardId = uuidv4();
  
    const newCard: Card = {
      id: cardId,
      definitionId: definition.id,
      name: definition.name,
      position: { x: randomX, y: randomY },
      inputPorts: definition.inputPorts.map(portDef => {
        const port = {
          id: uuidv4(),
          name: portDef.name,
          type: 'input' as const,
          dataType: portDef.dataType,
          connected: false,
          value: portDef.defaultValue || null,
          defaultValue: portDef.defaultValue || null,
        };
        console.log('🔌 Creating input port:', port);
        return port;
      }),
      outputPorts: definition.outputPorts.map(portDef => {
        const port = {
          id: uuidv4(),
          name: portDef.name,
          type: 'output' as const,
          dataType: portDef.dataType,
          connected: false,
        };
        console.log('🔌 Creating output port:', port);
        return port;
      }),
      properties: [...definition.properties],
      isSelected: false,
    };

    console.log('🏗️ Creating new card:', newCard.name, 'with ID:', newCard.id);
    console.log('🏗️ Card position:', newCard.position);
    console.log('🏗️ Card input ports:', newCard.inputPorts.length);
    console.log('🏗️ Card output ports:', newCard.outputPorts.length);

    setPipeline(prev => {
      const updatedPipeline = {
        ...prev,
        cards: [...prev.cards, newCard],
        updatedAt: new Date(),
      };
      console.log('📊 Pipeline updated. Total cards:', updatedPipeline.cards.length);
      console.log('📋 Current cards:', updatedPipeline.cards.map(c => ({ name: c.name, id: c.id.substring(0, 8), position: c.position })));
      return updatedPipeline;
    });
  };

  const handleCardPositionChange = (cardId: string, position: { x: number; y: number }) => {
    setPipeline(prev => ({
      ...prev,
      cards: prev.cards.map(card =>
        card.id === cardId ? { ...card, position } : card
      ),
      updatedAt: new Date(),
    }));
  };

  const handleCardPropertyChange = (
    cardId: string, 
    propertyName: string, 
    value: string | number | boolean | string[]
  ) => {
    setPipeline(prev => ({
      ...prev,
      cards: prev.cards.map(card =>
        card.id === cardId
          ? {
              ...card,
              properties: card.properties.map(prop =>
                prop.name === propertyName ? { ...prop, value } : prop
              ),
            }
          : card
      ),
      updatedAt: new Date(),
    }));
  };

  const handleCardSelect = (cardId: string, isMultiSelect: boolean) => {
    setCanvasState(prev => {
      const newSelectedItems = isMultiSelect
        ? prev.selectedItems.includes(cardId)
          ? prev.selectedItems.filter(id => id !== cardId)
          : [...prev.selectedItems, cardId]
        : [cardId];

      return {
        ...prev,
        selectedItems: newSelectedItems,
      };
    });

    setPipeline(prev => ({
      ...prev,
      cards: prev.cards.map(card => ({
        ...card,
        isSelected: isMultiSelect
          ? card.id === cardId
            ? !card.isSelected
            : card.isSelected
          : card.id === cardId,
      })),
    }));
  };

  const handleConnectionSelect = (connectionId: string) => {
    setCanvasState(prev => ({
      ...prev,
      selectedItems: [connectionId],
    }));
  };

  const handleConnectionCreate = (
    sourceCardId: string,
    sourcePortId: string,
    targetCardId: string,
    targetPortId: string
  ) => {
    const newConnection: Connection = {
      id: uuidv4(),
      sourceCardId,
      sourcePortId,
      targetCardId,
      targetPortId,
    };

    // Update port connection status
    setPipeline(prev => ({
      ...prev,
      connections: [...prev.connections, newConnection],
      cards: prev.cards.map(card => {
        if (card.id === sourceCardId) {
          return {
            ...card,
            outputPorts: card.outputPorts.map(port =>
              port.id === sourcePortId ? { ...port, connected: true } : port
            ),
          };
        }
        if (card.id === targetCardId) {
          return {
            ...card,
            inputPorts: card.inputPorts.map(port =>
              port.id === targetPortId ? { ...port, connected: true } : port
            ),
          };
        }
        return card;
      }),
      updatedAt: new Date(),
    }));
  };

  const handleCanvasClick = () => {
    setCanvasState(prev => ({
      ...prev,
      selectedItems: [],
    }));

    setPipeline(prev => ({
      ...prev,
      cards: prev.cards.map(card => ({ ...card, isSelected: false })),
    }));
  };

  const handleDeleteSelected = () => {
    const { selectedItems } = canvasState;
    
    setPipeline(prev => {
      // Filter out selected cards and connections
      const newCards = prev.cards.filter(card => !selectedItems.includes(card.id));
      const newConnections = prev.connections.filter(
        conn => !selectedItems.includes(conn.id) &&
                !selectedItems.includes(conn.sourceCardId) &&
                !selectedItems.includes(conn.targetCardId)
      );

      // Update port connection status
      const updatedCards = newCards.map(card => ({
        ...card,
        inputPorts: card.inputPorts.map(port => ({
          ...port,
          connected: newConnections.some(conn => 
            conn.targetCardId === card.id && conn.targetPortId === port.id
          ),
        })),
        outputPorts: card.outputPorts.map(port => ({
          ...port,
          connected: newConnections.some(conn => 
            conn.sourceCardId === card.id && conn.sourcePortId === port.id
          ),
        })),
      }));

      return {
        ...prev,
        cards: updatedCards,
        connections: newConnections,
        updatedAt: new Date(),
      };
    });

    setCanvasState(prev => ({
      ...prev,
      selectedItems: [],
    }));
  };

  // Handle drop from library to canvas
  const handleCanvasDrop = (event: React.DragEvent<HTMLDivElement>) => {
    const message = '🎯 DROP EVENT TRIGGERED!';
    addDebugLog(message);
    console.log('🎯 DROP EVENT TRIGGERED!');
    console.log('🎯 Event object:', event);
    console.log('🎯 DataTransfer object:', event.dataTransfer);
    
    event.preventDefault();
    
    const definitionId = event.dataTransfer.getData('card-definition-id');
    console.log('🎯 Retrieved data from dataTransfer:', definitionId);
    addDebugLog(`📦 Data: ${definitionId}`);
    
    if (!definitionId) {
      const errorMsg = '❌ NO DEFINITION ID FOUND';
      addDebugLog(errorMsg);
      console.error('❌ NO DEFINITION ID FOUND IN DROP!');
      console.error('❌ DataTransfer types:', event.dataTransfer.types);
      console.error('❌ DataTransfer items:', event.dataTransfer.items);
      return;
    }

    // Get canvas bounding rect to calculate relative position
    const canvasElement = event.currentTarget;
    const rect = canvasElement.getBoundingClientRect();
    const position = {
      x: Math.max(0, event.clientX - rect.left - 100),
      y: Math.max(0, event.clientY - rect.top - 75)
    };

    console.log('📍 Drop position calculated:', position);
    console.log('📍 Canvas rect:', rect);
    console.log('📍 Mouse position:', { x: event.clientX, y: event.clientY });
    addDebugLog(`📍 Position: (${position.x}, ${position.y})`);
    
    console.log('🎯 CALLING createCard function...');
    createCard(definitionId, position);
    addDebugLog('✅ DROP COMPLETE!');
    console.log('✅ DROP PROCESSING COMPLETE!');
  };

  const handleCanvasDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleCanvasDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleCanvasDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const executePipeline = async () => {
    setIsExecuting(true);
    setExecutionResults([]);

    try {
      const results: ExecutionResult[] = [];
      const cardOutputs: Record<string, Record<string, unknown>> = {};

      // Topological sort to determine execution order
      const executionOrder = getExecutionOrder(pipeline.cards, pipeline.connections);

      for (const card of executionOrder) {
        const startTime = Date.now();
        
        try {
          // Prepare inputs
          const inputs: Record<string, unknown> = {};
          
          for (const inputPort of card.inputPorts) {
            const connection = pipeline.connections.find(
              conn => conn.targetCardId === card.id && conn.targetPortId === inputPort.id
            );
            
            if (connection) {
              const sourceCardOutputs = cardOutputs[connection.sourceCardId];
              if (sourceCardOutputs) {
                const sourceCard = pipeline.cards.find(c => c.id === connection.sourceCardId);
                const sourcePort = sourceCard?.outputPorts.find(p => p.id === connection.sourcePortId);
                if (sourcePort) {
                  inputs[inputPort.name] = sourceCardOutputs[sourcePort.name];
                }
              }
            }
          }

          // Find executor
          const definition = cardDefinitions.find(def => def.id === card.definitionId);
          if (!definition) {
            throw new Error(`Card definition not found: ${card.definitionId}`);
          }

          const executor = executors[definition.executor];
          if (!executor) {
            throw new Error(`Executor not found: ${definition.executor}`);
          }

          // Execute
          const outputs = executor(inputs, card.properties);
          cardOutputs[card.id] = outputs;

          // Handle array outputs and looping
          const processedOutputs: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(outputs)) {
            // Ensure all outputs are arrays for pipeline consistency
            processedOutputs[key] = Array.isArray(value) ? value : [value];
          }

          results.push({
            cardId: card.id,
            outputs: processedOutputs,
            executionTime: Date.now() - startTime,
          });

          // Update the card's output port values in the UI
          setPipeline(prev => ({
            ...prev,
            cards: prev.cards.map(c => 
              c.id === card.id 
                ? {
                    ...c,
                    outputPorts: c.outputPorts.map(port => ({
                      ...port,
                      value: processedOutputs[port.name]
                    }))
                  }
                : c
            )
          }));

          // Update connected input ports with the output values
          for (const outputPort of card.outputPorts) {
            const outputValue = processedOutputs[outputPort.name];
            const connections = pipeline.connections.filter(
              conn => conn.sourceCardId === card.id && conn.sourcePortId === outputPort.id
            );
            
            if (connections.length > 0 && outputValue !== undefined) {
              setPipeline(prev => ({
                ...prev,
                cards: prev.cards.map(c => {
                  const hasConnection = connections.some(conn => conn.targetCardId === c.id);
                  if (hasConnection) {
                    return {
                      ...c,
                      inputPorts: c.inputPorts.map(port => {
                        const connection = connections.find(conn => conn.targetPortId === port.id);
                        return connection ? { ...port, value: outputValue } : port;
                      })
                    };
                  }
                  return c;
                })
              }));
            }
          }

        } catch (error) {
          results.push({
            cardId: card.id,
            outputs: {},
            error: error instanceof Error ? error.message : String(error),
            executionTime: Date.now() - startTime,
          });
        }
      }

      setExecutionResults(results);
    } catch (error) {
      console.error('Pipeline execution failed:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const getExecutionOrder = (cards: Card[], connections: Connection[]): Card[] => {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: Card[] = [];

    const visit = (cardId: string) => {
      if (visiting.has(cardId)) {
        throw new Error('Circular dependency detected');
      }
      if (visited.has(cardId)) {
        return;
      }

      visiting.add(cardId);

      // Visit dependencies first
      const dependencies = connections
        .filter(conn => conn.targetCardId === cardId)
        .map(conn => conn.sourceCardId);

      for (const depId of dependencies) {
        visit(depId);
      }

      visiting.delete(cardId);
      visited.add(cardId);

      const card = cards.find(c => c.id === cardId);
      if (card) {
        result.push(card);
      }
    };

    for (const card of cards) {
      if (!visited.has(card.id)) {
        visit(card.id);
      }
    }

    return result;
  };

  const savePipeline = () => {
    const dataStr = JSON.stringify(pipeline, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${pipeline.name.replace(/\s+/g, '_')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const loadPipeline = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const loadedPipeline = JSON.parse(e.target?.result as string);
        setPipeline({
          ...loadedPipeline,
          createdAt: new Date(loadedPipeline.createdAt),
          updatedAt: new Date(loadedPipeline.updatedAt),
        });
      } catch (error) {
        console.error('Failed to load pipeline:', error);
        alert('Failed to load pipeline file');
      }
    };
    reader.readAsText(file);
  };

  const handlePortValueChange = (cardId: string, portId: string, value: unknown) => {
    setPipeline(prev => ({
      ...prev,
      cards: prev.cards.map(card =>
        card.id === cardId
          ? {
              ...card,
              inputPorts: card.inputPorts.map(port =>
                port.id === portId ? { ...port, value } : port
              ),
            }
          : card
      ),
      updatedAt: new Date(),
    }));
  };

  return (
    <div className="app" data-bs-theme="dark">
      {/* Header */}
      <header className="app-header bg-dark border-bottom">
        <Container fluid>
          <Row className="align-items-center">
            <Col>
              <h1 className="mb-0 text-light">Visual Graph Programming</h1>
            </Col>
            <Col xs="auto">
              <div className="d-flex gap-2 align-items-center">
                <Form.Control
                  type="text"
                  value={pipeline.name}
                  onChange={(e) => setPipeline(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Pipeline name"
                  className="bg-secondary text-light border-secondary"
                  style={{ width: '200px' }}
                />
                <Button 
                  variant="primary" 
                  onClick={savePipeline}
                  size="sm"
                >
                  Save Pipeline
                </Button>
                <Button 
                  variant="outline-primary" 
                  as="label"
                  size="sm"
                  className="mb-0"
                >
                  Load Pipeline
                  <input
                    type="file"
                    accept=".json"
                    onChange={loadPipeline}
                    style={{ display: 'none' }}
                  />
                </Button>
                <Button
                  variant="success"
                  onClick={executePipeline}
                  disabled={isExecuting || pipeline.cards.length === 0}
                  size="sm"
                >
                  {isExecuting ? 'Executing...' : 'Execute Pipeline'}
                </Button>
                <Button
                  variant="warning"
                  onClick={() => {
                    console.log('🧪 TEST: Creating person card manually at position (100, 100)');
                    createCard('person', { x: 100, y: 100 });
                  }}
                  size="sm"
                >
                  Test Add Card
                </Button>
                <Button
                  variant="info"
                  onClick={() => {
                    console.log('🧪 DEBUG INFO:');
                    console.log('- Card definitions loaded:', cardDefinitions.length);
                    console.log('- Available card IDs:', cardDefinitions.map(def => def.id));
                    console.log('- Current pipeline cards:', pipeline.cards.length);
                    console.log('- Canvas state:', canvasState);
                    console.log('- Pipeline state:', pipeline);
                  }}
                  size="sm"
                >
                  Debug Info
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    console.log('🧪 FORCE DRAG TEST: Simulating drag and drop');
                    handleCanvasDrop({
                      preventDefault: () => {},
                      dataTransfer: {
                        getData: () => 'person'
                      },
                      currentTarget: document.querySelector('.canvas'),
                      clientX: 300,
                      clientY: 200
                    } as any);
                  }}
                  size="sm"
                >
                  Force Drop Test
                </Button>
                <Badge bg="info">
                  Cards: {pipeline.cards.length}
                </Badge>
              </div>
            </Col>
          </Row>
        </Container>
      </header>

      {/* Main Content */}
      <div className="app-content">
        {/* Sidebar */}
        <aside className="sidebar bg-dark border-end">
          <h3 className="text-light mb-3">Card Library</h3>
          <div className="card-library">
            {cardDefinitions.map((definition) => (
              <div
                key={definition.id}
                className="library-card"
                draggable={true}
                onDragStart={(e) => {
                  const message = `🚀 DRAG START: ${definition.name}`;
                  addDebugLog(message);
                  console.log('🚀 DRAG START EVENT FIRED!');
                  console.log('🎯 Card being dragged:', definition.name, definition.id);
                  console.log('🎯 Event object:', e);
                  console.log('🎯 DataTransfer object:', e.dataTransfer);
                  
                  e.dataTransfer.setData('card-definition-id', definition.id);
                  e.dataTransfer.effectAllowed = 'copy';
                  
                  console.log('✅ Data set in dataTransfer:', definition.id);
                  console.log('✅ Effect allowed set to: copy');
                  console.log('🟢 DRAG START COMPLETE - READY FOR DROP!');
                }}
                onClick={() => {
                  console.log('🖱️ Library card clicked:', definition.name, 'ID:', definition.id);
                  console.log('🖱️ Available card definitions:', cardDefinitions.length);
                  console.log('🖱️ Pipeline state before:', pipeline.cards.length, 'cards');
                  createCard(definition.id);
                  console.log('🖱️ createCard function called');
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    createCard(definition.id);
                  }
                }}
                aria-label={`Add ${definition.name} to canvas`}
              >
                <div className="library-card-body">
                  <h4 className="library-card-title">
                    {definition.name}
                  </h4>
                  <p className="library-card-text">
                    {definition.description}
                  </p>
                  <Badge bg="dark" className="small">
                    {definition.category}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          {/* Execution Results */}
          {executionResults.length > 0 && (
            <div className="execution-results mt-4">
              <h3 className="text-light mb-3">Execution Results</h3>
              <div className="results-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {executionResults.map((result) => {
                  const card = pipeline.cards.find(c => c.id === result.cardId);
                  return (
                    <BootstrapCard 
                      key={result.cardId} 
                      className={`mb-2 ${result.error ? 'border-danger' : 'border-success'} bg-secondary`}
                    >
                      <BootstrapCard.Body className="p-3">
                        <BootstrapCard.Title className="h6 mb-1 text-light">
                          {card?.name || 'Unknown Card'}
                        </BootstrapCard.Title>
                        <BootstrapCard.Text className="small mb-2 text-light-emphasis">
                          Time: {result.executionTime}ms
                        </BootstrapCard.Text>
                        {result.error ? (
                          <div className="text-danger small">
                            Error: {result.error}
                          </div>
                        ) : (
                          <div className="small text-light-emphasis">
                            {Object.entries(result.outputs).map(([key, value]) => (
                              <div key={key}>
                                <strong className="text-light">{key}:</strong> {Array.isArray(value) ? `${value.length} items` : String(value)}
                              </div>
                            ))}
                          </div>
                        )}
                      </BootstrapCard.Body>
                    </BootstrapCard>
                  );
                })}
              </div>
            </div>
          )}
        </aside>

        {/* Canvas */}
        <main className="canvas-container">
          <Canvas
            cards={pipeline.cards}
            connections={pipeline.connections}
            canvasState={canvasState}
            onCardPositionChange={handleCardPositionChange}
            onCardPropertyChange={handleCardPropertyChange}
            onPortValueChange={handlePortValueChange}
            onCardSelect={handleCardSelect}
            onConnectionSelect={handleConnectionSelect}
            onConnectionCreate={handleConnectionCreate}
            onCanvasClick={handleCanvasClick}
            onDeleteSelected={handleDeleteSelected}
            onCanvasDrop={handleCanvasDrop}
          />
        </main>
      </div>

      {/* Debug Panel */}
      <div className="debug-panel bg-dark text-light p-3">
        <h4 className="mb-3">Debug Panel</h4>
        <div className="debug-logs" style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {debugLogs.map((log, index) => (
            <div key={index} className="debug-log">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;
