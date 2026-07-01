# 迁移记录:OpenAI → 千问 (Qwen) + Railway → 阿里云函数计算

> 日期:2026-07-01
> 目标:后端从 Railway 迁移到阿里云函数计算 (FC),模型从 GPT-4o-mini 换成通义千问,前端保持 Vercel 不变。

---

## 一、迁移前架构

| 组件 | 平台 | 说明 |
|------|------|------|
| 前端 | Vercel | React + Vite,通过 `VITE_API_URL` 指向后端 |
| 后端 | Railway | FastAPI + uvicorn,由 `railway.toml` / `Procfile` 驱动 |
| 模型 | OpenAI GPT-4o-mini | 代码中硬编码 `model="gpt-4o-mini"`(共 6 处) |

## 二、方案选型

**为什么选函数计算 FC(而不是 ECS / SAE):**

- 自带免费 **HTTPS 公网域名** —— Vercel 前端是 HTTPS,浏览器禁止调用纯 HTTP 后端(混合内容),ECS 需要买域名 + 备案 + 配证书,太慢
- 按量付费,低流量几乎免费
- 控制台上传 zip 即可部署,最快上线

**为什么千问用 DashScope「OpenAI 兼容模式」:**

- 项目使用 OpenAI Python SDK 的 `chat.completions` 接口(提示词式工具调用,无 OpenAI 专属功能)
- DashScope 提供兼容端点 `https://dashscope.aliyuncs.com/compatible-mode/v1`,只需改 `base_url` 和 `model`,**零业务代码改动**

**平台分工澄清:**

| 平台 | 用途 |
|------|------|
| 阿里百炼 (bailian.console.aliyun.com) | 只负责大模型:创建 API Key |
| 阿里云函数计算 (fcnext.console.aliyun.com) | 只负责部署后端代码 |

## 三、代码改动

### 1. 模型与端点参数化

- [backend/agent/tools.py](../backend/agent/tools.py):新增 `LLM_MODEL = os.getenv("LLM_MODEL", "qwen-plus")`,6 处 `model="gpt-4o-mini"` 全部改为 `model=LLM_MODEL`
- [backend/agent/agent.py](../backend/agent/agent.py):`OpenAI(...)` 客户端增加 `base_url=os.getenv("OPENAI_BASE_URL")`,指向 DashScope 兼容端点
- [backend/main.py](../backend/main.py):同步引用 `LLM_MODEL`

### 2. 限流器代理感知修复

原 `_get_client_ip` 只读 `req.client.host`。部署在 FC 网关/反向代理后面时,该值恒为代理内网 IP,导致**所有用户共享同一限流配额**。修复:优先读 `X-Forwarded-For` 头的第一个 IP。

### 3. 打包脚本 deploy.sh

新增 [backend/deploy.sh](../backend/deploy.sh):把代码 + 依赖一起打成 `deploy.zip`。关键点:

- `pip install -r requirements.txt -t .` 把依赖装进包目录(FC 不会自动执行 pip install)
- `--platform manylinux2014_x86_64 --python-version 3.10 --only-binary=:all:` 强制下载 **Linux 版**二进制轮子 —— 本机是 macOS,直接装会得到 Mac 版 `pydantic-core`/`jiter` 等,上了 FC 会 import 失败

## 四、FC 部署配置

| 配置项 | 值 | 原因 |
|--------|-----|------|
| 函数类型 | **Web 函数** | 直接收 HTTP,适合 FastAPI |
| 运行时 | Python 3.10 | 与 deploy.sh 打包目标一致,必须匹配 |
| vCPU / 内存 / 磁盘 | 0.35 核 / 0.5 GB / 512 MB(最小档) | 纯 I/O 应用,时间都在等 LLM 响应 |
| 启动命令(命令模式) | `python3 -m uvicorn main:app --host 0.0.0.0 --port 9000` | 见问题 3 |
| 监听端口 | 9000 | 与启动命令一致 |
| 单实例并发度 / 最大实例数 | 100 / 1 | 会话与限流状态在内存,多实例会丢会话 |
| 触发器认证 | **无需认证** | API 由浏览器直接调用,无法带阿里云签名;已有限流 + CORS 防护 |
| 访问地址 | 公网地址 (`xxx.fcapp.run`) | 内网地址仅 VPC 内可达 |

**环境变量(FC 控制台配置):**

| Key | Value |
|-----|-------|
| `OPENAI_API_KEY` | 百炼 API Key (`sk-...`) |
| `OPENAI_BASE_URL` | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| `LLM_MODEL` | `qwen-plus` |
| `FRONTEND_URL` | Vercel 前端域名(CORS 白名单) |

## 五、遇到的问题与解决

### 问题 1:curl 测试出现 `dquote>`

**现象**:粘贴多行 curl 命令后终端卡在 `dquote>` 提示。
**原因**:引号未闭合 —— 多行命令的 `\` 后有空格,或输入法把英文引号换成了中文引号。
**解决**:`Ctrl+C` 退出,把命令合并成一行粘贴。

### 问题 2:API 返回 `Required body invalid`

**现象**:`{"error":{"message":"Required body invalid..."}}`
**原因**:JSON 里混入中文引号 `“`,且模型名写错(`qwen3.7-plus` 不存在)。
**解决**:全部使用英文引号,模型名改为 `qwen-plus`。

### 问题 3:本地后端报 `'ascii' codec can't encode character '\u201c'`

**现象**:调 `/api/generate-practice` 返回编码错误。
**原因**:`.env` 里的 API Key 前后被中文引号 `“ ”` 包裹,HTTP 头无法编码。
**解决**:清理 `.env` 中的非 ASCII 字符(可用 `cat -v .env` 检查,乱码 `M-^@` 即异常);修改 `.env` 后需**手动重启** uvicorn(`--reload` 不监听 `.env`)。

### 问题 4:git push 被拒 `GH013: Changes must be made through a pull request`

**现象**:直接 push main 被远端拒绝。
**原因**:GitHub 仓库规则要求 main 只能通过 PR 更新。
**附带发现**:5.4 MB 的构建产物 `deploy.zip` 被误提交(推送体积 4.8 MiB 暴露了问题)。
**解决**:`git rm --cached deploy.zip` + 加入 `.gitignore` + `git commit --amend`;然后 `git switch -c qwen-aliyun-migration` 推分支、开 PR 合并。

### 问题 5:FC 启动失败 `permission denied (code 13)`

**现象**:`Function instance exited unexpectedly(code 13, message:permission denied) with start command 'uvicorn main:app ...'`
**原因**:zip 打包丢失了 `uvicorn` 可执行脚本的执行权限位。
**解决**:启动命令改为 **`python3 -m uvicorn main:app --host 0.0.0.0 --port 9000`** —— 模块方式加载,不需要执行权限。

### 问题 6:FC 启动失败 `ModuleNotFoundError: No module named 'exceptiongroup'`

**现象**:改用 `python3 -m` 后 import 链在 anyio 处断掉。
**原因**:`exceptiongroup` 是条件依赖(仅 Python < 3.11 需要,3.11+ 已内置)。本机 Python 是 3.14,pip 按**本机解释器**评估条件标记,判定"不需要"而跳过;但 FC 跑的是 3.10,需要它。
**解决**:`deploy.sh` 的 pip install 显式追加 `exceptiongroup`,重新打包上传。

### 问题 7:FC 启动失败 `OPENAI_API_KEY not found in environment`

**现象**:依赖齐了,但 main.py 启动即退出。
**原因**:FC 上还没配环境变量(`.env` 只用于本地,不打进 zip)。
**解决**:FC 控制台 → 配置 → 环境变量,添加上表 4 个变量,保存自动重启。

### 问题 8:浏览器访问 `/docs` 变成下载文件,打开报 CORS 错

**现象**:访问 Swagger 页面时浏览器下载了 `docs.html`,本地打开报 `file:///openapi.json` CORS 错误。
**原因**:FC 默认公网域名 (`*.fcapp.run`) 出于安全对 HTML 响应强制加 `Content-Disposition: attachment`,浏览器只能下载不能渲染。
**解决**:不影响 API 本身(前端 axios 调 JSON 接口正常)。验证改用 curl:

```bash
curl -X POST https://xxx.fcapp.run/api/generate-practice -H "Content-Type: application/json" -d '{"topic": "ordering coffee", "difficulty": "beginner"}'
```

想正常看 `/docs` 可给 FC 绑定自定义域名(非必需)。

### 问题 9(安全):API Key 泄漏

**现象**:测试时把 Key 明文写进了 curl 命令,留在了 shell 历史/对话上下文中。
**教训**:密钥永远不要明文出现在命令行。从 `.env` 读取:

```bash
export OPENAI_API_KEY=$(grep OPENAI_API_KEY backend/.env | cut -d= -f2)
curl ... -H "Authorization: Bearer $OPENAI_API_KEY" ...
```

**处理**:测试完成后去百炼控制台作废旧 Key、生成新 Key,同步更新 FC 环境变量和本地 `.env`。

## 六、连接 Vercel

1. Vercel → 项目 → Settings → Environment Variables → `VITE_API_URL` = FC 公网地址(`https://` 开头,结尾不带 `/`)
2. Deployments → **Redeploy**(必须重新构建:Vite 环境变量是构建时写死进 JS 的)
3. 确认 FC 的 `FRONTEND_URL` 与 Vercel 域名完全一致(CORS)
4. 打开网站端到端测试;失败时按 F12 看 Console:CORS 错误 → `FRONTEND_URL` 不匹配;404/网络错误 → `VITE_API_URL` 错或没 Redeploy

## 七、收尾清单

- [ ] Vercel `VITE_API_URL` 更新并 Redeploy
- [ ] 作废泄漏的百炼 API Key,换新 Key
- [ ] 提交 `deploy.sh` / README 的后续修正(走 PR)
- [ ] 确认线上正常后停掉 Railway 旧服务

## 八、日常更新部署流程

```bash
cd backend
./deploy.sh          # 生成 deploy.zip(根目录)
# FC 控制台 → 代码 → 上传 ZIP 包 → 部署
```

启动命令保持不变:`python3 -m uvicorn main:app --host 0.0.0.0 --port 9000`

相关文档:[qwen-api-local-testing.md](qwen-api-local-testing.md)(本地测试千问 API 的完整步骤)
