import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateRangePicker } from "@/components/ui/date-picker";
import { type DateRange } from "react-day-picker";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { DollarSign, TrendingUp, Zap, Clock, CheckCircle2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface UsageData {
  by_model: {
    model_name: string;
    total_calls: number;
    total_request_tokens: number;
    total_response_tokens: number;
    avg_latency_ms: number;
    estimated_cost: number;
  }[];
  by_key: {
    key_name: string;
    total_calls: number;
    total_request_tokens: number;
    total_response_tokens: number;
    estimated_cost: number;
  }[];
  by_date: { date: string; total_calls: number; total_tokens: number; estimated_cost: number }[];
  summary: {
    total_calls: number;
    total_tokens: number;
    total_request_tokens: number;
    total_response_tokens: number;
    avg_latency_ms: number;
    success_rate: number;
    estimated_cost: number;
  };
}

const COLORS = ["hsl(239 84% 67%)", "hsl(142 76% 36%)", "hsl(38 92% 50%)", "hsl(201 94% 47%)", "hsl(0 84% 60%)", "hsl(280 65% 60%)", "hsl(160 84% 39%)", "hsl(330 84% 60%)"];

const TIME_PRESETS = [
  { label: "今日", value: "today" },
  { label: "本周", value: "week" },
  { label: "本月", value: "month" },
  { label: "自定义", value: "custom" },
] as const;

function getDateRange(preset: string): DateRange | undefined {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case "today":
      return { from: today, to: now };
    case "week": {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      return { from: startOfWeek, to: now };
    }
    case "month":
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
    default:
      return undefined;
  }
}

export default function UsagePage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timePreset, setTimePreset] = useState("today");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => getDateRange("today"));

  useEffect(() => { loadUsage(); }, [dateRange]);

  const handlePresetChange = (preset: string) => {
    setTimePreset(preset);
    if (preset !== "custom") {
      setDateRange(getDateRange(preset));
    }
  };

  const loadUsage = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateRange?.from) params.set("startDate", dateRange.from.toISOString());
      if (dateRange?.to) params.set("endDate", dateRange.to.toISOString());
      const res = await apiFetch(`/api/usage?${params}`);
      const { data: result } = await res.json();
      if (result) {
        setData({
          by_model: result.by_model || [],
          by_key: result.by_key || [],
          by_date: result.by_date || [],
          summary: result.summary || { total_calls: 0, total_tokens: 0, total_request_tokens: 0, total_response_tokens: 0, avg_latency_ms: 0, success_rate: 0, estimated_cost: 0 },
        });
      } else {
        setData(null);
      }
    } catch {
      toast.error("加载统计数据失败");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-8 w-24" /></CardContent></Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
          <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const summary = data.summary;

  return (
    <div className="space-y-6">
      {/* Time Range Presets + Custom Picker */}
      <div className="flex items-center gap-2 flex-wrap">
        {TIME_PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => handlePresetChange(p.value)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              timePreset === p.value
                ? "bg-[hsl(var(--primary))] text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {p.label}
          </button>
        ))}
        <div className="ml-2">
          <DateRangePicker
            value={dateRange}
            onChange={(v) => { setTimePreset("custom"); setDateRange(v); }}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="border-l-4 border-l-[hsl(var(--primary))]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> 总调用次数
            </CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold tabular-nums">{summary.total_calls.toLocaleString()}</div></CardContent>
        </Card>
        <Card className="border-l-4 border-l-[hsl(var(--info))]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4" /> 总Token消耗
            </CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold tabular-nums">{summary.total_tokens.toLocaleString()}</div></CardContent>
        </Card>
        <Card className="border-l-4 border-l-[hsl(var(--success))]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> 成功率
            </CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold tabular-nums">{summary.success_rate}%</div></CardContent>
        </Card>
        <Card className="border-l-4 border-l-[hsl(var(--warning))]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" /> 平均耗时
            </CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold tabular-nums">{summary.avg_latency_ms}ms</div></CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> 估算费用
            </CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold tabular-nums">${summary.estimated_cost.toFixed(4)}</div></CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Trend Chart - Calls */}
        <Card>
          <CardHeader><CardTitle className="text-base">调用趋势</CardTitle></CardHeader>
          <CardContent>
            {data.by_date.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">暂无数据</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={data.by_date}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="total_calls" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Cost Trend Chart */}
        <Card>
          <CardHeader><CardTitle className="text-base">费用趋势</CardTitle></CardHeader>
          <CardContent>
            {data.by_date.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">暂无数据</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.by_date}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => `$${value.toFixed(4)}`} />
                  <Bar dataKey="estimated_cost" fill="hsl(142 76% 36%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Model Stats / Key Stats */}
      <Tabs defaultValue="models" className="space-y-4">
        <TabsList>
          <TabsTrigger value="models">按模型统计</TabsTrigger>
          <TabsTrigger value="keys">按密钥统计</TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Model Distribution Pie */}
            <Card>
              <CardHeader><CardTitle className="text-base">模型调用占比</CardTitle></CardHeader>
              <CardContent>
                {data.by_model.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">暂无数据</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={data.by_model}
                        dataKey="total_calls"
                        nameKey="model_name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                      >
                        {data.by_model.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Model Cost Distribution */}
            <Card>
              <CardHeader><CardTitle className="text-base">模型费用占比</CardTitle></CardHeader>
              <CardContent>
                {data.by_model.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">暂无数据</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={data.by_model} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis type="category" dataKey="model_name" tick={{ fontSize: 12 }} width={120} />
                      <Tooltip formatter={(value: number) => `$${value.toFixed(4)}`} />
                      <Bar dataKey="estimated_cost" fill="hsl(239 84% 67%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Model Stats Table */}
          <Card>
            <CardHeader><CardTitle className="text-base">模型详细统计</CardTitle></CardHeader>
            <CardContent>
              {data.by_model.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">暂无数据</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>模型</TableHead>
                      <TableHead>调用次数</TableHead>
                      <TableHead>请求Token</TableHead>
                      <TableHead>响应Token</TableHead>
                      <TableHead>平均耗时</TableHead>
                      <TableHead>估算费用</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.by_model.map((m) => (
                      <TableRow key={m.model_name}>
                        <TableCell className="font-medium">{m.model_name}</TableCell>
                        <TableCell className="tabular-nums">{m.total_calls.toLocaleString()}</TableCell>
                        <TableCell className="tabular-nums">{m.total_request_tokens.toLocaleString()}</TableCell>
                        <TableCell className="tabular-nums">{m.total_response_tokens.toLocaleString()}</TableCell>
                        <TableCell className="tabular-nums">{m.avg_latency_ms}ms</TableCell>
                        <TableCell className="tabular-nums font-medium text-emerald-600">${m.estimated_cost.toFixed(4)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="keys" className="space-y-4">
          {/* Key Token Consumption Bar */}
          <Card>
            <CardHeader><CardTitle className="text-base">密钥Token消耗排行</CardTitle></CardHeader>
            <CardContent>
              {data.by_key.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">暂无数据</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.by_key} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="key_name" tick={{ fontSize: 12 }} width={120} />
                    <Tooltip />
                    <Bar dataKey="total_request_tokens" stackId="a" fill="hsl(239 84% 67%)" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="total_response_tokens" stackId="a" fill="hsl(201 94% 47%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Key Cost Bar */}
          <Card>
            <CardHeader><CardTitle className="text-base">密钥费用排行</CardTitle></CardHeader>
            <CardContent>
              {data.by_key.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">暂无数据</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.by_key.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="key_name" tick={{ fontSize: 12 }} angle={-30} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value: number) => `$${value.toFixed(4)}`} />
                    <Bar dataKey="estimated_cost" fill="hsl(142 76% 36%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Key Stats Table */}
          <Card>
            <CardHeader><CardTitle className="text-base">密钥详细统计</CardTitle></CardHeader>
            <CardContent>
              {data.by_key.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">暂无数据</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>密钥名称</TableHead>
                      <TableHead>调用次数</TableHead>
                      <TableHead>请求Token</TableHead>
                      <TableHead>响应Token</TableHead>
                      <TableHead>估算费用</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.by_key.map((k) => (
                      <TableRow key={k.key_name}>
                        <TableCell className="font-medium">
                          <Badge variant="outline" className="font-mono">{k.key_name}</Badge>
                        </TableCell>
                        <TableCell className="tabular-nums">{k.total_calls.toLocaleString()}</TableCell>
                        <TableCell className="tabular-nums">{k.total_request_tokens.toLocaleString()}</TableCell>
                        <TableCell className="tabular-nums">{k.total_response_tokens.toLocaleString()}</TableCell>
                        <TableCell className="tabular-nums font-medium text-emerald-600">${k.estimated_cost.toFixed(4)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
