import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { DateRangePicker } from "@/components/ui/date-picker";
import { type DateRange } from "react-day-picker";
import { Search, Eye } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";

interface Log {
  id: number;
  config_id: number;
  model_name: string;
  request_tokens: number | null;
  response_tokens: number | null;
  status: string;
  error_message: string | null;
  latency_ms: number | null;
  request_body: string | null;
  response_body: string | null;
  created_at: string;
}

interface ModelOption {
  id: number;
  model_name: string;
}

export default function LogsListPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [configId, setConfigId] = useState("all");
  const [status, setStatus] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLog, setDetailLog] = useState<Log | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (configId !== "all") params.set("configId", configId);
      if (status !== "all") params.set("status", status);
      if (dateRange?.from) params.set("startDate", dateRange.from.toISOString());
      if (dateRange?.to) params.set("endDate", dateRange.to.toISOString());
      const res = await apiFetch(`/api/logs?${params}`);
      const { data } = await res.json();
      setLogs(data.list || []);
      setTotal(data.total || 0);
    } catch {
      toast.error("加载日志失败");
    } finally {
      setLoading(false);
    }
  }, [page, configId, status, dateRange]);

  const loadModels = useCallback(async () => {
    try {
      const res = await apiFetch("/api/models/all");
      const { data } = await res.json();
      setModels(data || []);
    } catch {}
  }, []);

  useEffect(() => { loadData(); loadModels(); }, [loadData, loadModels]);

  const handleSearch = () => { setPage(1); loadData(); };

  const viewDetail = async (id: number) => {
    try {
      const res = await apiFetch(`/api/logs/${id}`);
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
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={configId} onValueChange={(v) => { setConfigId(v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="按模型筛选" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部模型</SelectItem>
            {models.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.model_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-32"><SelectValue placeholder="按状态筛选" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="success">成功</SelectItem>
            <SelectItem value="failed">失败</SelectItem>
            <SelectItem value="timeout">超时</SelectItem>
          </SelectContent>
        </Select>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
        <Button variant="outline" size="sm" onClick={handleSearch}>
          <Search className="h-4 w-4 mr-1" /> 筛选
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>调用时间</TableHead>
              <TableHead>模型</TableHead>
              <TableHead>请求Token</TableHead>
              <TableHead>响应Token</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>耗时</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
              ))
            ) : logs.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">暂无调用记录</TableCell></TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(log.created_at), "MM-dd HH:mm:ss")}</TableCell>
                  <TableCell className="font-medium">{log.model_name}</TableCell>
                  <TableCell className="tabular-nums">{log.request_tokens || "-"}</TableCell>
                  <TableCell className="tabular-nums">{log.response_tokens || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={log.status === "success" ? "default" : "destructive"} className="text-xs">
                      {log.status === "success" ? "成功" : log.status === "failed" ? "失败" : "超时"}
                    </Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">{log.latency_ms ? `${log.latency_ms}ms` : "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => viewDetail(log.id)}>
                      <Eye className="h-4 w-4 mr-1" /> 详情
                    </Button>
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

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-[600px] sm:max-w-[600px]">
          <SheetHeader>
            <SheetTitle>调用详情</SheetTitle>
          </SheetHeader>
          {detailLog && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-sm text-muted-foreground">模型</span><p className="font-medium">{detailLog.model_name}</p></div>
                <div><span className="text-sm text-muted-foreground">状态</span>
                  <Badge variant={detailLog.status === "success" ? "default" : "destructive"} className="mt-1">
                    {detailLog.status === "success" ? "成功" : detailLog.status === "failed" ? "失败" : "超时"}
                  </Badge>
                </div>
                <div><span className="text-sm text-muted-foreground">请求Token</span><p className="tabular-nums">{detailLog.request_tokens || "-"}</p></div>
                <div><span className="text-sm text-muted-foreground">响应Token</span><p className="tabular-nums">{detailLog.response_tokens || "-"}</p></div>
                <div><span className="text-sm text-muted-foreground">耗时</span><p className="tabular-nums">{detailLog.latency_ms ? `${detailLog.latency_ms}ms` : "-"}</p></div>
                <div><span className="text-sm text-muted-foreground">调用时间</span><p className="text-sm">{format(new Date(detailLog.created_at), "yyyy-MM-dd HH:mm:ss")}</p></div>
              </div>
              {detailLog.error_message && (
                <div>
                  <span className="text-sm text-muted-foreground">错误信息</span>
                  <p className="text-sm text-destructive mt-1 bg-destructive/10 p-2 rounded">{detailLog.error_message}</p>
                </div>
              )}
              {detailLog.request_body && (
                <div>
                  <span className="text-sm text-muted-foreground">请求体</span>
                  <pre className="text-xs bg-muted p-3 rounded mt-1 overflow-auto max-h-48 font-mono">{JSON.stringify(JSON.parse(detailLog.request_body), null, 2)}</pre>
                </div>
              )}
              {detailLog.response_body && (
                <div>
                  <span className="text-sm text-muted-foreground">响应体</span>
                  <pre className="text-xs bg-muted p-3 rounded mt-1 overflow-auto max-h-48 font-mono">{JSON.stringify(JSON.parse(detailLog.response_body), null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
