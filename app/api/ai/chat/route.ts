import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { adminDb } from '@/lib/firebase/admin';
import { getSalesOverview } from '@/lib/data-layer/sales-overview';
import { getTopProducts } from '@/lib/data-layer/top-products';

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

      // Fetch data using data layer if not provided in context
      let enrichedContext = { ...context };
      
      if (context.selectedClientId && context.dateRange?.startDate && context.dateRange?.endDate) {
        // Get client data to get dataset ID
        if (!adminDb) {
          return NextResponse.json(
            { success: false, error: 'Database not initialized' },
            { status: 500 }
          );
        }

        const clientDoc = await adminDb
          .collection('clients')
          .doc(context.selectedClientId)
          .get();

        if (clientDoc.exists) {
          const clientData = clientDoc.data();
          const datasetId = clientData?.bigQueryDatasetId;

          if (datasetId) {
            const queryOptions = {
              datasetId,
              clientId: context.selectedClientId,
              websiteId: context.selectedWebsiteId || 'all_combined',
              startDate: context.dateRange.startDate,
              endDate: context.dateRange.endDate,
            };

            // Fetch data using data layer if not already provided
            const [salesData, productsData] = await Promise.all([
              !enrichedContext.salesData
                ? getSalesOverview(queryOptions).catch((err) => {
                    console.error('Error fetching sales overview:', err);
                    return null;
                  })
                : Promise.resolve(null),
              !enrichedContext.productData
                ? getTopProducts({ ...queryOptions, limit: 10, sortBy: 'revenue' }).catch((err) => {
                    console.error('Error fetching top products:', err);
                    return null;
                  })
                : Promise.resolve(null),
            ]);

            // Enrich context with fetched data
            if (salesData && !enrichedContext.salesData) {
              enrichedContext.salesData = salesData;
            }
            if (productsData && !enrichedContext.productData) {
              enrichedContext.productData = productsData;
            }
          }
        }
      }

      // Build the context summary
      let contextSummary: string;
      try {
        contextSummary = buildContextSummary(enrichedContext);
        console.log('Context summary built, length:', contextSummary.length);
      } catch (contextError: any) {
        console.error('Error building context summary:', contextError);
        return NextResponse.json(
          { success: false, error: `Failed to build context: ${contextError.message || 'Unknown error'}` },
          { status: 500 }
        );
      }
      
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
      let output;
      try {
        console.log('Generating AI response with context length:', contextSummary.length);
        const result = await ai.generate({
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
        output = result.output;
        console.log('AI response received, output:', output ? 'exists' : 'null');
      } catch (genError: any) {
        console.error('Error generating AI response:', genError);
        console.error('Error details:', {
          message: genError.message,
          stack: genError.stack,
          name: genError.name,
        });
        return NextResponse.json(
          { success: false, error: `AI generation failed: ${genError.message || 'Unknown error'}` },
          { status: 500 }
        );
      }

      if (!output) {
        console.error('AI generate returned null output');
        return NextResponse.json(
          { success: false, error: 'Failed to generate response - AI returned empty output' },
          { status: 500 }
        );
      }

      // Handle case where output might not match schema exactly
      const responseMessage = output.message || (typeof output === 'string' ? output : JSON.stringify(output));
      const responseVisualization = output.visualization;

      if (!responseMessage) {
        console.error('No message in output:', output);
        return NextResponse.json(
          { success: false, error: 'Failed to generate response - no message in output' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: responseMessage,
        visualization: responseVisualization,
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
  if (context.dateRange?.startDate && context.dateRange?.endDate) {
    parts.push(`- Date Range: ${context.dateRange.startDate} to ${context.dateRange.endDate}`);
  } else {
    parts.push('- Date Range: Not specified');
  }
  
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

  // Add data summaries (format efficiently, don't just JSON.stringify)
  if (context.salesData) {
    parts.push('\n## Sales Data Available');
    if (context.salesData.summary) {
      const s = context.salesData.summary;
      parts.push(`Summary: ${s.total_orders || 0} orders, ${s.total_revenue || 0} revenue, AOV: ${s.aov || 0}, ${s.unique_customers || 0} customers`);
    }
    if (context.salesData.daily && Array.isArray(context.salesData.daily)) {
      parts.push(`Daily breakdown: ${context.salesData.daily.length} days of data`);
      // Include first few days as examples
      context.salesData.daily.slice(0, 3).forEach((day: any) => {
        parts.push(`  ${day.date}: ${day.total_orders || 0} orders, ${day.total_revenue || 0} revenue`);
      });
    }
  }

  if (context.productData && Array.isArray(context.productData)) {
    parts.push(`\n## Product Data Available (${context.productData.length} products)`);
    context.productData.slice(0, 5).forEach((product: any, idx: number) => {
      parts.push(`${idx + 1}. ${product.product_name || product.title || 'Unknown'}: ${product.total_revenue || 0} revenue, ${product.total_qty_ordered || 0} qty`);
    });
  } else if (context.productData) {
    parts.push('\n## Product Data Available');
    parts.push('(Product data structure available)');
  }

  if (context.marketingData) {
    parts.push('\n## Marketing Data Available');
    if (context.marketingData.channels && Array.isArray(context.marketingData.channels)) {
      context.marketingData.channels.forEach((channel: any) => {
        parts.push(`- ${channel.channel}: ${channel.total_spend || 0} spend, ${channel.total_revenue || 0} revenue, ROAS: ${channel.roas || 0}`);
      });
    }
  }

  if (context.websiteData) {
    parts.push('\n## Website Data Available');
    if (context.websiteData.metrics) {
      const m = context.websiteData.metrics;
      parts.push(`Sessions: ${m.total_sessions || 0}, Pageviews: ${m.total_pageviews || 0}, Users: ${m.total_users || 0}, Bounce Rate: ${((m.bounce_rate || 0) * 100).toFixed(1)}%`);
    }
  }

  if (context.annotations && context.annotations.length > 0) {
    parts.push('\n## Annotations');
    context.annotations.forEach((annotation: any) => {
      const date = annotation.startDate || annotation.date || 'Unknown date';
      const note = annotation.description || annotation.note || annotation.title || 'No description';
      const type = annotation.type || 'note';
      parts.push(`- ${date}: ${note} (${type})`);
    });
  }

  if (context.targets && context.targets.length > 0) {
    parts.push('\n## Targets');
    context.targets.forEach((target: any) => {
      parts.push(`- ${target.metric || 'Unknown'}: ${target.value || 0}${target.unit || ''} (${target.granularity || 'monthly'})`);
    });
  }

  return parts.join('\n');
}



