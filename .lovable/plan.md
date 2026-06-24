## 目标
在「个人观察台」页头右侧显示当前用户头像（替换示意图中绿框位置）。

## 改动
`src/routes/me.tsx` 头部区域（68-123 行）：

1. 在 `MePage` 中通过 `useServerFn(getMyProfile)` 加载当前用户 profile（与 dashboard 并行），保存到 state `profile`。
2. 把现有标题块改为左右两栏布局（flex）：
   - 左侧：`MY OBSERVATORY` 小标题 + `个人观察台` 主标题 + 「我的贡献积分 / 邀请好友」按钮（保持原样）
   - 右侧：头像方块（约 `h-28 w-28`，圆角 `rounded-full`），点击触发 `setEditingProfile(true)`，hover 显示「编辑头像」遮罩
3. 头像来源：`profile.avatar_url`；为空时显示用户昵称首字母占位（`bg-accent/10 text-accent`），保持芭比粉风格。
4. 「编辑资料」按钮位置不变。

## 不改
- AvatarPicker / profile 编辑器逻辑
- 数据库 / 服务端函数
- 其他页面
