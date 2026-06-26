/**
 * API 调用模型测试脚本
 * 
 * 使用平台访问密钥（Access Key）调用代理 API，测试模型路由和调用功能
 * 
 * 使用方法：
 * 1. 修改下方 CONFIG 区域的 BASE_URL 和 ACCESS_KEY
 * 2. 运行: npx tsx server/test/api-test.ts
 *    或:   node --loader ts-node/esm server/test/api-test.ts
 */

// ==================== 配置区 ====================
const CONFIG = {
  // 服务地址（本地开发或已部署地址）
  BASE_URL: 'https://5x678ktbzv.ai-app.pub',
  
  // 平台访问密钥（在「访问密钥管理」页面创建，格式 amg_xxx）
  ACCESS_KEY: 'amg_REPLACE_WITH_YOUR_KEY',
  
  // 是否打印请求/响应详情
  VERBOSE: true,
};

// ==================== 工具函数 ====================

function log(msg: string, color = '') {
  const colors: Record<string, string> = {
    title: '\x1b[36m',    // cyan
    success: '\x1b[32m',  // green
    error: '\x1b[31m',    // red
    warn: '\x1b[33m',     // yellow
    dim: '\x1b[90m',      // gray
    reset: '\x1b[0m',
  };
  const c = colors[color] || '';
  console.log(`${c}${msg}${colors.reset}`);
}

function separator() {
  console.log('─'.repeat(60));
}

async function apiCall(
  path: string,
  body: Record<string, any>,
  options?: { label?: string }
) {
  const { label = path } = options || {};
  const url = `${CONFIG.BASE_URL}${path}`;
  
  log(`\n📡 [${label}] POST ${url}`, 'title');
  
  if (CONFIG.VERBOSE) {
    log(`   Request: ${JSON.stringify(body, null, 2).substring(0, 500)}`, 'dim');
  }
  
  const startTime = Date.now();
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.ACCESS_KEY}`,
      },
      body: JSON.stringify(body),
    });
    
    const elapsed = Date.now() - startTime;
    const data = await res.json();
    
    log(`   ⏱  ${elapsed}ms | Status: ${res.status}`, res.ok ? 'success' : 'error');
    
    if (CONFIG.VERBOSE && data) {
      const preview = JSON.stringify(data, null, 2);
      log(`   Response: ${preview.substring(0, 800)}${preview.length > 800 ? '...' : ''}`, 'dim');
    }
    
    // 提取路由信息
    if (data._routing) {
      log(`   🛣  路由: ${data._routing.rule_name} → ${data._routing.routed_model} (${data._routing.strategy})`, 'warn');
    }
    
    // 提取回复内容
    const content = data.data?.choices?.[0]?.message?.content;
    if (content) {
      log(`   💬 回复: ${content.substring(0, 200)}${content.length > 200 ? '...' : ''}`, 'success');
    }
    
    // 提取 Token 用量
    const usage = data.data?.usage;
    if (usage) {
      log(`   📊 Tokens: prompt=${usage.prompt_tokens}, completion=${usage.completion_tokens}, total=${usage.total_tokens}`, 'dim');
    }
    
    return { ok: res.ok, status: res.status, data, elapsed };
  } catch (err: any) {
    const elapsed = Date.now() - startTime;
    log(`   ❌ 请求失败 (${elapsed}ms): ${err.message}`, 'error');
    return { ok: false, status: 0, data: null, elapsed, error: err.message };
  }
}

// ==================== 测试用例 ====================

async function test1_smartRoute_chat() {
  separator();
  log('🧪 测试 1: 智能路由 - 聊天任务 (task_type=chat)', 'title');
  
  return apiCall('/api/public/proxy/v1/chat', {
    task_type: 'chat',
    messages: [
      { role: 'user', content: '你好，请用一句话介绍你自己' },
    ],
    temperature: 0.7,
    max_tokens: 256,
  }, { label: '智能路由-聊天' });
}

async function test2_smartRoute_completion() {
  separator();
  log('🧪 测试 2: 智能路由 - 文本生成任务 (task_type=completion)', 'title');
  
  return apiCall('/api/public/proxy/v1/chat', {
    task_type: 'completion',
    messages: [
      { role: 'user', content: '写一首关于春天的四言绝句' },
    ],
    temperature: 0.8,
    max_tokens: 256,
  }, { label: '智能路由-文本生成' });
}

async function test3_smartRoute_code() {
  separator();
  log('🧪 测试 3: 智能路由 - 代码任务 (task_type=code)', 'title');
  
  return apiCall('/api/public/proxy/v1/chat', {
    task_type: 'code',
    messages: [
      { role: 'user', content: '用 JavaScript 写一个快速排序函数' },
    ],
    temperature: 0.2,
    max_tokens: 512,
  }, { label: '智能路由-代码' });
}

async function test4_smartRoute_withPreferredModel() {
  separator();
  log('🧪 测试 4: 智能路由 - 指定偏好模型', 'title');
  
  return apiCall('/api/public/proxy/v1/chat', {
    task_type: 'chat',
    model: 'gpt-4o',  // 替换为你配置的实际模型名
    messages: [
      { role: 'user', content: '你好' },
    ],
    temperature: 0.7,
    max_tokens: 128,
  }, { label: '智能路由-偏好模型' });
}

async function test5_directModel_chat() {
  separator();
  log('🧪 测试 5: 直接指定模型调用 (POST /proxy/chat)', 'title');
  
  return apiCall('/api/public/proxy/chat', {
    model: 'gpt-4o',  // 替换为你配置的实际模型名
    messages: [
      { role: 'user', content: '你好，测试直接调用' },
    ],
    temperature: 0.7,
    max_tokens: 128,
  }, { label: '直接调用模型' });
}

async function test6_openaiCompatible() {
  separator();
  log('🧪 测试 6: OpenAI 兼容端点 (POST /v1/chat/completions)', 'title');
  
  const url = `${CONFIG.BASE_URL}/api/public/proxy/v1/chat/completions`;
  const body = {
    task_type: 'chat',
    messages: [
      { role: 'user', content: 'Hello, this is a test of OpenAI compatible endpoint' },
    ],
    temperature: 0.7,
    max_tokens: 128,
  };
  
  log(`\n📡 POST ${url}`, 'title');
  
  const startTime = Date.now();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.ACCESS_KEY}`,
      },
      body: JSON.stringify(body),
    });
    
    const elapsed = Date.now() - startTime;
    const data = await res.json();
    
    log(`   ⏱  ${elapsed}ms | Status: ${res.status}`, res.ok ? 'success' : 'error');
    
    // OpenAI 兼容端点直接返回标准格式（不带包络）
    if (data.choices?.[0]?.message?.content) {
      log(`   💬 回复: ${data.choices[0].message.content.substring(0, 200)}`, 'success');
    }
    if (data.usage) {
      log(`   📊 Tokens: ${data.usage.total_tokens}`, 'dim');
    }
    if (data.model) {
      log(`   🤖 Model: ${data.model}`, 'warn');
    }
    
    return { ok: res.ok, status: res.status, data, elapsed };
  } catch (err: any) {
    log(`   ❌ 请求失败: ${err.message}`, 'error');
    return { ok: false, status: 0, data: null, elapsed: 0 };
  }
}

async function test7_getAvailableModels() {
  separator();
  log('🧪 测试 7: 获取可用模型列表 (GET /proxy/models)', 'title');
  
  const url = `${CONFIG.BASE_URL}/api/public/proxy/models`;
  
  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${CONFIG.ACCESS_KEY}`,
      },
    });
    
    const data = await res.json();
    const models = data.data || [];
    
    log(`   ✅ 获取到 ${models.length} 个可用模型`, 'success');
    models.forEach((m: any, i: number) => {
      log(`   ${i + 1}. ${m.model_name} (${m.provider})`, 'dim');
    });
    
    return { ok: res.ok, models };
  } catch (err: any) {
    log(`   ❌ 请求失败: ${err.message}`, 'error');
    return { ok: false, models: [] };
  }
}

async function test8_summarization() {
  separator();
  log('🧪 测试 8: 智能路由 - 摘要任务 (task_type=summarization)', 'title');
  
  return apiCall('/api/public/proxy/v1/chat', {
    task_type: 'summarization',
    messages: [
      { role: 'user', content: '请总结以下内容：人工智能（Artificial Intelligence，简称 AI）是计算机科学的一个分支，致力于开发能够模拟、延伸和扩展人类智能的理论、方法、技术及应用系统。人工智能的研究包括机器人、语言识别、图像识别、自然语言处理和专家系统等。' },
    ],
    temperature: 0.3,
    max_tokens: 256,
  }, { label: '智能路由-摘要' });
}

async function test9_translation() {
  separator();
  log('🧪 测试 9: 智能路由 - 翻译任务 (task_type=translation)', 'title');
  
  return apiCall('/api/public/proxy/v1/chat', {
    task_type: 'translation',
    messages: [
      { role: 'user', content: '请将以下内容翻译成英文：今天天气真好，适合出去散步' },
    ],
    temperature: 0.3,
    max_tokens: 256,
  }, { label: '智能路由-翻译' });
}

async function test10_analysis() {
  separator();
  log('🧪 测试 10: 智能路由 - 分析任务 (task_type=analysis)', 'title');
  
  return apiCall('/api/public/proxy/v1/chat', {
    task_type: 'analysis',
    messages: [
      { role: 'user', content: '分析以下商业模式的优缺点：订阅制 SaaS 服务' },
    ],
    temperature: 0.7,
    max_tokens: 512,
  }, { label: '智能路由-分析' });
}

// ==================== 主函数 ====================

async function runAllTests() {
  log('\n' + '═'.repeat(60), 'title');
  log('  🚀 AI Model Gateway - API 调用测试', 'title');
  log('═'.repeat(60), 'title');
  log(`\n   服务地址: ${CONFIG.BASE_URL}`);
  log(`   访问密钥: ${CONFIG.ACCESS_KEY.substring(0, 12)}...${CONFIG.ACCESS_KEY.substring(CONFIG.ACCESS_KEY.length - 4)}`);
  log(`   测试时间: ${new Date().toLocaleString('zh-CN')}`);
  
  if (CONFIG.ACCESS_KEY.includes('REPLACE')) {
    log('\n⚠️  请先修改 CONFIG.ACCESS_KEY 为你的实际访问密钥！', 'error');
    log('   在「访问密钥管理」页面创建密钥后填入', 'warn');
    return;
  }
  
  const results: Array<{ name: string; ok: boolean; elapsed?: number }> = [];
  
  const tests = [
    { name: '获取可用模型列表', fn: test7_getAvailableModels },
    { name: '智能路由-聊天', fn: test1_smartRoute_chat },
    { name: '智能路由-文本生成', fn: test2_smartRoute_completion },
    { name: '智能路由-代码', fn: test3_smartRoute_code },
    { name: '智能路由-摘要', fn: test8_summarization },
    { name: '智能路由-翻译', fn: test9_translation },
    { name: '智能路由-分析', fn: test10_analysis },
    { name: 'OpenAI 兼容端点', fn: test6_openaiCompatible },
    { name: '直接指定模型', fn: test5_directModel_chat },
  ];
  
  for (const test of tests) {
    const result = await test.fn();
    results.push({
      name: test.name,
      ok: result.ok,
      elapsed: (result as any).elapsed,
    });
    // 每个请求之间间隔，避免触发频率限制
    await new Promise(r => setTimeout(r, 500));
  }
  
  // 汇总报告
  separator();
  log('\n📋 测试汇总', 'title');
  separator();
  
  let passCount = 0;
  let failCount = 0;
  
  for (const r of results) {
    const icon = r.ok ? '✅' : '❌';
    const time = r.elapsed ? ` (${r.elapsed}ms)` : '';
    log(`   ${icon} ${r.name}${time}`, r.ok ? 'success' : 'error');
    if (r.ok) passCount++;
    else failCount++;
  }
  
  separator();
  log(`\n   总计: ${passCount} 通过 / ${failCount} 失败 / ${results.length} 总计`, passCount === results.length ? 'success' : 'error');
  log('═'.repeat(60) + '\n', 'title');
}

runAllTests().catch(console.error);
