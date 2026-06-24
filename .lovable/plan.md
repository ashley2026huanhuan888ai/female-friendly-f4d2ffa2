## 问题
当前 `handleDownload` 用 `<a download>` 触发下载。在 iOS Safari / 微信 / 多数 Android 浏览器里，这只会打开图片或存到"文件"，无法直接进相册。相册保存需要走系统原生分享面板（iOS）或长按图片菜单。

## 方案
改造 `ExportCardDialog.tsx` 里结果区的"下载"按钮逻辑，分平台走不同路径：

1. **优先用 Web Share API（iOS / 安卓微信外）**  
   已有 `handleShare` 用 `navigator.share({ files })`，iOS 分享面板里有"存储图像"可直接进相册。把"下载"按钮在移动端改为先尝试 `navigator.share`，桌面端仍走 `a.download`。

2. **回退提示长按保存**  
   当 `navigator.share` 不可用（如微信内置浏览器），在结果区显示一张可见的大图预览（已有 zoom 预览），并加一行提示文案："长按图片即可保存到相册"。图片需是真实 `<img src=dataURL>`，长按菜单才会出"保存到相册"。

3. **桌面端保持现状**  
   桌面浏览器无相册概念，继续 `a.download` 触发文件下载。

4. **文案 & i18n**  
   新增 `export.saveToAlbumHint`（中/英）。下载按钮在移动端文案改为"保存到相册"，桌面保持"下载"。

## 涉及文件
- `src/components/ExportCardDialog.tsx`：拆分 `handleSaveToAlbum` 逻辑（检测 `navigator.share + canShare({files})` → `share`；否则 desktop 下走 `a.download`；移动端不支持 share 时仅提示长按）。
- `src/lib/i18n.tsx`：新增提示与按钮文案 key。

## 不做
- 不引入原生 App / Capacitor。
- 不改长图渲染、不改 zoom 控件。
