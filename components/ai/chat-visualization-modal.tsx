'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChartVisualization } from '@/types/ai-chat';
import { AreaChart, BarChart, DonutChart, LineChart } from '@tremor/react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CHART_COLORS, CHART_COLORS_EXTENDED } from '@/lib/constants/colors';

interface ChatVisualizationModalProps {
  visualization: ChartVisualization | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ChatVisualizationModal({
  visualization,
  isOpen,
  onClose,
}: ChatVisualizationModalProps) {
  if (!visualization) return null;

  const renderChart = () => {
    const { type, data, config } = visualization;

    switch (type) {
      case 'line':
        return (
          <LineChart
            className="h-80"
            data={data}
            index={config?.xKey || 'date'}
            categories={config?.categories || []}
            colors={config?.colors || CHART_COLORS}
            yAxisWidth={60}
            showAnimation
          />
        );

      case 'area':
        return (
          <AreaChart
            className="h-80"
            data={data}
            index={config?.xKey || 'date'}
            categories={config?.categories || []}
            colors={config?.colors || CHART_COLORS}
            yAxisWidth={60}
            showAnimation
          />
        );

      case 'bar':
        return (
          <BarChart
            className="h-80"
            data={data}
            index={config?.xKey || 'name'}
            categories={config?.categories || []}
            colors={config?.colors || CHART_COLORS}
            yAxisWidth={60}
            showAnimation
          />
        );

      case 'donut':
      case 'pie':
        return (
          <DonutChart
            className="h-80"
            data={data}
            category={config?.yKey || 'value'}
            index={config?.xKey || 'name'}
            colors={config?.colors || CHART_COLORS}
            showAnimation
          />
        );

      default:
        return <div className="text-gray-500">Unsupported chart type</div>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{visualization.title}</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="mt-4">
          {renderChart()}
        </div>
      </DialogContent>
    </Dialog>
  );
}

