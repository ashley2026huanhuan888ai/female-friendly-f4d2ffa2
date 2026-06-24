# 文案替换

将首页「数据刷新时」显示的占位文案改为「性别争议热议中」。

## 改动 `src/lib/i18n.tsx`

- 第 212 行 zh：`"home.noWeeklyChange": "本周无变化。"` → `"性别争议热议中。"`
- 第 925 行 en：`"home.noWeeklyChange": "No change this week."` → `"Gender debates heating up."`

不改触发逻辑、不改样式。
