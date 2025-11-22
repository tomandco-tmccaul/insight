import React from 'react';
import { cn } from '@/lib/utils';

interface CustomChartLegendProps {
    categories: string[];
    colors: string[]; // Tailwind color names (e.g., 'blue', 'emerald')
    className?: string;
}

export function CustomChartLegend({ categories, colors, className }: CustomChartLegendProps) {
    const colorMap: Record<string, string> = {
        emerald: 'bg-emerald-500',
        blue: 'bg-blue-500',
        indigo: 'bg-indigo-500',
        violet: 'bg-violet-500',
        fuchsia: 'bg-fuchsia-500',
        cyan: 'bg-cyan-500',
        sky: 'bg-sky-500',
        teal: 'bg-teal-500',
        green: 'bg-green-500',
        lime: 'bg-lime-500',
        yellow: 'bg-yellow-500',
        amber: 'bg-amber-500',
        orange: 'bg-orange-500',
        red: 'bg-red-500',
        rose: 'bg-rose-500',
        pink: 'bg-pink-500',
        slate: 'bg-slate-500',
        gray: 'bg-gray-500',
        zinc: 'bg-zinc-500',
        neutral: 'bg-neutral-500',
        stone: 'bg-stone-500',
    };

    return (
        <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2", className)}>
            {categories.map((category, index) => {
                const colorName = colors[index % colors.length];
                const colorClass = colorMap[colorName] || `bg-${colorName}-500`;

                return (
                    <div key={category} className="flex items-center gap-2">
                        <span
                            className={cn(
                                "h-1 w-6 rounded-full", // Thick dash style
                                colorClass
                            )}
                        />
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            {category}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
