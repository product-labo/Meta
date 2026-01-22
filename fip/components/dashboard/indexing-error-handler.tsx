'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, AlertTriangle, Clock, CheckCircle, XCircle } from 'lucide-react';

interface FailedBatch {
  startBlock: number;
  endBlock: number;
  errorMessage: string;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
}

interface IndexingErrorsData {
  walletId: string;
  failedBatches: FailedBatch[];
  currentJobStatus: {
    id: string;
    status: string;
    errorMessage?: string;
    isRetry: boolean;
    failedBatchCount: number;
  } | null;
  rpcEndpointStatus: any;
  canRetry: boolean;
  summary: {
    totalFailedBatches: number;
    totalFailedBlocks: number;
    hasActiveRetry: boolean;
  };
}

interface IndexingErrorHandlerProps {
  projectId: string;
  walletId: string;
  onRetrySuccess?: () => void;
}

export function IndexingErrorHandler({ projectId, walletId, onRetrySuccess }: IndexingErrorHandlerProps) {
  const [errorData, setErrorData] = useState<IndexingErrorsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchErrorData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/wallets/${walletId}/indexing-errors`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch error data');
      }

      const result = await response.json();
      setErrorData(result.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch error data');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    try {
      setRetrying(true);
      const response = await fetch(`/api/projects/${projectId}/wallets/${walletId}/retry`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.data?.error || 'Failed to retry indexing');
      }

      const result = await response.json();
      
      // Refresh error data
      await fetchErrorData();
      
      // Notify parent component
      if (onRetrySuccess) {
        onRetrySuccess();
      }

      // Show success message
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry indexing');
    } finally {
      setRetrying(false);
    }
  };

  useEffect(() => {
    fetchErrorData();
  }, [projectId, walletId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Error Handling
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading error data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Error Handling
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button 
            onClick={fetchErrorData} 
            variant="outline" 
            className="mt-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!errorData) {
    return null;
  }

  const { failedBatches, currentJobStatus, canRetry, summary } = errorData;

  // Don't show the component if there are no errors and no active retry
  if (failedBatches.length === 0 && !summary.hasActiveRetry) {
    return null;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge variant="default" className="bg-blue-500"><Clock className="h-3 w-3 mr-1" />Running</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case 'queued':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Queued</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatErrorMessage = (message: string) => {
    // Truncate long error messages
    if (message.length > 100) {
      return message.substring(0, 100) + '...';
    }
    return message;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Indexing Error Handling
        </CardTitle>
        <CardDescription>
          Manage failed indexing batches and retry operations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        {(summary.totalFailedBatches > 0 || summary.hasActiveRetry) && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{summary.totalFailedBatches}</div>
              <div className="text-sm text-red-700">Failed Batches</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{summary.totalFailedBlocks.toLocaleString()}</div>
              <div className="text-sm text-orange-700">Failed Blocks</div>
            </div>
            {summary.hasActiveRetry && (
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
                </div>
                <div className="text-sm text-blue-700">Retry Active</div>
              </div>
            )}
          </div>
        )}

        {/* Current Job Status */}
        {currentJobStatus && (
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">Current Job Status</h4>
              {getStatusBadge(currentJobStatus.status)}
            </div>
            {currentJobStatus.isRetry && (
              <p className="text-sm text-blue-600 mb-2">
                Retry job processing {currentJobStatus.failedBatchCount} failed batches
              </p>
            )}
            {currentJobStatus.errorMessage && (
              <Alert variant="destructive" className="mt-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{formatErrorMessage(currentJobStatus.errorMessage)}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Failed Batches */}
        {failedBatches.length > 0 && (
          <div>
            <h4 className="font-medium mb-3">Failed Batches ({failedBatches.length})</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {failedBatches.map((batch, index) => (
                <div key={index} className="p-3 border rounded-lg bg-red-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">
                      Blocks {batch.startBlock.toLocaleString()} - {batch.endBlock.toLocaleString()}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      Retry #{batch.retryCount}
                    </Badge>
                  </div>
                  <p className="text-sm text-red-700 mb-2">
                    {formatErrorMessage(batch.errorMessage)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Failed: {new Date(batch.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Retry Button */}
        {canRetry && failedBatches.length > 0 && (
          <div className="pt-4 border-t">
            <Button 
              onClick={handleRetry} 
              disabled={retrying}
              className="w-full"
            >
              {retrying ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Failed Batches ({failedBatches.length})
                </>
              )}
            </Button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              This will create a new indexing job to retry all failed batches
            </p>
          </div>
        )}

        {/* Refresh Button */}
        <div className="pt-2">
          <Button 
            onClick={fetchErrorData} 
            variant="outline" 
            size="sm"
            className="w-full"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Status
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}