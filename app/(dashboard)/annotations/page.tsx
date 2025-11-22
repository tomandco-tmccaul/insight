'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Calendar, Edit, Trash2, FileText } from 'lucide-react';
import { useDashboard } from '@/lib/context/dashboard-context';
import { useAuth } from '@/lib/auth/context';
import { useIdToken } from '@/lib/auth/hooks';
import { apiRequest, buildQueryString } from '@/lib/utils/api';
import { formatDate } from '@/lib/utils/date';
import { Annotation, AnnotationType, CreateAnnotation } from '@/types/firestore';
import { PageHeader } from '@/components/dashboard/page-header';

export default function AnnotationsPage() {
  const { selectedClientId } = useDashboard();
  const { appUser } = useAuth();
  const getIdToken = useIdToken();
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAnnotation, setEditingAnnotation] = useState<Annotation | null>(null);

  // Determine the client ID to use
  const clientId = appUser?.role === 'admin' ? selectedClientId : appUser?.clientId;

  useEffect(() => {
    async function fetchAnnotations() {
      if (!clientId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const idToken = await getIdToken();
        const queryString = buildQueryString({ clientId });
        const response = await apiRequest<Annotation[]>(
          `/api/annotations${queryString}`,
          {},
          idToken || undefined
        );

        if (response.success && response.data) {
          setAnnotations(response.data);
        } else {
          setError(response.error || 'Failed to fetch annotations');
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchAnnotations();
  }, [clientId, getIdToken]);

  const handleCreateOrUpdate = async (data: CreateAnnotation) => {
    if (!clientId) return;

    try {
      const idToken = await getIdToken();
      if (!idToken) return;

      if (editingAnnotation) {
        // Update existing annotation
        const response = await apiRequest(
          `/api/annotations/${editingAnnotation.id}`,
          {
            method: 'PUT',
            body: JSON.stringify({ ...data, clientId }),
          },
          idToken
        );

        if (response.success) {
          setAnnotations((prev) =>
            prev.map((a) => (a.id === editingAnnotation.id ? response.data : a))
          );
          setIsDialogOpen(false);
          setEditingAnnotation(null);
        } else {
          alert(response.error || 'Failed to update annotation');
        }
      } else {
        // Create new annotation
        const response = await apiRequest<Annotation>(
          '/api/annotations',
          {
            method: 'POST',
            body: JSON.stringify({ ...data, clientId }),
          },
          idToken
        );

        if (response.success && response.data) {
          setAnnotations((prev) => [response.data!, ...prev]);
          setIsDialogOpen(false);
        } else {
          alert(response.error || 'Failed to create annotation');
        }
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred');
    }
  };

  const handleDelete = async (annotation: Annotation) => {
    if (!confirm('Are you sure you want to delete this annotation?')) return;

    try {
      const idToken = await getIdToken();
      if (!idToken) return;

      const queryString = buildQueryString({ clientId: annotation.clientId });
      const response = await apiRequest(
        `/api/annotations/${annotation.id}${queryString}`,
        { method: 'DELETE' },
        idToken
      );

      if (response.success) {
        setAnnotations((prev) => prev.filter((a) => a.id !== annotation.id));
      } else {
        alert(response.error || 'Failed to delete annotation');
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred');
    }
  };

  const handleEdit = (annotation: Annotation) => {
    setEditingAnnotation(annotation);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingAnnotation(null);
  };

  if (!clientId) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No Client Selected</h3>
          <p className="mt-2 text-gray-600">
            {appUser?.role === 'admin'
              ? 'Please select a client from the header to view annotations'
              : 'No client assigned to your account'}
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <AnnotationsSkeleton />;
  }

  if (error) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-red-600">Error Loading Annotations</h3>
          <p className="mt-2 text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Annotations"
        description="Manage events, insights, and notes for your reports"
        actions={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingAnnotation(null)}>
                <Plus className="mr-2 h-4 w-4" />
                New Annotation
              </Button>
            </DialogTrigger>
          </Dialog>
        }
      />
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingAnnotation ? 'Edit Annotation' : 'Create New Annotation'}
            </DialogTitle>
          </DialogHeader>
          <AnnotationForm
            annotation={editingAnnotation}
            onSubmit={handleCreateOrUpdate}
            onCancel={handleCloseDialog}
          />
        </DialogContent>
      </Dialog>

      {annotations.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">No Annotations Yet</h3>
            <p className="mt-2 text-gray-600">
              Create your first annotation to track important events and insights
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {annotations.map((annotation) => (
            <AnnotationCard
              key={annotation.id}
              annotation={annotation}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AnnotationCard({
  annotation,
  onEdit,
  onDelete,
}: {
  annotation: Annotation;
  onEdit: (annotation: Annotation) => void;
  onDelete: (annotation: Annotation) => void;
}) {
  const typeColors: Record<AnnotationType, string> = {
    event: 'bg-blue-100 text-blue-700',
    insight: 'bg-cyan-100 text-cyan-700',
    note: 'bg-gray-100 text-gray-700',
    alert: 'bg-red-100 text-red-700',
  };

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${typeColors[annotation.type]}`}>
              {annotation.type}
            </span>
            <span className="text-sm text-gray-600">
              {formatDate(annotation.startDate)}
              {annotation.endDate && annotation.endDate !== annotation.startDate && (
                <> - {formatDate(annotation.endDate)}</>
              )}
            </span>
          </div>
          <h3 className="mt-2 text-lg font-semibold text-gray-900">{annotation.title}</h3>
          {annotation.description && (
            <p className="mt-1 text-gray-600">{annotation.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(annotation)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDelete(annotation)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

type AnnotationFormData = Omit<CreateAnnotation, 'clientId' | 'createdBy'>;

function AnnotationForm({
  annotation,
  onSubmit,
  onCancel,
}: {
  annotation: Annotation | null;
  onSubmit: (data: CreateAnnotation) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<AnnotationFormData>({
    title: annotation?.title || '',
    description: annotation?.description || '',
    type: annotation?.type || 'note',
    startDate: annotation?.startDate || new Date().toISOString().split('T')[0],
    endDate: annotation?.endDate || new Date().toISOString().split('T')[0],
    websiteId: annotation?.websiteId || null,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData as CreateAnnotation);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Title</label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Enter annotation title"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Enter description (optional)"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Type</label>
        <Select
          value={formData.type}
          onValueChange={(value: AnnotationType) => setFormData({ ...formData, type: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="event">Event</SelectItem>
            <SelectItem value="insight">Insight</SelectItem>
            <SelectItem value="note">Note</SelectItem>
            <SelectItem value="alert">Alert</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Start Date</label>
          <Input
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">End Date</label>
          <Input
            type="date"
            value={formData.endDate || formData.startDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {annotation ? 'Update' : 'Create'} Annotation
        </Button>
      </div>
    </form>
  );
}

function AnnotationsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-48" />
          <Skeleton className="mt-2 h-5 w-96" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>

      <div className="grid gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-6">
            <Skeleton className="h-24 w-full" />
          </Card>
        ))}
      </div>
    </div>
  );
}

