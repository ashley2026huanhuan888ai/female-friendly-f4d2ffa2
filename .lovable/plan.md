## 目标
移除全站温度计（竖管渐变条）的视觉化 UI，只保留温度数字与档位标签。

## 修改
**`src/components/Thermometer.tsx`**：删掉竖管渐变条与刻度线的 div，仅保留右侧文字块（温度数字 `xx°C` + 档位标签）。
- 不再渲染 `w/h` 矩形条；`size` 仍控制数字字号（`sm/md/lg` → `text-base/text-2xl/text-4xl`）。
- `unmeasured` 状态：直接显示 `—` 与 "未测量" 文案，无虚线圆框。
- `showLabel={false}` 时只显示数字（不显示档位文字），保持与现有调用点（首页、me、discussions、submit）一致。
- 数字颜色根据档位（`band`）从设计 token 中映射（cool/neutral/warm/hot/critical），让温度仍有冷暖语义。

## 不改动
- 不动 `Thermometer` 的 props 接口与各调用点（向后兼容）。
- 不动 `TemperatureBreakdown` / `TemperatureTimeline` / `HeatSources` 等数据组件。