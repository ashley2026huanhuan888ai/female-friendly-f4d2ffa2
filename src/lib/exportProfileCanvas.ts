// 个人观察台导出图：640px 宽，自适应高度，PNG 输出。
// 风格沿用 exportCanvas.ts：米色底、芭比粉 accent、Noto Serif SC 标题。

export type ProfileExportInput = {
  nickname: string;
  avatarUrl: string | null;
  inviteCode: string;
  points: number;
  level: number;
  levelTitle: string;
  boycottCount: number;
  tags: Array<{ tag: string; count: number }>;
  qrDataUrl: string;
  inviteUrl: string;
  i18n: {
    eyebrow: string;        // MY OBSERVATORY
    title: string;          // 个人观察台
    pointsLabel: string;    // 贡献温度
    boycottLabel: string;   // 抵制次数
    levelLabel: string;     // 等级
    tagsTitle: string;      // 我观察的标签
    brandZh: string;        // 女性友好体验测评
    brandEn: string;        // FEMALE EXPERIENCE ASSESSMENT
    scanHint: string;       // 扫码加入 · 用我的邀请码
    tagLabel: (t: string) => string;
  };
};

const ACCENT = "#e0218a";
const INK = "#1a1a1a";
const MUTED = "#6b6b6b";
const BORDER = "#d9d2c4";
const PAPER = "#faf6ec";
const W = 640;
const PAD = 36;
const CONTENT_W = W - PAD * 2;

const FONT_SERIF = `"Noto Serif SC","PingFang SC","Microsoft YaHei",serif`;
const FONT_SANS = `"Noto Sans SC","PingFang SC","Microsoft YaHei",system-ui,sans-serif`;

async function ensureFonts(sample: string) {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  try {
    await Promise.all([
      document.fonts.load(`700 56px "Noto Serif SC"`, sample),
      document.fonts.load(`700 32px "Noto Serif SC"`, sample),
      document.fonts.load(`600 28px "Noto Sans SC"`, sample),
      document.fonts.load(`400 22px "Noto Sans SC"`, sample),
      document.fonts.ready,
    ]);
  } catch { /* fallback */ }
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function measureTag(ctx: CanvasRenderingContext2D, label: string, count: number, big: boolean) {
  const size = big ? 30 : 22;
  ctx.font = `${big ? 700 : 500} ${size}px ${FONT_SANS}`;
  const labelW = ctx.measureText(label).width;
  ctx.font = `400 ${size - 8}px ${FONT_SANS}`;
  const cntW = ctx.measureText("·" + count).width;
  return { w: labelW + 6 + cntW, size, labelW };
}

function drawTagItem(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  label: string, count: number,
  big: boolean
) {
  const size = big ? 30 : 22;
  ctx.fillStyle = INK;
  ctx.font = `${big ? 700 : 500} ${size}px ${FONT_SANS}`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(label, x, y);
  const labelW = ctx.measureText(label).width;
  ctx.fillStyle = MUTED;
  ctx.font = `400 ${size - 8}px ${FONT_SANS}`;
  ctx.fillText("·" + count, x + labelW + 6, y);
}

export async function renderProfileExportToPng(input: ProfileExportInput): Promise<string> {
  const sample = [
    input.nickname, input.i18n.eyebrow, input.i18n.title, input.i18n.tagsTitle,
    input.i18n.brandZh, input.i18n.brandEn, input.i18n.scanHint, input.inviteCode,
    ...input.tags.map(t => input.i18n.tagLabel(t.tag)),
  ].join(" ");
  await ensureFonts(sample);

  const dpr = Math.min(2, Math.max(1.5, window.devicePixelRatio || 1.5));
  const qrImg = input.qrDataUrl ? await loadImage(input.qrDataUrl) : null;
  const avatarImg = input.avatarUrl ? await loadImage(input.avatarUrl) : null;

  const measure = document.createElement("canvas").getContext("2d")!;

  // ---- 排版测算 ----
  let y = 48;
  // eyebrow
  y += 22;
  // title (h1) 56px
  y += 64;
  // nickname row + avatar
  y += 28;
  y += 40; // gap before stats card
  // stats card: padding 24, 3 行
  const statsH = 24 + 22 + 12 + 44 + 6 + 22 + 24;
  y += statsH;
  y += 36;
  // tags section title
  y += 28;
  y += 16;

  // 标签布局
  const TAG_GAP_X = 18;
  const TAG_GAP_Y = 16;
  const TAG_BIG_GAP_Y = 22;
  const bigTagCount = Math.min(4, input.tags.length);
  type Cell = { label: string; count: number; big: boolean; w: number; size: number };
  const cells: Cell[] = input.tags.map((t, i) => {
    const label = input.i18n.tagLabel(t.tag);
    const big = i < bigTagCount;
    const m = measureTag(measure, label, t.count, big);
    return { label, count: t.count, big, w: m.w, size: m.size };
  });
  // 折行
  const lines: Cell[][] = [];
  let line: Cell[] = [];
  let lineW = 0;
  let lastBig = true;
  for (const c of cells) {
    const advance = c.w + (line.length ? TAG_GAP_X : 0);
    const breakBigSmall = line.length && lastBig !== c.big;
    if (breakBigSmall || (line.length && lineW + advance > CONTENT_W)) {
      lines.push(line);
      line = [c];
      lineW = c.w;
    } else {
      line.push(c);
      lineW += advance;
    }
    lastBig = c.big;
  }
  if (line.length) lines.push(line);
  const linesH = lines.reduce((sum, ln) => {
    const h = ln[0]?.big ? 40 + TAG_BIG_GAP_Y : 30 + TAG_GAP_Y;
    return sum + h;
  }, 0);
  y += linesH + 6;

  // footer
  y += 32;
  const footerH = 132; // qr 96 + label
  y += footerH;
  y += 40; // bottom pad

  const H = Math.max(y, 720);

  // ---- 绘制 ----
  const cvs = document.createElement("canvas");
  cvs.width = W * dpr;
  cvs.height = H * dpr;
  const ctx = cvs.getContext("2d")!;
  ctx.scale(dpr, dpr);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);

  let cy = 48;

  // eyebrow
  ctx.fillStyle = MUTED;
  ctx.font = `500 14px ${FONT_SANS}`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(input.i18n.eyebrow, PAD, cy + 14);
  cy += 22;

  // title
  ctx.fillStyle = INK;
  ctx.font = `700 56px ${FONT_SERIF}`;
  ctx.fillText(input.i18n.title, PAD, cy + 56);
  cy += 64;

  // nickname + avatar
  cy += 28;
  // avatar right circle 88
  const avSize = 88;
  const avX = W - PAD - avSize;
  const avY = cy - 80;
  ctx.save();
  ctx.beginPath();
  ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = "#fff5fa";
  ctx.fillRect(avX, avY, avSize, avSize);
  if (avatarImg) {
    ctx.drawImage(avatarImg, avX, avY, avSize, avSize);
  } else {
    ctx.fillStyle = ACCENT;
    ctx.font = `700 36px ${FONT_SERIF}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText((input.nickname || "?").trim().charAt(0).toUpperCase(), avX + avSize / 2, avY + avSize / 2 + 2);
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }
  ctx.restore();
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2, 0, Math.PI * 2);
  ctx.stroke();

  // nickname text (left of avatar)
  ctx.fillStyle = INK;
  ctx.font = `600 22px ${FONT_SANS}`;
  ctx.fillText(`@${input.nickname || "匿名读者"}`, PAD, cy);
  cy += 40;

  // ---- 数据卡 ----
  const cardY = cy;
  const cardH = statsH;
  // soft accent panel
  ctx.fillStyle = "#fff5fa";
  ctx.fillRect(PAD, cardY, CONTENT_W, cardH);
  ctx.strokeStyle = "#f2c8df";
  ctx.lineWidth = 1;
  ctx.strokeRect(PAD, cardY, CONTENT_W, cardH);

  // 三栏
  const colW = CONTENT_W / 3;
  const drawStat = (i: number, label: string, value: string, sub?: string) => {
    const cx = PAD + colW * i + colW / 2;
    ctx.textAlign = "center";
    ctx.fillStyle = MUTED;
    ctx.font = `500 13px ${FONT_SANS}`;
    ctx.fillText(label, cx, cardY + 24 + 14);
    ctx.fillStyle = ACCENT;
    ctx.font = `700 36px ${FONT_SERIF}`;
    ctx.fillText(value, cx, cardY + 24 + 14 + 12 + 36);
    if (sub) {
      ctx.fillStyle = INK;
      ctx.font = `500 14px ${FONT_SANS}`;
      ctx.fillText(sub, cx, cardY + 24 + 14 + 12 + 36 + 22);
    }
    ctx.textAlign = "start";
  };
  drawStat(0, input.i18n.pointsLabel, String(Math.round(input.points)) + "°");
  drawStat(1, input.i18n.boycottLabel, String(input.boycottCount));
  drawStat(2, input.i18n.levelLabel, "L" + input.level, input.levelTitle);
  // 分隔竖线
  ctx.strokeStyle = "#f2c8df";
  ctx.beginPath();
  ctx.moveTo(PAD + colW, cardY + 20);
  ctx.lineTo(PAD + colW, cardY + cardH - 20);
  ctx.moveTo(PAD + colW * 2, cardY + 20);
  ctx.lineTo(PAD + colW * 2, cardY + cardH - 20);
  ctx.stroke();

  cy += cardH + 36;

  // ---- 标签标题 ----
  ctx.fillStyle = MUTED;
  ctx.font = `500 14px ${FONT_SANS}`;
  ctx.fillText(input.i18n.tagsTitle, PAD, cy + 14);
  cy += 28 + 16;

  // 标签绘制
  for (const ln of lines) {
    let x = PAD;
    const big = ln[0]?.big ?? false;
    const baselineDrop = big ? 32 : 24;
    const rowH = big ? 40 + TAG_BIG_GAP_Y : 30 + TAG_GAP_Y;
    for (let i = 0; i < ln.length; i++) {
      const c = ln[i];
      drawTagItem(ctx, x, cy + baselineDrop, c.label, c.count, big);
      x += c.w + TAG_GAP_X;
    }
    cy += rowH;
  }

  cy += 32;

  // ---- 底部 footer：左侧 brand，右侧 QR ----
  const qrSize = 96;
  const qrX = W - PAD - qrSize;
  const qrY = cy;

  // brand 左侧
  ctx.fillStyle = INK;
  ctx.font = `700 22px ${FONT_SERIF}`;
  ctx.fillText(input.i18n.brandZh, PAD, qrY + 22);
  ctx.fillStyle = MUTED;
  ctx.font = `500 11px ${FONT_SANS}`;
  ctx.fillText(input.i18n.brandEn, PAD, qrY + 22 + 18);
  ctx.fillStyle = ACCENT;
  ctx.font = `600 13px ${FONT_SANS}`;
  ctx.fillText(`${input.i18n.scanHint} ${input.inviteCode}`, PAD, qrY + qrSize - 6);

  // QR
  if (qrImg) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(qrX - 6, qrY - 6, qrSize + 12, qrSize + 12);
    ctx.strokeStyle = BORDER;
    ctx.strokeRect(qrX - 6, qrY - 6, qrSize + 12, qrSize + 12);
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
  }

  return cvs.toDataURL("image/png");
}
