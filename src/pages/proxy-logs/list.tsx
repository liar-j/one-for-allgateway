import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DateRangePicker } from "@/components/ui/date-picker";
import { type DateRange } from "react-day-picker";
import { Search, Eye, Route, Shuffle, ArrowRight, Clock, Bot } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";

interface ProxyLog {
  id: number;
  config_id: number;
  model_name: string;
  request_tokens: number | null;
  response_tokens: number | null;
  status: string;
  error_message: string | null;
  latency_ms: number | null;
  task_type: string | null;
  original_model: string | null;
  routed_model: string | null;
  rule_name: string | null;
  load_balance_strategy: string | null;
  request_body: string | null;
  response_body: string | null;
  created_at: string;
}

interface ModelOption {
  id: number;
  model_name: string;
}

const TASK_TYPES = [
  { value: "all", label: "全部" },
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

const STRATEGY_LABELS: Record<string, string> = {
  round_robin: "轮询",
  random: "随机",
  least_used: "最少使用",
};

export default function ProxyLogsPage() {
  const [logs, setLogs] = useState<ProxyLog[]>([]);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [configId, setConfigId] = useState("all");
  const [taskType, setTaskType] = useState("all");
  const [status, setStatus] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLog, setDetailLog] = useState<ProxyLog | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (configId !== "all") params.set("configId", configId);
      if (taskType !== "all") params.set("taskType", taskType);
      if (status !== "all") params.set("status", status);
      if (dateRange?.from) params.set("startDate", dateRange.from.toISOString());
      if (dateRange?.to) params.set("endDate", dateRange.to.toISOString());
      const res = await apiFetch(`/api/proxy-logs?${params}`);
      const { data } = await res.json();
      setLogs(data.list || []);
      setTotal(data.total || 0);
    } catch {
      toast.error("加载代理日志失败");
    } finally {
      setLoading(false);
    }
  }, [page, configId, taskType, status, dateRange]);

  const loadModels = useCallback(async () => {
    try {
      const res = await apiFetch("/api/models/all");
      const { data } = await res.json();
      setModels(data || []);
    } catch {
      toast.error("加载模型列表失败");
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { loadModels(); }, [loadModels]);

  const handleSearch = () => { setPage(1); loadData(); };

  const viewDetail = async (log: ProxyLog) => {
    try {
      const res = await apiFetch(`/api/proxy-logs/${log.id}`);
      const { data } = await res.json();
      setDetailLog(data);
      setDetailOpen(true);
    } catch {
      toast.error("加载详情失败");
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-4">
      {/* 筛选栏 */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">模型</label>
          <Select value={configId} onValueChange={setConfigId}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部模型</SelectItem>
              {models.map((m) => <SelectItem key={m.id} value={String(m.id)}>{m.model_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">任务类型</label>
          <Select value={taskType} onValueChange={setTaskType}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TASK_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">状态</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="success">成功</SelectItem>
              <SelectItem value="failed">失败</SelectItem>
              <SelectItem value="timeout">超时</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">时间范围</label>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
        <Button variant="outline" size="sm" onClick={handleSearch}>
          <Search className="h-4 w-4 mr-1" /> 搜索
        </Button>
      </div>

      {/* 表格 */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>调用时间</TableHead>
              <TableHead>任务类型</TableHead>
              <TableHead>路由规则</TableHead>
              <TableHead>偏好模型</TableHead>
              <TableHead>实际模型</TableHead>
              <TableHead>策略</TableHead>
              <TableHead>请求Token</TableHead>
              <TableHead>响应Token</TableHead>
              <TableHead>耗时</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={11}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
              ))
            ) : logs.length === 0 ? (
              <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                <div className="flex flex-col items-center gap-2">
                  <Bot className="h-8 w-8 opacity-50" />
                  <p>暂无代理调用记录</p>
                </div>
              </TableCell></TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {TASK_TYPES.find((t) => t.value === log.task_type)?.label || log.task_type || "-"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Route className="h-3 w-3 text-muted-foreground" />
                      <span>{log.rule_name || "直接匹配"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-mono">{log.original_model || "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{log.routed_model || log.model_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {log.load_balance_strategy ? STRATEGY_LABELS[log.load_balance_strategy] || log.load_balance_strategy : "-"}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">{log.request_tokens ?? "-"}</TableCell>
                  <TableCell className="text-sm tabular-nums">{log.response_tokens ?? "-"}</TableCell>
                  <TableCell>
                    <span className="text-sm tabular-nums">{log.latency_ms ? `${log.latency_ms}ms` : "-"}</span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={log.status === "success" ? "default" : log.status === "timeout" ? "secondary" : "destructive"}
                      className="text-xs"
                    >
                      {log.status === "success" ? "成功" : log.status === "timeout" ? "超时" : "失败"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => viewDetail(log)}>
                      <Eye className="h-4 w-4 mr-1" /> 详情
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>上一页</Button>
          <span className="flex items-center text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>下一页</Button>
        </div>
      )}

      {/* 详情抽屉 */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-[640px] sm:max-w-[640px]">
          <SheetHeader>
            <SheetTitle>代理调用详情</SheetTitle>
          </SheetHeader>
          {detailLog && (
            <div className="space-y-4 mt-4">
              {/* 路由信息 */}
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-2 text-xs font-medium text-primary mb-2">
                  <Route className="h-3.5 w-3.5" />
                  <span>路由信息</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">规则:</span>
                    <span className="ml-2 font-medium">{detailLog.rule_name || "直接匹配"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">任务类型:</span>
                    <span className="ml-2">{TASK_TYPES.find((t) => t.value === detailLog.task_type)?.label || detailLog.task_type}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">偏好模型:</span>
                    <span className="ml-2 font-mono">{detailLog.original_model || "自动"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">实际路由:</span>
                    <span className="ml-2 font-mono font-medium">{detailLog.routed_model || detailLog.model_name}</span>
                  </div>
                  {detailLog.load_balance_strategy && (
                    <div>
                      <span className="text-muted-foreground">负载均衡:</span>
                      <span className="ml-2">{STRATEGY_LABELS[detailLog.load_balance_strategy] || detailLog.load_balance_strategy}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">调用时间</span>
                  <p className="text-sm font-medium">{format(new Date(detailLog.created_at), "yyyy-MM-dd HH:mm:ss")}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">状态</span>
                  <div className="mt-1">
                    <Badge variant={detailLog.status === "success" ? "default" : "destructive"}>
                      {detailLog.status === "success" ? "成功" : "失败"}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">请求 Token</span>
                  <p className="text-sm font-medium tabular-nums">{detailLog.request_tokens ?? "-"}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">响应 Token</span>
                  <p className="text-sm font-medium tabular-nums">{detailLog.response_tokens ?? "-"}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">耗时</span>
                  <p className="text-sm font-medium tabular-nums">{detailLog.latency_ms ? `${detailLog.latency_ms}ms` : "-"}</p>
                </div>
              </div>

              {detailLog.error_message && (
                <div>
                  <span className="text-sm text-muted-foreground">错误信息</span>
                  <pre className="mt-1 p-3 bg-destructive/5 border border-destructive/20 rounded text-xs text-destructive whitespace-pre-wrap">
                    {detailLog.error_message}
                  </pre>
                </div>
              )}

              {detailLog.request_body && (
                <div>
                  <span className="text-sm text-muted-foreground">请求体</span>
                  <pre className="mt-1 p-3 bg-muted rounded text-xs overflow-auto max-h-48 whitespace-pre-wrap">
                    {(() => {
                      try { return JSON.stringify(JSON.parse(detailLog.request_body!), null, 2); } catch { return detailLog.request_body!; }
                    })()}
                  </pre>
                </div>
              )}

              {detailLog.response_body && (
                <div>
                  <span className="text-sm text-muted-foreground">响应体</span>
                  <pre className="mt-1 p-3 bg-muted rounded text-xs overflow-auto max-h-64 whitespace-pre-wrap">
                    {(() => {
                      try { return JSON.stringify(JSON.parse(detailLog.response_body!), null, 2); } catch { return detailLog.response_body!; }
                    })()}
                  </pre>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
