import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Trash2, Copy, Check, Zap, Clock, ArrowRight, Bot, Route, GitBranch, Shuffle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

interface ModelOption {
  id: number;
  model_name: string;
  provider: string;
  description: string | null;
}

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface RoutingInfo {
  rule_name: string | null;
  task_type: string;
  original_model: string;
  routed_model: string;
  strategy: string;
}

interface CallResult {
  content: string;
  latency: number;
  model: string;
  tokens: { prompt: number; completion: number; total: number };
  timestamp: Date;
  routing?: RoutingInfo;
}

const PROVIDER_COLORS: Record<string, string> = {
  openai: "bg-emerald-100 text-emerald-700 border-emerald-200",
  anthropic: "bg-orange-100 text-orange-700 border-orange-200",
  google: "bg-blue-100 text-blue-700 border-blue-200",
  custom: "bg-gray-100 text-gray-700 border-gray-200",
};

const TASK_TYPES = [
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
  { value: "default", label: "默认" },
];

const STRATEGY_LABELS: Record<string, string> = {
  round_robin: "轮询",
  random: "随机",
  least_used: "最少使用",
};

export default function ProxyTestPage() {
  const [models, setModels] = useState<ModelOption[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState("");
  const [autoRoute, setAutoRoute] = useState(true);
  const [taskType, setTaskType] = useState("chat");
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isCalling, setIsCalling] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [callHistory, setCallHistory] = useState<CallResult[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [lastRouting, setLastRouting] = useState<RoutingInfo | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadModels();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadModels = async () => {
    try {
      const res = await apiFetch("/api/proxy/models");
      const { data } = await res.json();
      setModels(data || []);
      if (data?.length > 0 && !selectedModel) {
        setSelectedModel(data[0].model_name);
      }
    } catch {
      toast.error("加载模型列表失败");
    } finally {
      setModelsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!inputMessage.trim() || isCalling) return;
    if (!autoRoute && !selectedModel) {
      toast.error("请选择模型或开启自动路由");
      return;
    }

    const userMessage: Message = { role: "user", content: inputMessage.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputMessage("");
    setIsCalling(true);
    setLastRouting(null);

    const startTime = Date.now();

    try {
      const endpoint = autoRoute ? "/api/proxy/v1/chat" : "/api/proxy/chat";
      const body: Record<string, any> = {
        messages: newMessages,
        temperature,
        max_tokens: maxTokens,
        task_type: taskType,
      };

      if (!autoRoute) {
        body.model = selectedModel;
      } else if (selectedModel) {
        body.model = selectedModel;
      }

      const res = await apiFetch(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      });
      const result = await res.json();

      if (!result.success) {
        toast.error(result.error || "调用失败");
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `❌ 错误: ${result.error}` },
        ]);
        return;
      }

      const data = result.data;
      let assistantContent = "";

      if (data.choices?.length > 0) {
        assistantContent = data.choices[0].message?.content || "";
      } else if (data.content) {
        assistantContent = data.content
          .filter((block: any) => block.type === "text")
          .map((block: any) => block.text)
          .join("\n");
      }

      if (!assistantContent) {
        assistantContent = "⚠️ 模型返回了空响应";
      }

      const assistantMessage: Message = { role: "assistant", content: assistantContent };
      setMessages((prev) => [...prev, assistantMessage]);

      const latency = Date.now() - startTime;
      const usage = data.usage || {};
      const routing = result._routing || null;
      setLastRouting(routing);

      setCallHistory((prev) => [
        {
          content: assistantContent,
          latency,
          model: routing?.routed_model || selectedModel,
          tokens: {
            prompt: usage.prompt_tokens || 0,
            completion: usage.completion_tokens || 0,
            total: usage.total_tokens || 0,
          },
          timestamp: new Date(),
          routing: routing || undefined,
        },
        ...prev,
      ]);
    } catch (error: any) {
      toast.error("网络请求失败");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `❌ 网络错误: ${error.message}` },
      ]);
    } finally {
      setIsCalling(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
    setInputMessage("");
    setLastRouting(null);
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    toast.success("已复制到剪贴板");
  };

  const selectedModelInfo = models.find((m) => m.model_name === selectedModel);

  return (
    <div className="space-y-4">
      {/* 顶部控制面板 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-[hsl(var(--primary))]" />
            智能代理测试
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            {/* 自动路由开关 */}
            <div className="w-40">
              <Label className="text-xs text-muted-foreground mb-1 block">路由模式</Label>
              <Select value={autoRoute ? "auto" : "manual"} onValueChange={(v) => setAutoRoute(v === "auto")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">
                    <div className="flex items-center gap-2">
                      <Route className="h-3.5 w-3.5" />
                      <span>自动路由</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="manual">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-3.5 w-3.5" />
                      <span>手动指定</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 任务类型 */}
            <div className="w-32">
              <Label className="text-xs text-muted-foreground mb-1 block">任务类型</Label>
              <Select value={taskType} onValueChange={setTaskType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 模型选择（手动模式或自动模式下可指定偏好） */}
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs text-muted-foreground mb-1 block">
                {autoRoute ? "偏好模型（可选）" : "选择模型"}
              </Label>
              {modelsLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger>
                    <SelectValue placeholder={autoRoute ? "自动选择" : "选择模型..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {autoRoute && <SelectItem value="">自动路由选择</SelectItem>}
                    {models.map((m) => (
                      <SelectItem key={m.id} value={m.model_name}>
                        <div className="flex items-center gap-2">
                          <span>{m.model_name}</span>
                          <Badge variant="outline" className="text-xs">
                            {m.provider}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="w-28">
              <Label className="text-xs text-muted-foreground mb-1 block">Temperature</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
              />
            </div>
            <div className="w-28">
              <Label className="text-xs text-muted-foreground mb-1 block">Max Tokens</Label>
              <Input
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value))}
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleClear} title="清空对话">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* 路由信息提示 */}
          {autoRoute && lastRouting && (
            <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2 text-xs font-medium text-primary mb-1">
                <Route className="h-3.5 w-3.5" />
                <span>路由匹配结果</span>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>规则: <span className="font-medium text-foreground">{lastRouting.rule_name || "直接匹配"}</span></span>
                <span className="flex items-center gap-1">
                  <ArrowRight className="h-3 w-3" />
                  任务: <Badge variant="outline" className="text-xs">{TASK_TYPES.find(t => t.value === lastRouting.task_type)?.label || lastRouting.task_type}</Badge>
                </span>
                <span className="flex items-center gap-1">
                  <Shuffle className="h-3 w-3" />
                  策略: <span className="font-medium text-foreground">{STRATEGY_LABELS[lastRouting.strategy] || lastRouting.strategy}</span>
                </span>
                <span>路由到: <Badge variant="secondary" className="text-xs font-mono">{lastRouting.routed_model}</Badge></span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 主内容区域：聊天 + 历史 */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* 左侧：聊天区域 */}
        <div className="lg:col-span-2">
          <Card className="min-h-[400px] flex flex-col">
            <ScrollArea className="flex-1" ref={scrollRef}>
              <div className="p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Bot className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">发送消息开始测试智能路由代理</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {autoRoute
                        ? "自动模式：根据任务类型自动匹配路由规则，选择最优模型"
                        : "手动模式：指定模型进行调用"}
                    </p>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-3 ${
                          msg.role === "user"
                            ? "bg-[hsl(var(--primary))] text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium opacity-70">
                            {msg.role === "user" ? "你" : "模型"}
                          </span>
                          {msg.role === "assistant" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 ml-auto"
                              onClick={() => handleCopy(msg.content, i)}
                            >
                              {copiedIndex === i ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          )}
                        </div>
                        <pre className="whitespace-pre-wrap text-sm font-sans">{msg.content}</pre>
                      </div>
                    </div>
                  ))
                )}
                {isCalling && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-4 py-3 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">
                        {autoRoute ? "路由匹配中..." : "模型思考中..."}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* 输入框 */}
            <div className="border-t p-4">
              <div className="flex gap-2">
                <Textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
                  className="min-h-[44px] max-h-[120px] resize-none"
                  rows={1}
                />
                <Button
                  onClick={handleSend}
                  disabled={!inputMessage.trim() || isCalling || (!autoRoute && !selectedModel)}
                  className="self-end"
                >
                  {isCalling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* 右侧：调用历史 */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-[hsl(var(--primary))]" />
                调用历史
                {callHistory.length > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {callHistory.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {callHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">暂无调用记录</p>
              ) : (
                <ScrollArea className="h-[600px]">
                  <div className="space-y-3">
                    {callHistory.map((call, i) => (
                      <div key={i} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs font-mono">
                            {call.model}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {call.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        {call.routing && (
                          <div className="flex items-center gap-1 text-xs text-primary/70">
                            <Route className="h-3 w-3" />
                            <span>{call.routing.rule_name}</span>
                            <span className="text-muted-foreground">→</span>
                            <Shuffle className="h-3 w-3" />
                            <span>{STRATEGY_LABELS[call.routing.strategy] || call.routing.strategy}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {call.latency}ms
                          </span>
                          <span className="flex items-center gap-1">
                            <ArrowRight className="h-3 w-3" />
                            {call.tokens.total} tokens
                          </span>
                        </div>
                        <Separator />
                        <pre className="text-xs whitespace-pre-wrap line-clamp-4 text-muted-foreground">
                          {call.content}
                        </pre>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
