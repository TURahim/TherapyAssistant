'use client';

import { useState } from 'react';
import {
  FileText,
  User,
  Stethoscope,
  RefreshCw,
  Edit,
  Check,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
  Copy,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

interface SessionSummaryCardProps {
  sessionId: string;
  sessionNumber: number;
  therapistSummary: string | null;
  clientSummary: string | null;
  keyTopics?: string[];
  isEdited?: boolean;
  editedAt?: Date | null;
  generatedAt?: Date | null;
  onRegenerate?: (type: 'therapist' | 'client' | 'both') => Promise<void>;
  onEdit?: (type: 'therapist' | 'client') => void;
  isRegenerating?: boolean;
  className?: string;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function SessionSummaryCard({
  sessionId,
  sessionNumber,
  therapistSummary,
  clientSummary,
  keyTopics = [],
  isEdited = false,
  editedAt,
  generatedAt,
  onRegenerate,
  onEdit,
  isRegenerating = false,
  className,
}: SessionSummaryCardProps) {
  const [activeTab, setActiveTab] = useState<'therapist' | 'client'>('therapist');
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  const hasSummary = therapistSummary || clientSummary;

  const handleCopy = async (text: string, type: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (!hasSummary) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Session Summary</CardTitle>
            </div>
          </div>
          <CardDescription>
            No summary has been generated for this session yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => onRegenerate?.('both')}
            disabled={isRegenerating}
          >
            {isRegenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate Summary
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Session {sessionNumber} Summary</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {generatedAt && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Generated {formatDate(generatedAt)}
            </span>
          )}
          {isEdited && (
            <Badge variant="secondary" className="text-xs">
              <Edit className="h-3 w-3 mr-1" />
              Edited
            </Badge>
          )}
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-2">
          {/* Key Topics */}
          {keyTopics.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium mb-2">Key Topics:</p>
              <div className="flex flex-wrap gap-2">
                {keyTopics.map((topic, index) => (
                  <Badge key={index} variant="outline">
                    {topic}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Summary Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'therapist' | 'client')}>
            <TabsList className="mb-4">
              <TabsTrigger value="therapist" className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4" />
                Therapist View
              </TabsTrigger>
              <TabsTrigger value="client" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Client View
              </TabsTrigger>
            </TabsList>

            <TabsContent value="therapist" className="space-y-3">
              {therapistSummary ? (
                <>
                  <div className="bg-muted/30 rounded-lg p-4 prose prose-sm max-w-none dark:prose-invert">
                    <div
                      className="whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{
                        __html: formatSummaryAsHtml(therapistSummary),
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(therapistSummary, 'therapist')}
                    >
                      {copied === 'therapist' ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                    {onEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit('therapist')}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    )}
                    {onRegenerate && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onRegenerate('therapist')}
                        disabled={isRegenerating}
                      >
                        {isRegenerating ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-1" />
                        )}
                        Regenerate
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Stethoscope className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No therapist summary generated</p>
                  {onRegenerate && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => onRegenerate('therapist')}
                      disabled={isRegenerating}
                    >
                      Generate
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="client" className="space-y-3">
              {clientSummary ? (
                <>
                  <div className="bg-primary/5 rounded-lg p-4 prose prose-sm max-w-none dark:prose-invert">
                    <div
                      className="whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{
                        __html: formatSummaryAsHtml(clientSummary),
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(clientSummary, 'client')}
                    >
                      {copied === 'client' ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                    {onEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit('client')}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    )}
                    {onRegenerate && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onRegenerate('client')}
                        disabled={isRegenerating}
                      >
                        {isRegenerating ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-1" />
                        )}
                        Regenerate
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No client summary generated</p>
                  {onRegenerate && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => onRegenerate('client')}
                      disabled={isRegenerating}
                    >
                      Generate
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Convert markdown-like summary to HTML
 */
function formatSummaryAsHtml(text: string): string {
  return text
    // Headers
    .replace(/^## (.+)$/gm, '<h3 class="text-base font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^### (.+)$/gm, '<h4 class="text-sm font-medium mt-3 mb-1">$1</h4>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Bullets
    .replace(/^[-•] (.+)$/gm, '<li class="ml-4">$1</li>')
    .replace(/^☐ (.+)$/gm, '<li class="ml-4 list-none">☐ $1</li>')
    // Line breaks
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

export default SessionSummaryCard;

