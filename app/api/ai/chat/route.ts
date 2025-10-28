import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// Initialize Genkit with explicit API key
const ai = genkit({
  plugins: [googleAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY })],
});

export async function POST(request: NextRequest) {
  return requireAuth(request, async (req, user) => {
    try {
      const body = await req.json();
      const { message, context, conversationHistory } = body;

      if (!message || !context) {
        return NextResponse.json(
          { success: false, error: 'Message and context are required' },
          { status: 400 }
        );
      }

      // Build the context summary
      const contextSummary = buildContextSummary(context);
      
      // Build conversation history for the model
      const messages = (conversationHistory || []).map((msg: any) => ({
        role: msg.role === 'assistant' ? 'model' : msg.role,
        content: [{ text: msg.content }],
      }));

      // System prompt
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
1. Only create visualizations when they would genuinely help understand the data
2. Choose the appropriate chart type:
   - 'line' or 'area' for trends over time
   - 'bar' for comparisons between categories
   - 'donut' or 'pie' for proportions/percentages
3. Provide clear, descriptive titles
4. Structure data as an array of objects with consistent keys
5. For time series, use a 'date' key and value keys for metrics
6. For categorical data, use a 'name' or 'category' key and value keys for metrics

Format your message responses using markdown:
- Use **bold** for emphasis
- Use bullet points for lists
- Use tables for structured data
- Use headings (##, ###) for sections

Be conversational, helpful, and insightful. If you don't have enough data to answer a question, say so clearly.

IMPORTANT: You must respond with a structured JSON object containing:
- "message": Your formatted markdown response
- "visualization": (optional) Chart configuration object if a visualization would help`;

      // Define the output schema for structured response
      const outputSchema = z.object({
        message: z.string().describe('The formatted markdown response to the user'),
        visualization: z.object({
          type: z.enum(['line', 'area', 'bar', 'donut', 'pie']).describe('The type of chart to display'),
          title: z.string().describe('The title of the chart'),
          data: z.array(z.record(z.any())).describe('Array of data points for the chart'),
          config: z.object({
            xKey: z.string().optional().describe('The key for x-axis values'),
            yKey: z.string().optional().describe('The key for y-axis values'),
            categories: z.array(z.string()).optional().describe('Categories for the chart'),
            colors: z.array(z.string()).optional().describe('Colors for the chart'),
          }).optional(),
        }).optional().describe('Optional chart visualization to display'),
      });

      // Generate response using Gemini 2.5 Flash with structured output
      const { output } = await ai.generate({
        model: googleAI.model('gemini-2.5-flash'),
        system: SYSTEM_PROMPT,
        prompt: `${contextSummary}\n\nUser question: ${message}`,
        messages: messages,
        output: {
          schema: outputSchema,
        },
        config: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      });

      if (!output) {
        return NextResponse.json(
          { success: false, error: 'Failed to generate response' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: output.message,
        visualization: output.visualization,
      });
    } catch (error: any) {
      console.error('Chat error:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to process chat message' },
        { status: 500 }
      );
    }
  });
}

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



