该功能已在上一轮实现：`src/routes/me.tsx` 头部右侧圆形头像按钮中，当 `profile.avatar_url` 为空时渲染 `<span>` 占位，显示 `profile.display_name`（兜底 `user.email`）首字母大写，使用 `bg-accent/5` 背景 + `text-accent` 芭比粉字色，外层与已上传头像共用同一个 `h-28 w-28 rounded-full border` 容器，因此尺寸/边框/hover 编辑遮罩完全一致。

无需新增改动。如果你看到的效果不符合预期（例如首字母没出现、样式错位），请告诉我具体现象，我再排查。