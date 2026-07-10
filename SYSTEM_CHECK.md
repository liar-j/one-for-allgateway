# 系统运行检查清单

本文档用于确保 AI Model Gateway 系统能够正常运行和调试。

## ✅ 已修复的问题

### 1. 缺失的路由文件
- **问题**: `server/routes/vendorApiKeyRoutes.ts` 被导入但不存在
- **解决**: 创建了完整的厂商API密钥管理路由文件
- **包含功能**:
  - GET `/api/vendor-api-keys` - 获取密钥列表（支持分页和厂商筛选）
  - POST `/api/vendor-api-keys` - 创建新密钥
  - PUT `/api/vendor-api-keys/:id` - 更新密钥
  - DELETE `/api/vendor-api-keys/:id` - 删除密钥（软删除）
  - POST `/api/vendor-api-keys/:id/copy` - 复制密钥

### 2. 路由注册缺失
- **问题**: vendorApiKeyRoutes 被导入但未在 Express 应用中注册
- **解决**: 在 `server/index.ts` 中添加了路由注册
  ```typescript
  app.use('/api/vendor-api-keys', vendorApiKeyRoutes);
  ```

### 3. 未使用的导入
- **问题**: `server/index.ts` 中导入了未使用的 `fs` 模块
- **解决**: 移除了该导入

### 4. 环境变量配置示例
- **问题**: 缺少环境变量配置示例文件
- **解决**: 创建了 `server/.env.example` 文件，包含所有必需的配置项

## 📋 运行前检查清单

### 1. 依赖安装

```bash
# 安装前端依赖
cd /media/long/_dde_data/pythonwork/ai-gateway/one-for-allgateway
npm install

# 安装后端依赖
cd server
npm install
```

**必需的后端依赖**:
- express
- cors
- cookie-parser
- @supabase/supabase-js
- @chen0825/aiapp-ability

### 2. 环境变量配置

在 `server` 目录下创建 `.env` 文件（可基于 `.env.example` 复制）：

```env
AI_APP_PLATFORM_ORIGIN=https://ai-app.example.com
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
APP_ID=your_app_id
CORP_ID=your_corp_id
BUCKET_NAME=your_bucket_name
```

**重要提示**: 
- `SUPABASE_URL` 和 `SUPABASE_ANON_KEY` 是必需的
- 从 Supabase 项目设置中获取这些值

### 3. 数据库初始化

执行以下 SQL 迁移脚本（按顺序）：

```bash
# 方式1: 通过 Supabase Dashboard SQL Editor 执行
# 方式2: 使用 psql 命令行

psql -h <host> -U <user> -d <database> -f supabase/migration/add_access_keys_table.sql
psql -h <host> -U <user> -d <database> -f supabase/migration/add_call_logs_rls_policies.sql
psql -h <host> -U <user> -d <database> -f supabase/migration/add_round_robin_counter.sql
psql -h <host> -U <user> -d <database> -f supabase/migration/add_vendor_key_id_to_models.sql
psql -h <host> -U <user> -d <database> -f supabase/migration/remove-model-level-keys.sql
psql -h <host> -U <user> -d <database> -f supabase/migration/remove_vendor_keys.sql
```

或直接导入表定义：

```bash
psql -h <host> -U <user> -d <database> -f supabase/tables/ai_model_gateway.sql
psql -h <host> -U <user> -d <database> -f supabase/tables/ai_vendor_api_keys.sql
psql -h <host> -U <user> -d <database> -f supabase/tables/ai_access_keys.sql
psql -h <host> -U <user> -d <database> -f supabase/tables/model_routing.sql
```

**核心数据表**:
- ai_model_configs_s_7b4a6688_3 - 模型配置
- ai_vendor_api_keys_s_7b4a6688_3 - 厂商API密钥
- ai_access_keys_s_7b4a6688_3 - 平台访问密钥
- ai_call_logs_s_7b4a6688_3 - 调用日志
- model_routing_rules_s_7b4a6688_3 - 路由规则
- proxy_call_logs_s_7b4a6688_3 - 代理调用日志

### 4. 启动服务

#### 开发模式

**终端 1 - 启动后端**:
```bash
cd server
npm run dev
# 或者如果 package.json 中没有 dev 脚本：
npx tsx index.ts
```

**终端 2 - 启动前端**:
```bash
npm run dev
```

**访问地址**:
- 前端: http://localhost:5173
- 后端: http://localhost:9000

#### 生产模式

```bash
# 构建前端
npm run build

# 构建后端
cd server
npm run build

# 启动后端
npm start
```

## 🔍 常见问题排查

### 1. 后端启动失败

**错误**: `Cannot find module 'express'`
- **原因**: 后端依赖未安装
- **解决**: `cd server && npm install`

**错误**: `SUPABASE_URL is not defined`
- **原因**: 环境变量未配置
- **解决**: 创建 `.env` 文件并配置 Supabase 连接信息

### 2. 前端启动失败

**错误**: `Cannot find module 'react'`
- **原因**: 前端依赖未安装
- **解决**: `npm install`

**错误**: `VITE_BASE is not defined`
- **原因**: Vite 环境变量问题
- **解决**: 这是正常的，VITE_BASE 有默认值 '/'

### 3. 数据库连接失败

**错误**: `Invalid API key`
- **原因**: SUPABASE_ANON_KEY 配置错误
- **解决**: 从 Supabase Dashboard → Settings → API 获取正确的 anon key

**错误**: `relation "xxx" does not exist`
- **原因**: 数据库表未创建
- **解决**: 执行迁移脚本或手动创建表

### 4. 认证问题

**现象**: 访问页面时重定向到登录页
- **原因**: 正常行为，需要 OAuth 认证
- **解决**: 确保已配置认证，或在免登白名单中添加测试路径

**现象**: 401 Unauthorized
- **原因**: Token 无效或过期
- **解决**: 清除 Cookie 重新登录

### 5. TypeScript 编译错误

**后端错误**: `找不到模块或其相应的类型声明`
- **原因**: 依赖未安装或 tsconfig 配置问题
- **解决**: 
  1. 确保安装了所有依赖
  2. 检查 `server/tsconfig.json` 中的 exclude 配置
  3. 运行 `npx tsc --noEmit` 查看详细错误

**前端错误**: 类似类型错误
- **解决**: 运行 `npm run build` 查看完整错误信息

## 🧪 功能测试

### 1. 健康检查
```bash
curl http://localhost:9000/api/health
# 预期返回: {"status":"ok","timestamp":"..."}
```

### 2. 前端页面访问
- 访问 http://localhost:5173
- 应该能看到仪表盘页面（需要登录后）

### 3. API 路由测试
```bash
# 需要登录后的 token
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:9000/api/models
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:9000/api/vendor-api-keys
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:9000/api/access-keys
```

## 📝 代码质量检查

### ESLint 检查
```bash
npm run lint
```

### TypeScript 类型检查
```bash
# 前端
npx tsc -b

# 后端
cd server && npx tsc --noEmit
```

## 🔐 安全注意事项

1. **不要提交 .env 文件到版本控制**
   - 确保 `.env` 在 `.gitignore` 中
   
2. **密钥管理**
   - 厂商 API 密钥加密存储
   - 前端仅展示脱敏后的密钥
   - 使用 Row Level Security (RLS) 隔离数据

3. **访问控制**
   - 大部分接口需要登录
   - 公开代理接口使用平台访问密钥认证
   - 支持 IP 白名单和频率限制

## 📚 相关文档

- [README.md](../README.md) - 完整项目文档
- [SPEC.md](../SPEC.md) - 产品需求规格
- [SCAFFOLD.md](../SCAFFOLD.md) - 前端脚手架说明
- [server/.env.example](.env.example) - 环境变量示例

## ✨ 下一步

1. ✅ 安装所有依赖
2. ✅ 配置环境变量
3. ✅ 初始化数据库
4. ✅ 启动开发服务器
5. ✅ 测试基本功能
6. ✅ 开始开发新功能

---

**最后更新**: 2026-06-26
**状态**: ✅ 系统代码已修复，可以正常运行
