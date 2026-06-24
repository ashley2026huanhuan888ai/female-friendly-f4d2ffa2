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
const BORDER = "#d9d2c4";
const PAPER = "#f5f1ea";
const W = 640;
const PAD = 36;
const CONTENT_W = W - PAD * 2;

const FONT_SERIF = `"Noto Serif SC", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", serif`;
const FONT_SANS = `"Noto Sans SC", "Noto Serif SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif`;
const FONT_MONO = `ui-monospace, Menlo, monospace`;

// 统一排版常量（测量 / 绘制必须用同一份，避免高度算错）
const TYPO = {
  summarySize: 36,
  summaryLH: 1.45,
  bodySize: 30,
  bodyLH: 1.65,
  tagSize: 22,
  tagSizeDense: 20,
  tagLH: 42,
  tagGapX: 10,
  tagPadX: 12,
  tempSize: 72,
  tempSize3Digit: 60,
  tempUnitSize: 24,
  nameLH: 1.1,
  sceneLH: 26,
  dateLH: 24,
  paraGap: 18,
  blockPad: 34,
} as const;

function nameFontSizeFor(name: string): number {
  if (name.length > 22) return 38;
  if (name.length > 18) return 44;
  if (name.length > 10) return 50;
  return 58;
}

async function ensureCanvasFonts(input: ExportInput): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  const sample = [
    input.i18n.cardTitle,
    input.i18n.cardSubtitle,
    input.i18n.objectType,
    input.object.name,
    input.i18n.scanToView,
    input.i18n.exportedBy,
    input.exporterName,
    ...input.observations.flatMap((o) => [
      o.scene || "",
      o.summary || "",
      o.cleaned_content || o.content || "",
      ...(o.tags || []).map((tg) => input.i18n.tagLabel(tg)),
    ]),
  ].join(" ");
  try {
    await Promise.all([
      document.fonts.load(`700 ${TYPO.summarySize}px "Noto Serif SC"`, sample),
      document.fonts.load(`500 ${TYPO.bodySize}px "Noto Serif SC"`, sample),
      document.fonts.load(`400 ${TYPO.bodySize}px "Noto Sans SC"`, sample),
      document.fonts.load(`500 ${TYPO.tagSize}px "Noto Sans SC"`, sample),
      document.fonts.load(`700 ${TYPO.tempSize}px "Noto Serif SC"`, sample),
      document.fonts.ready,
    ]);
  } catch {
    // 字体加载失败时继续使用系统 fallback，不能阻断导出。
  }
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
  const size = tags.length >= 5 || maxLen >= 9 ? TYPO.tagSizeDense : TYPO.tagSize;
  ctx.font = `600 ${size}px ${FONT_SANS}`;
  const lines: Array<Array<{ text: string; w: number }>> = [[]];
  let lineW = 0;
  for (let label of labels) {
    // 单标签若超过整行，截断
    if (ctx.measureText(label).width > CONTENT_W) {
      label = ellipsize(ctx, label, CONTENT_W);
    }
    const w = ctx.measureText(label).width + TYPO.tagPadX * 2;
    const advance = w + TYPO.tagGapX;
    if (lineW > 0 && lineW + w > CONTENT_W) {
      lines.push([{ text: label, w }]);
      lineW = advance;
    } else {
      lines[lines.length - 1].push({ text: label, w });
      lineW += advance;
    }
  }
  // 最多 3 行；额外计数也必须塞进最后一行，不能把行撑宽
  if (lines.length > 3) {
    let overflow = lines.slice(3).reduce((a, l) => a + l.length, 0);
    const trimmed = lines.slice(0, 3);
    let extra = `+${overflow}`;
    ctx.font = `600 ${size}px ${FONT_SANS}`;
    let extraW = ctx.measureText(extra).width + TYPO.tagPadX * 2;
    const last = trimmed[2];
    const lineWidth = () => last.reduce((sum, item, index) => sum + item.w + (index > 0 ? TYPO.tagGapX : 0), 0);
    while (last.length > 0 && lineWidth() + TYPO.tagGapX + extraW > CONTENT_W) {
      last.pop();
      overflow += 1;
      extra = `+${overflow}`;
      extraW = ctx.measureText(extra).width + TYPO.tagPadX * 2;
    }
    if (extraW > CONTENT_W) {
      extra = ellipsize(ctx, extra, CONTENT_W);
      extraW = ctx.measureText(extra).width + TYPO.tagPadX * 2;
    }
    last.push({ text: extra, w: extraW });
    return { lines: trimmed, size, lh: TYPO.tagLH };
  }
  return { lines, size, lh: TYPO.tagLH };
}

export async function renderExportToPng(input: ExportInput): Promise<string> {
  await ensureCanvasFonts(input);
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
  let y = 44; // top padding

  // Header
  // title + subtitle + separator（已移除品牌徽标行）
  const headerH = 40 + 22 + 24 + 1 + 34;
  y += headerH + 20;


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

  // object top pad + name + tags + temperature row + bottom pad
  y += 34 + nameWrap.height + 20 + tagsH + Math.max(72, tempBlock.numSize + 8) + 28;

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
        h += wrapText(measure, o.summary, contentW, TYPO.summarySize * TYPO.summaryLH).height + TYPO.paraGap;
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
      h += 26 + drawH;
    }
    h += 20 + TYPO.dateLH;
    h += TYPO.blockPad;

    y += h;
  }

  y += 28 + 22 + 22 + 44; // footer + bottom padding
  const totalH = y;

  // 真正的 canvas
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(totalH * dpr);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, totalH);

  // === Header ===（已移除品牌徽标 + 档案号行）
  let cy = 44;
  ctx.textBaseline = "middle";

  // QR (right side)
  if (qrImg) {
    const qrSize = 108;
    ctx.fillStyle = "#fff";
    ctx.fillRect(W - PAD - qrSize, 44, qrSize, qrSize);
    ctx.drawImage(qrImg, W - PAD - qrSize + 5, 44 + 5, qrSize - 10, qrSize - 10);
    ctx.fillStyle = MUTED;
    ctx.font = `400 14px ${FONT_SANS}`;
    ctx.textBaseline = "top";
    ctx.textAlign = "right";
    ctx.fillText(ellipsize(ctx, input.i18n.scanToView, qrSize + 28), W - PAD, 44 + qrSize + 8);
    ctx.textAlign = "left";
  }

  // Title
  ctx.fillStyle = INK;
  ctx.font = `700 32px ${FONT_SERIF}`;
  ctx.textBaseline = "top";
  ctx.fillText(input.i18n.cardTitle, PAD, cy);
  cy += 40;
  ctx.fillStyle = MUTED;
  ctx.font = `300 16px ${FONT_SANS}`;
  ctx.fillText(input.i18n.cardSubtitle, PAD, cy);
  cy += 22 + 24;

  // separator
  ctx.fillStyle = "rgba(26,26,26,0.12)";
  ctx.fillRect(PAD, cy, W - PAD * 2, 1);
  cy += 1 + 34;


  // Object name
  ctx.fillStyle = INK;
  ctx.font = `700 ${nameFontSize}px ${FONT_SERIF}`;
  for (let i = 0; i < nameWrap.lines.length; i++) {
    ctx.fillText(nameWrap.lines[i], PAD, cy + i * nameFontSize * TYPO.nameLH);
  }
  cy += nameWrap.height + 20;

  // Tags row — 与主页 ObjectCard 一致的描边胶囊
  if (tagLayout.lines.length > 0) {
    const rectH = tagLayout.size + 18;
    ctx.font = `500 ${tagLayout.size}px ${FONT_SANS}`;
    ctx.lineWidth = 1;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    for (let li = 0; li < tagLayout.lines.length; li++) {
      let tx = PAD;
      const rowCenter = cy + li * tagLayout.lh + tagLayout.lh / 2;
      for (const item of tagLayout.lines[li]) {
        ctx.strokeStyle = BORDER;
        ctx.strokeRect(tx + 0.5, rowCenter - rectH / 2 + 0.5, item.w - 1, rectH - 1);
        ctx.fillStyle = MUTED;
        ctx.fillText(item.text, tx + TYPO.tagPadX, rowCenter);
        tx += item.w + TYPO.tagGapX;
      }
    }
    ctx.textBaseline = "alphabetic";
    cy += tagLayout.lines.length * tagLayout.lh + 14;
  }

  // Temperature bar — 动态避让温度块
  const tempBlockW = tempBlock.totalW;
  const tempGap = 18;
  const barW = Math.max(160, W - PAD * 2 - tempBlockW - tempGap);
  const barH = 8;
  ctx.fillStyle = "rgba(26,26,26,0.08)";
  const r = barH / 2;
  ctx.beginPath();
  const barY = cy + 30;
  ctx.moveTo(PAD + r, barY);
  ctx.arcTo(PAD + barW, barY, PAD + barW, barY + barH, r);
  ctx.arcTo(PAD + barW, barY + barH, PAD, barY + barH, r);
  ctx.arcTo(PAD, barY + barH, PAD, barY, r);
  ctx.arcTo(PAD, barY, PAD + barW, barY, r);
  ctx.closePath();
  ctx.fill();
  // fill
  const fillW = Math.max(barH, (Math.max(0, Math.min(100, input.object.temperature)) / 100) * barW);
  ctx.fillStyle = input.bandHex;
  ctx.beginPath();
  ctx.moveTo(PAD + r, barY);
  ctx.arcTo(PAD + fillW, barY, PAD + fillW, barY + barH, r);
  ctx.arcTo(PAD + fillW, barY + barH, PAD, barY + barH, r);
  ctx.arcTo(PAD, barY + barH, PAD, barY, r);
  ctx.arcTo(PAD, barY, PAD + fillW, barY, r);
  ctx.closePath();
  ctx.fill();
  // Temp number + unit（共享 alphabetic baseline，避免单位被裁）
  const tempBaseline = barY + barH / 2 + tempBlock.numSize * 0.36;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = input.bandHex;
  ctx.font = `700 ${tempBlock.numSize}px ${FONT_SERIF}`;
  const tempX = PAD + barW + tempGap;
  ctx.fillText(tempBlock.tempStr, tempX, tempBaseline);
  const tempNumW = ctx.measureText(tempBlock.tempStr).width;
  ctx.fillStyle = INK;
  ctx.font = `700 ${tempBlock.unitSize}px ${FONT_SERIF}`;
  ctx.fillText("°C", tempX + tempNumW + 4, tempBaseline);
  ctx.textBaseline = "top";
  cy += Math.max(72, tempBlock.numSize + 8) + 28;

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
      ctx.font = `500 18px ${FONT_SANS}`;
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
        by += TYPO.paraGap;
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
      by += 26;
      ctx.fillStyle = "#fff";
      ctx.fillRect(cl, by, dw, dh);
      ctx.drawImage(im, cl, by, dw, dh);
      ctx.strokeStyle = "rgba(26,26,26,0.08)";
      ctx.lineWidth = 1;
      ctx.strokeRect(cl, by, dw, dh);
      by += dh;
    }

    by += 20;
    ctx.fillStyle = MUTED;
    ctx.font = `400 18px ${FONT_SANS}`;
    ctx.fillText(
      input.i18n.dateText.replace("{date}", formatShort(o.created_at)) || formatShort(o.created_at),
      cl,
      by
    );
    by += TYPO.dateLH + TYPO.blockPad;

    // bottom separator
    ctx.fillStyle = "rgba(26,26,26,0.06)";
    ctx.fillRect(PAD, by, W - PAD * 2, 1);
    cy = by + 1;
  }

  // Footer — 截断防溢出
  cy += 28;
  ctx.fillStyle = INK;
  ctx.font = `700 18px ${FONT_SANS}`;
  const rightNameMax = 200;
  const rightName = ellipsize(ctx, input.object.name.toUpperCase(), rightNameMax);
  const rightNameW = ctx.measureText(rightName).width;
  ctx.textAlign = "right";
  ctx.fillText(rightName, W - PAD, cy);
  ctx.textAlign = "left";

  ctx.fillStyle = MUTED;
  ctx.font = `400 18px ${FONT_SANS}`;
  const leftMax = W - PAD * 2 - rightNameW - 20;
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
