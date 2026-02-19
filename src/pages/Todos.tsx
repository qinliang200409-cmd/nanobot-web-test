import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Switch } from '../components/ui/Switch';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface GroupedTodos {
  expired: Todo[];
  today: Todo[];
  tomorrow: Todo[];
  later: Todo[];
  noDate: Todo[];
}

const STORAGE_KEY = 'nanobot-todos';

function generateId(): string {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

function getDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getTodayString(): string {
  return getDateString(new Date());
}

function getTomorrowString(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return getDateString(tomorrow);
}

function groupTodos(todos: Todo[]): GroupedTodos {
  const today = getTodayString();
  const tomorrow = getTomorrowString();

  return {
    expired: todos.filter(t => t.dueDate && t.dueDate < today && !t.completed),
    today: todos.filter(t => t.dueDate === today),
    tomorrow: todos.filter(t => t.dueDate === tomorrow),
    later: todos.filter(t => t.dueDate && t.dueDate > tomorrow),
    noDate: todos.filter(t => !t.dueDate),
  };
}

function getAISuggestion(todos: Todo[]): string {
  const incomplete = todos.filter(t => !t.completed);
  const overdue = incomplete.filter(t => t.dueDate && t.dueDate < getTodayString());
  const today = incomplete.filter(t => t.dueDate === getTodayString());

  if (incomplete.length === 0) {
    return '太棒了！你已经完成了所有待办事项！';
  }

  let suggestion = `你有 ${incomplete.length} 个待办事项。`;

  if (overdue.length > 0) {
    suggestion += `其中 ${overdue.length} 个已过期，建议优先处理。`;
  }

  if (today.length > 0) {
    suggestion += `今天是最后期限的有 ${today.length} 个任务。`;
  }

  if (overdue.length > 0) {
    const urgent = overdue[0];
    suggestion += `\n\n建议优先处理：「${urgent.title}」(已过期)`;
  } else if (today.length > 0) {
    const urgent = today[0];
    suggestion += `\n\n建议优先处理：「${urgent.title}」(今天到期)`;
  } else {
    const next = incomplete.find(t => t.dueDate);
    if (next) {
      suggestion += `\n\n下一个待办：「${next.title}」(${next.dueDate})`;
    }
  }

  return suggestion;
}

function getStartupReminderSettings(): boolean {
  try {
    const saved = localStorage.getItem('nanobot-settings');
    if (saved) {
      const settings = JSON.parse(saved);
      return settings?.web?.startup_remind_todos === true;
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return false;
}

export function Todos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoDate, setNewTodoDate] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [showReminder, setShowReminder] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setTodos(parsed);
      } catch (e) {
        console.error('Failed to parse todos:', e);
      }
    }

    // Check startup reminder
    if (getStartupReminderSettings()) {
      setShowReminder(true);
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }, [todos]);

  // Generate AI suggestion when todos change
  useEffect(() => {
    setAiSuggestion(getAISuggestion(todos));
  }, [todos]);

  const addTodo = () => {
    if (!newTodoTitle.trim()) return;
    const now = new Date().toISOString();
    const newTodo: Todo = {
      id: generateId(),
      title: newTodoTitle.trim(),
      completed: false,
      dueDate: newTodoDate || undefined,
      createdAt: now,
      updatedAt: now,
    };
    setTodos(prev => [...prev, newTodo]);
    setNewTodoTitle('');
    setNewTodoDate('');
  };

  const toggleTodo = (id: string) => {
    setTodos(prev =>
      prev.map(todo =>
        todo.id === id
          ? { ...todo, completed: !todo.completed, updatedAt: new Date().toISOString() }
          : todo
      )
    );
  };

  const deleteTodo = (id: string) => {
    setTodos(prev => prev.filter(todo => todo.id !== id));
    setDeleteConfirmId(null);
  };

  const startEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setEditTitle(todo.title);
    setEditDate(todo.dueDate || '');
  };

  const saveEdit = () => {
    if (!editTitle.trim() || !editingId) return;
    setTodos(prev =>
      prev.map(todo =>
        todo.id === editingId
          ? { ...todo, title: editTitle.trim(), dueDate: editDate || undefined, updatedAt: new Date().toISOString() }
          : todo
      )
    );
    setEditingId(null);
    setEditTitle('');
    setEditDate('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditDate('');
  };

  const refreshAISuggestion = () => {
    setAiSuggestion(getAISuggestion(todos));
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      action();
    }
  };

  const grouped = groupTodos(todos);
  const completedCount = todos.filter(t => t.completed).length;
  const totalCount = todos.length;
  const incompleteCount = totalCount - completedCount;

  const renderGroup = (title: string, todosInGroup: Todo[], isExpired = false, isToday = false, isTomorrow = false) => {
    if (todosInGroup.length === 0) return null;

    let titleColor = 'text-[#666666]';
    if (isExpired) titleColor = 'text-[#DC2626]';
    if (isToday) titleColor = 'text-[#2563EB]';
    if (isTomorrow) titleColor = 'text-[#059669]';

    return (
      <div className="mb-6">
        <h3 className={`text-sm font-medium mb-3 ${titleColor}`}>── {title} ──</h3>
        <div className="space-y-2">
          {todosInGroup.map(todo => renderTodoItem(todo, isExpired, isToday, isTomorrow))}
        </div>
      </div>
    );
  };

  const renderTodoItem = (todo: Todo, isExpired = false, isToday = false, isTomorrow = false) => {
    // Edit mode
    if (editingId === todo.id) {
      return (
        <Card key={todo.id} className="p-3 bg-[#FAFAFA]">
          <div className="space-y-2">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, saveEdit)}
              placeholder="待办标题"
              autoFocus
            />
            <div className="flex gap-2">
              <Input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="flex-1"
              />
              <Button size="sm" onClick={saveEdit}>保存</Button>
              <Button size="sm" variant="secondary" onClick={cancelEdit}>取消</Button>
            </div>
          </div>
        </Card>
      );
    }

    // Delete confirmation
    if (deleteConfirmId === todo.id) {
      return (
        <Card key={todo.id} className="p-3 bg-[#FEF2F2] border-[#DC2626]">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#DC2626]">确定要删除这个待办吗？</span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setDeleteConfirmId(null)}>取消</Button>
              <Button size="sm" className="bg-[#DC2626] hover:bg-[#B91C1C]" onClick={() => deleteTodo(todo.id)}>删除</Button>
            </div>
          </div>
        </Card>
      );
    }

    // Normal display
    let dateColor = '';
    if (todo.completed) {
      dateColor = 'text-[#999999]';
    } else if (isExpired) {
      dateColor = 'text-[#DC2626]';
    } else if (isToday) {
      dateColor = 'text-[#2563EB]';
    } else if (isTomorrow) {
      dateColor = 'text-[#059669]';
    }

    return (
      <Card key={todo.id} className="flex items-center gap-3 p-3">
        <Switch
          checked={todo.completed}
          onCheckedChange={() => toggleTodo(todo.id)}
        />
        <div className="flex-1 min-w-0">
          <span
            className={`text-sm block truncate ${
              todo.completed ? 'text-[#999999] line-through' : 'text-[#1A1A1A]'
            }`}
          >
            {todo.title}
          </span>
          {todo.dueDate && (
            <span className={`text-xs ${dateColor}`}>
              {todo.dueDate}
              {todo.completed && ' (已完成)'}
              {isExpired && !todo.completed && ' (已过期)'}
              {isToday && !todo.completed && ' (今天到期)'}
              {isTomorrow && !todo.completed && ' (明天到期)'}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => startEdit(todo)}
          className="text-[#999999] hover:text-[#2563EB]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDeleteConfirmId(todo.id)}
          className="text-[#999999] hover:text-[#DC2626]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </Button>
      </Card>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-xl">
      {/* Startup Reminder */}
      {showReminder && incompleteCount > 0 && (
        <Card className="bg-[#FEF3C7] border-[#F59E0B] p-4">
          <div className="flex items-start gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-[#92400E]">启动提醒</h3>
              <p className="text-sm text-[#92400E] mt-1">
                你有 <span className="font-bold">{incompleteCount}</span> 个待办事项需要处理
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowReminder(false)} className="text-[#92400E]">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </Button>
          </div>
        </Card>
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-[#1A1A1A] mb-1">待办事项</h1>
        <p className="text-sm text-[#666666]">
          {completedCount} / {totalCount} 已完成
        </p>
      </div>

      {/* Add Todo Form */}
      <Card className="p-4">
        <div className="space-y-3">
          <Input
            value={newTodoTitle}
            onChange={(e) => setNewTodoTitle(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, addTodo)}
            placeholder="输入待办标题..."
            className="w-full"
          />
          <div className="flex gap-2">
            <Input
              type="date"
              value={newTodoDate}
              onChange={(e) => setNewTodoDate(e.target.value)}
              className="flex-1"
            />
            <Button onClick={addTodo}>添加</Button>
          </div>
        </div>
      </Card>

      {/* Todo List */}
      <div>
        {todos.length === 0 ? (
          <Card className="text-center py-8">
            <p className="text-sm text-[#666666]">暂无待办事项，添加一个吧！</p>
          </Card>
        ) : (
          <>
            {renderGroup('已过期', grouped.expired, true)}
            {renderGroup('今天', grouped.today, false, true)}
            {renderGroup('明天', grouped.tomorrow, false, false, true)}
            {renderGroup('更晚', grouped.later)}
            {renderGroup('无截止日期', grouped.noDate)}
          </>
        )}
      </div>

      {/* AI Suggestions */}
      <Card className="bg-gradient-to-r from-[#F0F9FF] to-[#E0F2FE] border-[#0EA5E9]">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-[#0EA5E9] flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-[#0C4A6E] mb-2">AI 建议</h3>
            <p className="text-sm text-[#0C4A6E] whitespace-pre-line">{aiSuggestion}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshAISuggestion}
              className="mt-2 text-[#0EA5E9] hover:text-[#0284C7] hover:bg-[#E0F2FE]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 16h5v5" />
              </svg>
              刷新建议
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
