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
import { Plus, Search, Pencil, Trash2, Key, Settings, ArrowRight, Zap, Star, StarOff, ChevronUp, ChevronDown } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface RoutingRule {
  id: number;
  rule_name: string;
  description: string | null;
  task_type: string;
  priority: number;
  token_budget: number | null;
  max_latency_ms: number | null;
  fallback_config_id: number | null;
  load_balance_strategy: string;
  is_enabled: string;
  model_names: string[];
  config_ids: number[];
  created_at: string;
}

interface ModelOption {
  id: number;
  model_name: string;
  provider: string;
}

interface FormModelEntry {
  config_id: number;
  model_name: string;
  provider: string;
  weight: number;
  is_primary: boolean;
}

const TASK_TYPES = [
  { value: "default", label: "默认" },
  { value: "chat", label: "对话" },
  { value: "completion", label: "补全" },
  { value: "embedding", label: "向量" },
  { value: "vision", label: "视觉" },
  { value: "code", label: "代码" },
  { value: "summarization", label: "摘要" },
  { value: "analysis", label: "分析" },
  { value: "translation", label: "翻译" },
  { value: "function_calling", label: "函数调用" },
  { value: "agent", label: "智能体" },
  { value: "image_generation", label: "文生图" },
  { value: "video_generation", label: "视频生成" },
];

const STRATEGIES = [
  { value: "round_robin", label: "轮询" },
  { value: "random", label: "随机" },
  { value: "least_used", label: "最少使用" },
];

export default function RoutingRulesPage() {
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RoutingRule | null>(null);
  const [form, setForm] = useState({
    rule_name: "",
    description: "",
    task_type: "default",
    priority: 0,
    token_budget: null as number | null,
    max_latency_ms: null as number | null,
    fallback_config_id: null as number | null,
    load_balance_strategy: "round_robin",
    is_enabled: "y",
  });
  const [formModels, setFormModels] = useState<FormModelEntry[]>([]);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [defaultRuleDialogOpen, setDefaultRuleDialogOpen] = useState(false);
  const [defaultRuleSubmitting, setDefaultRuleSubmitting] = useState(false);

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "20",
        ...(keyword ? { keyword } : {}),
      });
      const res = await apiFetch(`/api/routing-rules?${params}`);
      const { data } = await res.json();
      setRules(data.list || []);
      setTotal(data.total || 0);
    } catch {
      toast.error("加载路由规则失败");
    } finally {
      setLoading(false);
    }
  }, [page, keyword]);

  const loadModels = useCallback(async () => {
    try {
      const res = await apiFetch("/api/models/all");
      const { data } = await res.json();
      setModels(data || []);
    } catch {
      toast.error("加载模型列表失败");
    }
  }, []);

  useEffect(() => { loadRules(); }, [loadRules]);
  useEffect(() => { loadModels(); }, [loadModels]);

  const addDefaultRule = async () => {
    if (models.length === 0) {
      toast.error("暂无可用模型，请先添加模型配置");
      return;
    }
    try {
      const res = await apiFetch("/api/routing-rules", {
        method: "POST",
        body: JSON.stringify({
          rule_name: "默认路由规则",
          description: "系统自动创建的默认规则，包含所有可用模型",
          task_type: "default",
          priority: 0,
          load_balance_strategy: "least_used",
          is_enabled: "y",
          model_configs: models.map((m, i) => ({
            config_id: m.id,
            weight: 1,
            is_primary: i === 0,
          })),
        }),
      });
      const result = await res.json();
      if (!result.success) { toast.error(result.error); return; }
      toast.success("默认路由规则已创建");
      setDefaultRuleDialogOpen(false);
      loadRules();
    } catch {
      toast.error("创建默认规则失败");
    }
  };

  const handleSearch = () => { setPage(1); loadRules(); };

  const resetForm = () => {
    setForm({ rule_name: "", description: "", task_type: "default", priority: 0, token_budget: null, max_latency_ms: null, fallback_config_id: null, load_balance_strategy: "round_robin", is_enabled: "y" });
    setFormModels([]);
    setEditing(null);
  };

  const openCreate = () => { resetForm(); setOpen(true); };
  const openEdit = async (r: RoutingRule) => {
    setEditing(r);
    setForm({
      rule_name: r.rule_name,
      description: r.description || "",
      task_type: r.task_type,
      priority: r.priority,
      token_budget: r.token_budget,
      max_latency_ms: r.max_latency_ms,
      fallback_config_id: r.fallback_config_id || null,
      load_balance_strategy: r.load_balance_strategy,
      is_enabled: r.is_enabled,
    });

    // 加载详细的模型配置（含 weight 和 is_primary）
    try {
      const res = await apiFetch(`/api/routing-rules/${r.id}/configs`);
      const { data } = await res.json();
      const entries: FormModelEntry[] = (data || []).map((c: any) => ({
        config_id: c.config_id,
        model_name: c.model?.model_name || "",
        provider: c.model?.provider || "",
        weight: c.weight || 1,
        is_primary: c.is_primary === "y",
      }));
      setFormModels(entries);
    } catch {
      setFormModels([]);
    }

    setOpen(true);
  };

  const toggleModelInForm = (model: ModelOption) => {
    setFormModels((prev) => {
      const exists = prev.find((e) => e.config_id === model.id);
      if (exists) {
        const next = prev.filter((e) => e.config_id !== model.id);
        // 如果移除的是主模型，将第一个设为主模型
        if (exists.is_primary && next.length > 0) {
          next[0].is_primary = true;
        }
        return next;
      }
      return [...prev, { config_id: model.id, model_name: model.model_name, provider: model.provider, weight: 1, is_primary: prev.length === 0 }];
    });
  };

  const updateModelEntry = (configId: number, updates: Partial<FormModelEntry>) => {
    setFormModels((prev) =>
      prev.map((e) => {
        if (e.config_id !== configId) return e;
        const updated = { ...e, ...updates };
        // 如果设为主模型，取消其他模型的主模型标记
        if (updates.is_primary === true) {
          // 在返回前处理，这里只更新当前项
        }
        return updated;
      }).map((e, _i, arr) => {
        if (updates.is_primary === true && e.config_id !== configId) {
          return { ...e, is_primary: false };
        }
        return e;
      })
    );
  };

  const moveModelUp = (index: number) => {
    if (index === 0) return;
    setFormModels((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  const moveModelDown = (index: number) => {
    setFormModels((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!form.rule_name) {
      toast.error("请填写规则名称");
      return;
    }
    if (formModels.length === 0) {
      toast.error("请至少选择一个模型");
      return;
    }
    try {
      const url = editing ? `/api/routing-rules/${editing.id}` : "/api/routing-rules";
      const method = editing ? "PUT" : "POST";
      const payload = {
        ...form,
        model_configs: formModels.map((m) => ({
          config_id: m.config_id,
          weight: m.weight,
          is_primary: m.is_primary,
        })),
      };
      const res = await apiFetch(url, { method, body: JSON.stringify(payload) });
      const result = await res.json();
      if (!result.success) { toast.error(result.error); return; }
      toast.success(editing ? "更新成功" : "创建成功");
      setOpen(false);
      loadRules();
    } catch {
      toast.error("操作失败");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await apiFetch(`/api/routing-rules/${id}`, { method: "DELETE" });
      const result = await res.json();
      if (!result.success) { toast.error(result.error); return; }
      toast.success("删除成功");
      loadRules();
    } catch {
      toast.error("删除失败");
    }
  };

  const toggleEnabled = async (r: RoutingRule) => {
    try {
      const res = await apiFetch(`/api/routing-rules/${r.id}`, {
        method: "PUT",
        body: JSON.stringify({ is_enabled: r.is_enabled === 'y' ? 'n' : 'y' }),
      });
      const result = await res.json();
      if (!result.success) { toast.error(result.error); return; }
      loadRules();
    } catch {
      toast.error("操作失败");
    }
  };

  const totalPages = Math.ceil(total / 20);

  const fallbackModel = models.find((m) => m.id === form.fallback_config_id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Input
            placeholder="搜索规则名称..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-64"
          />
          <Button variant="outline" size="sm" onClick={handleSearch}>
            <Search className="h-4 w-4 mr-1" /> 搜索
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setDefaultRuleDialogOpen(true)}>
            <Zap className="h-4 w-4 mr-1" /> 添加默认规则
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> 新增路由规则
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>规则名称</TableHead>
              <TableHead>任务类型</TableHead>
              <TableHead>关联模型</TableHead>
              <TableHead>优先级</TableHead>
              <TableHead>负载均衡</TableHead>
              <TableHead>兜底模型</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
              ))
            ) : rules.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                <div className="flex flex-col items-center gap-2">
                  <Settings className="h-8 w-8 opacity-50" />
                  <p>暂无路由规则，点击"新增路由规则"开始</p>
                </div>
              </TableCell></TableRow>
            ) : (
              rules.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.rule_name}</TableCell>
                  <TableCell><Badge variant="outline">{TASK_TYPES.find(t => t.value === r.task_type)?.label || r.task_type}</Badge></TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(r.model_names || []).slice(0, 2).map((name, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{name}</Badge>
                      ))}
                      {(r.model_names || []).length > 2 && <Badge variant="secondary" className="text-xs">+{(r.model_names || []).length - 2}</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>{r.priority}</TableCell>
                  <TableCell><span className="text-sm text-muted-foreground">{STRATEGIES.find(s => s.value === r.load_balance_strategy)?.label || r.load_balance_strategy}</span></TableCell>
                  <TableCell>
                    {(r as any).fallback_model_name ? (
                      <Badge variant="outline" className="text-xs">{(r as any).fallback_model_name}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">无</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${r.is_enabled === 'y' ? 'bg-[hsl(var(--success))]' : 'bg-muted'}`} />
                      <span className="text-sm">{r.is_enabled === 'y' ? '启用' : '禁用'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => toggleEnabled(r)}>
                        {r.is_enabled === 'y' ? '禁用' : '启用'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(r.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>上一页</Button>
          <span className="flex items-center text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>下一页</Button>
        </div>
      )}

      <Sheet open={open} onOpenChange={(v) => { if (!v) { setOpen(false); resetForm(); } }}>
        <SheetContent className="w-[560px] sm:max-w-[560px]">
          <SheetHeader>
            <SheetTitle>{editing ? "编辑路由规则" : "新增路由规则"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>规则名称</Label>
              <Input value={form.rule_name} onChange={(e) => setForm({ ...form, rule_name: e.target.value })} placeholder="如：高优先级对话路由" />
            </div>
            <div className="space-y-2">
              <Label>任务类型</Label>
              <Select value={form.task_type} onValueChange={(v) => setForm({ ...form, task_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* 关联模型（含权重和主模型配置） */}
            <div className="space-y-2">
              <Label>关联模型 <span className="text-destructive">*</span></Label>
              {/* 可选模型池 */}
              <div className="flex flex-wrap gap-1 mb-2">
                {models.filter(m => !formModels.find(f => f.config_id === m.id)).map(m => (
                  <Badge
                    key={m.id}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10 hover:border-primary/40 transition-colors"
                    onClick={() => toggleModelInForm(m)}
                  >
                    + {m.model_name}
                  </Badge>
                ))}
                {models.filter(m => !formModels.find(f => f.config_id === m.id)).length === 0 && (
                  <span className="text-xs text-muted-foreground">已添加所有模型</span>
                )}
              </div>
              {/* 已选模型列表 */}
              {formModels.length > 0 && (
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground w-8"></th>
                        <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">模型</th>
                        <th className="text-center px-3 py-2 font-medium text-xs text-muted-foreground w-20">权重</th>
                        <th className="text-center px-3 py-2 font-medium text-xs text-muted-foreground w-20">主模型</th>
                        <th className="text-center px-3 py-2 font-medium text-xs text-muted-foreground w-16">移除</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formModels.map((entry, idx) => (
                        <tr key={entry.config_id} className="border-t">
                          <td className="px-2 py-1.5">
                            <div className="flex flex-col gap-0.5">
                              <button type="button" className="p-0.5 hover:bg-muted rounded" onClick={() => moveModelUp(idx)} disabled={idx === 0}>
                                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                              <button type="button" className="p-0.5 hover:bg-muted rounded" onClick={() => moveModelDown(idx)} disabled={idx === formModels.length - 1}>
                                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{entry.model_name}</span>
                              <Badge variant="outline" className="text-xs">{entry.provider}</Badge>
                            </div>
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            <Input
                              type="number"
                              min={1}
                              className="h-7 w-16 text-center"
                              value={entry.weight}
                              onChange={(e) => updateModelEntry(entry.config_id, { weight: Math.max(1, Number(e.target.value)) })}
                            />
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            <button
                              type="button"
                              className="p-1 hover:bg-muted rounded transition-colors"
                              onClick={() => updateModelEntry(entry.config_id, { is_primary: !entry.is_primary })}
                              title={entry.is_primary ? "取消主模型" : "设为主模型"}
                            >
                              {entry.is_primary ? (
                                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                              ) : (
                                <StarOff className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            <button
                              type="button"
                              className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive transition-colors"
                              onClick={() => toggleModelInForm({ id: entry.config_id, model_name: entry.model_name, provider: entry.provider })}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {formModels.length === 0 && models.length > 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">点击上方模型标签添加</p>
              )}
            </div>

            {/* 兜底模型 */}
            <div className="space-y-2">
              <Label>兜底模型（可选）</Label>
              <Select
                value={form.fallback_config_id ? String(form.fallback_config_id) : ""}
                onValueChange={(v) => setForm({ ...form, fallback_config_id: v ? Number(v) : null })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="当规则中无可用模型时使用的兜底模型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">无</SelectItem>
                  {models.map(m => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.model_name} ({m.provider})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fallbackModel && (
                <p className="text-xs text-muted-foreground">
                  当前兜底: <span className="font-medium text-foreground">{fallbackModel.model_name}</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>优先级</Label>
              <Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} />
              <p className="text-xs text-muted-foreground">数字越大优先级越高，相同任务类型按优先级匹配</p>
            </div>
            <div className="space-y-2">
              <Label>负载均衡策略</Label>
              <Select value={form.load_balance_strategy} onValueChange={(v) => setForm({ ...form, load_balance_strategy: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STRATEGIES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Token预算（可选）</Label>
                <Input type="number" value={form.token_budget || ""} onChange={(e) => setForm({ ...form, token_budget: e.target.value ? Number(e.target.value) : null })} placeholder="不限制" />
              </div>
              <div className="space-y-2">
                <Label>最大延迟ms（可选）</Label>
                <Input type="number" value={form.max_latency_ms || ""} onChange={(e) => setForm({ ...form, max_latency_ms: e.target.value ? Number(e.target.value) : null })} placeholder="不限制" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="规则用途说明" />
            </div>
            <div className="flex items-center justify-between">
              <Label>启用状态</Label>
              <Switch checked={form.is_enabled === 'y'} onCheckedChange={(v) => setForm({ ...form, is_enabled: v ? 'y' : 'n' })} />
            </div>
            <Button className="w-full" onClick={handleSubmit}>{editing ? "保存修改" : "创建规则"}</Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={defaultRuleDialogOpen} onOpenChange={setDefaultRuleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>添加默认路由规则</AlertDialogTitle>
            <AlertDialogDescription>
              系统将创建一个名为"默认路由规则"的规则，包含当前所有 {models.length} 个可用模型，
              负载均衡策略为"最少使用"。是否继续？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={addDefaultRule} disabled={defaultRuleSubmitting}>
              {defaultRuleSubmitting ? "创建中..." : "确认创建"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
