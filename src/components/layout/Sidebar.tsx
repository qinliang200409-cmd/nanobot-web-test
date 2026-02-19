import { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useSession } from '../../contexts/SessionContext';
import { Button } from '../ui/Button';

interface SidebarProps {
  collapsed: boolean;
}

export function Sidebar({ collapsed }: SidebarProps) {
  const location = useLocation();
  const isChatPage = location.pathname === '/chat';
  const {
    sessions,
    activeSession,
    availableAgents,
    createSession,
    switchSession,
    deleteSession,
    updateSessionAgent,
  } = useSession();

  const [isAgentDropdownOpen, setIsAgentDropdownOpen] = useState(false);
  const [isSessionsExpanded, setIsSessionsExpanded] = useState(true);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; sessionId: string } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  
  // Agent edit modal state
  const [editingAgent, setEditingAgent] = useState<{ id: string; name: string; content: string } | null>(null);
  const [agentContent, setAgentContent] = useState('');
  const [isSavingAgent, setIsSavingAgent] = useState(false);

  // Close context menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close context menu on scroll or resize
  useEffect(() => {
    function handleScrollOrResize() {
      setContextMenu(null);
    }
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, []);

  const handleNewSession = () => {
    const agentId = activeSession?.agentId || 'default';
    createSession(agentId);
  };

  const handleAgentSelect = (agentId: string) => {
    if (activeSession) {
      updateSessionAgent(activeSession.id, agentId);
    }
    setIsAgentDropdownOpen(false);
  };

  const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (sessions.length > 1) {
      deleteSession(sessionId);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, sessionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, sessionId });
  };

  const handleContextMenuDelete = () => {
    if (contextMenu && sessions.length > 1) {
      deleteSession(contextMenu.sessionId);
      setContextMenu(null);
    }
  };

  // Agent editing functions
  const handleEditAgent = async (agentId: string, agentName: string) => {
    setIsAgentDropdownOpen(false);
    try {
      const response = await fetch(`/api/agents/${agentId}`);
      if (response.ok) {
        const data = await response.json();
        setEditingAgent({ id: agentId, name: agentName, content: data.content || '' });
        setAgentContent(data.content || '');
      } else {
        // If agent file doesn't exist, start with a template
        setEditingAgent({ id: agentId, name: agentName, content: `# ${agentName}\n\nYou are ${agentName}.` });
        setAgentContent(`# ${agentName}\n\nYou are ${agentName}.`);
      }
    } catch (error) {
      console.error('Failed to fetch agent content:', error);
      setEditingAgent({ id: agentId, name: agentName, content: `# ${agentName}\n\nYou are ${agentName}.` });
      setAgentContent(`# ${agentName}\n\nYou are ${agentName}.`);
    }
  };

  const handleCreateAgent = () => {
    setIsAgentDropdownOpen(false);
    const newAgentName = prompt('Enter agent name:');
    if (!newAgentName || !newAgentName.trim()) return;
    
    const agentId = newAgentName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const trimmedName = newAgentName.trim();
    
    setEditingAgent({ id: agentId, name: trimmedName, content: `# ${trimmedName}\n\nYou are a helpful AI assistant.` });
    setAgentContent(`# ${trimmedName}\n\nYou are a helpful AI assistant.`);
  };

  const handleDeleteAgent = async (e: React.MouseEvent, agentId: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this agent?')) return;
    
    try {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        // Refresh page to show updated agents list
        window.location.reload();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete agent');
      }
    } catch (error) {
      console.error('Failed to delete agent:', error);
    }
  };

  const handleSaveAgent = async () => {
    if (!editingAgent) return;
    
    setIsSavingAgent(true);
    try {
      const response = await fetch(`/api/agents/${editingAgent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: agentContent }),
      });
      
      if (response.ok) {
        setEditingAgent(null);
        setAgentContent('');
        // Refresh page to show new agent
        window.location.reload();
      } else {
        console.error('Failed to save agent:', await response.text());
      }
    } catch (error) {
      console.error('Failed to save agent:', error);
    } finally {
      setIsSavingAgent(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingAgent(null);
    setAgentContent('');
  };

  const currentAgent = availableAgents.find(a => a.id === (activeSession?.agentId || 'default')) || availableAgents[0];

  return (
    <aside
      className={cn(
        'bg-[#F7F7F7] dark:bg-[#242424] border-r border-[#E5E5E5] dark:border-[#333333] flex flex-col shrink-0 min-h-0 transition-all duration-300 ease-in-out overflow-hidden',
        collapsed ? 'w-0' : 'w-[260px]'
      )}
    >
      <div className={cn('flex flex-col h-full min-h-0', collapsed && 'opacity-0')}>
        {/* New Session Button */}
        <div className="p-3">
          <button
            onClick={handleNewSession}
            className="w-full flex items-center gap-2 px-4 py-2.5 bg-[#10A37F] hover:bg-[#0E8F6B] text-white rounded-lg font-medium text-sm transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Session
          </button>
        </div>

        {/* Agent Selector - Only show on chat page */}
        {isChatPage && (
          <div className="px-3 pb-3">
            <div className="relative">
              <button
                onClick={() => setIsAgentDropdownOpen(!isAgentDropdownOpen)}
                className="w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-[#333333] border border-[#E5E5E5] dark:border-[#444444] rounded-lg text-sm hover:bg-[#F5F5F5] dark:hover:bg-[#444444] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[#1A1A1A] dark:text-white">{currentAgent.name}</span>
                </div>
                <svg className="w-4 h-4 text-[#666666] dark:text-[#999999]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              <AnimatePresence>
                {isAgentDropdownOpen && (
                    <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#333333] border border-[#E5E5E5] dark:border-[#444444] rounded-lg shadow-lg z-10 overflow-hidden"
                  >
                    {/* New Agent Button */}
                    <div
                      onClick={handleCreateAgent}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-[#10A37F] hover:bg-[#F5F5F5] dark:hover:bg-[#444444] cursor-pointer border-b border-[#E5E5E5] dark:border-[#444444]"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>New Agent</span>
                    </div>
                    
                    {availableAgents.map((agent) => (
                      <div
                        onClick={() => handleAgentSelect(agent.id)}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 text-sm hover:bg-[#F5F5F5] dark:hover:bg-[#444444] transition-colors group cursor-pointer',
                          agent.id === currentAgent.id && 'bg-[#F0F0F0] dark:bg-[#444444]'
                        )}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="text-[#1A1A1A] dark:text-white truncate">{agent.name}</div>
                        </div>
                        {/* Edit Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditAgent(agent.id, agent.name);
                          }}
                          className="p-1 hover:bg-[#D0D0D0] dark:hover:bg-[#555555] rounded transition-all shrink-0"
                          title="Edit agent"
                        >
                          <svg className="w-3 h-3 text-[#666666] dark:text-[#999999]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        {/* Delete Button - not allowed for default */}
                        {agent.id !== 'default' && (
                          <button
                            onClick={(e) => handleDeleteAgent(e, agent.id)}
                            className="p-1 hover:bg-[#FFCCCC] dark:hover:bg-[#994444] rounded transition-all shrink-0"
                            title="Delete agent"
                          >
                            <svg className="w-3 h-3 text-[#666666] dark:text-[#999999]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Session List */}
        <div className="flex-1 min-h-0 overflow-auto px-3">
          <div className="flex items-center justify-between px-2 py-2">
            <span className="text-xs font-medium text-[#666666] dark:text-[#999999] uppercase tracking-wide">
              Sessions
            </span>
            <button
              onClick={() => setIsSessionsExpanded(!isSessionsExpanded)}
              className="text-[#666666] dark:text-[#999999] hover:text-[#1A1A1A] dark:hover:text-white transition-colors"
            >
              <svg 
                className={cn('w-4 h-4 transition-transform', isSessionsExpanded && 'rotate-180')} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          
          <AnimatePresence>
            {isSessionsExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <ul className="space-y-1">
                  {sessions.map((session) => (
                    <li key={session.id}>
                      <div
                        onClick={() => switchSession(session.id)}
                        onContextMenu={(e) => handleContextMenu(e, session.id)}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors group cursor-pointer',
                          activeSession?.id === session.id
                            ? 'bg-[#E5E5E5] dark:bg-[#333333] text-[#1A1A1A] dark:text-white'
                            : 'text-[#666666] dark:text-[#999999] hover:bg-[#E8E8E8] dark:hover:bg-[#333333] hover:text-[#1A1A1A] dark:hover:text-white'
                        )}
                      >
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span className="flex-1 truncate">{session.name}</span>
                        {sessions.length > 1 && (
                          <span
                            onClick={(e) => handleDeleteSession(e, session.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#D0D0D0] rounded transition-all cursor-pointer"
                            title="Delete session"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Context Menu */}
        <AnimatePresence>
          {contextMenu && (
            <motion.div
              ref={contextMenuRef}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed bg-white border border-[#E5E5E5] rounded-lg shadow-lg py-1 z-50 min-w-[140px]"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              <button
                onClick={handleContextMenuDelete}
                disabled={sessions.length <= 1}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-[#F5F5F5] transition-colors',
                  sessions.length <= 1 && 'opacity-50 cursor-not-allowed'
                )}
              >
                <svg className="w-4 h-4 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="text-[#DC2626]">Delete</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Agent Edit Modal */}
        <AnimatePresence>
          {editingAgent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={handleCancelEdit}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-4 border-b border-[#E5E5E5]">
                  <h2 className="text-lg font-semibold text-[#1A1A1A]">
                    Edit Agent: {editingAgent.name}
                  </h2>
                  <button
                    onClick={handleCancelEdit}
                    className="p-1 hover:bg-[#F5F5F5] rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="flex-1 p-4 overflow-hidden">
                  <textarea
                    value={agentContent}
                    onChange={(e) => setAgentContent(e.target.value)}
                    className="w-full h-[300px] p-3 border border-[#E5E5E5] rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] focus:border-transparent"
                    placeholder="Enter agent prompt..."
                  />
                  <p className="mt-2 text-xs text-[#666666]">
                    Edit the markdown content that defines this agent's behavior.
                  </p>
                </div>
                <div className="flex justify-end gap-2 p-4 border-t border-[#E5E5E5]">
                  <Button variant="secondary" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveAgent} disabled={isSavingAgent}>
                    {isSavingAgent ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Navigation */}
        <div className="border-t border-[#E5E5E5] p-3 mt-auto">
          <nav>
            <ul className="space-y-1">
              {[
                { path: '/chat', label: 'Chat' },
                { path: '/persona', label: 'Persona' },
                { path: '/todos', label: 'Todos' },
                { path: '/settings', label: 'Settings' },
              ].map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center px-3 py-2 rounded-lg text-sm transition-colors',
                        isActive
                          ? 'bg-[#E5E5E5] text-[#1A1A1A] font-medium'
                          : 'text-[#666666] hover:bg-[#E8E8E8] hover:text-[#1A1A1A]'
                      )
                    }
                  >
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </aside>
  );
}
