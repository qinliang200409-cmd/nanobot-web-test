import { useState, useEffect, useCallback } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const FILES = ['AGENTS.md', 'SOUL.md', 'USER.md', 'MEMORY.md', 'HISTORY.md'] as const;
type FileName = typeof FILES[number];

const DEFAULT_CONTENTS: Record<FileName, string> = {
  'AGENTS.md': `# Agent Instructions

You are nanobot, a lightweight AI assistant designed to help users with various tasks.

## Core Traits
- Helpful and concise
- Follows instructions precisely
- Maintains context awareness`,
  'SOUL.md': `# Soul

I am nanobot, a lightweight AI assistant created to provide helpful, concise, and context-aware responses.

## Personality
- Friendly and professional
- Clear and straightforward
- Adaptable to user needs`,
  'USER.md': `# User Information

Information about the user goes here.

## Preferences
- (To be filled by user)

## Context
- (User context will be stored here)`,
  'MEMORY.md': `# Long-term Memory

This file stores important information that should be remembered across conversations.

## Important Facts
- (Empty initially)

## Key Learnings
- (To be added over time)`,
  'HISTORY.md': `# Conversation History

This file stores the conversation history for context.

## Recent Messages
(Empty - will be populated during conversations)`,
};

const STORAGE_KEY = 'nanobot_persona_files';

function getStorageKey(file: FileName): string {
  return `${STORAGE_KEY}_${file}`;
}

function loadFileContent(file: FileName): string {
  const stored = localStorage.getItem(getStorageKey(file));
  if (stored !== null) {
    return stored;
  }
  return DEFAULT_CONTENTS[file];
}

function saveFileContent(file: FileName, content: string): void {
  localStorage.setItem(getStorageKey(file), content);
}

export function Persona() {
  const [selectedFile, setSelectedFile] = useState<FileName>('AGENTS.md');
  const [content, setContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Load content when file changes
  useEffect(() => {
    const loadedContent = loadFileContent(selectedFile);
    setContent(loadedContent);
    setOriginalContent(loadedContent);
    setSaveStatus('idle');
  }, [selectedFile]);

  const handleSave = useCallback(() => {
    try {
      saveFileContent(selectedFile, content);
      setOriginalContent(content);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  }, [selectedFile, content]);

  const handleReset = useCallback(() => {
    setContent(originalContent);
    setSaveStatus('idle');
  }, [originalContent]);

  const handleFileClick = (file: FileName) => {
    setSelectedFile(file);
  };

  const hasChanges = content !== originalContent;

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold text-[#1A1A1A] mb-1">Persona Configuration</h1>
        <p className="text-sm text-[#666666]">Edit personality files for your AI assistant</p>
      </div>

      <Card className="space-y-4">
        <div>
          <label className="text-sm font-medium text-[#1A1A1A] block mb-3">Select File:</label>
          <div className="flex flex-wrap gap-2">
            {FILES.map((file) => (
              <button
                key={file}
                onClick={() => handleFileClick(file)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 
                  ${selectedFile === file 
                    ? 'bg-[#1A1A1A] text-white shadow-md' 
                    : 'bg-[#F5F5F5] text-[#1A1A1A] hover:bg-[#E5E5E5]'
                  }`}
              >
                {file}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-[#E5E5E5] pt-4">
          <label className="text-sm font-medium text-[#1A1A1A] block mb-2">
            {selectedFile.replace('.md', '')} Content:
          </label>
          <div data-color-mode="light">
            <MDEditor
              value={content}
              onChange={(val) => setContent(val || '')}
              height={400}
              preview="live"
              enableScroll={true}
              textareaProps={{
                placeholder: `Enter ${selectedFile} content...`,
              }}
              className="!font-mono text-sm"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-3">
            {saveStatus === 'success' && (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Saved successfully!
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="text-sm text-red-600 flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                Save failed
              </span>
            )}
            {hasChanges && saveStatus === 'idle' && (
              <span className="text-sm text-[#666666]">Unsaved changes</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleSave}
              disabled={!hasChanges}
              className={!hasChanges ? 'opacity-50 cursor-not-allowed' : ''}
            >
              Save
            </Button>
            <Button 
              variant="secondary" 
              onClick={handleReset}
              disabled={!hasChanges}
              className={!hasChanges ? 'opacity-50 cursor-not-allowed' : ''}
            >
              Reset
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
