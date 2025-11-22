import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatPercentageValue } from '@/lib/utils/date';

interface KPICardProps {
    label: string;
    value: string;
    change: number | null;
    icon?: React.ReactNode;
}

export function KPICard({
    label,
    value,
    change,
    icon,
}: KPICardProps) {
    return (
        <Card className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-600">{label}</div>
                {icon && <div className="text-gray-400">{icon}</div>}
            </div>
            <div className="flex items-baseline gap-2 flex-1">
                <div className="text-2xl font-bold text-gray-900">{value}</div>
                {change !== null && (
                    <div
                        className={`flex items-center text-sm font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                    >
                        {change >= 0 ? (
                            <TrendingUp className="mr-1 h-4 w-4" />
                        ) : (
                            <TrendingDown className="mr-1 h-4 w-4" />
                        )}
                        {formatPercentageValue(change)}
                    </div>
                )}
            </div>
        </Card>
    );
}
