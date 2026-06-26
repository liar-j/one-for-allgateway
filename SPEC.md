# PROJECT_SPEC.md

## 1. 项目基本信息

| 字段 | 值 |
|---|---|
| 项目名称 | AI Model Gateway |
| 需求摘要 | 集成管理多种大模型API的配置、密钥、调用日志与使用统计平台 |
| 开发模式 | 全栈应用（前端 + 后端服务 + 数据库） |
| 创建时间 | 2026-06-08 |
| 最后更新 | 2026-06-16 |

---

## 2. 产品及视觉设计

### 2.1 项目概述

「AI Model Gateway」产品一句话定位
一站式大模型API集成管理平台，统一配置、监控和调用多种AI模型服务

**整体调性**

- 配色：深靛蓝 (#1e3a5f) 为主色调，搭配科技紫 (#6366f1) 作为强调色，传递专业、前沿的技术感
- 字体：Inter 作为主字体，JetBrains Mono 用于代码/密钥展示，匹配开发者工具气质
- 氛围：冷静、高效、可信赖的技术后台
- 节奏/密度：均衡密度，表格行高 48px，卡片内边距 20px

**设计宪法**

_默认原则（所有项目必须遵守）：_

1. 精致感底线 — 视觉呈现必须达到专业产品级标准，禁止粗糙拼凑
2. 像素对齐 — 所有元素必须严格对齐到网格系统
3. 系统化圆角 — 同层级元素使用统一的圆角规格
4. 留白有节奏 — 相邻模块间距遵循 8/16/24/32/48 递进关系

_项目特定原则：_

5. 密钥安全展示 — API密钥默认脱敏显示，提供一键复制功能，禁止明文常驻展示
6. 状态实时反馈 — 模型可用性、调用状态必须有明确的视觉指示（在线/离线/限流）
7. 数据可追溯 — 所有调用记录必须包含完整的时间戳、模型、状态和耗时信息

### 2.2 模块结构与页面路由

### 仪表盘 `/`

- **页面类型**：Dashboard
- **核心功能**：总调用量统计、各模型调用占比、今日费用估算、最近调用记录、模型健康状态
- **数据维度**：调用次数、Token消耗、费用、成功率、平均响应时间
- **主要交互**：KPI卡片点击跳转对应列表，图表支持时间范围筛选
- **状态定义**：正常/警告/错误，用于模型健康状态指示

### 模型管理 `/models`

- **页面类型**：Tabs 页签（模型管理 + 厂商密钥）
- **核心功能**：
  - **模型管理 Tab**：模型列表展示、新增/编辑模型配置、启用/禁用模型、测试连接、快速批量添加
  - **厂商密钥 Tab**：厂商级密钥管理、新增/编辑/复制密钥、启用/禁用、按厂商筛选
- **数据维度**：
  - 模型：模型名称、提供商、API端点、绑定的厂商密钥、状态
  - 厂商密钥：密钥名称、厂商、密钥值(脱敏)、使用次数、最后使用时间、过期时间、状态
- **主要交互**：
  - 模型表单中可选择绑定的厂商密钥（同一厂商的多个模型可共用一个密钥）
  - 快速添加对话框：选择厂商 → 勾选模型 → 可选绑定密钥 → 批量创建
  - 厂商密钥表单支持描述、过期时间配置
- **状态定义**：启用/禁用（模型）、激活/已禁用/已过期（密钥）

### 调用日志 `/logs`

- **页面类型**：列表页 + 详情抽屉
- **核心功能**：调用记录列表、多条件筛选(模型/状态/时间范围)、查看调用详情
- **数据维度**：调用时间、模型名称、请求Token、响应Token、状态(成功/失败)、耗时(ms)、错误信息
- **主要交互**：点击行查看调用详情抽屉，支持导出CSV，顶部筛选栏
- **状态定义**：成功/失败/超时，用于调用结果标识

### 使用统计 `/usage`

- **页面类型**：Dashboard + 图表页
- **核心功能**：按模型统计调用量、按时间趋势展示、Token消耗排行、费用估算
- **数据维度**：日期、模型、调用次数、请求Token、响应Token、估算费用
- **主要交互**：时间范围选择器(今日/本周/本月/自定义)，图表支持切换视图
- **状态定义**：无

### 代理测试 `/proxy`

- **页面类型**：聊天测试页 + 调用历史
- **核心功能**：智能路由代理测试、自动/手动路由切换、任务类型选择、实时路由匹配展示
- **数据维度**：消息内容、路由规则、匹配模型、负载均衡策略、调用耗时、Token消耗
- **主要交互**：自动路由模式下按任务类型自动匹配最优模型，手动模式指定模型调用，响应附带路由信息
- **状态定义**：路由匹配成功/直接匹配/无可用模型

### 2.3 信息架构与导航体系

### 整体布局

- **导航模式**：侧边栏导航
- **侧边栏内容**：header区域(应用logo + AI Model Gateway名称)、导航菜单、footer区域(用户头像 + 名称)
- **顶部栏内容**：侧边栏展开收起 / 面包屑 / 页面标题
- **内容区**：最大宽度 1400px / 内边距 24px

### 主导航结构

| 导航项 | 图标 | 路由 | 可见条件 |
|---|---|---|---|
| 仪表盘 | LayoutDashboard | / | 全部 |
| 模型管理 | Cpu | /models | 全部（Tabs：模型管理 + 厂商密钥） |
| 访问密钥管理 | Shield | /access-keys | 全部 |
| 调用日志 | ScrollText | /logs | 全部 |
| 使用统计 | BarChart3 | /usage | 全部 |
| 代理测试 | Zap | /proxy | 全部 |
| 代理日志 | ScrollText | /proxy-logs | 全部 |

### 响应式策略

- **桌面**（≥1280）：完整侧边栏 + 双栏布局
- **平板**（768–1279）：自动收起侧边栏为图标条
- **手机**（<768）：底部抽屉导航

### 2.4 设计系统定义

### 【视觉系统决策】

1. 布局：L2 - 现代SaaS感
   - 侧边栏：M2 模式，背景色值 hsl(220 15% 8%) / 边框色值 hsl(220 15% 15%)，宽度 260px / 64px(收起)
   - 顶部栏：高度 64px / 背景色值 hsl(0 0% 100%)
   - 内容区：最大宽度 1400px / 内边距 24px
   - 根背景色值 hsl(220 15% 96%) / 页面背景色值 hsl(0 0% 100%)

2. 颜色：
   - 主题色：P5 Indigo (#6366f1) → `hsl(239 84% 67%)` 写入 `--primary`
   - 中性色：C2 Slate（背景 hsl(220 15% 96%) / 文字 hsl(220 10% 15%) / 边框 hsl(220 15% 85%)）
   - 语义色：成功 hsl(142 76% 36%) / 警告 hsl(38 92% 50%) / 危险 hsl(0 84% 60%) / 信息 hsl(201 94% 47%)

3. 圆角：R3 - 8px（现代感）→ 卡片 12px / 按钮输入 8px / Tag 6px
   - 阴影级别：卡片 0 1px 3px rgba(0,0,0,0.08) / 悬停 0 4px 12px rgba(0,0,0,0.12) / 弹窗 0 8px 24px rgba(0,0,0,0.16)

4. 字体：Inter 标题 / Inter 正文
   - 字号层级：标题 24px / 正文 14px / 辅助 12px / KPI 32px
   - 数字加 `tabular-nums`

5. 图标：Ix - 线性风格（lucide-react）

### 视觉 DNA

1. **状态指示灯**：每个模型/密钥旁显示小圆点状态指示（绿/黄/红），传递实时健康状态
2. **代码等宽展示**：API端点、密钥值使用等宽字体 + 浅色背景块，强化开发者工具属性
3. **数据卡片边框**：KPI卡片使用左侧 3px 主题色边框，形成统一视觉记忆

### 组件规格

- 按钮档位高度：36px(默认) / 32px(紧凑) / 44px(大)
- 输入框统一高度：36px
- 表格行高：48px
- 卡片内边距：20px

### 信息密度

- 判断：均衡
- 具体参数：表格行 48px、卡片 padding 20px、正文字号 14px

### 2.5 交互模式与组件清单

### shadcn 组件（18个）

`button`, `card`, `table`, `dialog`, `sheet`, `form`, `input`, `select`, `badge`, `dropdown-menu`, `tabs`, `skeleton`, `toast`, `alert-dialog`, `popover`, `tooltip`, `separator`, `scroll-area`

### 第三方库

`recharts`（图表）, `lucide-react`（图标）, `date-fns`（日期处理）, `clsx` + `tailwind-merge`（样式合并）

### 2.6 状态与边界设计

- **空状态**：插画 + 文案 + 主操作按钮（如"添加第一个模型配置"）
- **加载态**：表格用骨架屏 · 按钮用 spinner · 页面用整体骨架
- **错误态**：错误提示 + 重试操作 + 降级展示
- **空数据**：友好提示（如"暂无调用记录"）

---

## 3. 前端设计

### 3.1 技术栈

- React 18 + TypeScript 5 (strict)
- React Router DOM 6
- Vite 7
- Tailwind CSS 3 + shadcn/ui
- Recharts (数据可视化)

### 3.2 页面组件结构

```
src/
├── pages/
│   ├── dashboard.tsx          # 仪表盘页
│   ├── models/
│   │   └── list.tsx           # 模型列表 + 厂商密钥（Tabs）
│   ├── logs/
│   │   └── list.tsx           # 调用日志列表
│   └── usage/
│       └── index.tsx          # 使用统计页
├── components/
│   ├── model-status-badge.tsx # 模型状态徽章
│   ├── key-display.tsx        # 密钥脱敏展示组件
│   └── stat-card.tsx          # 统计卡片组件
```

### 3.3 状态管理

- 使用 React useState + useEffect 管理组件状态
- 使用 apiFetch 工具进行API调用
- 数据列表支持分页、筛选、排序

---

## 4. 鉴权策略 [LOCKED]

AUTH_STRATEGY: dingtalk-platform

依赖钉钉平台访问控制，不生成登录页，不使用 supabase.auth.* 相关 API

---

## 5. 数据模型 [LOCKED after first deploy]

### 5.1 表清单

| 表名（物理名） | 显示名 | 用途 |
|---|---|---|
| ai_model_configs | AI模型配置表 | 存储各模型提供商的配置信息 |
| ai_vendor_api_keys | 厂商API密钥表 | 存储外部厂商（如OpenAI/Anthropic）的API密钥，一个密钥可被同一厂商的多个模型共用 |
| ai_access_keys | 平台访问密钥表 | 存储外部系统访问本平台代理的认证密钥（与模型Key完全隔离） |
| ai_call_logs | 调用日志表 | 记录每次API调用的详细信息 |
| model_routing_rules | 路由规则表 | 存储任务类型到模型的路由规则配置 |
| model_rule_configs | 规则-模型关联表 | 路由规则与模型配置的多对多关联 |
| proxy_call_logs | 代理调用日志表 | 记录通过统一代理API的调用详情（含路由信息） |

### 5.2 表结构详情

#### AI模型配置表（ai_model_configs）

用途：存储支持的大模型配置信息，包括提供商、端点、默认参数等

核心字段：
- id: SERIAL PRIMARY KEY  自增主键
- corp_id: VARCHAR(128)  企业ID
- emp_id: VARCHAR(128)  创建人ID
- model_name: VARCHAR(128) NOT NULL  模型名称（如 gpt-4, claude-3-opus）
- provider: VARCHAR(64) NOT NULL  提供商（openai / anthropic / google / custom）
- api_endpoint: TEXT NOT NULL  API端点URL
- default_max_tokens: INTEGER  默认最大Token数
- default_temperature: DECIMAL(3,2)  默认温度参数
- vendor_key_id: INTEGER  关联的厂商密钥ID（可空，同一厂商的多个模型可共用一个密钥）
- is_enabled: CHAR(1) DEFAULT 'y'  是否启用
- description: TEXT  模型描述
- is_deleted: CHAR(1) DEFAULT 'n'  逻辑删除标记
- created_at: TIMESTAMP DEFAULT NOW()  创建时间
- updated_at: TIMESTAMP DEFAULT NOW()  更新时间

关联关系：多对一关联 ai_vendor_api_keys 表

#### 厂商API密钥表（ai_vendor_api_keys）

用途：存储外部厂商（如OpenAI/Anthropic）的API密钥，一个密钥可被同一厂商的多个模型共用

核心字段：
- id: SERIAL PRIMARY KEY  自增主键
- corp_id: VARCHAR(128)  企业ID
- emp_id: VARCHAR(128)  创建人ID
- vendor: VARCHAR(64) NOT NULL  厂商（openai / anthropic / google / dashscope / qianfan / zhipu / moonshot / deepseek / minimax / yi / hunyuan / custom）
- key_name: VARCHAR(128) NOT NULL  密钥名称（用于标识）
- api_key: TEXT NOT NULL  API密钥值（加密存储）
- is_enabled: CHAR(1) DEFAULT 'y'  是否启用
- last_used_at: TIMESTAMP  最后使用时间
- usage_count: INTEGER DEFAULT 0  使用次数
- expires_at: TIMESTAMP  过期时间
- description: TEXT  描述
- is_deleted: CHAR(1) DEFAULT 'n'  逻辑删除标记
- created_at: TIMESTAMP DEFAULT NOW()  创建时间
- updated_at: TIMESTAMP DEFAULT NOW()  更新时间

关联关系：一对多关联 ai_model_configs 表（通过 vendor_key_id）

#### 平台访问密钥表（ai_access_keys）

用途：存储外部系统（如 OpenClaw）访问本平台代理 API 的认证密钥。与厂商 API Key（ai_vendor_api_keys）完全隔离。
- 厂商 API Key：用于本平台调用外部大模型（如 OpenAI、Anthropic）
- 平台访问密钥：用于外部系统调用本平台代理 API

核心字段：
- id: SERIAL PRIMARY KEY  自增主键
- corp_id: VARCHAR(128)  企业ID
- emp_id: VARCHAR(128)  创建人ID
- key_name: VARCHAR(128) NOT NULL  密钥名称
- access_key: VARCHAR(128) NOT NULL UNIQUE  访问密钥值（格式：amg_<timestamp>_<random>）
- key_prefix: VARCHAR(16)  密钥前缀（用于展示）
- description: TEXT  描述
- is_enabled: CHAR(1) DEFAULT 'y'  是否启用
- last_used_at: TIMESTAMP  最后使用时间
- usage_count: INTEGER DEFAULT 0  使用次数
- expires_at: TIMESTAMP  过期时间
- allowed_ips: TEXT  IP 白名单（逗号分隔）
- rate_limit_per_minute: INTEGER  频率限制（次/分钟）
- is_deleted: CHAR(1) DEFAULT 'n'  逻辑删除标记
- created_at: TIMESTAMP DEFAULT NOW()  创建时间
- updated_at: TIMESTAMP DEFAULT NOW()  更新时间

关联关系：独立表

#### 调用日志表（ai_call_logs）

用途：记录每次API调用的详细信息，用于审计和统计

核心字段：
- id: SERIAL PRIMARY KEY  自增主键
- corp_id: VARCHAR(128)  企业ID
- emp_id: VARCHAR(128)  调用人ID
- config_id: INTEGER NOT NULL  关联模型配置ID
- request_tokens: INTEGER  请求Token数
- response_tokens: INTEGER  响应Token数
- status: VARCHAR(32) NOT NULL  调用状态（success / failed / timeout）
- error_message: TEXT  错误信息
- latency_ms: INTEGER  响应耗时（毫秒）
- request_body: TEXT  请求体（JSON）
- response_body: TEXT  响应体（JSON）
- is_deleted: CHAR(1) DEFAULT 'n'  逻辑删除标记
- created_at: TIMESTAMP DEFAULT NOW()  调用时间
- updated_at: TIMESTAMP DEFAULT NOW()  更新时间

关联关系：多对一关联 ai_model_configs 表

#### 路由规则表（model_routing_rules）

用途：存储任务类型到模型的路由规则配置，用于智能路由代理

核心字段：
- id: SERIAL PRIMARY KEY  自增主键
- corp_id: VARCHAR(128)  企业ID
- emp_id: VARCHAR(128)  创建人ID
- rule_name: VARCHAR(128) NOT NULL  规则名称
- description: TEXT  规则描述
- task_type: VARCHAR(64) NOT NULL DEFAULT 'default'  任务类型（default/chat/completion/embedding/vision/code/summarization/analysis/translation/function_calling/agent/image_generation/video_generation）
- priority: INTEGER DEFAULT 0  优先级（数字越大优先级越高）
- token_budget: INTEGER  Token预算上限
- max_latency_ms: INTEGER  最大延迟限制（毫秒）
- fallback_config_id: INTEGER  兜底模型配置ID（可空）
- load_balance_strategy: VARCHAR(32) DEFAULT 'round_robin'  负载均衡策略（round_robin/random/least_used）
- is_enabled: CHAR(1) DEFAULT 'y'  是否启用
- is_deleted: CHAR(1) DEFAULT 'n'  逻辑删除标记
- created_at: TIMESTAMP DEFAULT NOW()  创建时间
- updated_at: TIMESTAMP DEFAULT NOW()  更新时间

关联关系：一对多关联 model_rule_configs 表

#### 规则-模型关联表（model_rule_configs）

用途：路由规则与模型配置的多对多关联表

核心字段：
- id: SERIAL PRIMARY KEY  自增主键
- corp_id: VARCHAR(128)  企业ID
- emp_id: VARCHAR(128)  创建人ID
- rule_id: INTEGER NOT NULL  关联路由规则ID
- config_id: INTEGER NOT NULL  关联模型配置ID
- weight: INTEGER DEFAULT 1  权重（用于负载均衡）
- is_primary: CHAR(1) DEFAULT 'n'  是否主模型
- is_deleted: CHAR(1) DEFAULT 'n'  逻辑删除标记
- created_at: TIMESTAMP DEFAULT NOW()  创建时间
- updated_at: TIMESTAMP DEFAULT NOW()  更新时间

关联关系：多对一关联 model_routing_rules 表和 ai_model_configs 表

#### 代理调用日志表（proxy_call_logs）

用途：记录通过统一代理API的调用详情，包含路由信息

核心字段：
- id: SERIAL PRIMARY KEY  自增主键
- corp_id: VARCHAR(128)  企业ID
- emp_id: VARCHAR(128)  调用人ID
- rule_id: INTEGER  匹配的路由规则ID（可空）
- config_id: INTEGER NOT NULL  实际使用的模型配置ID
- request_tokens: INTEGER  请求Token数
- response_tokens: INTEGER  响应Token数
- status: VARCHAR(32) NOT NULL  调用状态（success / failed / timeout）
- error_message: TEXT  错误信息
- latency_ms: INTEGER  响应耗时（毫秒）
- task_type: VARCHAR(64)  任务类型
- original_model: VARCHAR(128)  用户指定的偏好模型
- routed_model: VARCHAR(128)  实际路由到的模型
- request_body: TEXT  请求体（JSON）
- response_body: TEXT  响应体（JSON）
- is_deleted: CHAR(1) DEFAULT 'n'  逻辑删除标记
- created_at: TIMESTAMP DEFAULT NOW()  调用时间
- updated_at: TIMESTAMP DEFAULT NOW()  更新时间

关联关系：多对一关联 model_routing_rules 表和 ai_model_configs 表

---

## 6. API 接口协议 [LOCKED]

### 6.1 统一响应包络

成功：`{ success: true, data: T }`
失败：`{ success: false, error: string }`

### 6.2 接口清单

#### 仪表盘相关

页面路径：/

@NeedLogin
GET /api/dashboard/stats
Response:
  { success: true, data: {
    total_calls: number,           // 总调用次数
    total_tokens: number,          // 总Token消耗
    success_rate: number,          // 成功率 (0-100)
    today_calls: number,           // 今日调用次数
    model_distribution: [{         // 模型调用分布
      model_name: string,
      count: number,
      percentage: number
    }],
    recent_logs: [{                // 最近调用记录
      id: number,
      model_name: string,
      status: string,
      latency_ms: number,
      created_at: string
    }],
    health_status: [{              // 模型健康状态
      model_name: string,
      status: string,              // online / warning / offline
      last_call_at: string
    }]
  } }

#### 模型管理相关

页面路径：/models（Tabs：模型管理 + 厂商密钥）

@NeedLogin
GET /api/models?page=number&pageSize=number&keyword=string
Response:
  { success: true, data: {
    list: [{
      id: number,
      model_name: string,
      provider: string,
      api_endpoint: string,
      default_max_tokens: number,
      default_temperature: number,
      is_enabled: string,
      description: string,
      vendor_key_id: number | null,
      vendor_key: { id: number; key_name: string; is_enabled: string } | null,
      created_at: string
    }],
    total: number
  } }

@NeedLogin
POST /api/models
Request Body:
  { model_name: string, provider: string, api_endpoint: string, default_max_tokens?: number, default_temperature?: number, description?: string, vendor_key_id?: number }
Response:
  { success: true, data: { id: number, ... } }

@NeedLogin
PUT /api/models/:id
Request Body:
  { model_name?: string, provider?: string, api_endpoint?: string, default_max_tokens?: number, default_temperature?: number, is_enabled?: string, description?: string, vendor_key_id?: number }
Response:
  { success: true, data: { id: number, ... } }

@NeedLogin
DELETE /api/models/:id
Response:
  { success: true }

@NeedLogin
POST /api/models/:id/test
Response:
  { success: true, data: { connected: boolean, message: string } }

@NeedLogin
POST /api/models/batch
Request Body:
  { models: [{ model_name: string, provider: string, api_endpoint: string, default_max_tokens?: number, default_temperature?: number, vendor_key_id?: number }] }
Response:
  { success: true, data: { created_count: number, models: [...] } }

#### 厂商密钥管理相关

页面路径：/models（厂商密钥 Tab）

@NeedLogin
GET /api/vendor-api-keys?page=number&pageSize=number&vendor=string
Response:
  { success: true, data: {
    list: [{
      id: number,
      vendor: string,
      key_name: string,
      api_key_masked: string,       // 脱敏后的密钥
      is_enabled: string,
      last_used_at: string | null,
      usage_count: number,
      expires_at: string | null,
      description: string | null,
      created_at: string
    }],
    total: number
  } }

@NeedLogin
POST /api/vendor-api-keys
Request Body:
  { vendor: string, key_name: string, api_key: string, expires_at?: string, description?: string }
Response:
  { success: true, data: { id: number, ... } }

@NeedLogin
PUT /api/vendor-api-keys/:id
Request Body:
  { key_name?: string, api_key?: string, is_enabled?: string, expires_at?: string, description?: string }
Response:
  { success: true, data: { id: number, ... } }

@NeedLogin
DELETE /api/vendor-api-keys/:id
Response:
  { success: true }

@NeedLogin
POST /api/vendor-api-keys/:id/copy
Response:
  { success: true, data: { api_key: string } }  // 返回完整密钥用于复制

#### 调用日志相关

页面路径：/logs

@NeedLogin
GET /api/logs?page=number&pageSize=number&configId=number&status=string&startDate=string&endDate=string
Response:
  { success: true, data: {
    list: [{
      id: number,
      config_id: number,
      model_name: string,           // join 自 ai_model_configs
      request_tokens: number,
      response_tokens: number,
      status: string,
      error_message: string,
      latency_ms: number,
      created_at: string
    }],
    total: number
  } }

@NeedLogin
GET /api/logs/:id
Response:
  { success: true, data: {
    id: number,
    model_name: string,
    request_tokens: number,
    response_tokens: number,
    status: string,
    error_message: string,
    latency_ms: number,
    request_body: string,
    response_body: string,
    created_at: string
  } }

#### 使用统计相关

页面路径：/usage

@NeedLogin
GET /api/usage?startDate=string&endDate=string&groupBy=string
Response:
  { success: true, data: {
    by_model: [{                     // 按模型统计
      model_name: string,
      total_calls: number,
      total_request_tokens: number,
      total_response_tokens: number,
      avg_latency_ms: number
    }],
    by_date: [{                      // 按日期趋势
      date: string,
      total_calls: number,
      total_tokens: number
    }],
    summary: {
      total_calls: number,
      total_tokens: number,
      avg_latency_ms: number,
      success_rate: number
    }
  } }

#### 智能代理相关

页面路径：/proxy

@NeedLogin
POST /api/proxy/v1/chat
Request Body:
  { task_type: string,            // 任务类型: chat/completion/embedding/vision/code/default
    messages: [{ role: string, content: string }],
    model?: string,               // 偏好模型（可选，自动路由时作为优先匹配）
    temperature?: number,
    max_tokens?: number,
    stream?: boolean }
Response:
  { success: true, data: {        // OpenAI 兼容响应
    id: string,
    object: string,
    model: string,
    choices: [{ message: { role: string, content: string }, finish_reason: string }],
    usage: { prompt_tokens: number, completion_tokens: number, total_tokens: number }
  },
  _routing: {                     // 路由信息
    rule_name: string,            // 匹配的路由规则名称
    task_type: string,            // 任务类型
    original_model: string,       // 用户指定的偏好模型
    routed_model: string,         // 实际路由到的模型
    strategy: string              // 负载均衡策略: round_robin/random/least_used
  } }

@NeedLogin
POST /api/proxy/chat
Request Body:
  { model: string,                // 必须指定模型名称
    messages: [{ role: string, content: string }],
    temperature?: number,
    max_tokens?: number,
    stream?: boolean }
Response:
  { success: true, data: { ... } }  // OpenAI 兼容响应

@NeedLogin
GET /api/proxy/models
Response:
  { success: true, data: [{
    id: number,
    model_name: string,
    provider: string,
    description: string
  }] }

#### 路由规则相关

页面路径：/routing

@NeedLogin
GET /api/routing-rules?page=number&pageSize=number&keyword=string
Response:
  { success: true, data: {
    list: [{
      id: number,
      rule_name: string,
      description: string,
      task_type: string,           // chat/completion/embedding/vision/code/default
      priority: number,
      token_budget: number,
      max_latency_ms: number,
      load_balance_strategy: string,
      is_enabled: string,
      model_names: string[],       // 关联的模型名称列表
      config_ids: number[],        // 关联的模型配置ID列表
      created_at: string
    }],
    total: number
  } }

@NeedLogin
GET /api/routing-rules/all
Response:
  { success: true, data: [{
    id: number,
    rule_name: string,
    task_type: string
  }] }

@NeedLogin
POST /api/routing-rules
Request Body:
  { rule_name: string,
    description?: string,
    task_type: string,
    priority: number,
    token_budget?: number,
    max_latency_ms?: number,
    load_balance_strategy: string,  // round_robin/random/least_used
    is_enabled: string,
    config_ids: number[] }          // 关联的模型配置ID数组
Response:
  { success: true, data: { id: number, ... } }

@NeedLogin
PUT /api/routing-rules/:id
Request Body:
  { rule_name?: string, description?: string, task_type?: string, priority?: number, load_balance_strategy?: string, is_enabled?: string, config_ids?: number[] }
Response:
  { success: true, data: { id: number, ... } }

@NeedLogin
DELETE /api/routing-rules/:id
Response:
  { success: true }

@NeedLogin
GET /api/routing-rules/:id/configs
Response:
  { success: true, data: [{
    id: number,
    config_id: number,
    weight: number,
    is_primary: string,
    model: { id: number, model_name: string, provider: string, api_endpoint: string } | null
  }] }

#### 平台访问密钥管理相关

页面路径：/access-keys

@NeedLogin
GET /api/access-keys?page=number&pageSize=number&keyword=string
Response:
  { success: true, data: {
    list: [{
      id: number,
      key_name: string,
      access_key_masked: string,     // 脱敏后的密钥
      key_prefix: string,            // 密钥前缀（amg_<timestamp>）
      description: string | null,
      is_enabled: string,
      last_used_at: string | null,
      usage_count: number,
      expires_at: string | null,
      allowed_ips: string | null,
      rate_limit_per_minute: number | null,
      created_at: string
    }],
    total: number
  } }

@NeedLogin
POST /api/access-keys
Request Body:
  { key_name: string, description?: string, expires_at?: string, allowed_ips?: string, rate_limit_per_minute?: number }
Response:
  { success: true, data: { id: number, access_key: string, ... } }  // 创建时返回完整密钥

@NeedLogin
PUT /api/access-keys/:id
Request Body:
  { key_name?: string, description?: string, is_enabled?: string, expires_at?: string, allowed_ips?: string, rate_limit_per_minute?: number }
Response:
  { success: true, data: { id: number, ... } }

@NeedLogin
DELETE /api/access-keys/:id
Response:
  { success: true }

@NeedLogin
POST /api/access-keys/:id/copy
Response:
  { success: true, data: { access_key: string } }  // 返回完整密钥用于复制

@NeedLogin
POST /api/access-keys/:id/regenerate
Response:
  { success: true, data: { id: number, access_key: string, ... } }  // 重新生成密钥

#### 公开代理端点（免钉钉登录，使用平台访问密钥认证）

页面路径：/api/public/*（外部系统调用）

// 无标注 - 使用平台访问密钥认证（非钉钉登录）
POST /api/public/proxy/v1/chat
Request Headers:
  Authorization: Bearer <access_key>   // 或 X-API-Key: <access_key>
Request Body:
  { task_type: string,            // 任务类型: chat/completion/embedding/vision/code/default
    messages: [{ role: string, content: string }],
    model?: string,               // 偏好模型（可选）
    temperature?: number,
    max_tokens?: number,
    stream?: boolean }
Response:
  { success: true, data: { ... }, _routing: { rule_name: string, task_type: string, original_model: string, routed_model: string, strategy: string } }
  // 失败返回 { success: false, error: string }

// 无标注 - 使用平台访问密钥认证
POST /api/public/proxy/chat
Request Headers:
  Authorization: Bearer <access_key>   // 或 X-API-Key: <access_key>
Request Body:
  { model: string,                // 必须指定模型
    messages: [{ role: string, content: string }],
    temperature?: number,
    max_tokens?: number,
    stream?: boolean }
Response:
  { success: true, data: { ... } }

// 可选认证
GET /api/public/proxy/models
Response:
  { success: true, data: [{ id: number, model_name: string, provider: string, description: string }] }

#### 代理调用日志相关

页面路径：/proxy-logs

@NeedLogin
GET /api/proxy-logs?page=number&pageSize=number&configId=number&taskType=string&status=string&startDate=string&endDate=string
Response:
  { success: true, data: {
    list: [{
      id: number,
      config_id: number,
      model_name: string,           // join 自 ai_model_configs
      request_tokens: number,
      response_tokens: number,
      status: string,
      error_message: string,
      latency_ms: number,
      task_type: string,            // chat/completion/embedding/vision/code/summarization/analysis/translation/function_calling/agent/default
      original_model: string,       // 用户指定的偏好模型
      routed_model: string,         // 实际路由到的模型
      rule_name: string,            // join 自 model_routing_rules
      load_balance_strategy: string, // join 自 model_routing_rules
      request_body: string,
      response_body: string,
      created_at: string
    }],
    total: number
  } }

@NeedLogin
GET /api/proxy-logs/:id
Response:
  { success: true, data: { ...同上... } }

---

## 7. 业务组件清单

| 组件名 | 文件路径 | 来源 | 关联页面 | 功能说明 |
|---|---|---|---|---|
| ModelStatusBadge | src/components/model-status-badge.tsx | 自研 | 模型管理 | 模型启用/禁用状态徽章 |
| KeyDisplay | src/components/key-display.tsx | 自研 | API密钥管理 | 密钥脱敏展示与复制 |
| StatCard | src/components/stat-card.tsx | 自研 | 仪表盘 | KPI统计卡片 |
| DatePicker | @/components/ui/date-picker.tsx | shadcn/ui | 调用日志/使用统计 | 日期范围选择 |
| EmployeeSelector | @/components/employee-selector/EmployeeSelector.tsx | 内置 | 全部 | 人员选择 |

---

## 8. 迭代变更记录

| 时间 | 变更类型 | 变更内容 | 变更原因 |
|---|---|---|---|
| 2026-06-08 | 初始化 | 首次生成 | 用户需求：创建集成各种大模型API接入的平台 |
| 2026-06-16 | 功能增强 | 新增统一代理API（POST /api/proxy/v1/chat），支持一个API对应多个模型，按任务类型自动路由；新增路由规则表和代理调用日志表；前端代理测试页面增加自动/手动路由切换、任务类型选择、路由匹配结果展示 | 用户需求：集成平台的一个API能够对应多个模型，并通过模型路由功能分配不同的模型不同的任务 |
| 2026-06-16 | 安全架构重构 | 新增 ai_access_keys 表（平台访问密钥），与模型 API Key（ai_api_keys）彻底分离；重写公开代理端点认证逻辑（authenticateAccessKey）；新增 access-key 管理后端路由（CRUD + regenerate）；新增「访问密钥」前端页面（含安全策略配置：IP白名单、频率限制、过期时间）；公开端点改用平台访问密钥认证，模型 Key 仅用于调用外部大模型 | 用户需求：平台的 key 与模型的 key 区别开，做好安全防护措施 |
| 2026-06-16 | 功能重构 | 新增 ai_vendor_api_keys 表（厂商级密钥表）；给 ai_model_configs 添加 vendor_key_id 字段；合并「模型管理」和「API密钥」为统一页面（Tabs切换：模型管理 + 厂商密钥）；移除独立的 /api-keys 路由和导航项；模型表单和快速添加支持绑定厂商密钥（同一厂商的多个模型可共用一个密钥）；新增厂商密钥后端路由 vendorApiKeyRoutes.ts | 用户需求：模型管理和API密钥功能合并为一个栏目，同时支持一个外部厂商的密钥支持多个模型 |
| 2026-06-16 | 路由优化 | 新增任务类型 summarization/analysis/translation/function_calling/agent；路由规则表单增加兜底模型（fallback_config_id）配置；模型关联支持权重（weight）和主模型（is_primary）精细化配置；round_robin 策略改用持久化计数器（last_round_index 字段）替代 Date.now() 取模；新增代理调用日志页面 /proxy-logs（含筛选、详情查看）；修复 SPEC.md /proxy 路由路径不一致问题；后端路由规则 CRUD 支持 model_configs 数组格式（向后兼容 config_ids） | 用户需求：优化模型路由功能，增加任务类型和精细化配置 |
| 2026-06-17 | 架构精简 | 彻底删除模型级密钥表（ai_api_keys）及其一切相关配置：删除数据库表、删除 key_id 字段（ai_call_logs、proxy_call_logs）、删除后端 apiKeyRoutes.ts 路由、删除前端 api-keys 页面、重构 publicProxyRoutes.ts 的 resolveApiKey 仅使用厂商级密钥、清理 dashboardRoutes.ts 中的密钥统计；系统全流程仅依赖厂商级密钥（ai_vendor_api_keys） | 用户需求：只保留厂商级密钥，彻底删除所有模型级密钥及其在系统中的一切相关配置项 |
