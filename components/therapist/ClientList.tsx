'use client';

import { useState } from 'react';
import { ClientCard } from './ClientCard';
import { ListSkeleton } from '@/components/shared/LoadingStates';
import { ErrorFallback } from '@/components/shared/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  UserPlus,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import type { ClientListItem, PaginatedResponse } from '@/types';

interface ClientListProps {
  clients: ClientListItem[];
  pagination: PaginatedResponse<ClientListItem>['pagination'] | null;
  isLoading: boolean;
  error: string | null;
  onSearch: (search: string) => void;
  onFilterChange: (key: string, value: string | boolean | undefined) => void;
  onPageChange: (page: number) => void;
  onDeactivate: (clientId: string) => Promise<boolean>;
  onRefresh: () => void;
}

export function ClientList({
  clients,
  pagination,
  isLoading,
  error,
  onSearch,
  onFilterChange,
  onPageChange,
  onDeactivate,
  onRefresh,
}: ClientListProps) {
  const [searchValue, setSearchValue] = useState('');
  const [clientToDeactivate, setClientToDeactivate] = useState<ClientListItem | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchValue);
  };

  const handleDeactivate = async () => {
    if (!clientToDeactivate) return;

    setIsDeactivating(true);
    const success = await onDeactivate(clientToDeactivate.id);
    setIsDeactivating(false);

    if (success) {
      setClientToDeactivate(null);
    }
  };

  if (error) {
    return (
      <ErrorFallback
        error={new Error(error)}
        onReset={onRefresh}
        title="Failed to load clients"
        description={error}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-9"
            />
          </div>
        </form>

        {/* Status Filter */}
        <Select
          defaultValue="active"
          onValueChange={(value) => {
            if (value === 'all') {
              onFilterChange('isActive', undefined);
            } else {
              onFilterChange('isActive', value === 'active');
            }
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select
          defaultValue="intakeDate-desc"
          onValueChange={(value) => {
            const [sortBy, sortOrder] = value.split('-');
            onFilterChange('sortBy', sortBy);
            onFilterChange('sortOrder', sortOrder);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="intakeDate-desc">Newest First</SelectItem>
            <SelectItem value="intakeDate-asc">Oldest First</SelectItem>
            <SelectItem value="name-asc">Name A-Z</SelectItem>
            <SelectItem value="name-desc">Name Z-A</SelectItem>
          </SelectContent>
        </Select>

        {/* Add Client Button */}
        <Button asChild>
          <Link href="/clients/new">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Client
          </Link>
        </Button>
      </div>

      {/* Client List */}
      {isLoading ? (
        <ListSkeleton count={5} />
      ) : clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-3 mb-4">
            <Users className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">No clients found</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            {searchValue
              ? 'Try adjusting your search or filters'
              : 'Get started by adding your first client'}
          </p>
          {!searchValue && (
            <Button asChild>
              <Link href="/clients/new">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Your First Client
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onDeactivate={() => setClientToDeactivate(client)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} clients
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={!pagination.hasPrev}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={!pagination.hasNext}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Deactivate Confirmation Dialog */}
      <Dialog open={!!clientToDeactivate} onOpenChange={() => setClientToDeactivate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Client</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate{' '}
              <strong>
                {clientToDeactivate?.firstName} {clientToDeactivate?.lastName}
              </strong>
              ? They will no longer be able to access their portal, but their data will be preserved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setClientToDeactivate(null)}
              disabled={isDeactivating}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeactivate}
              disabled={isDeactivating}
            >
              {isDeactivating ? 'Deactivating...' : 'Deactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

