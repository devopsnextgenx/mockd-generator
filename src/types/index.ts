// Core types for the visual graph programming system

export interface Port {
  id: string;
  name: string;
  type: 'input' | 'output';
  dataType: string; // e.g., 'string', 'number', 'array', 'object'
  connected: boolean;
  value?: unknown;
  defaultValue?: unknown; // Default value for input ports
  showDisplayValue?: boolean; // Whether to show the display value in the UI
}

export interface Connection {
  id: string;
  sourceCardId: string;
  sourcePortId: string;
  targetCardId: string;
  targetPortId: string;
}

export interface CardProperty {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'array';
  value: string | number | boolean | string[];
  options?: string[]; // For select type
  description?: string;
}

export interface CardDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  inputPorts: (Omit<Port, 'id' | 'connected' | 'value'> & { defaultValue?: unknown })[];
  outputPorts: Omit<Port, 'id' | 'connected' | 'value'>[];
  properties: CardProperty[];
  executor: string; // Function name or code to execute
}

export interface Card {
  id: string;
  definitionId: string;
  name: string;
  position: { x: number; y: number };
  inputPorts: Port[];
  outputPorts: Port[];
  properties: CardProperty[];
  isSelected: boolean;
}

export interface Pipeline {
  id: string;
  name: string;
  description: string;
  cards: Card[];
  connections: Connection[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ExecutionResult {
  cardId: string;
  outputs: Record<string, unknown>;
  error?: string;
  executionTime: number;
}

export interface PipelineExecution {
  pipelineId: string;
  results: ExecutionResult[];
  status: 'running' | 'completed' | 'error';
  startTime: Date;
  endTime?: Date;
}

// Canvas state
export interface CanvasState {
  zoom: number;
  offset: { x: number; y: number };
  selectedItems: string[]; // IDs of selected cards/connections
  dragState: {
    isDragging: boolean;
    startPosition: { x: number; y: number };
    currentPosition: { x: number; y: number };
  };
}

// Application state
export interface AppState {
  pipeline: Pipeline;
  canvas: CanvasState;
  cardDefinitions: CardDefinition[];
  isExecuting: boolean;
  lastExecution?: PipelineExecution;
}
