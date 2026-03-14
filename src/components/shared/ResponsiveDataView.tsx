import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/shared/EmptyState';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  hideOnMobile?: boolean;
}

interface ResponsiveDataViewProps<T> {
  data: T[] | undefined;
  columns: Column<T>[];
  renderMobileCard: (item: T) => React.ReactNode;
  keyExtractor: (item: T) => string;
  loading?: boolean;
  loadingRows?: number;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  className?: string;
}

export default function ResponsiveDataView<T>({
  data,
  columns,
  renderMobileCard,
  keyExtractor,
  loading = false,
  loadingRows = 5,
  emptyIcon,
  emptyTitle = 'No data',
  emptyDescription,
  emptyActionLabel,
  onEmptyAction,
  className,
}: ResponsiveDataViewProps<T>) {
  if (loading) {
    return (
      <div className={cn('space-y-3 p-4', className)}>
        {Array.from({ length: loadingRows }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  const isEmpty = !data || data.length === 0;

  if (isEmpty && emptyIcon) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
      />
    );
  }

  return (
    <>
      {/* Mobile: card list */}
      <div className={cn('md:hidden space-y-3 p-3', className)}>
        {data?.map((item) => (
          <Card key={keyExtractor(item)} className="overflow-hidden">
            <CardContent className="p-3">
              {renderMobileCard(item)}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop: table */}
      <div className={cn('hidden md:block', className)}>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key}>{col.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isEmpty ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-12 text-muted-foreground">
                  {emptyTitle}
                </TableCell>
              </TableRow>
            ) : (
              data?.map((item) => (
                <TableRow key={keyExtractor(item)}>
                  {columns.map((col) => (
                    <TableCell key={col.key}>{col.render(item)}</TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
