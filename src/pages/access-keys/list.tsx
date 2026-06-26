import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Plus, Copy, Pencil, Trash2, RefreshCw, X, Key, Shield, Globe, Clock, Zap } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { format, isPast } from "date-fns";

interface AccessKey {
  id: number;
  key_name: string;
  access_key_masked: string;
  key_prefix: string;
  description: string | null;
  is_enabled: string;
  last_used_at: string | null;
  usage_count: number;
  expires_at: string | null;
  allowed_ips: string | null;
  rate_limit_per_minute: number | null;
  created_at: string;
}

function getKeyStatus(key: AccessKey): { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' } {
  if (key.expires_at && isPast(new Date(key.expires_at))) {
    return { label: '已过期', variant: 'destructive' };
  }
  if (key.is_enabled === 'y') {
    return { label: '激活', variant: 'success' };
  }
  return { label: '已禁用', variant: 'secondary' };
}

export default function AccessKeysListPage() {
  const [keys, setKeys] = useState<AccessKey[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AccessKey | null>(null);
  const [form, setForm] = useState({
    key_name: "",
    description: "",
    expires_at: "",
    allowed_ips: "",
    rate_limit_per_minute: "",
    is_enabled: "y",
  });
  const [showFullKey, setShowFullKey] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (keyword) params.set("keyword", keyword);
      const res = await apiFetch(`/api/access-keys?${params}`);
      const { data } = await res.json();
      setKeys(data.list || []);
      setTotal(data.total || 0);
    } catch {
      toast.error("加载访问密钥列表失败");
    } finally {
      setLoading(false);
    }
  }, [page, keyword]);

  useEffect(() => { loadData(); }, [loadData]);

  const resetForm = () => {
    setForm({ key_name: "", description: "", expires_at: "", allowed_ips: "", rate_limit_per_minute: "", is_enabled: "y" });
    setEditing(null);
  };

  const openCreate = () => { resetForm(); setOpen(true); };
  const openEdit = (k: AccessKey) => {
    setEditing(k);
    setForm({
      key_name: k.key_name,
      description: k.description || "",
      expires_at: k.expires_at ? k.expires_at.slice(0, 16) : "",
      allowed_ips: k.allowed_ips || "",
      rate_limit_per_minute: k.rate_limit_per_minute ? String(k.rate_limit_per_minute) : "",
      is_enabled: k.is_enabled,
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.key_name) {
      toast.error("请填写密钥名称");
      return;
    }
    try {
      const url = editing ? `/api/access-keys/${editing.id}` : "/api/access-keys";
      const method = editing ? "PUT" : "POST";
      const body: Record<string, unknown> = { ...form };
      if (!form.expires_at) delete body.expires_at;
      if (!form.allowed_ips) delete body.allowed_ips;
      if (!form.rate_limit_per_minute) delete body.rate_limit_per_minute;
      else body.rate_limit_per_minute = Number(form.rate_limit_per_minute);
      const res = await apiFetch(url, { method, body: JSON.stringify(body) });
      const result = await res.json();
      if (!result.success) { toast.error(result.error); return; }
      toast.success(editing ? "更新成功" : "创建成功");
      if (!editing && result.data?.access_key) {
        setShowFullKey(result.data.access_key);
      }
      setOpen(false);
      loadData();
    } catch {
      toast.error("操作失败");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await apiFetch(`/api/access-keys/${id}`, { method: "DELETE" });
      const result = await res.json();
      if (!result.success) { toast.error(result.error); return; }
      toast.success("删除成功");
      loadData();
    } catch {
      toast.error("删除失败");
    }
  };

  const copyKey = async (id: number) => {
    try {
      const res = await apiFetch(`/api/access-keys/${id}/copy`, { method: "POST" });
      const result = await res.json();
      if (!result.success) { toast.error(result.error); return; }
      await navigator.clipboard.writeText(result.data.access_key);
      toast.success("密钥已复制到剪贴板");
    } catch {
      toast.error("复制失败");
    }
  };

  const toggleEnabled = async (k: AccessKey) => {
    try {
      const res = await apiFetch(`/api/access-keys/${k.id}`, {
        method: "PUT",
        body: JSON.stringify({ is_enabled: k.is_enabled === 'y' ? 'n' : 'y' }),
      });
      const result = await res.json();
      if (!result.success) { toast.error(result.error); return; }
      toast.success(k.is_enabled === 'y' ? "已禁用" : "已启用");
      loadData();
    } catch {
      toast.error("操作失败");
    }
  };

  const regenerateKey = async (id: number) => {
    try {
      const res = await apiFetch(`/api/access-keys/${id}/regenerate`, { method: "POST" });
      const result = await res.json();
      if (!result.success) { toast.error(result.error); return; }
      if (result.data?.access_key) {
        setShowFullKey(result.data.access_key);
      }
      toast.success("密钥已重新生成");
      loadData();
    } catch {
      toast.error("重新生成失败");
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 px-4 py-3 flex items-start gap-3">
        <Shield className="h-5 w-5 text-indigo-600 mt-0.5 shrink-0" />
        <div className="text-sm text-indigo-800">
          <p className="font-medium">平台访问密钥（Access Key）</p>
          <p className="text-indigo-600 mt-0.5">用于外部系统（如 OpenClaw）调用本平台代理 API。与模型 API Key 完全隔离，模型 Key 仅用于调用外部大模型。</p>
        </div>
      </div>

      {/* Full Key Display Modal */}
      {showFullKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowFullKey(null)}>
          <div className="rounded-xl bg-white p-6 max-w-lg w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Key className="h-5 w-5 text-indigo-600" />
                新密钥已生成
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowFullKey(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-3">请妥善保存此密钥，关闭后将无法再次查看完整密钥。</p>
            <div className="rounded-lg bg-slate-50 border p-3 mb-4">
              <code className="text-sm font-mono break-all text-slate-800">{showFullKey}</code>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={async () => {
                await navigator.clipboard.writeText(showFullKey);
                toast.success("已复制");
              }}>
                <Copy className="h-4 w-4 mr-1" /> 复制密钥
              </Button>
              <Button variant="outline" onClick={() => setShowFullKey(null)}>我知道了</Button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-xs">
          <Input
            placeholder="搜索密钥名称..."
            value={keyword}
            onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
            className="h-9"
          />
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> 新增访问密钥
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>密钥名称</TableHead>
              <TableHead>密钥前缀</TableHead>
              <TableHead>密钥值</TableHead>
              <TableHead>使用次数</TableHead>
              <TableHead>最后使用</TableHead>
              <TableHead>安全策略</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
              ))
            ) : keys.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                <div className="flex flex-col items-center gap-2">
                  <Key className="h-8 w-8 text-muted-foreground/40" />
                  <span>暂无访问密钥</span>
                  <Button variant="link" size="sm" onClick={openCreate}>创建第一个访问密钥</Button>
                </div>
              </TableCell></TableRow>
            ) : (
              keys.map((k) => (
                <TableRow key={k.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{k.key_name}</p>
                      {k.description && <p className="text-xs text-muted-foreground truncate max-w-48">{k.description}</p>}
                    </div>
                  </TableCell>
                  <TableCell><code className="text-xs bg-muted px-2 py-1 rounded font-mono">{k.key_prefix}</code></TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{k.access_key_masked}</code>
                  </TableCell>
                  <TableCell className="tabular-nums">{k.usage_count}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {k.last_used_at ? format(new Date(k.last_used_at), "MM-dd HH:mm") : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                      {k.allowed_ips && (
                        <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> IP白名单</span>
                      )}
                      {k.rate_limit_per_minute && (
                        <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> {k.rate_limit_per_minute}/min</span>
                      )}
                      {k.expires_at && (
                        <span className={`flex items-center gap-1 ${isPast(new Date(k.expires_at)) ? 'text-destructive' : ''}`}>
                          <Clock className="h-3 w-3" /> {format(new Date(k.expires_at), "MM-dd")}
                        </span>
                      )}
                      {!k.allowed_ips && !k.rate_limit_per_minute && !k.expires_at && <span>-</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const status = getKeyStatus(k);
                        return (
                          <>
                            <div className={`h-2 w-2 rounded-full ${
                              status.variant === 'success' ? 'bg-[hsl(var(--success))]' :
                              status.variant === 'destructive' ? 'bg-destructive' :
                              status.variant === 'warning' ? 'bg-[hsl(var(--warning))]' :
                              'bg-muted'
                            }`} />
                            <span className="text-sm">{status.label}</span>
                          </>
                        );
                      })()}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => copyKey(k.id)} title="复制密钥"><Copy className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => regenerateKey(k.id)} title="重新生成"><RefreshCw className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleEnabled(k)}>
                        {k.is_enabled === 'y' ? '禁用' : '启用'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(k)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(k.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem><PaginationPrevious onClick={() => setPage(p => Math.max(1, p - 1))} className={page <= 1 ? 'pointer-events-none opacity-50' : ''} /></PaginationItem>
            {Array.from({ length: totalPages }).map((_, i) => (
              <PaginationItem key={i}><PaginationLink isActive={page === i + 1} onClick={() => setPage(i + 1)}>{i + 1}</PaginationLink></PaginationItem>
            ))}
            <PaginationItem><PaginationNext onClick={() => setPage(p => Math.min(totalPages, p + 1))} className={page >= totalPages ? 'pointer-events-none opacity-50' : ''} /></PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Create/Edit Sheet */}
      <Sheet open={open} onOpenChange={(v) => { if (!v) { setOpen(false); resetForm(); } }}>
        <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? "编辑访问密钥" : "新增访问密钥"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>密钥名称 <span className="text-destructive">*</span></Label>
              <Input value={form.key_name} onChange={(e) => setForm({ ...form, key_name: e.target.value })} placeholder="用于标识的密钥名称，如 OpenClaw" />
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="可选，说明此密钥的用途" />
            </div>
            <div className="space-y-2">
              <Label>过期时间（可选）</Label>
              <Input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
            </div>

            {/* Security Settings */}
            <div className="rounded-lg border bg-slate-50 p-4 space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" /> 安全策略
              </h4>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">IP 白名单（逗号分隔，可选）</Label>
                <Input value={form.allowed_ips} onChange={(e) => setForm({ ...form, allowed_ips: e.target.value })} placeholder="如: 192.168.1.1, 10.0.0.1" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">频率限制（次/分钟，可选）</Label>
                <Input type="number" min="1" value={form.rate_limit_per_minute} onChange={(e) => setForm({ ...form, rate_limit_per_minute: e.target.value })} placeholder="如: 60" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>启用状态</Label>
              <Switch checked={form.is_enabled === 'y'} onCheckedChange={(v) => setForm({ ...form, is_enabled: v ? 'y' : 'n' })} />
            </div>
            <Button className="w-full" onClick={handleSubmit}>{editing ? "保存修改" : "创建密钥"}</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
