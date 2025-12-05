'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  MessageSquare,
  User,
  Stethoscope,
  Search,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from 'lucide-react';

interface TranscriptPreviewProps {
  transcript: string;
  className?: string;
}

interface TranscriptLine {
  speaker: 'therapist' | 'client' | 'unknown';
  text: string;
  lineNumber: number;
}

export function TranscriptPreview({ transcript, className }: TranscriptPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  // Parse transcript into lines with speaker identification
  const lines = useMemo((): TranscriptLine[] => {
    if (!transcript) return [];

    const rawLines = transcript.split('\n').filter((line) => line.trim());
    
    return rawLines.map((line, index) => {
      const lowerLine = line.toLowerCase();
      let speaker: 'therapist' | 'client' | 'unknown' = 'unknown';

      if (
        lowerLine.startsWith('therapist:') ||
        lowerLine.startsWith('t:') ||
        lowerLine.startsWith('counselor:') ||
        lowerLine.startsWith('dr.')
      ) {
        speaker = 'therapist';
      } else if (
        lowerLine.startsWith('client:') ||
        lowerLine.startsWith('c:') ||
        lowerLine.startsWith('patient:') ||
        lowerLine.startsWith('p:')
      ) {
        speaker = 'client';
      }

      return {
        speaker,
        text: line,
        lineNumber: index + 1,
      };
    });
  }, [transcript]);

  // Filter lines based on search
  const filteredLines = useMemo(() => {
    if (!searchQuery) return lines;
    const query = searchQuery.toLowerCase();
    return lines.filter((line) => line.text.toLowerCase().includes(query));
  }, [lines, searchQuery]);

  // Calculate stats
  const stats = useMemo(() => {
    const therapistLines = lines.filter((l) => l.speaker === 'therapist').length;
    const clientLines = lines.filter((l) => l.speaker === 'client').length;
    const wordCount = transcript.split(/\s+/).filter(Boolean).length;
    const charCount = transcript.length;

    return {
      totalLines: lines.length,
      therapistLines,
      clientLines,
      wordCount,
      charCount,
    };
  }, [lines, transcript]);

  const displayLines = isExpanded ? filteredLines : filteredLines.slice(0, 10);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const highlightSearch = (text: string) => {
    if (!searchQuery) return text;

    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  if (!transcript) {
    return (
      <Card className={cn('', className)}>
        <CardContent className="py-8 text-center">
          <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No transcript to preview</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Transcript Preview
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </>
            )}
          </Button>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mt-2">
          <span>{stats.totalLines} lines</span>
          <span>{stats.wordCount.toLocaleString()} words</span>
          <span className="flex items-center gap-1">
            <Stethoscope className="h-3 w-3" />
            {stats.therapistLines} therapist
          </span>
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {stats.clientLines} client
          </span>
        </div>
      </CardHeader>

      <CardContent>
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transcript..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Lines */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin">
          {displayLines.map((line) => (
            <div
              key={line.lineNumber}
              className={cn(
                'flex gap-2 p-2 rounded text-sm',
                line.speaker === 'therapist' && 'bg-primary/5',
                line.speaker === 'client' && 'bg-accent/50'
              )}
            >
              <span className="flex-shrink-0 w-6 text-xs text-muted-foreground text-right">
                {line.lineNumber}
              </span>
              <div className="flex-shrink-0 mt-0.5">
                {line.speaker === 'therapist' ? (
                  <Stethoscope className="h-4 w-4 text-primary" />
                ) : line.speaker === 'client' ? (
                  <User className="h-4 w-4 text-accent-foreground" />
                ) : (
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <p className="flex-1">{highlightSearch(line.text)}</p>
            </div>
          ))}
        </div>

        {/* Expand/Collapse */}
        {filteredLines.length > 10 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Show All ({filteredLines.length} lines)
              </>
            )}
          </Button>
        )}

        {/* Search no results */}
        {searchQuery && filteredLines.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-4">
            No matches found for &quot;{searchQuery}&quot;
          </p>
        )}
      </CardContent>
    </Card>
  );
}

