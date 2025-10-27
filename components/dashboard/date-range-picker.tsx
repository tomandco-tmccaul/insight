'use client';

import * as React from 'react';
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DateRangePickerProps {
  dateRange: { startDate: string; endDate: string };
  onDateRangeChange: (range: { startDate: string; endDate: string }) => void;
  className?: string;
}

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  className,
}: DateRangePickerProps) {
  const [date, setDate] = React.useState<DateRange | undefined>(() => {
    return {
      from: new Date(dateRange.startDate),
      to: new Date(dateRange.endDate),
    };
  });

  // Update internal state when prop changes
  React.useEffect(() => {
    setDate({
      from: new Date(dateRange.startDate),
      to: new Date(dateRange.endDate),
    });
  }, [dateRange.startDate, dateRange.endDate]);

  const handleSelect = (range: DateRange | undefined) => {
    setDate(range);

    // Only update parent if we have both dates
    if (range?.from && range?.to) {
      onDateRangeChange({
        startDate: format(range.from, 'yyyy-MM-dd'),
        endDate: format(range.to, 'yyyy-MM-dd'),
      });
    }
  };

  const handlePreset = (preset: string) => {
    let from: Date;
    let to: Date;
    const now = new Date();

    switch (preset) {
      case 'today':
        from = startOfDay(now);
        to = endOfDay(now);
        break;
      case 'yesterday':
        from = startOfDay(subDays(now, 1));
        to = endOfDay(subDays(now, 1));
        break;
      case 'last7days':
        from = startOfDay(subDays(now, 6));
        to = endOfDay(now);
        break;
      case 'last14days':
        from = startOfDay(subDays(now, 13));
        to = endOfDay(now);
        break;
      case 'last30days':
        from = startOfDay(subDays(now, 29));
        to = endOfDay(now);
        break;
      case 'last90days':
        from = startOfDay(subDays(now, 89));
        to = endOfDay(now);
        break;
      case 'thisMonth':
        from = startOfMonth(now);
        to = endOfDay(now);
        break;
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        from = startOfMonth(lastMonth);
        to = endOfMonth(lastMonth);
        break;
      default:
        return;
    }

    const newRange = { from, to };
    setDate(newRange);
    onDateRangeChange({
      startDate: format(from, 'yyyy-MM-dd'),
      endDate: format(to, 'yyyy-MM-dd'),
    });
  };

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              'justify-start text-left font-normal',
              !date && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, 'LLL dd, y')} -{' '}
                  {format(date.to, 'LLL dd, y')}
                </>
              ) : (
                format(date.from, 'LLL dd, y')
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            {/* Preset buttons sidebar */}
            <div className="flex flex-col gap-1 border-r p-3">
              <div className="text-xs font-semibold text-gray-500 mb-2">Quick Select</div>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start text-xs h-8"
                onClick={() => handlePreset('today')}
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start text-xs h-8"
                onClick={() => handlePreset('yesterday')}
              >
                Yesterday
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start text-xs h-8"
                onClick={() => handlePreset('last7days')}
              >
                Last 7 days
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start text-xs h-8"
                onClick={() => handlePreset('last14days')}
              >
                Last 14 days
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start text-xs h-8"
                onClick={() => handlePreset('last30days')}
              >
                Last 30 days
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start text-xs h-8"
                onClick={() => handlePreset('last90days')}
              >
                Last 90 days
              </Button>
              <div className="border-t my-1"></div>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start text-xs h-8"
                onClick={() => handlePreset('thisMonth')}
              >
                This month
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start text-xs h-8"
                onClick={() => handlePreset('lastMonth')}
              >
                Last month
              </Button>
            </div>

            {/* Calendar */}
            <div>
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={handleSelect}
                numberOfMonths={2}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

