'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDashboard } from '@/lib/context/dashboard-context';
import { useAuth } from '@/lib/auth/context';
import { useIdToken } from '@/lib/auth/hooks';
import { apiRequest, buildQueryString } from '@/lib/utils/api';
import { formatDate } from '@/lib/utils/date';
import { Annotation, AnnotationType } from '@/types/firestore';
import { Info, MessageSquare } from 'lucide-react';

/**
 * Helper function to check if two date ranges overlap
 */
function dateRangesOverlap(
  range1Start: string,
  range1End: string,
  range2Start: string,
  range2End: string
): boolean {
  const start1 = new Date(range1Start);
  const end1 = new Date(range1End);
  const start2 = new Date(range2Start);
  const end2 = new Date(range2End);

  // Check if ranges overlap: start1 <= end2 && start2 <= end1
  return start1 <= end2 && start2 <= end1;
}

/**
 * Component to display annotations for the current report period
 */
export function ReportAnnotations() {
  const { selectedClientId, selectedWebsiteId, dateRange } = useDashboard();
  const { appUser } = useAuth();
  const getIdToken = useIdToken();
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);

  // Determine the client ID to use
  const clientId = appUser?.role === 'admin' ? selectedClientId : appUser?.clientId;

  useEffect(() => {
    async function fetchAnnotations() {
      if (!clientId) {
        setLoading(false);
        setAnnotations([]);
        return;
      }

      setLoading(true);

      try {
        const idToken = await getIdToken();
        const queryString = buildQueryString({ clientId });
        const response = await apiRequest<Annotation[]>(
          `/api/annotations${queryString}`,
          {},
          idToken || undefined
        );

        if (response.success && response.data) {
          // Filter annotations that:
          // 1. Overlap with the current date range
          // 2. Match the website filter (if website is selected, show annotations with matching websiteId or null websiteId)
          const filtered = response.data.filter((annotation) => {
            // Check date range overlap
            const overlaps = dateRangesOverlap(
              dateRange.startDate,
              dateRange.endDate,
              annotation.startDate,
              annotation.endDate
            );

            if (!overlaps) return false;

            // Check website filter
            // If a specific website is selected, show annotations that:
            // - Have no websiteId (client-level annotations), OR
            // - Match the selected websiteId
            // If "all_combined" is selected, show all annotations (no website filter)
            if (selectedWebsiteId && selectedWebsiteId !== 'all_combined') {
              return !annotation.websiteId || annotation.websiteId === selectedWebsiteId;
            }

            return true;
          });

          setAnnotations(filtered);
        } else {
          setAnnotations([]);
        }
      } catch (err: any) {
        console.error('Error fetching annotations:', err);
        setAnnotations([]);
      } finally {
        setLoading(false);
      }
    }

    fetchAnnotations();
  }, [clientId, selectedWebsiteId, dateRange, getIdToken, appUser]);

  if (loading || !clientId) {
    return null;
  }

  if (annotations.length === 0) {
    return null;
  }

  const typeColors: Record<AnnotationType, string> = {
    event: 'bg-blue-100 text-blue-700 border-blue-200',
    insight: 'bg-purple-100 text-purple-700 border-purple-200',
    note: 'bg-gray-100 text-gray-700 border-gray-200',
    alert: 'bg-red-100 text-red-700 border-red-200',
  };

  return (
    <Card className="p-4 border-l-4 border-l-blue-500">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
          <MessageSquare className="h-4 w-4 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Period Annotations</h3>
          <div className="space-y-2">
            {annotations.map((annotation) => (
              <div
                key={annotation.id}
                className="flex items-start gap-2 p-2 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <Badge
                  variant="outline"
                  className={`${typeColors[annotation.type]} border flex-shrink-0 text-xs`}
                >
                  {annotation.type}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{annotation.title}</p>
                  {annotation.description && (
                    <p className="text-xs text-gray-600 mt-0.5">{annotation.description}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDate(annotation.startDate)}
                    {annotation.endDate && annotation.endDate !== annotation.startDate && (
                      <> - {formatDate(annotation.endDate)}</>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

