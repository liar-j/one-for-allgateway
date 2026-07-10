#!/bin/bash

# AI Model Gateway 快速启动脚本
# 用法: ./start-dev.sh

set -e

echo "=========================================="
echo "  AI Model Gateway - 开发环境启动"
echo "=========================================="
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到 Node.js，请先安装 Node.js >= 18"
    exit 1
fi

echo "✅ Node.js 版本: $(node --version)"
echo ""

# 检查后端依赖
echo "📦 检查后端依赖..."
cd server
if [ ! -d "node_modules" ]; then
    echo "⚙️  安装后端依赖..."
    npm install
else
    echo "✅ 后端依赖已安装"
fi
cd ..

# 检查前端依赖
echo "📦 检查前端依赖..."
if [ ! -d "node_modules" ]; then
    echo "⚙️  安装前端依赖..."
    npm install
else
    echo "✅ 前端依赖已安装"
fi
echo ""

# 检查环境变量
echo "🔐 检查环境变量配置..."
if [ ! -f "server/.env" ]; then
    echo "⚠️  警告: server/.env 文件不存在"
    if [ -f "server/.env.example" ]; then
        echo "📝 从 .env.example 复制模板..."
        cp server/.env.example server/.env
        echo "⚠️  请编辑 server/.env 并填入实际值后再启动"
        echo ""
        echo "必需的配置项:"
        echo "  - SUPABASE_URL"
        echo "  - SUPABASE_ANON_KEY"
        echo "  - APP_ID"
        echo "  - CORP_ID"
        echo ""
        read -p "是否现在编辑 .env 文件? (y/n): " edit_env
        if [ "$edit_env" = "y" ]; then
            ${EDITOR:-nano} server/.env
        else
            echo "💡 提示: 稍后可以手动编辑 server/.env 文件"
        fi
    else
        echo "❌ 错误: 找不到 .env.example 模板文件"
        exit 1
    fi
else
    echo "✅ 环境变量配置文件存在"
fi
echo ""

# 检查数据库连接（可选）
echo "🗄️  数据库检查..."
echo "💡 提示: 确保 Supabase 项目已创建并执行了迁移脚本"
echo "   参考: supabase/migration/ 目录下的 SQL 文件"
echo ""

# 启动服务
echo "=========================================="
echo "  启动开发服务器"
echo "=========================================="
echo ""
echo "📌 前端将运行在: http://localhost:5173"
echo "📌 后端将运行在: http://localhost:9000"
echo ""
echo "按 Ctrl+C 停止所有服务"
echo ""

# 使用 trap 捕获退出信号
trap 'echo ""; echo "👋 停止服务..."; exit 0' INT TERM

# 启动后端（后台运行）
echo "🚀 启动后端服务..."
cd server
if grep -q '"dev"' package.json; then
    npm run dev &
    BACKEND_PID=$!
else
    # 如果没有 dev 脚本，尝试使用 tsx
    if command -v npx &> /dev/null && npx tsx --version &> /dev/null 2>&1; then
        npx tsx index.ts &
        BACKEND_PID=$!
    else
        echo "⚠️  尝试编译后运行..."
        npm run build 2>/dev/null || true
        node dist/index.js &
        BACKEND_PID=$!
    fi
fi
cd ..

# 等待后端启动
sleep 2

# 检查后端是否成功启动
if ps -p $BACKEND_PID > /dev/null; then
    echo "✅ 后端服务已启动 (PID: $BACKEND_PID)"
else
    echo "❌ 后端服务启动失败，请检查日志"
    exit 1
fi

# 启动前端（前台运行）
echo "🚀 启动前端服务..."
npm run dev

# 如果前端退出，也停止后端
kill $BACKEND_PID 2>/dev/null || true
