'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { formatDate, getRelativeTime } from '@/lib/utils/dates';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Calendar,
  FileText,
  MoreVertical,
  User,
  UserX,
  Eye,
  Edit,
  Plus,
} from 'lucide-react';
import type { ClientListItem } from '@/types';

interface ClientCardProps {
  client: ClientListItem;
  onDeactivate?: (clientId: string) => void;
  className?: string;
}

export function ClientCard({ client, onDeactivate, className }: ClientCardProps) {
  const displayName = client.preferredName 
    ? `${client.preferredName} (${client.firstName})`
    : `${client.firstName} ${client.lastName}`;

  return (
    <Card className={cn('transition-shadow hover:shadow-md', className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Client Info */}
          <div className="flex items-start gap-3 min-w-0">
            {/* Avatar */}
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </div>

            {/* Details */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Link 
                  href={`/clients/${client.id}`}
                  className="font-medium text-foreground hover:text-primary transition-colors truncate"
                >
                  {displayName}
                </Link>
                {client.pronouns && (
                  <span className="text-xs text-muted-foreground">
                    ({client.pronouns})
                  </span>
                )}
                {!client.isActive && (
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    Inactive
                  </span>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground truncate">
                {client.email}
              </p>

              {/* Stats Row */}
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>Intake: {formatDate(client.intakeDate)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  <span>{client.sessionCount} sessions</span>
                </div>
                {client.lastSessionDate && (
                  <span className="text-muted-foreground/70">
                    Last: {getRelativeTime(client.lastSessionDate)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Quick Action - New Session */}
            <Button variant="outline" size="sm" asChild>
              <Link href={`/clients/${client.id}/sessions/new`}>
                <Plus className="h-4 w-4 mr-1" />
                Session
              </Link>
            </Button>

            {/* More Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">More actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/clients/${client.id}`} className="flex items-center cursor-pointer">
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/clients/${client.id}?edit=true`} className="flex items-center cursor-pointer">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Client
                  </Link>
                </DropdownMenuItem>
                {client.activePlanId && (
                  <DropdownMenuItem asChild>
                    <Link href={`/plans/${client.activePlanId}`} className="flex items-center cursor-pointer">
                      <FileText className="mr-2 h-4 w-4" />
                      View Plan
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {client.isActive && onDeactivate && (
                  <DropdownMenuItem
                    onClick={() => onDeactivate(client.id)}
                    className="text-destructive focus:text-destructive cursor-pointer"
                  >
                    <UserX className="mr-2 h-4 w-4" />
                    Deactivate
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Plan Status Indicator */}
        {client.activePlanId && (
          <div className="mt-3 pt-3 border-t">
            <Link 
              href={`/plans/${client.activePlanId}`}
              className="flex items-center gap-2 text-xs text-primary hover:underline"
            >
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              Active Treatment Plan
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

