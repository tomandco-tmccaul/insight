import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// Initialize Genkit with Google AI plugin
const ai = genkit({
  plugins: [googleAI()],
});

// Define the chat input schema
const ChatInputSchema = z.object({
  message: z.string().describe('The user message'),
  context: z.object({
    selectedClientId: z.string().nullable(),
    selectedWebsiteId: z.string().nullable(),
    dateRange: z.object({
      startDate: z.string(),
      endDate: z.string(),
    }),
    comparisonPeriod: z.enum(['none', 'previous_period', 'previous_year']),
    salesData: z.any().optional(),
    productData: z.any().optional(),
    marketingData: z.any().optional(),
    websiteData: z.any().optional(),
    annotations: z.array(z.any()).optional(),
    targets: z.array(z.any()).optional(),
    customLinks: z.array(z.any()).optional(),
  }).describe('Current dashboard context and data'),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  })).describe('Previous conversation messages'),
});

// Define the chat output schema
const ChatOutputSchema = z.object({
  message: z.string().describe('The AI response message'),
  visualization: z.object({
    type: z.enum(['line', 'bar', 'area', 'donut', 'pie']),
    title: z.string(),
    data: z.array(z.any()),
    config: z.object({
      xKey: z.string().optional(),
      yKey: z.string().optional(),
      categories: z.array(z.string()).optional(),
      colors: z.array(z.string()).optional(),
    }).optional(),
  }).optional().describe('Optional chart visualization'),
});

// System prompt for the AI assistant
const SYSTEM_PROMPT = `You are an AI assistant for an eCommerce analytics dashboard called "Insight" built by Tom&Co.

Your role is to help users understand their data, answer questions, and provide insights about their eCommerce performance.

You have access to the following data sources:
- Sales data (orders, revenue, AOV, customers)
- Product performance data (top products, quantities, pricing)
- Marketing data (Google Ads, Facebook Ads, Pinterest Ads, SEO)
- Website behavior data (sessions, bounce rate, conversions)
- Annotations (user-created notes about events)
- Targets (revenue and performance goals)
- Custom links (quick access links)

When analyzing data:
1. Be specific and reference actual numbers from the provided context
2. Identify trends, patterns, and anomalies
3. Provide actionable insights and recommendations
4. Consider annotations when explaining changes in metrics
5. Compare against targets when available

When creating visualizations:
1. Only suggest visualizations when they would genuinely help understand the data
2. Choose the appropriate chart type (line for trends, bar for comparisons, donut for proportions)
3. Keep visualizations simple and focused
4. Provide clear titles and labels

Format your responses using markdown:
- Use **bold** for emphasis
- Use bullet points for lists
- Use tables for structured data
- Use code blocks for technical details

Be conversational, helpful, and insightful. If you don't have enough data to answer a question, say so clearly.`;

// Define the chat flow
export const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: ChatInputSchema,
    outputSchema: ChatOutputSchema,
  },
  async (input) => {
    // Build the context summary
    const contextSummary = buildContextSummary(input.context);
    
    // Build conversation history for the model
    const messages = input.conversationHistory.map((msg) => ({
      role: msg.role as 'user' | 'model' | 'system',
      content: [{ text: msg.content }],
    }));

    // Generate response using Gemini 2.0 Flash
    const { text } = await ai.generate({
      model: googleAI.model('gemini-2.0-flash-exp'),
      system: SYSTEM_PROMPT,
      prompt: `${contextSummary}\n\nUser question: ${input.message}`,
      messages: messages,
      config: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    });

    // Parse the response to extract visualization if present
    const visualization = extractVisualization(text);

    return {
      message: text,
      visualization,
    };
  }
);

// Helper function to build context summary
function buildContextSummary(context: any): string {
  const parts: string[] = [];

  parts.push('## Current Dashboard Context');
  parts.push(`- Date Range: ${context.dateRange.startDate} to ${context.dateRange.endDate}`);
  
  if (context.selectedClientId) {
    parts.push(`- Client: ${context.selectedClientId}`);
  }
  
  if (context.selectedWebsiteId && context.selectedWebsiteId !== 'all_combined') {
    parts.push(`- Website: ${context.selectedWebsiteId}`);
  } else {
    parts.push(`- Website: All Stores Combined`);
  }

  if (context.comparisonPeriod !== 'none') {
    parts.push(`- Comparison: ${context.comparisonPeriod.replace('_', ' ')}`);
  }

  // Add data summaries
  if (context.salesData) {
    parts.push('\n## Sales Data Available');
    parts.push(JSON.stringify(context.salesData, null, 2));
  }

  if (context.productData) {
    parts.push('\n## Product Data Available');
    parts.push(JSON.stringify(context.productData, null, 2));
  }

  if (context.marketingData) {
    parts.push('\n## Marketing Data Available');
    parts.push(JSON.stringify(context.marketingData, null, 2));
  }

  if (context.websiteData) {
    parts.push('\n## Website Data Available');
    parts.push(JSON.stringify(context.websiteData, null, 2));
  }

  if (context.annotations && context.annotations.length > 0) {
    parts.push('\n## Annotations');
    context.annotations.forEach((annotation: any) => {
      parts.push(`- ${annotation.date}: ${annotation.note} (${annotation.type})`);
    });
  }

  if (context.targets && context.targets.length > 0) {
    parts.push('\n## Targets');
    context.targets.forEach((target: any) => {
      parts.push(`- ${target.metric}: ${target.value} (${target.granularity})`);
    });
  }

  return parts.join('\n');
}

// Helper function to extract visualization from response
function extractVisualization(text: string): any | undefined {
  // Look for visualization markers in the response
  // This is a simple implementation - could be enhanced with structured output
  const vizMatch = text.match(/```visualization\n([\s\S]*?)\n```/);
  
  if (vizMatch) {
    try {
      return JSON.parse(vizMatch[1]);
    } catch (e) {
      console.error('Failed to parse visualization:', e);
      return undefined;
    }
  }

  return undefined;
}

export default chatFlow;

