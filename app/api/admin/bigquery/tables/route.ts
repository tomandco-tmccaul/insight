import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { bigquery } from '@/lib/bigquery/client';
import { ApiResponse } from '@/types';

export interface BigQueryTableInfo {
  tableId: string;
  datasetId: string;
  projectId: string;
  type: string; // 'TABLE' or 'VIEW'
  numRows: string;
  numBytes: string;
  creationTime: string;
  lastModifiedTime: string;
  description?: string;
}

/**
 * GET /api/admin/bigquery/tables
 * List all tables in a BigQuery dataset
 */
export async function GET(request: NextRequest) {
  return requireAdmin(request, async (req) => {
    try {
      const { searchParams } = new URL(req.url);
      const datasetId = searchParams.get('dataset_id');

      if (!datasetId) {
        return NextResponse.json(
          {
            success: false,
            error: 'Missing required parameter: dataset_id',
          },
          { status: 400 }
        );
      }

      // Get the dataset
      const dataset = bigquery.dataset(datasetId);

      // List all tables in the dataset
      const [tables] = await dataset.getTables();

      // Get metadata for each table
      const tableInfos: BigQueryTableInfo[] = await Promise.all(
        tables.map(async (table) => {
          const [metadata] = await table.getMetadata();

          return {
            tableId: metadata.tableReference.tableId,
            datasetId: metadata.tableReference.datasetId,
            projectId: metadata.tableReference.projectId,
            type: metadata.type,
            numRows: metadata.numRows || '0',
            numBytes: metadata.numBytes || '0',
            creationTime: new Date(parseInt(metadata.creationTime)).toISOString(),
            lastModifiedTime: new Date(parseInt(metadata.lastModifiedTime)).toISOString(),
            description: metadata.description,
          };
        })
      );

      // Sort by table name
      tableInfos.sort((a, b) => a.tableId.localeCompare(b.tableId));

      return NextResponse.json<ApiResponse<BigQueryTableInfo[]>>({
        success: true,
        data: tableInfos,
      });
    } catch (error: unknown) {
      console.error('Error listing BigQuery tables:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'An error occurred',
        },
        { status: 500 }
      );
    }
  });
}

