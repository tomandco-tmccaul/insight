'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Target } from '@/types/firestore';
import { Loader2 } from 'lucide-react';

const targetSchema = z.object({
    metric: z.enum(['revenue', 'roas', 'cpa', 'sessions']),
    granularity: z.enum(['monthly', 'quarterly', 'yearly', 'custom']),
    periodName: z.string().optional(),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    value: z.coerce.number().min(0, 'Value must be positive'),
    websiteId: z.string().min(1, 'Website is required'),
}).refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
    message: 'Start date must be before end date',
    path: ['endDate'],
});

type TargetFormValues = z.infer<typeof targetSchema>;

interface TargetFormProps {
    initialData?: Target;
    websites: { id: string; name: string }[];
    onSubmit: (data: TargetFormValues) => Promise<void>;
    onCancel: () => void;
}

export function TargetForm({ initialData, websites, onSubmit, onCancel }: TargetFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<TargetFormValues>({
        resolver: zodResolver(targetSchema) as any,
        defaultValues: {
            metric: initialData?.metric || 'revenue',
            granularity: initialData?.granularity || 'monthly',
            periodName: initialData?.periodName || '',
            startDate: initialData?.startDate || new Date().toISOString().split('T')[0],
            endDate: initialData?.endDate || new Date().toISOString().split('T')[0],
            value: initialData?.value || 0,
            websiteId: initialData?.websiteId || 'all_combined',
        },
    });

    const granularity = form.watch('granularity');

    // Auto-set end date based on granularity when start date changes
    useEffect(() => {
        if (granularity === 'custom') return;

        const subscription = form.watch((value, { name }) => {
            if (name === 'startDate' && value.startDate) {
                const start = new Date(value.startDate);
                let end = new Date(start);

                if (granularity === 'monthly') {
                    end.setMonth(end.getMonth() + 1);
                    end.setDate(0); // Last day of the month
                } else if (granularity === 'quarterly') {
                    end.setMonth(end.getMonth() + 3);
                    end.setDate(0);
                } else if (granularity === 'yearly') {
                    end.setFullYear(end.getFullYear() + 1);
                    end.setDate(0);
                }

                // Format as YYYY-MM-DD
                const endDateStr = end.toISOString().split('T')[0];
                form.setValue('endDate', endDateStr);
            }
        });
        return () => subscription.unsubscribe();
    }, [form, granularity]);

    const handleSubmit = async (data: TargetFormValues) => {
        try {
            setIsSubmitting(true);
            await onSubmit(data);
        } catch (error) {
            console.error('Error submitting form:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="metric"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Metric</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a metric" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="revenue">Revenue</SelectItem>
                                        <SelectItem value="sessions">Sessions</SelectItem>
                                        <SelectItem value="roas">ROAS</SelectItem>
                                        <SelectItem value="cpa">CPA</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="websiteId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Website</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a website" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="all_combined">All Websites</SelectItem>
                                        {websites.map((site) => (
                                            <SelectItem key={site.id} value={site.id}>
                                                {site.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="granularity"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Period Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select period type" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                    <SelectItem value="quarterly">Quarterly</SelectItem>
                                    <SelectItem value="yearly">Yearly</SelectItem>
                                    <SelectItem value="custom">Custom Range</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="periodName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Period Name (Optional)</FormLabel>
                            <FormControl>
                                <Input placeholder='e.g. "Q1 2024" or "Summer Sale"' {...field} />
                            </FormControl>
                            <FormDescription>
                                A friendly name to identify this target period.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Start Date</FormLabel>
                                <FormControl>
                                    <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>End Date</FormLabel>
                                <FormControl>
                                    <Input type="date" {...field} disabled={granularity !== 'custom'} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="value"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Target Value</FormLabel>
                            <FormControl>
                                <Input type="number" step="0.01" {...field} />
                            </FormControl>
                            <FormDescription>
                                The target value for the selected metric.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {initialData ? 'Update Target' : 'Create Target'}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
