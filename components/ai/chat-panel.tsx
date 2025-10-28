'use client';

import { useState, useRef, useEffect } from 'react';
import { useAIChat } from '@/lib/context/ai-chat-context';
import { useDashboard } from '@/lib/context/dashboard-context';
import { useAuth } from '@/lib/auth/context';
import { ChatMessage, ChatContext, ChartVisualization } from '@/types/ai-chat';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { 
  X, 
  Send, 
  Sparkles, 
  Trash2, 
  Maximize2,
  User,
  Bot,
  ChevronRight,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatVisualizationModal } from './chat-visualization-modal';
import { motion, AnimatePresence } from 'framer-motion';

export function ChatPanel() {
  const { isOpen, setIsOpen, messages, addMessage, clearMessages, isLoading, setIsLoading } = useAIChat();
  const { selectedClientId, selectedWebsiteId, dateRange, comparisonPeriod } = useDashboard();
  const { user } = useAuth();
  
  const [input, setInput] = useState('');
  const [selectedVisualization, setSelectedVisualization] = useState<ChartVisualization | null>(null);
  const [isVisualizationModalOpen, setIsVisualizationModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus textarea when panel opens
  useEffect(() => {
    if (isOpen) {
      textareaRef.current?.focus();
    }
  }, [isOpen]);

  const buildContext = async (): Promise<ChatContext> => {
    const context: ChatContext = {
      selectedClientId,
      selectedWebsiteId,
      dateRange,
      comparisonPeriod,
    };

    // Debug logging
    console.log('Building context with:', {
      selectedClientId,
      selectedWebsiteId,
      dateRange,
    });

    // Fetch actual data from APIs if we have a client and website selected
    if (selectedClientId && selectedWebsiteId) {
      try {
        const token = await user?.getIdToken();
        const headers = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        };

        // Get client info to get dataset ID
        const clientResponse = await fetch(`/api/admin/clients/${selectedClientId}`, { headers });
        const clientData = await clientResponse.json();
        const datasetId = clientData.data?.bigQueryDatasetId;

        console.log('Dataset ID:', datasetId);

        if (datasetId) {
          // Get the storeId from the website document if a specific website is selected
          let websiteFilter = 'all_combined';
          if (selectedWebsiteId && selectedWebsiteId !== 'all_combined') {
            const websiteResponse = await fetch(
              `/api/admin/clients/${selectedClientId}/websites/${selectedWebsiteId}`,
              { headers }
            );
            if (websiteResponse.ok) {
              const websiteData = await websiteResponse.json();
              websiteFilter = websiteData.data?.storeId || selectedWebsiteId;
            }
          }

          const params = new URLSearchParams({
            dataset_id: datasetId,
            website_id: websiteFilter,
            start_date: dateRange.startDate,
            end_date: dateRange.endDate,
          });

          // Fetch sales data
          const salesResponse = await fetch(`/api/reports/sales-overview?${params}`, { headers });
          if (salesResponse.ok) {
            const salesData = await salesResponse.json();
            context.salesData = salesData.data;
          }

          // Fetch top products
          const productsResponse = await fetch(`/api/reports/top-products?${params}&limit=10&sort_by=revenue`, { headers });
          if (productsResponse.ok) {
            const productsData = await productsResponse.json();
            context.productData = productsData.data;
          }

          // Fetch annotations
          const annotationsResponse = await fetch(`/api/admin/clients/${selectedClientId}/annotations`, { headers });
          if (annotationsResponse.ok) {
            const annotationsData = await annotationsResponse.json();
            context.annotations = annotationsData.data;
          }

          // Fetch targets
          const targetsResponse = await fetch(`/api/admin/clients/${selectedClientId}/targets`, { headers });
          if (targetsResponse.ok) {
            const targetsData = await targetsResponse.json();
            context.targets = targetsData.data;
          }
        }
      } catch (error) {
        console.error('Error fetching context data:', error);
      }
    }

    return context;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    addMessage(userMessage);
    setInput('');
    setIsLoading(true);

    try {
      const context = await buildContext();
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await user?.getIdToken()}`,
        },
        body: JSON.stringify({
          message: input.trim(),
          context,
          conversationHistory,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
          visualization: data.visualization,
        };

        addMessage(assistantMessage);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}. Please try again.`,
        timestamp: new Date(),
      };
      addMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const openVisualization = (viz: ChartVisualization) => {
    setSelectedVisualization(viz);
    setIsVisualizationModalOpen(true);
  };

  if (!isOpen) return null;

  return (
    <>
      <motion.div
        initial={{ x: 400 }}
        animate={{ x: 0 }}
        exit={{ x: 400 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 h-screen w-96 bg-white border-l border-gray-200 shadow-2xl flex flex-col z-50"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
              <p className="text-xs text-gray-600">Powered by Gemini 2.5 Flash</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={clearMessages}
              className="h-8 w-8"
              title="Clear conversation"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="inline-flex p-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full mb-4">
                <Sparkles className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                How can I help you today?
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Ask me anything about your data, trends, or performance.
              </p>
              <div className="space-y-2 text-left">
                <button
                  onClick={() => setInput("What are my top performing products?")}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-sm"
                >
                  <ChevronRight className="h-4 w-4 inline mr-2 text-blue-600" />
                  What are my top performing products?
                </button>
                <button
                  onClick={() => setInput("How is my revenue trending?")}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-sm"
                >
                  <ChevronRight className="h-4 w-4 inline mr-2 text-blue-600" />
                  How is my revenue trending?
                </button>
                <button
                  onClick={() => setInput("Show me customer insights")}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-sm"
                >
                  <ChevronRight className="h-4 w-4 inline mr-2 text-blue-600" />
                  Show me customer insights
                </button>
              </div>
            </div>
          )}

          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                )}
                
                <div className={`flex-1 max-w-[85%] ${message.role === 'user' ? 'order-first' : ''}`}>
                  <Card className={`p-3 ${
                    message.role === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-50 text-gray-900'
                  }`}>
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          // Custom styling for markdown elements
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          ul: ({ children }) => <ul className="mb-2 ml-4 list-disc">{children}</ul>,
                          ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal">{children}</ol>,
                          li: ({ children }) => <li className="mb-1">{children}</li>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          code: ({ children }) => (
                            <code className={`px-1 py-0.5 rounded text-xs ${
                              message.role === 'user' ? 'bg-blue-700' : 'bg-gray-200'
                            }`}>
                              {children}
                            </code>
                          ),
                          pre: ({ children }) => (
                            <pre className={`p-2 rounded text-xs overflow-x-auto ${
                              message.role === 'user' ? 'bg-blue-700' : 'bg-gray-200'
                            }`}>
                              {children}
                            </pre>
                          ),
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                    
                    {message.visualization && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openVisualization(message.visualization!)}
                        className="mt-3 w-full"
                      >
                        <Maximize2 className="h-4 w-4 mr-2" />
                        View Chart
                      </Button>
                    )}
                  </Card>
                  <div className="text-xs text-gray-500 mt-1 px-1">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {message.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="h-5 w-5 text-gray-600" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <Card className="p-3 bg-gray-50">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </Card>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about your data..."
              className="flex-1 min-h-[44px] max-h-32 resize-none"
              rows={1}
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="h-11 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </motion.div>

      {/* Visualization Modal */}
      <ChatVisualizationModal
        visualization={selectedVisualization}
        isOpen={isVisualizationModalOpen}
        onClose={() => setIsVisualizationModalOpen(false)}
      />
    </>
  );
}

