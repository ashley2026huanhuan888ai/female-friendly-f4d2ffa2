## 问题
预设头像目前通过 Vite `import a1 from "@/assets/avatars/avatar-01.png"` 引入。Vite 在构建时会把它替换成带 hash 的资源 URL（如 `/assets/avatar-12-abc123.png`），数据库里存的就是这个 hash 路径。

下次构建 hash 会变 → 旧 URL 失效；服务端渲染 / 其它页面引用时也可能解析不到 → 头像显示破图（即截图里的灰色占位）。

## 修复方案
把 12 张预设头像改用 **Lovable Assets CDN**，得到永久稳定的 URL，再写入数据库。

具体步骤：

1. 用 `lovable-assets create` 把 `src/assets/avatars/avatar-01.png … avatar-12.png` 逐个上传，生成 `*.asset.json` 指针文件。
2. 删除原始 PNG 二进制（CDN 已托管）。
3. 改写 `src/components/AvatarPicker.tsx`：
   - 不再 `import a1 from "...png"`，改为 `import a1 from "@/assets/avatars/avatar-01.png.asset.json"`，使用 `a1.url`（形如 `/__l5e/assets-v1/<uuid>/avatar-01.png`，永久稳定）。
   - `PRESET_AVATARS` 数组内容变成 CDN URL 字符串，其它逻辑（实时预览、无头像选项、网格、选中态）保持不变。
4. 服务端校验 `src/lib/api/profile.functions.ts` 已放宽为 `^(https?:\/\/|\/)`，CDN 路径以 `/` 开头，无需再改。
5. 已写入数据库的旧 hash 路径会自动失效，但用户重新选一次预设就会写入新的 CDN URL；无需迁移脚本。

## 不在范围
- 不改 me / leaderboard / contribution / messages / follows 等消费端代码（它们只是 `<img src={avatar_url}>`，URL 换成 CDN 后自然能用）。
- 不新增上传自定义头像功能。
- 不调整头像图片本身，也不改数据库表结构。