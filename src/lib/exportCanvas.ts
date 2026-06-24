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
const CONTENT_W = W - PAD * 2;

const FONT_SERIF = `"Songti SC", "Noto Serif SC", Georgia, serif`;
const FONT_SANS = `-apple-system, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif`;
const FONT_MONO = `ui-monospace, Menlo, monospace`;

// 统一排版常量（测量 / 绘制必须用同一份，避免高度算错）
const TYPO = {
  summarySize: 46,
  summaryLH: 1.35,
  bodySize: 38,
  bodyLH: 1.6,
  tagSize: 34,
  tagSizeDense: 30,
  tagLH: 44,
  tagGapX: 22,
  tempSize: 96,
  tempSize3Digit: 80,
  tempUnitSize: 34,
  nameLH: 1.1,
  sceneLH: 28,
  dateLH: 26,
  paraGap: 20,
  blockPad: 40,
} as const;

function nameFontSizeFor(name: string): number {
  if (name.length > 22) return 44;
  if (name.length > 18) return 52;
  if (name.length > 10) return 60;
  return 72;
}


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
      // 强制断字：即使 cur 为空，单字符若超出也要直接落行，避免极端字号下死循环
      if (ctx.measureText(test).width > maxWidth) {
        if (cur) {
          lines.push(cur);
          cur = ch;
        } else {
          lines.push(ch);
          cur = "";
        }
      } else {
        cur = test;
      }
    }
    if (cur) lines.push(cur);
  }
  return { lines, height: lines.length * lineHeight };
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  const ell = "…";
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (ctx.measureText(text.slice(0, mid) + ell).width <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return text.slice(0, lo) + ell;
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

/** 计算温度区域宽度（数字 + 单位），以便温度条避让 */
function measureTempBlock(
  ctx: CanvasRenderingContext2D,
  temperature: number
): { tempStr: string; numSize: number; unitSize: number; totalW: number } {
  const tempStr = String(Math.round(temperature));
  const numSize = tempStr.length >= 3 ? TYPO.tempSize3Digit : TYPO.tempSize;
  const unitSize = TYPO.tempUnitSize;
  ctx.font = `700 ${numSize}px ${FONT_SERIF}`;
  const numW = ctx.measureText(tempStr).width;
  ctx.font = `700 ${unitSize}px ${FONT_SERIF}`;
  const unitW = ctx.measureText("°C").width;
  return { tempStr, numSize, unitSize, totalW: numW + 4 + unitW };
}

/** 计算标签布局 + 自适应字号 */
function layoutTags(
  ctx: CanvasRenderingContext2D,
  tags: string[],
  i18n: ExportInput["i18n"]
): { lines: Array<Array<{ text: string; w: number }>>; size: number; lh: number } {
  if (tags.length === 0) return { lines: [], size: TYPO.tagSize, lh: TYPO.tagLH };
  const labels = tags.map((tg) => `#${i18n.tagLabel(tg)}`);
  const maxLen = labels.reduce((m, s) => Math.max(m, s.length), 0);
  const size = tags.length >= 6 || maxLen >= 10 ? TYPO.tagSizeDense : TYPO.tagSize;
  ctx.font = `600 ${size}px ${FONT_SANS}`;
  const lines: Array<Array<{ text: string; w: number }>> = [[]];
  let lineW = 0;
  for (let label of labels) {
    // 单标签若超过整行，截断
    if (ctx.measureText(label).width > CONTENT_W) {
      label = ellipsize(ctx, label, CONTENT_W);
    }
    const w = ctx.measureText(label).width;
    const advance = w + TYPO.tagGapX;
    if (lineW > 0 && lineW + w > CONTENT_W) {
      lines.push([{ text: label, w }]);
      lineW = advance;
    } else {
      lines[lines.length - 1].push({ text: label, w });
      lineW += advance;
    }
  }
  // 最多 3 行
  if (lines.length > 3) {
    const overflow = lines.slice(3).reduce((a, l) => a + l.length, 0);
    const trimmed = lines.slice(0, 3);
    const extra = `+${overflow}`;
    ctx.font = `600 ${size}px ${FONT_SANS}`;
    trimmed[2].push({ text: extra, w: ctx.measureText(extra).width });
    return { lines: trimmed, size, lh: TYPO.tagLH };
  }
  return { lines, size, lh: TYPO.tagLH };
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
  const nameFontSize = nameFontSizeFor(name);
  measure.font = `700 ${nameFontSize}px ${FONT_SERIF}`;
  const nameWrap = wrapText(measure, name, CONTENT_W, nameFontSize * TYPO.nameLH);

  // union tags
  const allTags = Array.from(
    new Set(input.observations.flatMap((o) => Array.from(input.configs[o.id]?.tags || [])))
  );
  const tagLayout = layoutTags(measure, allTags, input.i18n);
  const tagsH = tagLayout.lines.length > 0 ? tagLayout.lines.length * tagLayout.lh + 16 : 0;

  // 温度块度量（决定温度条宽度，影响下方排版高度但不影响高度计算）
  const tempBlock = measureTempBlock(measure, input.object.temperature);

  // 40 top pad + name + 24 + tags + bar(50) + 36 bottom pad
  y += 40 + nameWrap.height + 24 + tagsH + 50 + 36;

  // Observations
  const contentLeft = PAD;
  const contentW = CONTENT_W;

  for (const o of input.observations) {
    const cfg = input.configs[o.id];
    if (!cfg) continue;
    const showShot = cfg.includeScreenshot && !!shotImgs[o.id];
    if (!cfg.includeContent && !showShot) continue;

    let h = 36; // padding top
    if (o.scene) h += TYPO.sceneLH;
    if (cfg.includeContent) {
      if (o.summary) {
        measure.font = `700 ${TYPO.summarySize}px ${FONT_SERIF}`;
        h += wrapText(measure, o.summary, contentW, TYPO.summarySize * TYPO.summaryLH).height + 16;
      }
      measure.font = `400 ${TYPO.bodySize}px ${FONT_SERIF}`;
      h += wrapText(measure, o.cleaned_content || o.content, contentW, TYPO.bodySize * TYPO.bodyLH).height;
    }
    if (showShot) {
      const im = shotImgs[o.id]!;
      const ratio = im.height / im.width;
      const drawW = contentW;
      let drawH = drawW * ratio;
      if (drawH > 640) drawH = 640;
      h += 22 + drawH;
    }
    h += 16 + TYPO.dateLH;
    h += 36; // padding bottom
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
    ctx.fillText(nameWrap.lines[i], PAD, cy + i * nameFontSize * TYPO.nameLH);
  }
  cy += nameWrap.height + 24;

  // Tags row (band color, 自适应布局)
  if (tagLayout.lines.length > 0) {
    ctx.fillStyle = input.bandHex;
    ctx.font = `600 ${tagLayout.size}px ${FONT_SANS}`;
    for (let li = 0; li < tagLayout.lines.length; li++) {
      let tx = PAD;
      const ty = cy + li * tagLayout.lh;
      for (const item of tagLayout.lines[li]) {
        ctx.fillText(item.text, tx, ty);
        tx += item.w + TYPO.tagGapX;
      }
    }
    cy += tagLayout.lines.length * tagLayout.lh + 16;
  }

  // Temperature bar — 动态避让温度块
  const tempBlockW = tempBlock.totalW;
  const barW = Math.max(320, W - PAD * 2 - tempBlockW - 32);
  const barH = 10;
  ctx.fillStyle = "rgba(26,26,26,0.08)";
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
  // Temp number + unit（共享 alphabetic baseline，避免单位被裁）
  const tempBaseline = cy + 35 + barH / 2 + tempBlock.numSize * 0.36;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = input.bandHex;
  ctx.font = `700 ${tempBlock.numSize}px ${FONT_SERIF}`;
  const tempX = PAD + barW + 24;
  ctx.fillText(tempBlock.tempStr, tempX, tempBaseline);
  const tempNumW = ctx.measureText(tempBlock.tempStr).width;
  ctx.fillStyle = INK;
  ctx.font = `700 ${tempBlock.unitSize}px ${FONT_SERIF}`;
  ctx.fillText("°C", tempX + tempNumW + 4, tempBaseline);
  ctx.textBaseline = "top";
  cy += Math.max(86, tempBlock.numSize + 8) + 24;

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

    // scene
    if (o.scene) {
      ctx.fillStyle = MUTED;
      ctx.font = `400 13px ${FONT_SANS}`;
      ctx.fillText(ellipsize(ctx, o.scene.toUpperCase(), cw), cl, by);
      by += TYPO.sceneLH;
    }

    if (cfg.includeContent) {
      if (o.summary) {
        by += drawText(
          ctx,
          o.summary,
          cl,
          by,
          cw,
          TYPO.summarySize * TYPO.summaryLH,
          INK,
          `700 ${TYPO.summarySize}px ${FONT_SERIF}`
        );
        by += 16;
      }
      by += drawText(
        ctx,
        o.cleaned_content || o.content,
        cl,
        by,
        cw,
        TYPO.bodySize * TYPO.bodyLH,
        "#2a2a2a",
        `400 ${TYPO.bodySize}px ${FONT_SERIF}`
      );
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
    ctx.fillText(
      input.i18n.dateText.replace("{date}", formatShort(o.created_at)) || formatShort(o.created_at),
      cl,
      by
    );
    by += TYPO.dateLH + 36;

    // bottom separator
    ctx.fillStyle = "rgba(26,26,26,0.06)";
    ctx.fillRect(PAD, by, W - PAD * 2, 1);
    cy = by + 1;
  }

  // Footer — 截断防溢出
  cy += 28;
  ctx.fillStyle = INK;
  ctx.font = `700 14px ${FONT_SANS}`;
  const rightNameMax = 360;
  const rightName = ellipsize(ctx, input.object.name.toUpperCase(), rightNameMax);
  const rightNameW = ctx.measureText(rightName).width;
  ctx.textAlign = "right";
  ctx.fillText(rightName, W - PAD, cy);
  ctx.textAlign = "left";

  ctx.fillStyle = MUTED;
  ctx.font = `400 14px ${FONT_SANS}`;
  const leftMax = W - PAD * 2 - rightNameW - 24;
  const leftFull = `${input.i18n.nowText}  |  ${input.i18n.exportedBy}: ${input.exporterName}`;
  ctx.fillText(ellipsize(ctx, leftFull, leftMax), PAD, cy);

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
