'use client';

import { useClients } from '@/lib/hooks/useClients';
import { ClientList } from '@/components/therapist/ClientList';

export default function ClientsPage() {
  const {
    clients,
    pagination,
    isLoading,
    error,
    fetchClients,
    deleteClient,
    refresh,
  } = useClients({ autoFetch: true });

  const handleSearch = (search: string) => {
    fetchClients({ search, page: 1 });
  };

  const handleFilterChange = (key: string, value: string | boolean | undefined) => {
    fetchClients({ [key]: value, page: 1 });
  };

  const handlePageChange = (page: number) => {
    fetchClients({ page });
  };

  const handleDeactivate = async (clientId: string) => {
    return deleteClient(clientId, false);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
        <p className="text-muted-foreground">
          Manage your client roster and access their treatment information
        </p>
      </div>

      {/* Client List */}
      <ClientList
        clients={clients}
        pagination={pagination}
        isLoading={isLoading}
        error={error}
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
        onPageChange={handlePageChange}
        onDeactivate={handleDeactivate}
        onRefresh={refresh}
      />
    </div>
  );
}

