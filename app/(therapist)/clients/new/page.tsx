import Link from 'next/link';
import { ClientForm } from '@/components/therapist/ClientForm';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

export default function NewClientPage() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/clients">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Clients
          </Link>
        </Button>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Add New Client</h1>
        <p className="text-muted-foreground">
          Create a new client profile and portal account
        </p>
      </div>

      {/* Form */}
      <div className="max-w-2xl">
        <ClientForm mode="create" />
      </div>
    </div>
  );
}

