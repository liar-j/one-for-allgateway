import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpRight, ArrowDownRight, Zap, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

interface DashboardData {
  total_calls: number;
  total_tokens: number;
  success_rate: number;
  today_calls: number;
  model_distribution: { model_name: string; count: number; percentage: number }[];
  recent_logs: { id: number; model_name: string; status: string; latency_ms: number; created_at: string }[];
  health_status: { model_name: string; status: string; last_call_at: string }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await apiFetch("/api/dashboard/stats");
      const { data: result } = await res.json();
      if (result) {
        setData({
          total_calls: result.total_calls || 0,
          total_tokens: result.total_tokens || 0,
          success_rate: result.success_rate || 0,
          today_calls: result.today_calls || 0,
          model_distribution: result.model_distribution || [],
          recent_logs: result.recent_logs || [],
          health_status: result.health_status || [],
        });
      } else {
        setData(null);
      }
    } catch {
      toast.error("加载仪表盘数据失败");
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (n: number) => n.toLocaleString();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
          <Card><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const kpiCards = [
    { label: "总调用次数", value: formatNumber(data.total_calls), icon: Zap, color: "text-[hsl(var(--primary))]", trend: data.today_calls > 0, trendLabel: `今日 ${data.today_calls} 次` },
    { label: "Token消耗", value: formatNumber(data.total_tokens), icon: ArrowUpRight, color: "text-[hsl(var(--info))]", trend: false },
    { label: "成功率", value: `${data.success_rate}%`, icon: CheckCircle, color: "text-[hsl(var(--success))]", trend: data.success_rate >= 95 },
    { label: "模型数量", value: data.health_status.length, icon: ArrowDownRight, color: "text-[hsl(var(--warning))]", trend: false },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label} className="border-l-4 border-l-[hsl(var(--primary))]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">{kpi.value}</div>
              {kpi.trend && (
                <p className="text-xs text-muted-foreground mt-1">{kpi.trendLabel}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Model Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">模型调用分布</CardTitle>
          </CardHeader>
          <CardContent>
            {data.model_distribution.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">暂无调用数据</p>
            ) : (
              <div className="space-y-3">
                {data.model_distribution.map((m) => (
                  <div key={m.model_name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-[hsl(var(--primary))]" />
                      <span className="text-sm font-medium">{m.model_name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm tabular-nums">{m.count} 次</span>
                      <Badge variant="secondary" className="text-xs">{m.percentage}%</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Health Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">模型健康状态</CardTitle>
          </CardHeader>
          <CardContent>
            {data.health_status.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">暂无模型配置</p>
            ) : (
              <div className="space-y-3">
                {data.health_status.map((h) => (
                  <div key={h.model_name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${
                        h.status === 'online' ? 'bg-[hsl(var(--success))]' :
                        h.status === 'warning' ? 'bg-[hsl(var(--warning))]' : 'bg-[hsl(var(--destructive))]'
                      }`} />
                      <span className="text-sm font-medium">{h.model_name}</span>
                    </div>
                    <Badge variant={h.status === 'online' ? 'default' : h.status === 'warning' ? 'secondary' : 'destructive'} className="text-xs">
                      {h.status === 'online' ? '正常' : h.status === 'warning' ? '警告' : '离线'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">最近调用记录</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recent_logs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">暂无调用记录</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>模型</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>耗时</TableHead>
                  <TableHead>时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recent_logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.model_name}</TableCell>
                    <TableCell>
                      <Badge variant={log.status === 'success' ? 'default' : 'destructive'} className="text-xs">
                        {log.status === 'success' ? '成功' : log.status === 'failed' ? '失败' : '超时'}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">{log.latency_ms}ms</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(log.created_at), "MM-dd HH:mm:ss")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
