import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Switch } from '../components/ui/Switch';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';

// ============ Types ============
interface AgentSettings {
  model: string;
  temperature: number;
  max_tokens: number;
  max_tool_iterations: number;
  memory_window: number;
}

interface ProviderConfig {
  provider: string;
  api_key: string;
  api_base: string;
}

interface ChannelConfig {
  enabled: boolean;
  // Telegram
  token?: string;
  allow_from?: string;
  proxy?: string;
  // Discord
  // WhatsApp
  bridge_url?: string;
  bridge_token?: string;
  // Feishu
  app_id?: string;
  app_secret?: string;
  // DingTalk
  client_id?: string;
  client_secret?: string;
  // Email
  imap_host?: string;
  imap_port?: string;
  imap_user?: string;
  imap_pass?: string;
  smtp_host?: string;
  smtp_port?: string;
  smtp_user?: string;
  smtp_pass?: string;
  // Slack
  bot_token?: string;
  app_token?: string;
  // QQ
  secret?: string;
  // Mochat
  claw_token?: string;
  base_url?: string;
}

interface ToolsSettings {
  web_search_api_key: string;
  mcp_servers: MCPServer[];
  exec_timeout: number;
  restrict_to_workspace: boolean;
}

interface MCPServer {
  id: string;
  name: string;
  command: string;
  args: string;
  env: Record<string, string>;
}

interface WebSettings {
  startup_remind_todos: boolean;
  theme: 'light' | 'dark' | 'system';
}

interface NanobotSettings {
  agent: AgentSettings;
  provider: ProviderConfig;
  channels: Record<string, ChannelConfig>;
  tools: ToolsSettings;
  web: WebSettings;
}

// ============ Constants ============
const PROVIDERS = [
  { value: 'custom', label: 'Custom (OpenAI Compatible)' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'groq', label: 'Groq' },
  { value: 'zhipu', label: '智谱 (Zhipu)' },
  { value: 'dashscope', label: '阿里云通义千问 (Dashscope)' },
  { value: 'vllm', label: 'vLLM' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'moonshot', label: '月之暗面 (Moonshot/Kimi)' },
  { value: 'minimax', label: 'MiniMax' },
  { value: 'aihubmix', label: 'AIHubMix' },
  { value: 'siliconflow', label: '硅基流动 (SiliconFlow)' },
  { value: 'openai_codex', label: 'OpenAI Codex' },
  { value: 'github_copilot', label: 'GitHub Copilot' },
];

const CHANNELS = [
  { key: 'telegram', label: 'Telegram', fields: ['token', 'allow_from', 'proxy'] },
  { key: 'discord', label: 'Discord', fields: ['token', 'allow_from'] },
  { key: 'whatsapp', label: 'WhatsApp', fields: ['bridge_url', 'bridge_token'] },
  { key: 'feishu', label: '飞书 (Feishu)', fields: ['app_id', 'app_secret'] },
  { key: 'dingtalk', label: '钉钉 (DingTalk)', fields: ['client_id', 'client_secret'] },
  { key: 'email', label: 'Email', fields: ['imap_host', 'imap_port', 'imap_user', 'imap_pass', 'smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass'] },
  { key: 'slack', label: 'Slack', fields: ['bot_token', 'app_token'] },
  { key: 'qq', label: 'QQ', fields: ['app_id', 'secret'] },
  { key: 'mochat', label: 'MoChat', fields: ['claw_token', 'base_url'] },
];

const DEFAULT_SETTINGS: NanobotSettings = {
  agent: {
    model: 'anthropic/claude-opus-4-5-20251114',
    temperature: 0.7,
    max_tokens: 8192,
    max_tool_iterations: 50,
    memory_window: 20,
  },
  provider: {
    provider: 'openrouter',
    api_key: '',
    api_base: '',
  },
  channels: {
    telegram: { enabled: false, token: '', allow_from: '', proxy: '' },
    discord: { enabled: false, token: '', allow_from: '' },
    whatsapp: { enabled: false, bridge_url: '', bridge_token: '' },
    feishu: { enabled: false, app_id: '', app_secret: '' },
    dingtalk: { enabled: false, client_id: '', client_secret: '' },
    email: { enabled: false, imap_host: '', imap_port: '', imap_user: '', imap_pass: '', smtp_host: '', smtp_port: '', smtp_user: '', smtp_pass: '' },
    slack: { enabled: false, bot_token: '', app_token: '' },
    qq: { enabled: false, app_id: '', secret: '' },
    mochat: { enabled: false, claw_token: '', base_url: '' },
  },
  tools: {
    web_search_api_key: '',
    mcp_servers: [],
    exec_timeout: 30,
    restrict_to_workspace: true,
  },
  web: {
    startup_remind_todos: false,
    theme: 'system',
  },
};

// ============ Helper Functions ============
function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function Settings() {
  const [settings, setSettings] = useState<NanobotSettings>(DEFAULT_SETTINGS);
  const [expandedChannel, setExpandedChannel] = useState<string | null>(null);
  const [mcpForm, setMcpForm] = useState({ name: '', command: '', args: '', env_key: '', env_value: '' });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('nanobot-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge with defaults to ensure all fields exist
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (e) {
        console.error('Failed to parse saved settings:', e);
      }
    }
  }, []);

  // Transform frontend settings to nanobot config format
  const transformToNanobotConfig = (frontendSettings: NanobotSettings) => {
    const providerName = frontendSettings.provider.provider || 'custom';
    
    return {
      agents: {
        defaults: {
          workspace: '~/.nanobot/workspace',
          model: frontendSettings.agent.model,
          maxTokens: frontendSettings.agent.max_tokens,
          temperature: frontendSettings.agent.temperature,
          maxToolIterations: frontendSettings.agent.max_tool_iterations,
          memoryWindow: frontendSettings.agent.memory_window,
        }
      },
      channels: frontendSettings.channels,
      providers: {
        [providerName]: {
          apiKey: frontendSettings.provider.api_key,
          apiBase: frontendSettings.provider.api_base || null,
          extraHeaders: null,
        }
      },
      tools: {
        web_search_api_key: frontendSettings.tools.web_search_api_key,
        mcp_servers: frontendSettings.tools.mcp_servers,
        exec_timeout: frontendSettings.tools.exec_timeout,
        restrict_to_workspace: frontendSettings.tools.restrict_to_workspace,
      },
    };
  };

  const handleSave = () => {
    // 表单验证
    if (!settings.provider.api_key.trim()) {
      alert('请填写 API Key！');
      return;
    }
    
    setSaveStatus('saving');
    try {
      // Save to localStorage
      localStorage.setItem('nanobot-settings', JSON.stringify(settings));
      
      // Transform to nanobot format and save to config file
      const nanobotConfig = transformToNanobotConfig(settings);
      
      fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: nanobotConfig })
      }).then(() => {
        setTimeout(() => {
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2000);
        }, 300);
      }).catch(() => {
        // Still show saved even if API fails (localStorage worked)
        setTimeout(() => {
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2000);
        }, 300);
      });
    } catch (e) {
      setSaveStatus('error');
    }
  };

  // Transform nanobot config to frontend settings format
  const transformFromNanobotConfig = (nanobotConfig: any): NanobotSettings => {
    const agents = nanobotConfig?.agents?.defaults || {};
    const providers = nanobotConfig?.providers || {};
    const channels = nanobotConfig?.channels || {};
    const tools = nanobotConfig?.tools || {};
    
    // Find the first provider with an API key
    let providerName = 'custom';
    let providerConfig = { apiKey: '', apiBase: '' };
    
    for (const [name, config] of Object.entries(providers)) {
      const cfg = config as any;
      if (cfg?.apiKey) {
        providerName = name;
        providerConfig = {
          apiKey: cfg.apiKey,
          apiBase: cfg.apiBase || '',
        };
        break;
      }
    }
    
    return {
      agent: {
        model: agents.model || 'anthropic/claude-opus-4-5-20251114',
        temperature: agents.temperature || 0.7,
        max_tokens: agents.maxTokens || 8192,
        max_tool_iterations: agents.maxToolIterations || 50,
        memory_window: agents.memoryWindow || 20,
      },
      provider: {
        provider: providerName,
        api_key: providerConfig.apiKey,
        api_base: providerConfig.apiBase,
      },
      channels: channels,
      tools: {
        web_search_api_key: tools.web_search_api_key || '',
        mcp_servers: tools.mcp_servers || [],
        exec_timeout: tools.exec_timeout || 30,
        restrict_to_workspace: tools.restrict_to_workspace ?? true,
      },
      web: {
        startup_remind_todos: false,
        theme: 'system',
      },
    };
  };

  const handleLoad = () => {
    // First try to load from nanobot config via API
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.settings) {
          const frontendSettings = transformFromNanobotConfig(data.settings);
          setSettings({ ...DEFAULT_SETTINGS, ...frontendSettings });
        }
      })
      .catch(() => {
        // Fallback to localStorage
        const saved = localStorage.getItem('nanobot-settings');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setSettings({ ...DEFAULT_SETTINGS, ...parsed });
          } catch (e) {
            console.error('Failed to parse saved settings:', e);
          }
        }
      });
  };

  const updateAgent = (field: keyof AgentSettings, value: string | number) => {
    setSettings(prev => ({
      ...prev,
      agent: { ...prev.agent, [field]: value }
    }));
  };

  const updateProvider = (field: keyof ProviderConfig, value: string) => {
    setSettings(prev => ({
      ...prev,
      provider: { ...prev.provider, [field]: value }
    }));
  };

  const updateChannel = (channelKey: string, field: string, value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      channels: {
        ...prev.channels,
        [channelKey]: { ...prev.channels[channelKey], [field]: value }
      }
    }));
  };

  const updateTools = (field: keyof ToolsSettings, value: string | number | boolean | MCPServer[]) => {
    setSettings(prev => ({
      ...prev,
      tools: { ...prev.tools, [field]: value }
    }));
  };

  const updateWeb = (field: keyof WebSettings, value: boolean | string) => {
    setSettings(prev => ({
      ...prev,
      web: { ...prev.web, [field]: value }
    }));
    
    // Apply theme change immediately
    if (field === 'theme') {
      const theme = value as string;
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else if (theme === 'light') {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      } else {
        // system
        localStorage.setItem('theme', 'system');
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    }
  };

  const addMcpServer = () => {
    const newServer: MCPServer = {
      id: generateId(),
      name: mcpForm.name || 'Unnamed Server',
      command: mcpForm.command,
      args: mcpForm.args,
      env: mcpForm.env_key && mcpForm.env_value ? { [mcpForm.env_key]: mcpForm.env_value } : {},
    };
    updateTools('mcp_servers', [...settings.tools.mcp_servers, newServer]);
    setMcpForm({ name: '', command: '', args: '', env_key: '', env_value: '' });
  };

  const removeMcpServer = (id: string) => {
    updateTools('mcp_servers', settings.tools.mcp_servers.filter(s => s.id !== id));
  };

  const getChannelFields = (channelKey: string) => {
    const channel = CHANNELS.find(c => c.key === channelKey);
    return channel?.fields || [];
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-[#1A1A1A] mb-1">设置</h1>
        <p className="text-sm text-[#666666]">配置 Nanobot 各项设置</p>
      </div>

      <Card className="space-y-6">
        {/* ============ Agent Settings ============ */}
        <div>
          <h2 className="text-sm font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-[#1A1A1A] rounded-full"></span>
            模型设置
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <label className="text-sm font-medium text-[#1A1A1A]">默认模型</label>
              <Input
                value={settings.agent.model}
                onChange={(e) => updateAgent('model', e.target.value)}
                placeholder="anthropic/claude-opus-4-5-20251114"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#1A1A1A]">Temperature</label>
              <Input
                type="number"
                min={0}
                max={2}
                step={0.1}
                value={settings.agent.temperature}
                onChange={(e) => updateAgent('temperature', parseFloat(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#1A1A1A]">Max Tokens</label>
              <Input
                type="number"
                min={1}
                value={settings.agent.max_tokens}
                onChange={(e) => updateAgent('max_tokens', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#1A1A1A]">Max Tool Iterations</label>
              <Input
                type="number"
                min={1}
                value={settings.agent.max_tool_iterations}
                onChange={(e) => updateAgent('max_tool_iterations', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#1A1A1A]">Memory Window</label>
              <Input
                type="number"
                min={1}
                value={settings.agent.memory_window}
                onChange={(e) => updateAgent('memory_window', parseInt(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-[#E5E5E5] pt-6">
          <h2 className="text-sm font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-[#1A1A1A] rounded-full"></span>
            Provider 配置
          </h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#1A1A1A]">选择 Provider</label>
              <Select
                options={PROVIDERS}
                value={settings.provider.provider}
                onValueChange={(value) => updateProvider('provider', value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#1A1A1A]">API Key</label>
              <Input
                type="password"
                value={settings.provider.api_key}
                onChange={(e) => updateProvider('api_key', e.target.value)}
                placeholder="sk-..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#1A1A1A]">API Base (可选)</label>
              <Input
                value={settings.provider.api_base}
                onChange={(e) => updateProvider('api_base', e.target.value)}
                placeholder="https://api.example.com/v1"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-[#E5E5E5] pt-6">
          <h2 className="text-sm font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-[#1A1A1A] rounded-full"></span>
            Channel 配置
          </h2>
          <div className="space-y-3">
            {CHANNELS.map(channel => (
              <div key={channel.key} className="border border-[#E5E5E5] rounded-lg overflow-hidden">
                <div
                  className="flex items-center justify-between p-3 bg-[#FAFAFA] cursor-pointer hover:bg-[#F5F5F5] transition-colors"
                  onClick={() => setExpandedChannel(expandedChannel === channel.key ? null : channel.key)}
                >
                  <span className="text-sm font-medium text-[#1A1A1A]">{channel.label}</span>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={settings.channels[channel.key]?.enabled || false}
                      onCheckedChange={(checked) => updateChannel(channel.key, 'enabled', checked)}
                    />
                  </div>
                </div>
                {expandedChannel === channel.key && (
                  <div className="p-3 bg-white border-t border-[#E5E5E5] space-y-3">
                    {getChannelFields(channel.key).map(field => (
                      <div key={field} className="space-y-1">
                        <label className="text-xs font-medium text-[#666666] uppercase">{field.replace(/_/g, ' ')}</label>
                        <Input
                          type={field.includes('pass') || field.includes('secret') || field.includes('token') && field !== 'allow_from' ? 'password' : 'text'}
                          value={settings.channels[channel.key]?.[field as keyof ChannelConfig] as string || ''}
                          onChange={(e) => updateChannel(channel.key, field, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-[#E5E5E5] pt-6">
          <h2 className="text-sm font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-[#1A1A1A] rounded-full"></span>
            工具配置
          </h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#1A1A1A]">Web Search API Key (Brave Search)</label>
              <Input
                type="password"
                value={settings.tools.web_search_api_key}
                onChange={(e) => updateTools('web_search_api_key', e.target.value)}
                placeholder="Brave Search API Key"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#1A1A1A]">MCP Servers</label>
              <div className="space-y-2">
                {settings.tools.mcp_servers.map(server => (
                  <div key={server.id} className="flex items-center justify-between p-2 bg-[#F5F5F5] rounded-lg">
                    <div className="text-sm">
                      <span className="font-medium">{server.name}</span>
                      <span className="text-[#666666] ml-2">{server.command} {server.args}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeMcpServer(server.id)}>删除</Button>
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-2 p-3 bg-[#FAFAFA] rounded-lg border border-[#E5E5E5]">
                  <Input
                    placeholder="Server Name"
                    value={mcpForm.name}
                    onChange={(e) => setMcpForm({ ...mcpForm, name: e.target.value })}
                  />
                  <Input
                    placeholder="Command (e.g., npx)"
                    value={mcpForm.command}
                    onChange={(e) => setMcpForm({ ...mcpForm, command: e.target.value })}
                  />
                  <Input
                    placeholder="Args (e.g., -m server)"
                    value={mcpForm.args}
                    onChange={(e) => setMcpForm({ ...mcpForm, args: e.target.value })}
                    className="col-span-2"
                  />
                  <div className="col-span-2 flex gap-2">
                    <Input
                      placeholder="ENV Key"
                      value={mcpForm.env_key}
                      onChange={(e) => setMcpForm({ ...mcpForm, env_key: e.target.value })}
                    />
                    <Input
                      placeholder="ENV Value"
                      value={mcpForm.env_value}
                      onChange={(e) => setMcpForm({ ...mcpForm, env_value: e.target.value })}
                    />
                  </div>
                  <Button variant="secondary" size="sm" onClick={addMcpServer} className="col-span-2">
                    添加 MCP Server
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#1A1A1A]">Exec Timeout (秒)</label>
                <Input
                  type="number"
                  min={1}
                  value={settings.tools.exec_timeout}
                  onChange={(e) => updateTools('exec_timeout', parseInt(e.target.value))}
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-[#FAFAFA] rounded-lg">
                <span className="text-sm font-medium text-[#1A1A1A]">Restrict to Workspace</span>
                <Switch
                  checked={settings.tools.restrict_to_workspace}
                  onCheckedChange={(checked) => updateTools('restrict_to_workspace', checked)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-[#E5E5E5] pt-6">
          <h2 className="text-sm font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-[#1A1A1A] rounded-full"></span>
            启动设置
          </h2>
          <div className="space-y-3">
            {/* Theme Toggle */}
            <div className="flex items-center justify-between p-3 bg-[#FAFAFA] rounded-lg">
              <div>
                <span className="text-sm font-medium text-[#1A1A1A]">主题模式</span>
                <p className="text-xs text-[#666666]">选择浅色/深色/跟随系统</p>
              </div>
              <select
                value={settings.web.theme}
                onChange={(e) => updateWeb('theme', e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-[#E5E5E5] bg-white dark:bg-[#333333] dark:border-[#444444] text-sm"
              >
                <option value="light">浅色</option>
                <option value="dark">深色</option>
                <option value="system">跟随系统</option>
              </select>
            </div>
            {/* Startup Todo */}
            <div className="flex items-center justify-between p-3 bg-[#FAFAFA] rounded-lg">
              <div>
                <span className="text-sm font-medium text-[#1A1A1A]">启动提醒待办</span>
                <p className="text-xs text-[#666666]">启动时提醒查看待办事项</p>
              </div>
              <Switch
                checked={settings.web.startup_remind_todos}
                onCheckedChange={(checked) => updateWeb('startup_remind_todos', checked)}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-[#E5E5E5] pt-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleLoad}>加载配置</Button>
            </div>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
            >
              {saveStatus === 'saving' ? '保存中...' : saveStatus === 'saved' ? '已保存!' : saveStatus === 'error' ? '保存失败' : '保存配置'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
