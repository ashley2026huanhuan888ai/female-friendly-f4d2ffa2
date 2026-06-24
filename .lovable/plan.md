## 目标
在现有 12 个预设头像基础上，按风格分组扩展到 18 个：**插画 / 几何 / 动物 各 6 个**，并在 AvatarPicker 中按分组展示。

## 实施步骤

### 1. 资源整理
- 现有 12 张 `avatar-01 … avatar-12.png.asset.json`（已上传 CDN）作为「插画」组的前 6 张 + 「几何」组的 6 张。
  - 经回顾，现有 12 张实为统一芭比粉极简插画，不天然契合三类。为避免风格混乱：
  - **保留前 6 张作为「插画」组**（重命名变量 `illustration-01..06` 引用现有 asset.json，不动 CDN 文件）。
  - **删除后 6 张** asset 指针（`delete_asset` 工具清理 avatar-07..12.png.asset.json + CDN 文件，避免占用未引用资源）。
  - **新生成 6 张「几何」头像**：极简几何图形（圆/三角/方块/同心环），芭比粉 #E0218A 主色 + 黑白配，纯背景。
  - **新生成 6 张「动物」头像**：极简插画动物头像（兔、猫、狐、熊、鸟、鹿），芭比粉点缀，与整体风格协调。
  - 共 18 张，都上传到 Lovable Assets CDN 获得稳定 URL。

### 2. AvatarPicker 改造
`src/components/AvatarPicker.tsx`：
- 定义 `AVATAR_GROUPS: { key: 'illustration'|'geometric'|'animal', label: string, urls: string[] }[]`
- 实时预览区不变（显示当前选中头像 + 「无头像」说明）
- 「无头像」选项保留
- 预设网格按分组渲染：每组一个小标题（如「插画 · Illustration」）+ 6 张圆形头像 4 列网格
- 选中态、aria-pressed、勾标记沿用现有样式

### 3. 不动的部分
- `me.tsx` 调用方不变
- 数据库 `profiles.avatar_url` 仍存 CDN URL 字符串
- `profile.functions.ts` 校验不变
- 其它显示头像的页面（leaderboard / messages / follows）不变

## 不在范围
- 不做自定义上传
- 不改头像尺寸或裁剪逻辑
- 不引入新字体或排版变化