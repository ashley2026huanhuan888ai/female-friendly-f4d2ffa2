## 目标
把现有 AI 调用（观察分析 / 对象总结 / 风险审查 / 批量导入等）从 Lovable Gateway 切换到 DeepSeek API。

## 现状
`src/lib/api/platform.functions.ts` 中的 `getAIConfig()` 已经支持 DeepSeek：
- 设置 `AI_PROVIDER=deepseek` 时，自动使用 `https://api.deepseek.com/chat/completions` 和模型 `deepseek-chat`
- 读取 `AI_API_KEY` 作为鉴权密钥
- 可选 `AI_MODEL`（例如 `deepseek-reasoner`）覆盖默认模型

所以无需改代码，只需配置两个 Secret。

## 步骤
1. 用 `set_secret` 设置 `AI_PROVIDER=deepseek`
2. 用 `add_secret` 让你在安全表单里填入 `AI_API_KEY`（DeepSeek 控制台 → API Keys 生成，格式 `sk-...`）
3. （可选）若想用推理模型，再加 `AI_MODEL=deepseek-reasoner`

配置完成后所有 AI 流程自动走 DeepSeek，无需重启或改代码。
