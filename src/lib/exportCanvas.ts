// 兼容性兜底：当 html-to-image 在某些浏览器/移动端把 DOM 转为 SVG/foreignObject 时
// 发生图片解码失败（错误对象形如 {isTrusted:true}），改用原生 Canvas 直接绘制。
// 不依赖 SVG / foreignObject / 外部字体，最大兼容。

export type ExportObservation = {
  id: string;
  content: string;
  cleaned_content?: string | null;
  summary?: string | null;
  tags?: string[] | null;
  screenshot_url?: string | null;
  created_at: string;
  evidence_level?: number | null;
  scene?: string | null;
};

export type ExportInput = {
  object: { id: string; name: string; type: string; temperature: number };
  observations: ExportObservation[];
  configs: Record<string, { includeScreenshot: boolean; includeContent: boolean; tags: Set<string> }>;
  shotBlobs: Record<string, string>;
  qrDataUrl: string;
  bandHex: string;
  archiveNo: string;
  exporterName: string;
  /** 已本地化字符串 */
  i18n: {
    cardTitle: string;
    cardSubtitle: string;
    scanToView: string;
    exportedBy: string;
    objectType: string;
    dateText: string;
    nowText: string;
    tagLabel: (t: string) => string;
  };
};

const ACCENT = "#e0218a";
const INK = "#1a1a1a";
const MUTED = "#6b6b6b";
const PAPER = "#f5f1ea";
const W = 1080;
const PAD = 64;

const FONT_SERIF = `"Songti SC", "Noto Serif SC", Georgia, serif`;
const FONT_SANS = `-apple-system, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif`;
const FONT_MONO = `ui-monospace, Menlo, monospace`;

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  lineHeight: number
): { lines: string[]; height: number } {
  const lines: string[] = [];
  const paragraphs = text.split(/\r?\n/);
  for (const para of paragraphs) {
    if (!para) {
      lines.push("");
      continue;
    }
    let cur = "";
    for (const ch of para) {
      const test = cur + ch;
      if (ctx.measureText(test).width > maxWidth && cur) {
        lines.push(cur);
        cur = ch;
      } else {
        cur = test;
      }
    }
    if (cur) lines.push(cur);
  }
  return { lines, height: lines.length * lineHeight };
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  color: string,
  font: string
): number {
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textBaseline = "top";
  const { lines } = wrapText(ctx, text, maxWidth, lineHeight);
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, y + i * lineHeight);
  }
  return lines.length * lineHeight;
}

export async function renderExportToPng(input: ExportInput): Promise<string> {
  const dpr = Math.min(2, Math.max(1.5, window.devicePixelRatio || 1.5));

  // 预加载图片
  const qrImg = input.qrDataUrl ? await loadImage(input.qrDataUrl) : null;
  const shotImgs: Record<string, HTMLImageElement | null> = {};
  for (const o of input.observations) {
    const cfg = input.configs[o.id];
    if (!cfg?.includeScreenshot) continue;
    const src = input.shotBlobs[o.id];
    if (!src) continue;
    shotImgs[o.id] = await loadImage(src);
  }

  // 第一次测量：用临时 canvas 算总高度
  const measure = document.createElement("canvas").getContext("2d")!;
  let y = 56; // top padding

  // Header
  const headerH = 24 + 38 * 1.1 + 8 + 15 + 24; // pill + title + sub + bottom border padding
  y += headerH + 24;

  // Object name + tags + temp
  const name = input.object.name;
  const nameFontSize = name.length > 18 ? 56 : name.length > 10 ? 68 : 84;
  measure.font = `700 ${nameFontSize}px ${FONT_SERIF}`;
  const nameWrap = wrapText(measure, name, W - PAD * 2, nameFontSize * 1.1);

  // union tags
  const allTags = Array.from(
    new Set(input.observations.flatMap((o) => Array.from(input.configs[o.id]?.tags || [])))
  );
  measure.font = `600 22px ${FONT_SANS}`;
  let tagsRowsH = 0;
  if (allTags.length > 0) {
    let tx = 0;
    let rows = 1;
    for (const tg of allTags) {
      const w = measure.measureText(`#${input.i18n.tagLabel(tg)}`).width + 18;
      if (tx + w > W - PAD * 2) { rows++; tx = w; } else { tx += w; }
    }
    tagsRowsH = rows * 28 + 20;
  }
  // 40 top pad + name + 24 + tags + bar(50) + 36 bottom pad
  y += 40 + nameWrap.height + 24 + tagsRowsH + 50 + 36;

  // Observations
  const contentLeft = PAD;
  const contentW = W - contentLeft - PAD;

  const obsBlocks: Array<{ height: number }> = [];
  for (const o of input.observations) {
    const cfg = input.configs[o.id];
    if (!cfg) {
      obsBlocks.push({ height: 0 });
      continue;
    }
    const showShot = cfg.includeScreenshot && !!shotImgs[o.id];
    if (!cfg.includeContent && !showShot) {
      obsBlocks.push({ height: 0 });
      continue;
    }
    let h = 36; // padding top
    if (o.scene) h += 22;
    if (cfg.includeContent) {
      if (o.summary) {
        measure.font = `700 30px ${FONT_SERIF}`;
        h += wrapText(measure, o.summary, contentW, 30 * 1.4).height + 16;
      }
      measure.font = `400 26px ${FONT_SERIF}`;
      h += wrapText(measure, o.cleaned_content || o.content, contentW, 26 * 1.7).height;
    }
    if (showShot) {
      const im = shotImgs[o.id]!;
      const ratio = im.height / im.width;
      const drawW = contentW;
      let drawH = drawW * ratio;
      if (drawH > 640) drawH = 640;
      h += 22 + drawH;
    }
    h += 16 + 18; // date + bottom padding
    h += 36; // padding bottom
    obsBlocks.push({ height: h });
    y += h;
  }


  y += 28 + 18 + 24 + 48; // footer + bottom padding
  const totalH = y;

  // 真正的 canvas
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(totalH * dpr);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, totalH);

  // === Header ===
  let cy = 56;
  // pill
  ctx.font = `700 16px ${FONT_SANS}`;
  const typeText = input.i18n.objectType;
  const typeW = ctx.measureText(typeText).width + 24;
  ctx.fillStyle = ACCENT;
  ctx.fillRect(PAD, cy, typeW, 26);
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  ctx.fillText(typeText, PAD + 12, cy + 14);
  // archive no
  ctx.fillStyle = MUTED;
  ctx.font = `400 15px ${FONT_MONO}`;
  ctx.fillText(input.archiveNo, PAD + typeW + 12, cy + 14);
  cy += 26 + 14;

  // QR (right side)
  if (qrImg) {
    const qrSize = 132;
    ctx.fillStyle = "#fff";
    ctx.fillRect(W - PAD - qrSize, 56, qrSize, qrSize);
    ctx.drawImage(qrImg, W - PAD - qrSize + 6, 56 + 6, qrSize - 12, qrSize - 12);
    ctx.fillStyle = MUTED;
    ctx.font = `400 12px ${FONT_SANS}`;
    ctx.textBaseline = "top";
    ctx.textAlign = "right";
    ctx.fillText(input.i18n.scanToView, W - PAD, 56 + qrSize + 8);
    ctx.textAlign = "left";
  }

  // Title
  ctx.fillStyle = INK;
  ctx.font = `700 38px ${FONT_SERIF}`;
  ctx.textBaseline = "top";
  ctx.fillText(input.i18n.cardTitle, PAD, cy);
  cy += 44;
  ctx.fillStyle = MUTED;
  ctx.font = `300 15px ${FONT_SANS}`;
  ctx.fillText(input.i18n.cardSubtitle, PAD, cy);
  cy += 20 + 24;

  // separator
  ctx.fillStyle = "rgba(26,26,26,0.12)";
  ctx.fillRect(PAD, cy, W - PAD * 2, 1);
  cy += 1 + 40;

  // Object name
  ctx.fillStyle = INK;
  ctx.font = `700 ${nameFontSize}px ${FONT_SERIF}`;
  for (let i = 0; i < nameWrap.lines.length; i++) {
    ctx.fillText(nameWrap.lines[i], PAD, cy + i * nameFontSize * 1.1);
  }
  cy += nameWrap.height + 24;

  // Tags row (band color)
  if (allTags.length > 0) {
    ctx.fillStyle = input.bandHex;
    ctx.font = `600 22px ${FONT_SANS}`;
    let tx = PAD;
    let ty = cy;
    for (const tg of allTags) {
      const txt = `#${input.i18n.tagLabel(tg)}`;
      const tw = ctx.measureText(txt).width;
      if (tx + tw > W - PAD) { tx = PAD; ty += 28; }
      ctx.fillText(txt, tx, ty);
      tx += tw + 18;
    }
    cy = ty + 28 + 20;
  }

  // Temperature bar
  const barW = W - PAD * 2 - 260;
  const barH = 10;
  ctx.fillStyle = "rgba(26,26,26,0.08)";
  // rounded bg
  const r = barH / 2;
  ctx.beginPath();
  ctx.moveTo(PAD + r, cy + 35);
  ctx.arcTo(PAD + barW, cy + 35, PAD + barW, cy + 35 + barH, r);
  ctx.arcTo(PAD + barW, cy + 35 + barH, PAD, cy + 35 + barH, r);
  ctx.arcTo(PAD, cy + 35 + barH, PAD, cy + 35, r);
  ctx.arcTo(PAD, cy + 35, PAD + barW, cy + 35, r);
  ctx.closePath();
  ctx.fill();
  // fill
  const fillW = Math.max(barH, (Math.max(0, Math.min(100, input.object.temperature)) / 100) * barW);
  ctx.fillStyle = input.bandHex;
  ctx.beginPath();
  ctx.moveTo(PAD + r, cy + 35);
  ctx.arcTo(PAD + fillW, cy + 35, PAD + fillW, cy + 35 + barH, r);
  ctx.arcTo(PAD + fillW, cy + 35 + barH, PAD, cy + 35 + barH, r);
  ctx.arcTo(PAD, cy + 35 + barH, PAD, cy + 35, r);
  ctx.arcTo(PAD, cy + 35, PAD + fillW, cy + 35, r);
  ctx.closePath();
  ctx.fill();
  // Temp number
  ctx.fillStyle = input.bandHex;
  ctx.font = `700 84px ${FONT_SERIF}`;
  ctx.textBaseline = "alphabetic";
  const tempStr = String(Math.round(input.object.temperature));
  ctx.fillText(tempStr, PAD + barW + 24, cy + 78);
  const tempW = ctx.measureText(tempStr).width;
  ctx.fillStyle = INK;
  ctx.font = `700 28px ${FONT_SERIF}`;
  ctx.fillText("°C", PAD + barW + 24 + tempW + 4, cy + 78);
  ctx.textBaseline = "top";
  cy += 86 + 24;

  // separator
  ctx.fillStyle = "rgba(26,26,26,0.08)";
  ctx.fillRect(PAD, cy, W - PAD * 2, 1);
  cy += 1;

  // === Observations ===
  for (let idx = 0; idx < input.observations.length; idx++) {
    const o = input.observations[idx];
    const cfg = input.configs[o.id];
    if (!cfg) continue;
    const showShot = cfg.includeScreenshot && !!shotImgs[o.id];
    if (!cfg.includeContent && !showShot) continue;

    const blockTop = cy + 36;

    let by = blockTop;
    const cl = contentLeft;
    const cw = contentW;

    // scene only (tags moved to header)
    if (o.scene) {
      ctx.fillStyle = MUTED;
      ctx.font = `400 13px ${FONT_SANS}`;
      ctx.fillText(o.scene.toUpperCase(), cl, by);
      by += 22;
    }

    if (cfg.includeContent) {
      if (o.summary) {
        by += drawText(ctx, o.summary, cl, by, cw, 30 * 1.4, INK, `700 30px ${FONT_SERIF}`);
        by += 16;
      }
      by += drawText(ctx, o.cleaned_content || o.content, cl, by, cw, 26 * 1.7, "#2a2a2a", `400 26px ${FONT_SERIF}`);
    }


    if (showShot) {
      const im = shotImgs[o.id]!;
      const ratio = im.height / im.width;
      let dw = cw;
      let dh = dw * ratio;
      if (dh > 640) {
        dh = 640;
        dw = dh / ratio;
      }
      by += 22;
      ctx.fillStyle = "#fff";
      ctx.fillRect(cl, by, dw, dh);
      ctx.drawImage(im, cl, by, dw, dh);
      ctx.strokeStyle = "rgba(26,26,26,0.08)";
      ctx.lineWidth = 1;
      ctx.strokeRect(cl, by, dw, dh);
      by += dh;
    }

    by += 16;
    ctx.fillStyle = MUTED;
    ctx.font = `400 13px ${FONT_SANS}`;
    ctx.fillText(input.i18n.dateText.replace("{date}", formatShort(o.created_at)) || formatShort(o.created_at), cl, by);
    by += 18 + 36;

    // bottom separator
    ctx.fillStyle = "rgba(26,26,26,0.06)";
    ctx.fillRect(PAD, by, W - PAD * 2, 1);
    cy = by + 1;
  }

  // Footer
  cy += 28;
  ctx.fillStyle = MUTED;
  ctx.font = `400 14px ${FONT_SANS}`;
  ctx.fillText(`${input.i18n.nowText}  |  ${input.i18n.exportedBy}: ${input.exporterName}`, PAD, cy);
  ctx.fillStyle = INK;
  ctx.font = `700 14px ${FONT_SANS}`;
  ctx.textAlign = "right";
  let nm = input.object.name;
  while (ctx.measureText(nm).width > 360 && nm.length > 4) nm = nm.slice(0, -1);
  if (nm !== input.object.name) nm += "…";
  ctx.fillText(nm.toUpperCase(), W - PAD, cy);
  ctx.textAlign = "left";

  return canvas.toDataURL("image/png");
}

function formatShort(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return iso;
  }
}
