// AI Chat Types

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  visualization?: ChartVisualization;
  isStreaming?: boolean;
}

export interface ChartVisualization {
  id: string;
  type: 'line' | 'bar' | 'area' | 'donut' | 'pie';
  title: string;
  data: any[];
  config?: {
    xKey?: string;
    yKey?: string;
    categories?: string[];
    colors?: string[];
    valueFormatter?: string; // Function as string to be evaluated
  };
}

export interface ChatContext {
  // Current dashboard state
  selectedClientId: string | null;
  selectedWebsiteId: string | null;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  comparisonPeriod: 'none' | 'previous_period' | 'previous_year';
  
  // Available data
  salesData?: any;
  productData?: any;
  marketingData?: any;
  websiteData?: any;
  annotations?: any[];
  targets?: any[];
  customLinks?: any[];
}

export interface ChatRequest {
  message: string;
  context: ChatContext;
  conversationHistory: ChatMessage[];
}

export interface ChatResponse {
  success: boolean;
  message?: string;
  visualization?: ChartVisualization;
  error?: string;
}

export interface StreamChunk {
  type: 'text' | 'visualization' | 'error' | 'done';
  content?: string;
  visualization?: ChartVisualization;
  error?: string;
}

