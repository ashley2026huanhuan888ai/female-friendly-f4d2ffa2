## 补全

首页等位置温度由 `Thermometer` 组件渲染（未走 `TempText`），所以之前的修改未在这些地方生效。

## 修改

仅改 `src/components/Thermometer.tsx`：在 `v > 40` 时，在 `°C` 后追加同色「温度告警！」小字（`text-xs`，`ml-1`，`font-semibold`，颜色用 `band.color`），不影响 `unmeasured` 与 ≤40°C 情况。

温度告警，竖行显示。

&nbsp;

同样的修改，适应到所有会出现温度的地方， 旁边都增加“温度告警”，并且是竖行显示。

布局上 Thermometer 当前是 `flex flex-col`，告警字与温度同一行紧贴 °C 右侧，不换行，竖行显示。