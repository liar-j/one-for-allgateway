import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Plus, Search, Pencil, Trash2, TestTube2, Key, Copy, Zap, Eye, EyeOff } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

// ---- Types ----
interface Model {
  id: number;
  model_name: string;
  provider: string;
  api_endpoint: string;
  default_max_tokens: number | null;
  default_temperature: number | null;
  is_enabled: string;
  description: string | null;
  api_key_masked: string | null;
  auth_type: string;
  created_at: string;
}

// ---- Constants ----
const PROVIDERS = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "google", label: "Google" },
  { value: "dashscope", label: "通义千问" },
  { value: "qianfan", label: "文心一言" },
  { value: "zhipu", label: "智谱AI" },
  { value: "moonshot", label: "月之暗面" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "minimax", label: "MiniMax" },
  { value: "yi", label: "零一万物" },
  { value: "hunyuan", label: "腾讯混元" },
  { value: "custom", label: "自定义" },
];

const AUTH_TYPES = [
  { value: "bearer", label: "Bearer Token (Authorization: Bearer ...)" },
  { value: "x-api-key", label: "API Key (x-api-key: ...)" },
];

const PROVIDER_MODEL_TEMPLATES: Record<string, { name: string; endpoint: string; maxTokens: number; temperature: number }[]> = {
  openai: [
    { name: "gpt-4o", endpoint: "https://api.openai.com/v1/chat/completions", maxTokens: 4096, temperature: 0.7 },
    { name: "gpt-4o-mini", endpoint: "https://api.openai.com/v1/chat/completions", maxTokens: 4096, temperature: 0.7 },
    { name: "gpt-4-turbo", endpoint: "https://api.openai.com/v1/chat/completions", maxTokens: 4096, temperature: 0.7 },
    { name: "gpt-4", endpoint: "https://api.openai.com/v1/chat/completions", maxTokens: 4096, temperature: 0.7 },
    { name: "gpt-3.5-turbo", endpoint: "https://api.openai.com/v1/chat/completions", maxTokens: 4096, temperature: 0.7 },
    { name: "o1", endpoint: "https://api.openai.com/v1/chat/completions", maxTokens: 4096, temperature: 1 },
    { name: "o1-mini", endpoint: "https://api.openai.com/v1/chat/completions", maxTokens: 4096, temperature: 1 },
    { name: "o3-mini", endpoint: "https://api.openai.com/v1/chat/completions", maxTokens: 4096, temperature: 1 },
  ],
  anthropic: [
    { name: "claude-sonnet-4-20250514", endpoint: "https://api.anthropic.com/v1/messages", maxTokens: 8192, temperature: 0.7 },
    { name: "claude-opus-4-20250514", endpoint: "https://api.anthropic.com/v1/messages", maxTokens: 8192, temperature: 0.7 },
    { name: "claude-3-5-sonnet-latest", endpoint: "https://api.anthropic.com/v1/messages", maxTokens: 8192, temperature: 0.7 },
    { name: "claude-3-5-haiku-latest", endpoint: "https://api.anthropic.com/v1/messages", maxTokens: 8192, temperature: 0.7 },
    { name: "claude-3-opus-latest", endpoint: "https://api.anthropic.com/v1/messages", maxTokens: 4096, temperature: 0.7 },
  ],
  google: [
    { name: "gemini-2.5-pro", endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", maxTokens: 8192, temperature: 0.7 },
    { name: "gemini-2.5-flash", endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", maxTokens: 8192, temperature: 0.7 },
    { name: "gemini-2.0-flash", endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", maxTokens: 8192, temperature: 0.7 },
    { name: "gemini-1.5-pro", endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", maxTokens: 8192, temperature: 0.7 },
  ],
  dashscope: [
    { name: "qwen-max", endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", maxTokens: 8192, temperature: 0.7 },
    { name: "qwen-plus", endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", maxTokens: 8192, temperature: 0.7 },
    { name: "qwen-turbo", endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", maxTokens: 8192, temperature: 0.7 },
    { name: "qwen-long", endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", maxTokens: 32000, temperature: 0.7 },
    { name: "qwen-vl-max", endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", maxTokens: 2048, temperature: 0.7 },
    { name: "qwen-coder-plus", endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", maxTokens: 8192, temperature: 0.7 },
    { name: "qwen-math-plus", endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", maxTokens: 4096, temperature: 0.7 },
  ],
  qianfan: [
    { name: "ERNIE-4.0-8K", endpoint: "https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions_pro", maxTokens: 8192, temperature: 0.7 },
    { name: "ERNIE-3.5-8K", endpoint: "https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions", maxTokens: 8192, temperature: 0.7 },
    { name: "ERNIE-Speed-8K", endpoint: "https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/ernie_speed", maxTokens: 8192, temperature: 0.7 },
    { name: "ERNIE-Lite-8K", endpoint: "https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/ernie-lite-8k", maxTokens: 8192, temperature: 0.7 },
    { name: "ERNIE-Tiny-8K", endpoint: "https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/ernie-tiny-8k", maxTokens: 8192, temperature: 0.7 },
  ],
  zhipu: [
    { name: "glm-4-plus", endpoint: "https://open.bigmodel.cn/api/paas/v4/chat/completions", maxTokens: 4096, temperature: 0.7 },
    { name: "glm-4", endpoint: "https://open.bigmodel.cn/api/paas/v4/chat/completions", maxTokens: 4096, temperature: 0.7 },
    { name: "glm-4-flash", endpoint: "https://open.bigmodel.cn/api/paas/v4/chat/completions", maxTokens: 4096, temperature: 0.7 },
    { name: "glm-4v-plus", endpoint: "https://open.bigmodel.cn/api/paas/v4/chat/completions", maxTokens: 2048, temperature: 0.7 },
    { name: "glm-3-turbo", endpoint: "https://open.bigmodel.cn/api/paas/v4/chat/completions", maxTokens: 8192, temperature: 0.7 },
    { name: "codegeex-4", endpoint: "https://open.bigmodel.cn/api/paas/v4/chat/completions", maxTokens: 4096, temperature: 0.7 },
  ],
  moonshot: [
    { name: "moonshot-v1-8k", endpoint: "https://api.moonshot.cn/v1/chat/completions", maxTokens: 8192, temperature: 0.7 },
    { name: "moonshot-v1-32k", endpoint: "https://api.moonshot.cn/v1/chat/completions", maxTokens: 32768, temperature: 0.7 },
    { name: "moonshot-v1-128k", endpoint: "https://api.moonshot.cn/v1/chat/completions", maxTokens: 131072, temperature: 0.7 },
  ],
  deepseek: [
    { name: "deepseek-chat", endpoint: "https://api.deepseek.com/chat/completions", maxTokens: 8192, temperature: 0.7 },
    { name: "deepseek-reasoner", endpoint: "https://api.deepseek.com/chat/completions", maxTokens: 8192, temperature: 0.7 },
    { name: "deepseek-coder", endpoint: "https://api.deepseek.com/chat/completions", maxTokens: 8192, temperature: 0.7 },
  ],
  minimax: [
    { name: "abab6.5-chat", endpoint: "https://api.minimax.chat/v1/text/chatcompletion_v2", maxTokens: 8192, temperature: 0.7 },
    { name: "abab6.5s-chat", endpoint: "https://api.minimax.chat/v1/text/chatcompletion_v2", maxTokens: 8192, temperature: 0.7 },
    { name: "abab5.5-chat", endpoint: "https://api.minimax.chat/v1/text/chatcompletion_v2", maxTokens: 8192, temperature: 0.7 },
  ],
  yi: [
    { name: "yi-large", endpoint: "https://api.lingyiwanwu.com/v1/chat/completions", maxTokens: 4096, temperature: 0.7 },
    { name: "yi-large-turbo", endpoint: "https://api.lingyiwanwu.com/v1/chat/completions", maxTokens: 4096, temperature: 0.7 },
    { name: "yi-medium", endpoint: "https://api.lingyiwanwu.com/v1/chat/completions", maxTokens: 8192, temperature: 0.7 },
    { name: "yi-vision", endpoint: "https://api.lingyiwanwu.com/v1/chat/completions", maxTokens: 2048, temperature: 0.7 },
  ],
  hunyuan: [
    { name: "hunyuan-pro", endpoint: "https://api.hunyuan.cloud.tencent.com/v1/chat/completions", maxTokens: 4096, temperature: 0.7 },
    { name: "hunyuan-standard", endpoint: "https://api.hunyuan.cloud.tencent.com/v1/chat/completions", maxTokens: 4096, temperature: 0.7 },
    { name: "hunyuan-lite", endpoint: "https://api.hunyuan.cloud.tencent.com/v1/chat/completions", maxTokens: 8192, temperature: 0.7 },
    { name: "hunyuan-turbo", endpoint: "https://api.hunyuan.cloud.tencent.com/v1/chat/completions", maxTokens: 8192, temperature: 0.7 },
  ],
  custom: [],
};

export default function ModelsListPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [modelTotal, setModelTotal] = useState(0);
  const [modelPage, setModelPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [modelLoading, setModelLoading] = useState(true);
  const [modelSheetOpen, setModelSheetOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [modelForm, setModelForm] = useState({
    model_name: "",
    provider: "openai",
    api_endpoint: "",
    default_max_tokens: 4096,
    default_temperature: 0.7,
    description: "",
    is_enabled: "y",
    api_key: "",
    auth_type: "bearer",
  });
  const [showApiKey, setShowApiKey] = useState(false);

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddProvider, setQuickAddProvider] = useState("");
  const [quickAddSelected, setQuickAddSelected] = useState<string[]>([]);
  const [quickAddApiKey, setQuickAddApiKey] = useState("");
  const [quickAddAuthType, setQuickAddAuthType] = useState("bearer");
  const [quickAddSubmitting, setQuickAddSubmitting] = useState(false);

  const loadModels = useCallback(async () => {
    setModelLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(modelPage),
        pageSize: "20",
        ...(keyword ? { keyword } : {}),
      });
      const res = await apiFetch(`/api/models?${params}`);
      const { data } = await res.json();
      setModels(data.list || []);
      setModelTotal(data.total || 0);
    } catch {
      toast.error("加载模型列表失败");
    } finally {
      setModelLoading(false);
    }
  }, [modelPage, keyword]);

  useEffect(() => { loadModels(); }, [loadModels]);

  const resetModelForm = () => {
    const templates = PROVIDER_MODEL_TEMPLATES[modelForm.provider] || [];
    const defaultTokens = templates.length > 0 ? templates[0].maxTokens : 4096;
    setModelForm({ model_name: "", provider: modelForm.provider, api_endpoint: "", default_max_tokens: defaultTokens, default_temperature: 0.7, description: "", is_enabled: "y", api_key: "", auth_type: "bearer" });
    setEditingModel(null);
    setShowApiKey(false);
  };

  const handleModelNameChange = (name: string) => {
    const templates = PROVIDER_MODEL_TEMPLATES[modelForm.provider] || [];
    const matched = templates.find(t => t.name === name);
    if (matched) {
      setModelForm({
        ...modelForm,
        model_name: name,
        api_endpoint: matched.endpoint,
        default_max_tokens: matched.maxTokens,
        default_temperature: matched.temperature,
      });
    } else {
      setModelForm({ ...modelForm, model_name: name });
    }
  };

  const openCreateModel = () => { resetModelForm(); setModelSheetOpen(true); };
  const openEditModel = (m: Model) => {
    setEditingModel(m);
    setModelForm({
      model_name: m.model_name,
      provider: m.provider,
      api_endpoint: m.api_endpoint,
      default_max_tokens: m.default_max_tokens || 4096,
      default_temperature: m.default_temperature || 0.7,
      description: m.description || "",
      is_enabled: m.is_enabled,
      api_key: "",
      auth_type: m.auth_type || "bearer",
    });
    setModelSheetOpen(true);
    setShowApiKey(false);
  };

  const handleModelSubmit = async () => {
    if (!modelForm.model_name || !modelForm.api_endpoint) {
      toast.error("请填写模型名称和API端点");
      return;
    }
    if (!editingModel && !modelForm.api_key) {
      toast.error("请输入API密钥");
      return;
    }
    try {
      const url = editingModel ? `/api/models/${editingModel.id}` : "/api/models";
      const method = editingModel ? "PUT" : "POST";
      const body: Record<string, unknown> = { ...modelForm };
      if (editingModel && !body.api_key) delete body.api_key;
      if (!body.description) delete body.description;
      const res = await apiFetch(url, { method, body: JSON.stringify(body) });
      const result = await res.json();
      if (!result.success) { toast.error(result.error); return; }
      toast.success(editingModel ? "更新成功" : "创建成功");
      setModelSheetOpen(false);
      loadModels();
    } catch {
      toast.error("操作失败");
    }
  };

  const handleDeleteModel = async (id: number) => {
    try {
      const res = await apiFetch(`/api/models/${id}`, { method: "DELETE" });
      const result = await res.json();
      if (!result.success) { toast.error(result.error); return; }
      toast.success("删除成功");
      loadModels();
    } catch {
      toast.error("删除失败");
    }
  };

  const toggleModelEnabled = async (m: Model) => {
    try {
      const res = await apiFetch(`/api/models/${m.id}`, {
        method: "PUT",
        body: JSON.stringify({ is_enabled: m.is_enabled === 'y' ? 'n' : 'y' }),
      });
      const result = await res.json();
      if (!result.success) { toast.error(result.error); return; }
      loadModels();
    } catch {
      toast.error("操作失败");
    }
  };

  const testConnection = async (id: number) => {
    try {
      const res = await apiFetch(`/api/models/${id}/test`, { method: "POST" });
      const result = await res.json();
      if (!result.success) {
        const msg = result.debug_url
          ? `${result.error}\n\n请求地址: ${result.debug_url}`
          : result.error;
        toast.error("连接测试失败", { description: msg });
        return;
      }
      toast.success("连接测试成功");
    } catch {
      toast.error("连接测试失败");
    }
  };

  const copyApiKey = async (id: number) => {
    try {
      const res = await apiFetch(`/api/models/${id}/copy-key`, { method: "POST" });
      const result = await res.json();
      if (!result.success) { toast.error(result.error); return; }
      await navigator.clipboard.writeText(result.data.api_key);
      toast.success("API密钥已复制到剪贴板");
    } catch {
      toast.error("复制失败");
    }
  };

  const modelTotalPages = Math.ceil(modelTotal / 20);

  const handleQuickAdd = async () => {
    if (quickAddSelected.length === 0 || !quickAddProvider) return;
    if (!quickAddApiKey) {
      toast.error("请输入API密钥");
      return;
    }
    setQuickAddSubmitting(true);
    try {
      const templates = PROVIDER_MODEL_TEMPLATES[quickAddProvider] || [];
      const models = quickAddSelected.map(name => {
        const t = templates.find(t => t.name === name)!;
        return {
          model_name: t.name,
          provider: quickAddProvider,
          api_endpoint: t.endpoint,
          default_max_tokens: t.maxTokens,
          default_temperature: t.temperature,
          api_key: quickAddApiKey,
          auth_type: quickAddAuthType,
        };
      });
      const res = await apiFetch("/api/models/batch", {
        method: "POST",
        body: JSON.stringify({ models }),
      });
      const result = await res.json();
      if (!result.success) { toast.error(result.error); return; }
      toast.success(`成功添加 ${result.data.created_count} 个模型`);
      setQuickAddOpen(false);
      setQuickAddProvider("");
      setQuickAddSelected([]);
      setQuickAddApiKey("");
      loadModels();
    } catch {
      toast.error("批量添加失败");
    } finally {
      setQuickAddSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Input
            placeholder="搜索模型名称..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadModels()}
            className="w-64"
          />
          <Button variant="outline" size="sm" onClick={() => { setModelPage(1); loadModels(); }}>
            <Search className="h-4 w-4 mr-1" /> 搜索
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => { setQuickAddOpen(true); setQuickAddProvider(""); setQuickAddSelected([]); setQuickAddApiKey(""); }}>
            <Zap className="h-4 w-4 mr-1" /> 快速添加
          </Button>
          <Button onClick={openCreateModel}>
            <Plus className="h-4 w-4 mr-1" /> 新增模型
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>模型名称</TableHead>
              <TableHead>提供商</TableHead>
              <TableHead>API端点</TableHead>
              <TableHead>API密钥</TableHead>
              <TableHead>认证方式</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {modelLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
              ))
            ) : models.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">暂无模型配置，点击"新增模型"开始</TableCell></TableRow>
            ) : (
              models.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.model_name}</TableCell>
                  <TableCell><Badge variant="outline">{PROVIDERS.find(p => p.value === m.provider)?.label || m.provider}</Badge></TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground max-w-[250px] truncate">{m.api_endpoint}</TableCell>
                  <TableCell>
                    {m.api_key_masked ? (
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{m.api_key_masked}</code>
                    ) : (
                      <span className="text-xs text-muted-foreground">未配置</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {m.auth_type === 'x-api-key' ? 'x-api-key' : 'Bearer'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${m.is_enabled === 'y' ? 'bg-[hsl(var(--success))]' : 'bg-muted'}`} />
                      <span className="text-sm">{m.is_enabled === 'y' ? '启用' : '禁用'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(m.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => testConnection(m.id)} title="测试连接"><TestTube2 className="h-4 w-4" /></Button>
                      {m.api_key_masked && <Button variant="ghost" size="sm" onClick={() => copyApiKey(m.id)} title="复制密钥"><Copy className="h-4 w-4" /></Button>}
                      <Button variant="ghost" size="sm" onClick={() => toggleModelEnabled(m)}>
                        {m.is_enabled === 'y' ? '禁用' : '启用'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEditModel(m)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteModel(m.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {modelTotalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem><PaginationPrevious onClick={() => setModelPage(p => Math.max(1, p - 1))} className={modelPage <= 1 ? 'pointer-events-none opacity-50' : ''} /></PaginationItem>
            {Array.from({ length: modelTotalPages }).map((_, i) => (
              <PaginationItem key={i}><PaginationLink isActive={modelPage === i + 1} onClick={() => setModelPage(i + 1)}>{i + 1}</PaginationLink></PaginationItem>
            ))}
            <PaginationItem><PaginationNext onClick={() => setModelPage(p => Math.min(modelTotalPages, p + 1))} className={modelPage >= modelTotalPages ? 'pointer-events-none opacity-50' : ''} /></PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* ===== Model Create/Edit Sheet ===== */}
      <Sheet open={modelSheetOpen} onOpenChange={(v) => { if (!v) { setModelSheetOpen(false); resetModelForm(); } }}>
        <SheetContent className="w-[500px] sm:max-w-[500px]">
          <SheetHeader>
            <SheetTitle>{editingModel ? "编辑模型" : "新增模型"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>模型名称</Label>
              <Input value={modelForm.model_name} onChange={(e) => handleModelNameChange(e.target.value)} placeholder="如 gpt-4, claude-3-opus（选择已知模型自动填充配置）" list={`model-suggestions-${modelForm.provider}`} />
              <datalist id={`model-suggestions-${modelForm.provider}`}>
                {(PROVIDER_MODEL_TEMPLATES[modelForm.provider] || []).map(t => (
                  <option key={t.name} value={t.name} />
                ))}
              </datalist>
              {modelForm.model_name && (PROVIDER_MODEL_TEMPLATES[modelForm.provider] || []).find(t => t.name === modelForm.model_name) && (
                <p className="text-xs text-muted-foreground">✓ 已识别为已知模型，自动填充 API 端点、最大 Token 数等配置</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>提供商</Label>
              <Select value={modelForm.provider} onValueChange={(v) => setModelForm({ ...modelForm, provider: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>API端点</Label>
              <Input value={modelForm.api_endpoint} onChange={(e) => setModelForm({ ...modelForm, api_endpoint: e.target.value })} placeholder="https://api.openai.com/v1/chat/completions" />
            </div>
            <div className="space-y-2">
              <Label>API密钥 {editingModel && <span className="text-xs text-muted-foreground">（留空则不修改）</span>}</Label>
              <div className="relative">
                <Input
                  type={showApiKey ? "text" : "password"}
                  value={modelForm.api_key}
                  onChange={(e) => setModelForm({ ...modelForm, api_key: e.target.value })}
                  placeholder="sk-..."
                  className="font-mono pr-10"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>认证方式</Label>
              <Select value={modelForm.auth_type} onValueChange={(v) => setModelForm({ ...modelForm, auth_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AUTH_TYPES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>最大 Token 数</Label>
                <Input type="number" value={modelForm.default_max_tokens} onChange={(e) => setModelForm({ ...modelForm, default_max_tokens: Number(e.target.value) })} placeholder="单位：tokens" />
              </div>
              <div className="space-y-2">
                <Label>Temperature</Label>
                <Input type="number" step="0.1" value={modelForm.default_temperature} onChange={(e) => setModelForm({ ...modelForm, default_temperature: Number(e.target.value) })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea value={modelForm.description} onChange={(e) => setModelForm({ ...modelForm, description: e.target.value })} rows={2} />
            </div>
            <div className="flex items-center justify-between">
              <Label>启用状态</Label>
              <Switch checked={modelForm.is_enabled === 'y'} onCheckedChange={(v) => setModelForm({ ...modelForm, is_enabled: v ? 'y' : 'n' })} />
            </div>
            <Button className="w-full" onClick={handleModelSubmit}>{editingModel ? "保存修改" : "创建模型"}</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ===== Quick Add Dialog ===== */}
      <Dialog open={quickAddOpen} onOpenChange={(v) => { if (!v) setQuickAddOpen(false); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Zap className="h-5 w-5" /> 快速添加模型</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              <Label>1. 选择厂商</Label>
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground">国内厂商</span>
                <div className="grid grid-cols-4 gap-2">
                  {PROVIDERS.filter(p => ["dashscope", "qianfan", "zhipu", "moonshot", "deepseek", "minimax", "yi", "hunyuan"].includes(p.value)).map(p => (
                    <button
                      key={p.value}
                      onClick={() => { setQuickAddProvider(p.value); setQuickAddSelected([]); }}
                      className={`p-3 rounded-lg border text-center transition-all ${quickAddProvider === p.value ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "hover:border-primary/50"}`}
                    >
                      <span className="text-sm font-medium">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground">国际厂商</span>
                <div className="grid grid-cols-4 gap-2">
                  {PROVIDERS.filter(p => ["openai", "anthropic", "google"].includes(p.value)).map(p => (
                    <button
                      key={p.value}
                      onClick={() => { setQuickAddProvider(p.value); setQuickAddSelected([]); }}
                      className={`p-3 rounded-lg border text-center transition-all ${quickAddProvider === p.value ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "hover:border-primary/50"}`}
                    >
                      <span className="text-sm font-medium">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {quickAddProvider && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>2. 勾选要添加的模型 ({quickAddSelected.length} 已选)</Label>
                  <Button variant="ghost" size="sm" onClick={() => {
                    const templates = PROVIDER_MODEL_TEMPLATES[quickAddProvider] || [];
                    if (quickAddSelected.length === templates.length) {
                      setQuickAddSelected([]);
                    } else {
                      setQuickAddSelected(templates.map(t => t.name));
                    }
                  }}>
                    {quickAddSelected.length === (PROVIDER_MODEL_TEMPLATES[quickAddProvider] || []).length ? "取消全选" : "全选"}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-auto rounded-lg border p-3">
                  {(PROVIDER_MODEL_TEMPLATES[quickAddProvider] || []).map(t => (
                    <label
                      key={t.name}
                      className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${quickAddSelected.includes(t.name) ? "bg-primary/5 border-primary" : "hover:bg-muted/50"} border`}
                    >
                      <input
                        type="checkbox"
                        checked={quickAddSelected.includes(t.name)}
                        onChange={() => {
                          setQuickAddSelected(prev =>
                            prev.includes(t.name) ? prev.filter(n => n !== t.name) : [...prev, t.name]
                          );
                        }}
                        className="rounded border-gray-300"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium truncate block">{t.name}</span>
                        <span className="text-xs text-muted-foreground truncate block">{t.endpoint}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>3. API密钥（所选模型将共用此密钥）</Label>
              <Input
                type="password"
                value={quickAddApiKey}
                onChange={(e) => setQuickAddApiKey(e.target.value)}
                placeholder="sk-..."
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label>认证方式</Label>
              <Select value={quickAddAuthType} onValueChange={setQuickAddAuthType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AUTH_TYPES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full"
              disabled={quickAddSelected.length === 0 || quickAddSubmitting}
              onClick={handleQuickAdd}
            >
              {quickAddSubmitting ? "添加中..." : `添加 ${quickAddSelected.length} 个模型`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
