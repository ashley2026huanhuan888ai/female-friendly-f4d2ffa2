## 目标
将 `/me` 个人资料页的"头像 URL 输入框"替换为一组**固定预设头像**，用户点击即选中。

## 改动

### 1. 生成预设头像（12 张）
- 风格：芭比粉极简插画，与站点视觉一致；中性人物剪影 / 几何图形 / 抽象温度计图样混合
- 输出到 `src/assets/avatars/`：`avatar-01.png` … `avatar-12.png`（512×512，PNG 透明背景）
- 通过 `imagegen` 批量生成

### 2. 新建 `src/components/AvatarPicker.tsx`
- 4 × 3 网格（移动端 4 列）
- 每个头像为圆形按钮，选中态：`ring-2 ring-accent` + 右下角小勾
- 支持"无头像"占位选项
- props: `value: string | null`、`onChange: (url) => void`

### 3. 修改 `src/routes/me.tsx`
- 移除 `avatar_url` 文本输入框
- 在原位置渲染 `<AvatarPicker value={avatarUrl} onChange={setAvatarUrl} />`
- 顶部预览仍显示当前选中头像
- 提交逻辑不变（写 `profiles.avatar_url`）

### 4. 头像存储格式
- 沿用现有 `profiles.avatar_url`（text）
- 写入相对路径（如 `/assets/avatars/avatar-03.png` 经 Vite 处理后的导入 URL）
- 不动数据库 schema

## 不在范围
- 不做上传自定义头像
- 不改其它页面展示头像的逻辑（继续读 `avatar_url`）
- 不改 i18n key（保留并复用 `profile.avatar*` 文案，必要时把 placeholder 文案替换为"选择一个头像"）
