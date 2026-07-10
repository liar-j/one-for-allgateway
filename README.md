# AI Model Gateway

一站式大模型API集成管理平台,统一配置、监控和调用多种AI模型服务。

## 📋 项目概述

**AI Model Gateway** 是一个功能完善的大模型API网关平台,旨在解决多AI服务商接入复杂、权限分散及监控困难的问题。通过集中管理模型访问密钥、API调用日志和路由策略,为企业提供统一的AI能力接入层。

### 核心价值

- **统一接入**：支持 OpenAI、Anthropic、Google、智谱、通义千问等主流AI厂商
- **智能路由**：基于任务类型自动匹配最优模型,支持负载均衡策略
- **细粒度控制**：独立的平台访问密钥与厂商API密钥隔离,保障安全
- **完整审计**：全链路调用日志追踪,支持Token消耗统计与费用估算

## ✨ 核心功能

### 1. 仪表盘 (`/`)
- 总调用量、Token消耗、成功率等KPI指标展示
- 各模型调用占比饼图
- 今日费用估算
- 最近调用记录时间线
- 模型健康状态实时监控（在线/警告/离线）

### 2. 模型管理 (`/models`)
采用Tabs页签设计,包含两个子模块：

#### 模型管理 Tab
- 模型列表展示（名称、提供商、端点、绑定密钥、状态）
- 新增/编辑模型配置
- 启用/禁用模型
- 测试连接可用性
- **快速批量添加**：选择厂商 → 勾选模型 → 可选绑定密钥 → 批量创建

#### 厂商密钥 Tab
- 厂商级密钥统一管理（OpenAI、Anthropic、Google等）
- 新增/编辑/复制密钥
- 启用/禁用密钥
- 按厂商筛选
- 密钥脱敏展示,一键复制
- 使用次数与最后使用时间追踪

### 3. 访问密钥管理 (`/access-keys`)
外部系统访问本平台代理的认证密钥管理：
- 生成平台访问密钥（格式：`amg_<timestamp>_<random>`）
- IP白名单配置
- 频率限制设置（次/分钟）
- 过期时间管理
- 密钥重新生成
- 使用统计追踪

### 4. 调用日志 (`/logs`)
- 完整调用记录列表
- 多维度筛选（模型/状态/时间范围）
- 调用详情抽屉（请求体、响应体、Token数、耗时）
- CSV导出功能
- 状态标识（成功/失败/超时）

### 5. 使用统计 (`/usage`)
- 按模型统计调用量柱状图
- 按日期趋势折线图
- Token消耗排行
- 费用估算报表
- 时间范围选择器（今日/本周/本月/自定义）

### 6. 路由规则 (`/routing`)
智能路由策略配置：
- 任务类型路由（chat/completion/embedding/vision/code/summarization/analysis/translation/function_calling/agent/default）
- 优先级配置
- Token预算上限
- 最大延迟限制
- 负载均衡策略（轮询/随机/最少使用）
- 兜底模型配置
- 模型权重与主模型设置

### 7. 代理测试 (`/proxy`)
- 实时聊天测试界面
- 自动/手动路由切换
- 任务类型选择
- 路由匹配结果实时展示
- 响应附带路由信息（规则名称、任务类型、原始模型、路由模型、策略）

### 8. 代理日志 (`/proxy-logs`)
- 代理调用详细日志
- 路由信息展示（匹配规则、负载均衡策略）
- 原始模型 vs 实际路由模型对比
- 多维度筛选（模型/任务类型/状态/时间）

## 🏗️ 技术架构

### 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.x | UI框架 |
| React Router DOM | 6.x | 前端路由 |
| Vite | 7.x | 构建工具 |
| TypeScript | 5.8.x | 类型系统 |
| Tailwind CSS | 3.4.x | 原子化CSS |
| shadcn/ui | - | 组件库（基于Radix UI） |
| Recharts | 2.15.4 | 数据可视化 |
| Tiptap | 2.11.0 | 富文本编辑器 |
| ESLint | 9.x | 代码检查 |

### 后端技术栈

| 技术 | 用途 |
|------|------|
| Node.js + Express | Web服务器 |
| TypeScript | 类型安全 |
| Supabase (PostgreSQL) | 数据库 |
| Row Level Security (RLS) | 数据行级权限控制 |

### 数据库设计

#### 核心数据表

1. **ai_model_configs** - AI模型配置表
   - 存储模型名称、提供商、API端点、默认参数
   - 关联厂商密钥ID（vendor_key_id）

2. **ai_vendor_api_keys** - 厂商API密钥表
   - 存储外部厂商（OpenAI/Anthropic等）的API密钥
   - 一个密钥可被同一厂商的多个模型共用
   - 加密存储,脱敏展示

3. **ai_access_keys** - 平台访问密钥表
   - 外部系统访问本平台代理的认证密钥
   - 与厂商API密钥完全隔离
   - 支持IP白名单、频率限制、过期时间

4. **ai_call_logs** - 调用日志表
   - 记录每次API调用的详细信息
   - Token数、状态、耗时、错误信息

5. **model_routing_rules** - 路由规则表
   - 任务类型到模型的路由配置
   - 优先级、Token预算、延迟限制
   - 负载均衡策略配置

6. **model_rule_configs** - 规则-模型关联表
   - 路由规则与模型的多对多关联
   - 权重、主模型标识

7. **proxy_call_logs** - 代理调用日志表
   - 记录通过统一代理API的调用详情
   - 包含路由信息（规则ID、任务类型、原始模型、路由模型）

## 🔐 安全架构

### 密钥隔离设计

```
┌─────────────────────────────────────┐
│       外部系统 (OpenClaw等)          │
└──────────────┬──────────────────────┘
               │ 使用平台访问密钥
               ▼
┌─────────────────────────────────────┐
│    AI Model Gateway (本平台)         │
│  - ai_access_keys (平台访问密钥)     │
│  - 路由引擎                          │
│  - 负载均衡                          │
└──────────────┬──────────────────────┘
               │ 使用厂商API密钥
               ▼
┌─────────────────────────────────────┐
│   外部AI厂商 (OpenAI/Anthropic等)    │
│  - ai_vendor_api_keys (厂商密钥)     │
└─────────────────────────────────────┘
```

**关键安全特性：**
- ✅ 平台访问密钥与厂商API密钥彻底隔离
- ✅ 厂商密钥加密存储,前端仅展示脱敏值
- ✅ 支持IP白名单限制访问来源
- ✅ 频率限制防止滥用
- ✅ 密钥过期时间管理
- ✅ 数据库Row Level Security (RLS) 保障数据隔离

## 📁 项目结构

```
one-for-allgateway/
├── public/                          # 静态资源
│   └── openclaw-integration-guide.md
├── server/                          # 后端服务
│   ├── _core/                       # 核心模块
│   │   ├── auth.ts                  # 认证中间件
│   │   ├── env.ts                   # 环境变量
│   │   └── tokenInjection.ts        # Token注入
│   ├── lib/                         # 工具库
│   │   └── user-context.ts          # 用户上下文
│   ├── official-apis/               # 官方API集成
│   │   ├── contactsRoutes.ts        # 通讯录接口
│   │   ├── deptRoutes.ts            # 部门接口
│   │   └── storageRoutes.ts         # 存储接口
│   ├── routes/                      # 业务路由
│   │   ├── accessKeyRoutes.ts       # 访问密钥管理
│   │   ├── dashboardRoutes.ts       # 仪表盘数据
│   │   ├── logRoutes.ts             # 调用日志
│   │   ├── modelRoutes.ts           # 模型管理
│   │   ├── proxyLogRoutes.ts        # 代理日志
│   │   ├── publicProxyRoutes.ts     # 公开代理端点
│   │   ├── routingRoutes.ts         # 路由规则
│   │   └── vendorApiKeyRoutes.ts    # 厂商密钥管理
│   ├── services/                    # 业务服务层
│   │   ├── contacts/                # 通讯录服务
│   │   │   ├── supabase_contacts_provider.ts
│   │   │   ├── interface.ts
│   │   │   └── index.ts
│   │   ├── department_service.ts    # 部门服务
│   │   ├── employee_service.ts      # 员工服务
│   │   └── storage_service.ts       # 存储服务
│   ├── test/                        # 测试文件
│   │   └── api-test.ts
│   ├── index.ts                     # 后端入口
│   ├── package.json                 # 后端依赖
│   └── tsconfig.json
├── src/                             # 前端源码
│   ├── components/                  # 组件库
│   │   ├── ui/                      # shadcn/ui组件
│   │   ├── upload/                  # 文件上传组件
│   │   ├── employee-selector/       # 人员选择器
│   │   ├── dept-selector/           # 部门选择器
│   │   ├── selector/                # 通用搜索选择器
│   │   ├── providers/               # 全局Provider
│   │   ├── app-layout.tsx           # 应用布局
│   │   ├── CurrentUser.tsx          # 当前用户组件
│   │   └── RichEditor.tsx           # 富文本编辑器
│   ├── pages/                       # 页面组件
│   │   ├── dashboard.tsx            # 仪表盘
│   │   ├── models/list.tsx          # 模型管理
│   │   ├── call-logs/list.tsx       # 调用日志
│   │   ├── usage/index.tsx          # 使用统计
│   │   ├── routing/list.tsx         # 路由规则
│   │   ├── proxy/test.tsx           # 代理测试
│   │   ├── proxy-logs/list.tsx      # 代理日志
│   │   ├── access-keys/list.tsx     # 访问密钥
│   │   └── not-found.tsx            # 404页面
│   ├── hooks/                       # 自定义Hooks
│   │   ├── use-dark-mode.ts         # 暗黑模式
│   │   └── use-mobile.tsx           # 移动端检测
│   ├── lib/                         # 工具函数
│   │   ├── api.ts                   # API请求封装
│   │   ├── auth.ts                  # Token提取
│   │   ├── url.ts                   # URL处理
│   │   └── utils.ts                 # 通用工具(cn函数)
│   ├── types/                       # 类型定义
│   │   ├── contacts.ts              # 通讯录类型
│   │   ├── database.ts              # 数据库类型
│   │   └── department.ts            # 部门类型
│   ├── app.tsx                      # 应用根组件
│   ├── main.tsx                     # 入口文件
│   └── app.css                      # 全局样式
├── supabase/                        # 数据库配置
│   ├── migration/                   # 迁移脚本
│   │   ├── add_access_keys_table.sql
│   │   ├── add_call_logs_rls_policies.sql
│   │   ├── add_round_robin_counter.sql
│   │   └── ...
│   └── tables/                      # 表定义
│       ├── ai_access_keys.sql
│       ├── ai_model_gateway.sql
│       ├── ai_vendor_api_keys.sql
│       └── model_routing.sql
├── SCAFFOLD.md                      # 前端脚手架文档
├── SPEC.md                          # 产品需求规格说明书
├── package.json                     # 前端依赖
├── vite.config.ts                   # Vite配置
├── tailwind.config.js               # Tailwind配置
└── tsconfig.json                    # TypeScript配置
```

## 🚀 快速开始

### 环境要求

- Node.js >= 18.x
- PostgreSQL (Supabase) 或兼容数据库

### 安装步骤

#### 1. 克隆项目

```bash
git clone <repository-url>
cd one-for-allgateway
```

#### 2. 安装依赖

```bash
# 前端依赖
npm install

# 后端依赖
cd server
npm install
cd ..
```

#### 3. 配置环境变量

在 `server` 目录下创建 `.env` 文件：

```env
# 数据库配置
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# 其他配置
PORT=9000
NODE_ENV=development
```

#### 4. 初始化数据库

执行 Supabase 迁移脚本：

```bash
# 方式1: 通过Supabase Dashboard执行SQL
# 方式2: 使用psql命令行
psql -h <host> -U <user> -d <database> -f supabase/migration/add_access_keys_table.sql
psql -h <host> -U <user> -d <database> -f supabase/migration/add_call_logs_rls_policies.sql
# ... 执行所有迁移脚本
```

或直接导入表定义：

```bash
psql -h <host> -U <user> -d <database> -f supabase/tables/ai_model_gateway.sql
psql -h <host> -U <user> -d <database> -f supabase/tables/ai_vendor_api_keys.sql
psql -h <host> -U <user> -d <database> -f supabase/tables/ai_access_keys.sql
psql -h <host> -U <user> -d <database> -f supabase/tables/model_routing.sql
```

#### 5. 启动开发服务器

```bash
# 终端1: 启动后端
cd server
npm run dev

# 终端2: 启动前端
npm run dev
```

前端运行在 `http://localhost:5173`  
后端运行在 `http://localhost:9000`

### 生产构建

```bash
# 构建前端
npm run build

# 构建后端
cd server
npm run build
```

## 📖 API 接口文档

### 认证说明

- **需要登录的接口**：标记为 `@NeedLogin`,通过OAuth获取用户身份
- **公开接口**：使用平台访问密钥认证,Header中携带 `Authorization: Bearer <access_key>`

### 核心接口清单

#### 仪表盘

```
GET /api/dashboard/stats
```

返回总调用量、Token消耗、成功率、模型分布、最近日志、健康状态。

#### 模型管理

```
GET  /api/models?page=1&pageSize=10&keyword=gpt
POST /api/models
PUT  /api/models/:id
DELETE /api/models/:id
POST /api/models/:id/test
POST /api/models/batch
```

#### 厂商密钥

```
GET  /api/vendor-api-keys?page=1&pageSize=10&vendor=openai
POST /api/vendor-api-keys
PUT  /api/vendor-api-keys/:id
DELETE /api/vendor-api-keys/:id
POST /api/vendor-api-keys/:id/copy
```

#### 访问密钥

```
GET  /api/access-keys?page=1&pageSize=10
POST /api/access-keys
PUT  /api/access-keys/:id
DELETE /api/access-keys/:id
POST /api/access-keys/:id/copy
POST /api/access-keys/:id/regenerate
```

#### 调用日志

```
GET /api/logs?page=1&pageSize=20&configId=1&status=success&startDate=2024-01-01&endDate=2024-12-31
GET /api/logs/:id
```

#### 使用统计

```
GET /api/usage?startDate=2024-01-01&endDate=2024-12-31&groupBy=model
```

#### 路由规则

```
GET  /api/routing-rules?page=1&pageSize=10
GET  /api/routing-rules/all
POST /api/routing-rules
PUT  /api/routing-rules/:id
DELETE /api/routing-rules/:id
GET  /api/routing-rules/:id/configs
```

#### 智能代理

```
POST /api/proxy/v1/chat
{
  "task_type": "chat",
  "messages": [{"role": "user", "content": "你好"}],
  "model": "gpt-4",
  "temperature": 0.7,
  "max_tokens": 1000
}
```

响应包含 `_routing` 字段展示路由信息。

#### 公开代理端点（免登录）

```
POST /api/public/proxy/v1/chat
Headers: Authorization: Bearer amg_xxx_xxx
Body: 同 /api/proxy/v1/chat
```

#### 代理日志

```
GET /api/proxy-logs?page=1&pageSize=20&taskType=chat&status=success
GET /api/proxy-logs/:id
```

### 统一响应格式

**成功响应：**
```json
{
  "success": true,
  "data": { ... }
}
```

**失败响应：**
```json
{
  "success": false,
  "error": "错误信息"
}
```

## 🎨 设计规范

### 视觉系统

- **主色调**：深靛蓝 (#1e3a5f) + 科技紫 (#6366f1)
- **字体**：Inter（正文）+ JetBrains Mono（代码）
- **圆角**：卡片12px / 按钮8px / Tag 6px
- **间距**：遵循 8/16/24/32/48 递进关系
- **阴影**：卡片轻微阴影,悬停增强

### 组件规范

- 按钮高度：36px（默认）/ 32px（紧凑）/ 44px（大）
- 输入框高度：36px
- 表格行高：48px
- 卡片内边距：20px

### 交互原则

1. **密钥安全展示**：API密钥默认脱敏,提供一键复制
2. **状态实时反馈**：模型可用性用绿/黄/红指示
3. **数据可追溯**：所有调用记录包含完整时间戳、模型、状态、耗时

## 🔧 开发指南

### 代码规范

- 使用 ESLint 进行代码检查
- TypeScript strict 模式
- 组件命名：PascalCase
- 文件命名：kebab-case
- 变量命名：camelCase

### Git 工作流

```bash
# 创建功能分支
git checkout -b feature/your-feature-name

# 提交代码
git commit -m "feat: add new feature"

# 推送并创建PR
git push origin feature/your-feature-name
```

### 添加新页面

1. 在 `src/pages/` 创建页面组件
2. 在 `src/app.tsx` 添加路由
3. 在侧边栏菜单添加导航项（如需要）
4. 创建对应的后端路由（如需要）

### 添加新API

1. 在 `server/routes/` 创建路由文件
2. 在 `server/index.ts` 注册路由
3. 实现业务逻辑（services层）
4. 添加数据库迁移（如需要）

## 📊 数据库迁移

### 重要迁移脚本说明

- `add_access_keys_table.sql` - 添加平台访问密钥表
- `add_call_logs_rls_policies.sql` - 添加调用日志RLS策略
- `add_round_robin_counter.sql` - 添加轮询计数器
- `add_vendor_key_id_to_models.sql` - 为模型表添加厂商密钥ID字段
- `remove-model-level-keys.sql` - 移除模型级密钥（仅保留厂商级密钥）
- `remove_vendor_keys.sql` - 清理旧版厂商密钥表

### RLS 策略

项目使用 Supabase Row Level Security 实现数据隔离：

```sql
-- 示例：只允许查看自己企业的数据
CREATE POLICY "Users can view own corp data"
ON ai_model_configs_s_7b4a6688_3
FOR SELECT
USING (corp_id = current_setting('app.current_corp_id'));
```

## 🧪 测试

### 后端API测试

```bash
cd server
npm test
```

或使用提供的测试脚本：

```bash
cd server
node test/api-test.ts
```

### 前端测试

```bash
npm run lint  # 代码检查
npm run build # 构建验证
```

## 📝 迭代历史

| 时间 | 版本 | 主要变更 |
|------|------|----------|
| 2026-06-08 | v1.0 | 初始版本,基础模型管理与调用日志 |
| 2026-06-16 | v2.0 | 新增智能路由、统一代理API、平台访问密钥 |
| 2026-06-16 | v2.1 | 安全架构重构,密钥彻底隔离 |
| 2026-06-16 | v2.2 | 合并模型管理与厂商密钥,支持密钥共享 |
| 2026-06-16 | v2.3 | 路由优化,增加任务类型与精细化配置 |
| 2026-06-17 | v3.0 | 架构精简,仅保留厂商级密钥 |

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 📞 支持与联系

- 项目文档：[SPEC.md](SPEC.md)、[SCAFFOLD.md](SCAFFOLD.md)
- 集成指南：[public/openclaw-integration-guide.md](public/openclaw-integration-guide.md)

## 🙏 致谢

- [shadcn/ui](https://ui.shadcn.com/) - 优秀的组件库
- [Radix UI](https://www.radix-ui.com/) - 无障碍UI原语
- [Recharts](https://recharts.org/) - 强大的图表库
- [Tiptap](https://tiptap.dev/) - 灵活的富文本编辑器

---

**Built with ❤️ by AI Model Gateway Team**
