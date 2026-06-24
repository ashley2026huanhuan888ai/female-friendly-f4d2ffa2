## 目标
重做 `src/components/ExportCardDialog.tsx` 的长图渲染区域（off-screen 卡片），与平台首页 / 详情页风格统一，并提升可读性。

## 改动点

### 1. 删除无附件证据
- 在 `handleExport` 与选项 UI 中：当某条观察 `includeScreenshot=true` 但 `screenshot_url` 为空时，自动剔除（不再渲染"未提供附件"占位框）。
- 渲染循环里同步过滤：无截图就不显示截图区，整条观察若内容/截图都没有则跳过。
- 选项面板里，对没有附件的观察直接禁用"包含附件"勾选，并提示。

### 2. 标签风格对齐主页
当前：黑底白字方块 + ✓。
改为与 `objects.$id.tsx` 列表一致：`#tagname`，使用 accent（芭比粉）色，无边框，inline 横排，前面带证据等级胶囊：
```
[evidence 3]  #服美役  #PUA  · 场景
```

### 3. 对象名称旁加温度
在 header 区 `{object.name}` 右侧加 `TempText`-等价的温度数值（无法直接挂载 React 组件到内联 HTML 渲染没问题——它已是 React 树）：
- 直接 `import { TempText } from "@/components/TempText"`，`<TempText value={object.temperature} size="lg" />`。
- 需要 `Props.object` 新增 `temperature: number`，调用方 `objects.$id.tsx` 传入 `obj.temperature`。

### 4. 增加二维码
- 新增 dep：`bun add qrcode`（含类型）。
- 在打开 dialog 时用 `QRCode.toDataURL(url)` 生成档案入口二维码，URL 指向 `${window.location.origin}/objects/${object.id}`。
- 在 footer 上方插入一个区块，模仿用户上传图：左侧二维码（160×160），右侧两行文字"档案入口 / 扫码查看完整档案"，accent 色下划线短横强调"档案入口"，右侧箭头 →。

### 5. 可读性 & 排版
- 卡片整体 padding 提到 `64px 64px 48px`，正文行距 `1.8`，正文字号 `19px`，摘要 `22px`。
- header 标题字号与对象名字号微调；分隔线由 2px 改 1px 更精致，统一边框颜色 `#1a1a1a`。
- section 间距 `marginBottom: 44`。
- 截图最大高度限制 `maxHeight: 720px; object-fit: contain` 防止单张截图把卡片拉太长。
- footer 改双行：左 = 导出人 + 日期；右 = 平台名（accent）+ 档案号（mono）。

## 涉及文件
- `src/components/ExportCardDialog.tsx`（主要改动）
- `src/routes/objects.$id.tsx`（给 ExportCardDialog 传 `temperature`）
- `package.json`（新增 `qrcode`）

## 验收
- 选择没有截图的观察 → 长图里不出现"未提供附件"占位，截图区直接省略。
- 长图 header 显示：对象类型 / 对象名 / 温度（粉色或区间色）。
- 标签呈现 `#xxx` 粉色，与详情页一致。
- 卡片底部含二维码 + "档案入口"提示。
- 字号、行距更舒展，整体不再拥挤。