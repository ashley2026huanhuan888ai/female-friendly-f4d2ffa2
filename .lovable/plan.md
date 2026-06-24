# LongImagePreview 通用长图预览组件

## 目标
信息流/列表中的长截图，缩略图默认展示**顶部**（标题区），点击后进入**全屏竖向滚动**模式查看完整内容。

## 组件 API
`src/components/LongImagePreview.tsx`

```ts
interface LongImagePreviewProps {
  src: string;
  alt?: string;
  thumbnailMaxHeight?: string; // 默认 "60vh"
  aspectHint?: number;         // 可选，已知宽高比时避免布局抖动
  className?: string;
  onOpen?: () => void;
}
```

## 行为规范

### 1. 列表缩略图态
- 容器宽度 = 父容器 100%，高度 = `min(图片自然高度, thumbnailMaxHeight)`，默认 `60vh`
- `<img>` 用 `w-full h-auto`，外层 `overflow-hidden` + `object-position: top`
  - 关键：当图片真实高度 > 容器高度时，**只显示顶部**（不是居中裁剪）
- 底部加 16–24px 渐隐遮罩 + 「点击查看完整长图」提示条，暗示可展开
- 整块 `role="button"`、可键盘聚焦，点击/回车触发全屏

### 2. 全屏查看态
- 用 shadcn `Dialog`（全屏变体）：`fixed inset-0 z-50 bg-background`
- 顶部固定栏：返回按钮 + 滚动进度条（基于 scrollTop/scrollHeight）
- 内容区 `overflow-y-auto overscroll-contain` + `-webkit-overflow-scrolling: touch`
- `<img>` 宽度 100vw，高度 auto，按宽高比铺满宽度，超出部分**向下滚动**查看
- 打开瞬间 `scrollTop = 0`，关闭时还原 body 滚动锁定
- 安全区：`pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]`
- 手势：原生竖滚；ESC / 顶部返回按钮 / 下拉到顶再下拉关闭（先不做下拉关闭，留扩展）

## 布局示意

```text
缩略图态（移动 390px）          全屏态
┌──────────────────┐           ┌──────────────────┐
│ [品牌] FF-2026-… │           │ ← 返回   ▓▓░░░░░ │ ← 顶部栏 + 进度
│ 女性友好体验存档  │           ├──────────────────┤
│ 滴露             │           │ [品牌] FF-2026…  │
│ #伪女性友好 #…   │           │ 女性友好体验存档 │
│ ▓▓▓▓▓░  90℃     │           │ 滴露             │
│ 滴露衣物消毒液…  │           │ #伪女性友好 …    │
│ ░░░渐隐░░░       │ ← 60vh    │ ▓▓▓▓▓░  90℃     │
│ ⌄ 展开完整长图   │           │ 滴露衣物消毒液… │
└──────────────────┘           │  …（可竖滚）…   │
                               │ 2026/6/24 滴露   │
                               └──────────────────┘
```

不同断点：
- 移动 (<640): 缩略 60vh，全屏 100vw
- 平板 (≥640): 缩略 70vh，全屏图片 max-width 720px 居中，两侧留灰
- 桌面 (≥1024): 缩略 80vh，全屏 max-width 640px 居中

## 交互流程

```text
[列表项]
   │ render 缩略图（顶对齐裁剪）
   │ 用户点击 / 回车
   ▼
[打开全屏 Dialog] ── body scroll lock
   │ scrollTop=0，显示图片顶部
   │ 用户向下滚动 ↓↓↓ 查看完整内容
   │ 顶部进度条实时更新
   ▼
[返回 / ESC] ── 解锁 body scroll，回到列表
```

## 技术要点
- 顶对齐裁剪核心：外层 `overflow-hidden` + 内层 `<img class="w-full h-auto block">`，**不要**用 `object-cover`（会缩放变形）。仅当用 `object-cover` 时才需 `object-top`；本方案让图片保持自然宽高比、被外层 clip。
- 避免 CLS：传入 `aspectHint` 时缩略容器先用 `aspect-ratio` 占位
- 进度条用 `requestAnimationFrame` 节流 onScroll
- 全屏 Dialog 用现有 `@/components/ui/dialog`，去掉默认 padding 与圆角

## 接入点
- 暂不改动现有 ExportCardDialog
- 新建 `src/routes/dev.long-image-preview.tsx` 作为演示/验收页，便于在移动视口检查
