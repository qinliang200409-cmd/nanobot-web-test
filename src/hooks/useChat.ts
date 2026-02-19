import { useState, useCallback, useRef, useEffect } from 'react';
import type { Message, ProgressStep } from '../types/chat';

const STORAGE_KEY = 'nanobot-chat-history';
const SESSION_ID_KEY = 'nanobot-session-id';

function generateSessionId(): string {
  return `web:session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function getOrCreateSessionId(): string {
  try {
    const stored = localStorage.getItem(SESSION_ID_KEY);
    if (stored) {
      return stored;
    }
    const newSessionId = generateSessionId();
    localStorage.setItem(SESSION_ID_KEY, newSessionId);
    return newSessionId;
  } catch (error) {
    console.error('Failed to manage session ID:', error);
    return generateSessionId();
  }
}

const DEFAULT_MESSAGES: Message[] = [
  {
    id: 'welcome',
    role: 'assistant',
    content: "Hello! I'm your AI assistant powered by nanobot. How can I help you today?",
    timestamp: new Date(),
  },
];

function loadMessages(): Message[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((msg: Message) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }));
    }
  } catch (error) {
    console.error('Failed to load chat history:', error);
  }
  return DEFAULT_MESSAGES;
}

function saveMessages(messages: Message[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch (error) {
    console.error('Failed to save chat history:', error);
  }
}

async function loadHistory(sessionId: string): Promise<Message[]> {
  try {
    const res = await fetch(`/api/chat/history?sessionId=${encodeURIComponent(sessionId)}`);
    if (!res.ok) {
      throw new Error(`Failed to load history: ${res.status}`);
    }
    const data = await res.json();
    if (data.messages && Array.isArray(data.messages)) {
      return data.messages.map((msg: { role: string; content: string; timestamp?: string }) => ({
        id: `msg-${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
      }));
    }
    return [];
  } catch (error) {
    console.error('Failed to load history from backend:', error);
    return [];
  }
}

function mergeMessages(backendMessages: Message[], localMessages: Message[]): Message[] {
  // If local messages is just default, return backend
  if (localMessages.length <= 1 && localMessages[0]?.id === 'welcome') {
    return backendMessages.length > 0 ? backendMessages : localMessages;
  }
  
  // Otherwise merge: add local-only messages to backend history
  // (local messages are ones not yet sent to backend)
  const backendContentSet = new Set(backendMessages.map(m => m.content.trim()));
  const localOnlyMessages = localMessages.filter(m => 
    m.id !== 'welcome' && !backendContentSet.has(m.content.trim())
  );
  
  return [...backendMessages, ...localOnlyMessages];
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>(loadMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [sessionId] = useState<string>(getOrCreateSessionId);
  const streamingContentRef = useRef('');
  const historyLoadedRef = useRef(false);

  // Load history from backend on mount (only once)
  useEffect(() => {
    if (historyLoadedRef.current) return;
    historyLoadedRef.current = true;

    const initChat = async () => {
      setIsLoadingHistory(true);
      
      try {
        const localMessages = loadMessages();
        
        // Load history from backend for current session
        const backendMessages = await loadHistory(sessionId);
        
        // Merge: use backend messages if available, otherwise keep localStorage
        // But don't overwrite if history loading failed (empty backendMessages)
        if (backendMessages.length > 0) {
          const mergedMessages = mergeMessages(backendMessages, localMessages);
          setMessages(mergedMessages);
          saveMessages(mergedMessages);
        }
        // If backend returns empty, keep localMessages as-is (already loaded from localStorage)
      } catch (error) {
        console.error('Failed to load chat history:', error);
        // Keep existing local messages on error - don't overwrite with empty
      } finally {
        setIsLoadingHistory(false);
      }
    };
    
    initChat();
  }, [sessionId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    // Add user message using functional update to avoid stale closure
    setMessages(prev => {
      const updatedMessages = [...prev, userMessage];
      saveMessages(updatedMessages);
      return updatedMessages;
    });

    // Reset streaming states
    setStreamingContent('');
    setIsStreaming(false);
    setIsThinking(false);
    streamingContentRef.current = '';

    // Set loading state
    setIsLoading(true);

    try {
      // Try streaming first
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content.trim(), sessionId })
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      // Handle streaming response
      if (res.body) {
        setIsStreaming(true);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let currentEventType = 'message';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          
          // Parse SSE events from buffer - handle multi-line events
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim() || line.startsWith(':')) continue;
            
            // Track event type (can appear before data)
            if (line.startsWith('event:')) {
              currentEventType = line.slice(6).trim();
              continue;
            }
            
            // Parse data
            if (line.startsWith('data:')) {
              const dataContent = line.slice(5).trim();
              try {
                const data = JSON.parse(dataContent);
                
                switch (currentEventType) {
                  case 'thinking':
                    setIsThinking(data.status === 'starting' || data.status === 'queued');
                    break;
                  case 'progress':
                    // Handle rich progress event with tool, file, action, status
                    if (data.tool || data.file || data.action) {
                      setProgressSteps(prev => {
                        // Update existing or add new
                        const newStep: ProgressStep = {
                          tool: data.tool,
                          file: data.file,
                          action: data.action,
                          status: data.status || 'running',
                          content: data.content
                        };
                        // If we have a similar step, update it
                        const existingIndex = prev.findIndex(
                          s => s.tool === data.tool && s.file === data.file
                        );
                        if (existingIndex >= 0) {
                          const updated = [...prev];
                          updated[existingIndex] = newStep;
                          return updated;
                        }
                        return [...prev, newStep];
                      });
                    }
                    streamingContentRef.current += data.content;
                    setStreamingContent(streamingContentRef.current);
                    break;
                  case 'message':
                    // Final message - will be handled after stream ends
                    break;
                  case 'error':
                    console.error('Stream error:', data.content);
                    break;
                }
              } catch {
                // Not JSON, treat as plain text progress
                streamingContentRef.current += dataContent;
                setStreamingContent(streamingContentRef.current);
              }
              // Reset event type after processing
              currentEventType = 'message';
            }
          }
        }

        setIsStreaming(false);
        setIsThinking(false);

        // Create assistant message from streaming content
        const assistantMessage: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: streamingContentRef.current || 'No response',
          timestamp: new Date(),
        };

        // Use functional update to append assistant message
        setMessages(prev => {
          const finalMessages = [...prev, assistantMessage];
          saveMessages(finalMessages);
          return finalMessages;
        });
        setStreamingContent('');
        setShowSummary(true);
        // Auto-hide after 3 seconds
        setTimeout(() => setShowSummary(false), 3000);
      } else {
        throw new Error('No response body');
      }
    } catch (error) {
      console.error('Streaming failed, falling back to regular API:', error);
      
      // Fallback to regular /api/chat
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: content.trim(), sessionId })
        });

        if (!res.ok) {
          throw new Error(`API error: ${res.status}`);
        }

        const data = await res.json();

        const assistantMessage: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: data.response || data.message || 'No response',
          timestamp: new Date(),
          toolCalls: data.toolCalls,
        };

        // Use functional update to append assistant message
        setMessages(prev => {
          const finalMessages = [...prev, assistantMessage];
          saveMessages(finalMessages);
          return finalMessages;
        });
        setShowSummary(true);
        // Auto-hide after 3 seconds
        setTimeout(() => setShowSummary(false), 3000);
      } catch (fallbackError) {
        console.error('Failed to send message:', fallbackError);
        const errorMessage: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your request.',
          timestamp: new Date(),
        };
        // Use functional update to append error message
        setMessages(prev => {
          const finalMessages = [...prev, errorMessage];
          saveMessages(finalMessages);
          return finalMessages;
        });
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      setIsThinking(false);
      setProgressSteps([]);
      setStreamingContent('');
    }
  }, [isLoading, sessionId]);

  const clearHistory = useCallback(async () => {
    // Try to call backend API to clear session
    try {
      await fetch('/api/chat/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
    } catch (error) {
      console.warn('Failed to clear session on backend:', error);
    }

    // Clear local state and storage
    setMessages(DEFAULT_MESSAGES);
    localStorage.removeItem(STORAGE_KEY);
  }, [sessionId]);

  return {
    messages,
    isLoading,
    isLoadingHistory,
    isStreaming,
    isThinking,
    streamingContent,
    progressSteps,
    showSummary,
    sendMessage,
    clearHistory,
    sessionId,
  };
}
