# 千问 (Qwen) API Key 本地测试指南

本文档记录如何验证百炼 API Key 可用,以及如何在本地跑通整个后端。

## 前置条件

- 已在 [百炼控制台](https://bailian.console.aliyun.com) → API-KEY 管理 → 创建 API Key(格式为 `sk-xxx`)
- 已完成后端环境搭建(见下文第 2 步)

---

## 第 1 步:用 curl 直接验证 API Key

不依赖项目代码,一条命令即可确认 Key 和模型可用:

```bash
curl https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions \
  -H "Authorization: Bearer sk-你的key" \
  -H "Content-Type: application/json" \
  -d '{"model": "qwen-plus", "messages": [{"role": "user", "content": "你好"}]}'
```

**成功的响应**(返回 JSON,包含模型回复):

```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "你好!有什么可以帮你的吗?"
      }
    }
  ],
  "model": "qwen-plus",
  "usage": { ... }
}
```

### 常见错误排查

| 现象 | 原因 | 解决 |
|------|------|------|
| 终端出现 `dquote>` | 引号未闭合:多行命令的 `\` 后有空格,或引号被输入法换成中文引号 | 按 `Ctrl+C` 退出,把命令合并成一行重新粘贴 |
| `Required body invalid` | JSON 里混入了中文引号 `“ ”`,或模型名写错 | 确保所有引号是英文 `"`,模型名为 `qwen-plus` |
| `Incorrect API key` / 401 | Key 复制错误或已删除 | 回百炼控制台重新复制/生成 |

> ⚠️ **安全提醒**:不要把 Key 明文粘在命令行(会留在 shell 历史里)。更安全的做法是从 `.env` 读取:
>
> ```bash
> export OPENAI_API_KEY=$(grep OPENAI_API_KEY backend/.env | cut -d= -f2)
> curl https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions \
>   -H "Authorization: Bearer $OPENAI_API_KEY" \
>   -H "Content-Type: application/json" \
>   -d '{"model": "qwen-plus", "messages": [{"role": "user", "content": "你好"}]}'
> ```

---

## 第 2 步:配置并启动本地后端

### 2.1 创建 `backend/.env`

```bash
cd backend
cat > .env << 'EOF'
OPENAI_API_KEY=sk-你的百炼key
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
LLM_MODEL=qwen-plus
EOF
```

**注意**:
- Key 前后**不要加任何引号**(尤其是从别处复制粘贴时容易带入中文引号 `“ ”`,会导致后端报错 `'ascii' codec can't encode character '\u201c'`)
- 检查文件是否干净:`cat -v backend/.env`,如果看到 `M-^@` 之类的乱码说明混入了非 ASCII 字符

### 2.2 创建虚拟环境并启动

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn main:app --port 8000 --reload
```

> 修改 `.env` 后必须**手动重启** uvicorn(`Ctrl+C` 后重新启动)——`--reload` 只监听代码文件变化,不监听 `.env`。

---

## 第 3 步:用 Swagger UI 测试后端接口

后端启动后,浏览器打开:

**<http://localhost:8000/docs>**

这是 FastAPI 自动生成的交互式 API 文档(Swagger UI)。

### 测试 `/api/generate-practice`

1. 找到 `POST /api/generate-practice`,点击展开
2. 点击 **Try it out**
3. 在 Request body 中填入:

   ```json
   {"topic": "ordering coffee", "difficulty": "beginner"}
   ```

4. 点击 **Execute**

**成功**:返回 200,body 中包含 5 道练习题(`exercises` 数组),说明千问已完整接入项目。

**失败排查**:

| 响应 | 原因 |
|------|------|
| `'ascii' codec can't encode character '\u201c'` | `.env` 里的 Key 混入了中文引号,按 2.1 的注意事项清理后重启 |
| 401 / `Incorrect API key` | Key 无效,用第 1 步的 curl 重新验证 |
| 连接超时 | 检查 `OPENAI_BASE_URL` 是否为 `https://dashscope.aliyuncs.com/compatible-mode/v1` |

---

## 第 4 步(可选):启动前端联调

另开一个终端:

```bash
cd frontend
npm install
npm run dev
```

打开 <http://localhost:5173>,前端本地默认连接 `http://localhost:8000`,无需额外配置。完整走一遍"生成练习 → 答题 → 评分 → AI 导师"流程即可确认端到端正常。

---

## 模型切换

模型由环境变量 `LLM_MODEL` 控制(默认 `qwen-plus`):

| 值 | 说明 |
|-----|------|
| `qwen-turbo` | 更便宜、更快 |
| `qwen-plus` | 均衡(推荐) |
| `qwen-max` | 能力最强、最贵 |

切回 OpenAI:删除 `OPENAI_BASE_URL`,设 `LLM_MODEL=gpt-4o-mini`,并换成 OpenAI 的 API Key。
