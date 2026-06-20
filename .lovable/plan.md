## 目标

让用户在首页（`/`）直接完成"选对象 → 写体验 → 提交"，不再跳转 `/submit/$objectId`。

## 改动范围

只改 `src/routes/index.tsx` 中的 `HomeSubmitQuickAction` 组件，复用现有 `submitObservation` server function（`src/lib/api/platform.functions.ts`），不动后端、不动 RLS。

## 新表单字段

1. **对象选择**：保留现有 搜索框 + `<select>`
2. **体验内容** `content`：`<textarea>` 必填，10–2000 字，实时计数
3. **来源链接** `reference_url`：可选，URL 校验
4. **提交按钮**：未登录显示"登录后继续提交"（带 redirect 回 `/`，并把当前草稿存进 localStorage `home-submit-draft`）；已登录显示"提交体验"

## 提交逻辑

```ts
const submit = useServerFn(submitObservation);
await submit({ data: {
  object_id: selectedObjectId,
  content: content.trim(),
  scene: null,
  reference_url: reference_url || null,
}});
```

- 提交中：按钮 disabled，显示"分析中…"
- 成功：清空表单 + localStorage 草稿，显示 inline 成功提示（"已记录，可在对象页查看"，附带跳转该对象页的链接）
- 失败：`toast.error`（用 sonner，submit 页已在用）+ 保留输入

## 校验

用 `zod`（项目已有）：

```ts
z.object({
  object_id: z.string().uuid(),
  content: z.string().trim().min(10).max(2000),
  reference_url: z.string().url().max(500).optional().or(z.literal("")),
})
```

校验不通过时按钮禁用并提示。

## 草稿与登录回跳

- 输入时自动写 `localStorage["home-submit-draft"] = {object_id, content, reference_url}`（防抖 600ms）
- 挂载时若有草稿则恢复
- 未登录点提交 → 跳 `/login?redirect=/`，回来后草稿自动恢复，用户再点一次提交即可

## 埋点

复用 `pushHomeInteractionEvent`：保留 `home_submit_start`，新增 `home_submit_success` / `home_submit_error`。

## 不改动

- `submit/$objectId` 页保留，作为深链入口
- 移动版 hero 图、布局、样式不动
- 后端 server fn、表结构、RLS 不动
