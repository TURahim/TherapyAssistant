'use client';

import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload,
  FileText,
  Clipboard,
  Loader2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

interface TranscriptInputProps {
  onTranscriptChange: (transcript: string, source: 'paste' | 'upload') => void;
  disabled?: boolean;
  className?: string;
}

export function TranscriptInput({
  onTranscriptChange,
  disabled = false,
  className,
}: TranscriptInputProps) {
  const [activeTab, setActiveTab] = useState<'paste' | 'upload'>('paste');
  const [pastedText, setPastedText] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePasteChange = (text: string) => {
    setPastedText(text);
    setError(null);
    if (text.trim().length > 0) {
      onTranscriptChange(text, 'paste');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsProcessing(true);

    try {
      // Validate file type
      const validTypes = ['text/plain', 'text/markdown', 'application/pdf'];
      if (!validTypes.includes(file.type) && !file.name.endsWith('.txt') && !file.name.endsWith('.md')) {
        throw new Error('Please upload a .txt, .md, or .pdf file');
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB');
      }

      setUploadedFile(file);

      // Read file content
      const text = await readFileContent(file);
      onTranscriptChange(text, 'upload');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file');
      setUploadedFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files[0];
    if (file) {
      // Trigger the same logic as file select
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      if (fileInputRef.current) {
        fileInputRef.current.files = dataTransfer.files;
        handleFileSelect({ target: fileInputRef.current } as React.ChangeEvent<HTMLInputElement>);
      }
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={cn('space-y-4', className)}>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'paste' | 'upload')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="paste" disabled={disabled}>
            <Clipboard className="h-4 w-4 mr-2" />
            Paste Text
          </TabsTrigger>
          <TabsTrigger value="upload" disabled={disabled}>
            <Upload className="h-4 w-4 mr-2" />
            Upload File
          </TabsTrigger>
        </TabsList>

        <TabsContent value="paste" className="mt-4">
          <div className="space-y-2">
            <Label htmlFor="transcript-paste">Session Transcript</Label>
            <Textarea
              id="transcript-paste"
              placeholder="Paste your session transcript here...

Example format:
Therapist: How have you been feeling since our last session?
Client: I've been doing better. The techniques we discussed have been helping."
              value={pastedText}
              onChange={(e) => handlePasteChange(e.target.value)}
              disabled={disabled}
              className="min-h-[300px] font-mono text-sm"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {pastedText.length > 0
                  ? `${pastedText.length.toLocaleString()} characters`
                  : 'No text entered'}
              </span>
              {pastedText.length > 0 && pastedText.length < 100 && (
                <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Transcript seems short
                </span>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="upload" className="mt-4">
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
              disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary',
              error ? 'border-destructive' : 'border-muted'
            )}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => !disabled && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.pdf,text/plain,text/markdown,application/pdf"
              onChange={handleFileSelect}
              disabled={disabled}
              className="hidden"
            />

            {isProcessing ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Processing file...</p>
              </div>
            ) : uploadedFile ? (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                <div>
                  <p className="font-medium">{uploadedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(uploadedFile.size)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setUploadedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  Choose Different File
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">Drop your transcript file here</p>
                  <p className="text-sm text-muted-foreground">
                    or click to browse
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Supported formats: .txt, .md, .pdf (max 5MB)
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-2 flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

