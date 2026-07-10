# OpenClaw 接入 AI Model Gateway 使用指南

## 1. 获取平台访问密钥

在 AI Model Gateway 管理后台 → **访问密钥管理** 页面创建密钥：

1. 点击「新建密钥」，填写密钥名称
2. 可选配置：过期时间、IP 白名单、频率限制
3. 创建成功后**立即复制完整密钥**（格式：`amg_xxxxx`），平台仅展示一次
4. 后续可通过「复制」按钮重新获取

---

## 2. 认证方式

所有请求需在 Header 中携带密钥，支持两种方式：

```
Authorization: Bearer amg_xxxxx
```

或

```
X-API-Key: amg_xxxxx
```

---

## 3. 重要：Base URL 配置

OpenClaw 配置 `base_url` 时，**必须包含 `/api` 前缀**：

```
✅ 正确：https://your-domain.ai-app.pub/api/public/proxy/v1/chat
❌ 错误：https://your-domain.ai-app.pub/public/proxy/v1/chat
```

> ⚠️ 如果缺少 `/api` 前缀，请求会被登录中间件拦截，返回 401。

---

## 4. API 端点

### 4.1 智能路由对话（推荐）

根据任务类型自动匹配最优模型：

```
POST /api/public/proxy/v1/chat
```

**请求体**：

```json
{
  "task_type": "chat",
  "messages": [
    { "role": "user", "content": "你好，请帮我分析这段代码的问题" }
  ],
  "model": "gpt-4",
  "temperature": 0.7,
  "max_tokens": 2048,
  "stream": false
}
```

**task_type 可选值**：

| 值 | 说明 |
|---|---|
| `chat` | 日常对话 |
| `completion` | 文本续写 |
| `code` | 代码生成/分析 |
| `embedding` | 向量嵌入 |
| `vision` | 图像理解 |
| `summarization` | 摘要总结 |
| `analysis` | 数据分析 |
| `translation` | 翻译 |
| `function_calling` | 函数调用 |
| `agent` | 智能体任务 |
| `default` | 兜底默认 |

**响应**：

```json
{
  "success": true,
  "data": {
    "id": "chatcmpl-xxx",
    "object": "chat.completion",
    "model": "gpt-4o",
    "choices": [{
      "message": { "role": "assistant", "content": "你好！..." },
      "finish_reason": "stop"
    }],
    "usage": { "prompt_tokens": 10, "completion_tokens": 50, "total_tokens": 60 }
  },
  "_routing": {
    "rule_name": "代码分析规则",
    "task_type": "code",
    "original_model": "gpt-4",
    "routed_model": "claude-3-sonnet",
    "strategy": "round_robin"
  }
}
```

> `_routing` 字段说明实际路由到的模型，便于追踪。

### 4.2 OpenAI 兼容端点

与 `/api/public/proxy/v1/chat` 完全等价，供标准 OpenAI SDK 客户端使用：

```
POST /api/public/proxy/v1/chat/completions
```

请求/响应格式同上。

### 4.3 直接指定模型

跳过路由，直接调用指定模型：

```
POST /api/public/proxy/chat
```

**请求体**：

```json
{
  "model": "gpt-4o",
  "messages": [
    { "role": "user", "content": "你好" }
  ],
  "temperature": 0.7,
  "max_tokens": 2048
}
```

### 4.4 查询可用模型

```
GET /api/public/proxy/models
```

**响应**：

```json
{
  "success": true,
  "data": [
    { "id": 1, "model_name": "gpt-4o", "provider": "openai", "description": "GPT-4 Optimized" },
    { "id": 2, "model_name": "claude-3-sonnet", "provider": "anthropic", "description": "Claude 3 Sonnet" }
  ]
}
```

---

## 5. OpenClaw 配置示例

### 方式一：base_url 配置

在 OpenClaw 配置中将 `base_url` 设为：

```
https://your-domain.ai-app.pub/api/public/proxy/v1/chat
```

请求时会自动拼接 `/chat/completions`，最终调用：
`POST /api/public/proxy/v1/chat/chat/completions`

> ⚠️ 注意：如果你的客户端会在 base_url 后追加 `/chat/completions`，请将 base_url 设为：
> ```
> https://your-domain.ai-app.pub/api/public/proxy/v1
> ```
> 这样最终路径为 `/api/public/proxy/v1/chat/completions`，与路由匹配。

### 方式二：curl 直接调用

```bash
# 智能路由对话
curl -X POST https://your-domain.ai-app.pub/api/public/proxy/v1/chat \
  -H "Authorization: Bearer amg_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "task_type": "code",
    "messages": [{"role": "user", "content": "写一个快速排序"}]
  }'

# OpenAI 兼容端点
curl -X POST https://your-domain.ai-app.pub/api/public/proxy/v1/chat/completions \
  -H "Authorization: Bearer amg_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "你好"}]
  }'

# 直接指定模型
curl -X POST https://your-domain.ai-app.pub/api/public/proxy/chat \
  -H "X-API-Key: amg_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "你好"}]
  }'
```

---

## 6. 错误处理

所有错误统一返回：

```json
{
  "success": false,
  "error": "Invalid or expired access key"
}
```

常见错误：

| 错误信息 | 原因 |
|---|---|
| `请先登录` (401) | **请求路径缺少 `/api` 前缀**，被登录中间件拦截 |
| `Invalid access key` (401) | 密钥无效或未提供 |
| `Access key is disabled` (403) | 密钥已禁用 |
| `Access key has expired` (403) | 密钥已过期 |
| `IP not in whitelist` (403) | 请求 IP 不在白名单 |
| `Rate limit exceeded` (429) | 超出频率限制 |
| `No available model for task type: xxx` (404) | 无可用模型处理该任务类型 |
| `Model xxx not found or not enabled` (404) | 指定模型不存在或已禁用 |
| `No available API keys for this model` (503) | 模型未配置 API Key |

---

## 7. 安全建议

- **不要在客户端代码中硬编码密钥**，仅用于服务端调用
- 建议配置 **IP 白名单** 限制调用来源
- 定期 **轮换密钥**（通过管理后台重新生成）
- 设置合理的 **过期时间** 和 **频率限制**
