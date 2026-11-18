import { jsPDF } from 'jspdf';
import type { Language, Order, StoreSettings } from '../types';
import { formatMmk } from './i18n';

// A4 dimensions in points (72 dpi) and high-resolution canvas scale (2x for sharp text)
const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;
const SCALE = 2;
const CANVAS_W = Math.round(A4_WIDTH_PT * SCALE); // 1191 px
const CANVAS_H = Math.round(A4_HEIGHT_PT * SCALE); // 1684 px
const MARGIN = 76;
const CONTENT_W = CANVAS_W - MARGIN * 2;

const COLORS = {
  white: '#FFFFFF',
  alabaster: '#FCF8F8',
  champagne: '#F7EEEE',
  border: '#EBDADA',
  bronzeBorder: '#D8BEBE',
  ink: '#241113',
  secondary: '#6A4B4E',
  muted: '#927275',
  espresso: '#6B1D24',
  titanium: '#9A4D53',
  green: '#15803D',
  greenBg: '#F0FDF4',
  greenBorder: '#BBF7D0',
};

const FONT_SANS = '"Plus Jakarta Sans", "DM Sans", "Noto Sans Myanmar", system-ui, sans-serif';
const FONT_MONO = '"JetBrains Mono", "Noto Sans Myanmar", monospace';

function createPageCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is unavailable');
  }
  ctx.fillStyle = COLORS.white;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.textBaseline = 'top';
  return { canvas, ctx };
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill?: string,
  stroke?: string
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const normalized = (text || '').replace(/\r\n/g, '\n');
  const paragraphs = normalized.split('\n');
  const lines: string[] = [];

  for (const para of paragraphs) {
    if (!para.trim()) {
      lines.push('');
      continue;
    }
    const words = para.split(' ');
    let current = '';

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth) {
        current = candidate;
      } else {
        if (current) {
          lines.push(current);
          current = '';
        }
        // Character-level fallback for unbroken strings (e.g., long URLs, keys, or Myanmar phrases)
        if (ctx.measureText(word).width > maxWidth) {
          let chunk = '';
          for (const ch of Array.from(word)) {
            const next = chunk + ch;
            if (ctx.measureText(next).width > maxWidth && chunk) {
              lines.push(chunk);
              chunk = ch;
            } else {
              chunk = next;
            }
          }
          current = chunk;
        } else {
          current = word;
        }
      }
    }
    if (current) {
      lines.push(current);
    }
  }

  return lines.length > 0 ? lines : [''];
}

function formatOrderDate(order: Order): string {
  if (order.createdAt?.toDate) {
    return order.createdAt.toDate().toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

function drawFooter(
  ctx: CanvasRenderingContext2D,
  storeSettings: StoreSettings | undefined,
  lang: Language,
  pageNumber: number
) {
  const footerY = CANVAS_H - 92;
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(MARGIN, footerY);
  ctx.lineTo(CANVAS_W - MARGIN, footerY);
  ctx.stroke();

  const storeName = storeSettings?.storeName || 'Aurelia Commerce';
  const contactParts: string[] = [];
  if (storeSettings?.supportPhone) contactParts.push(`Tel: ${storeSettings.supportPhone}`);
  if (storeSettings?.supportTelegram) contactParts.push(`Telegram: ${storeSettings.supportTelegram}`);

  ctx.fillStyle = COLORS.secondary;
  ctx.font = `500 20px ${FONT_SANS}`;
  ctx.textAlign = 'left';
  ctx.fillText(storeName, MARGIN, footerY + 18);

  if (contactParts.length > 0) {
    ctx.fillStyle = COLORS.muted;
    ctx.font = `400 18px ${FONT_MONO}`;
    ctx.fillText(contactParts.join('  ·  '), MARGIN, footerY + 46);
  }

  ctx.fillStyle = COLORS.muted;
  ctx.font = `500 18px ${FONT_MONO}`;
  ctx.textAlign = 'right';
  const pageLabel = lang === 'mm' ? `စာမျက်နှာ ${pageNumber}` : `Page ${pageNumber}`;
  ctx.fillText(pageLabel, CANVAS_W - MARGIN, footerY + 26);
  ctx.textAlign = 'left';
}

function finalizePdf(pages: HTMLCanvasElement[], filename: string) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
    compress: true,
  });

  pages.forEach((canvas, idx) => {
    if (idx > 0) {
      doc.addPage('a4', 'portrait');
    }
    const imgData = canvas.toDataURL('image/png');
    doc.addImage(imgData, 'PNG', 0, 0, A4_WIDTH_PT, A4_HEIGHT_PT, undefined, 'FAST');
  });

  doc.save(filename);
}

/**
 * Generates and downloads a single-order A4 PDF Invoice for a completed order.
 */
export async function downloadOrderInvoicePdf(
  order: Order,
  lang: Language,
  storeSettings?: StoreSettings
): Promise<void> {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    await document.fonts.ready;
  }

  const isMm = lang === 'mm';
  const storeName = storeSettings?.storeName || 'Aurelia Commerce';
  const pages: HTMLCanvasElement[] = [];
  let { canvas, ctx } = createPageCanvas();
  pages.push(canvas);

  const startNewPage = () => {
    drawFooter(ctx, storeSettings, lang, pages.length);
    const next = createPageCanvas();
    canvas = next.canvas;
    ctx = next.ctx;
    pages.push(canvas);
    return 76;
  };

  // Top Header Banner (Deep Maroon)
  drawRoundedRect(ctx, MARGIN, 64, CONTENT_W, 136, 20, COLORS.espresso);

  ctx.fillStyle = COLORS.white;
  ctx.font = `700 34px ${FONT_SANS}`;
  ctx.textAlign = 'left';
  ctx.fillText(storeName, MARGIN + 36, 94);

  ctx.fillStyle = '#F7EEEE';
  ctx.font = `500 20px ${FONT_SANS}`;
  ctx.fillText(
    isMm ? 'တရားဝင် ငွေပေးချေမှု ပြေစာနှင့် အော်ဒါမှတ်တမ်း' : 'OFFICIAL ORDER INVOICE & RECEIPT SUMMARY',
    MARGIN + 36,
    144
  );

  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.white;
  ctx.font = `700 26px ${FONT_MONO}`;
  ctx.fillText(order.orderNumber || order.id, CANVAS_W - MARGIN - 36, 98);

  ctx.fillStyle = '#BBF7D0';
  ctx.font = `600 19px ${FONT_SANS}`;
  ctx.fillText(
    isMm ? 'အတည်ပြုပြီး ပို့ဆောင်ပြီး' : 'VERIFIED & COMPLETED',
    CANVAS_W - MARGIN - 36,
    144
  );
  ctx.textAlign = 'left';

  let y = 232;

  // Two-column Metadata Cards (Customer Info | Payment & Invoice Details)
  const colGap = 24;
  const colW = (CONTENT_W - colGap) / 2;
  const metaH = 204;

  drawRoundedRect(ctx, MARGIN, y, colW, metaH, 16, COLORS.alabaster, COLORS.border);
  drawRoundedRect(ctx, MARGIN + colW + colGap, y, colW, metaH, 16, COLORS.alabaster, COLORS.border);

  // Left card: Customer & Delivery
  const lx = MARGIN + 24;
  ctx.fillStyle = COLORS.titanium;
  ctx.font = `700 18px ${FONT_SANS}`;
  ctx.fillText(isMm ? 'ဝယ်ယူသူနှင့် လက်ခံမည့် အချက်အလက်' : 'BILLED & DELIVERED TO', lx, y + 22);

  ctx.fillStyle = COLORS.ink;
  ctx.font = `700 23px ${FONT_SANS}`;
  ctx.fillText(order.customerName || 'Customer', lx, y + 54);

  ctx.fillStyle = COLORS.secondary;
  ctx.font = `400 19px ${FONT_SANS}`;
  ctx.fillText(order.customerEmail || '—', lx, y + 88);
  if (order.customerPhone) {
    ctx.fillText(`Tel: ${order.customerPhone}`, lx, y + 116);
  }
  ctx.font = `500 19px ${FONT_SANS}`;
  const deliveryLines = wrapText(
    ctx,
    `${isMm ? 'ပို့ဆောင်မှု: ' : 'Delivery: '}${order.deliveryContact || '—'}`,
    colW - 48
  );
  deliveryLines.slice(0, 2).forEach((line, i) => {
    ctx.fillText(line, lx, y + (order.customerPhone ? 144 : 118) + i * 24);
  });

  // Right card: Invoice & Payment Info
  const rx = MARGIN + colW + colGap + 24;
  ctx.fillStyle = COLORS.titanium;
  ctx.font = `700 18px ${FONT_SANS}`;
  ctx.fillText(isMm ? 'ငွေပေးချေမှု အချက်အလက်' : 'INVOICE & PAYMENT DETAILS', rx, y + 22);

  const metaRows: Array<[string, string]> = [
    [isMm ? 'ရက်စွဲ' : 'Order Date', formatOrderDate(order)],
    [isMm ? 'ငွေလွဲနည်းလမ်း' : 'Payment Channel', order.paymentMethodName || '—'],
    [isMm ? 'ပြေစာနောက်ဆုံး ၄ လုံး' : 'Receipt Slip Last 4', `#${order.receiptLast4 || '----'}`],
    [isMm ? 'အခြေအနေ' : 'Status', isMm ? 'ပို့ဆောင်ပြီး' : 'Verified & Delivered'],
  ];

  metaRows.forEach(([label, val], idx) => {
    const rowY = y + 58 + idx * 34;
    ctx.fillStyle = COLORS.secondary;
    ctx.font = `400 19px ${FONT_SANS}`;
    ctx.textAlign = 'left';
    ctx.fillText(label, rx, rowY);

    ctx.fillStyle = idx === 3 ? COLORS.green : COLORS.ink;
    ctx.font = `600 19px ${idx === 2 ? FONT_MONO : FONT_SANS}`;
    ctx.textAlign = 'right';
    ctx.fillText(val, MARGIN + CONTENT_W - 24, rowY);
  });
  ctx.textAlign = 'left';

  y += metaH + 34;

  // Items Table Header
  const drawTableHeader = (topY: number) => {
    drawRoundedRect(ctx, MARGIN, topY, CONTENT_W, 52, 12, COLORS.champagne);
    ctx.fillStyle = COLORS.espresso;
    ctx.font = `700 19px ${FONT_SANS}`;
    ctx.textAlign = 'left';
    ctx.fillText(isMm ? 'ဝယ်ယူထားသော ပစ္စည်းများ' : 'ITEM & PLAN', MARGIN + 22, topY + 15);
    ctx.textAlign = 'center';
    ctx.fillText(isMm ? 'အရေအတွက်' : 'QTY', MARGIN + CONTENT_W - 360, topY + 15);
    ctx.textAlign = 'right';
    ctx.fillText(isMm ? 'တစ်ခုဈေး' : 'UNIT PRICE', MARGIN + CONTENT_W - 185, topY + 15);
    ctx.fillText(isMm ? 'စုစုပေါင်း' : 'LINE TOTAL', CANVAS_W - MARGIN - 22, topY + 15);
    ctx.textAlign = 'left';
    return topY + 62;
  };

  y = drawTableHeader(y);

  // Table Rows
  for (const item of order.items) {
    const title = isMm ? item.titleMm || item.titleEn : item.titleEn || item.titleMm;
    const variant = isMm
      ? item.variantLabelMm || item.variantLabelEn
      : item.variantLabelEn || item.variantLabelMm;

    ctx.font = `600 21px ${FONT_SANS}`;
    const titleLines = wrapText(ctx, title, CONTENT_W - 430);
    const rowHeight = Math.max(66, titleLines.length * 28 + (variant ? 32 : 18));

    if (y + rowHeight > CANVAS_H - 280) {
      y = startNewPage();
      y = drawTableHeader(y);
    }

    // Item Title & Variant
    ctx.fillStyle = COLORS.ink;
    ctx.font = `600 21px ${FONT_SANS}`;
    titleLines.forEach((line, idx) => {
      ctx.fillText(line, MARGIN + 22, y + 10 + idx * 28);
    });
    if (variant) {
      ctx.fillStyle = COLORS.secondary;
      ctx.font = `400 18px ${FONT_SANS}`;
      ctx.fillText(variant, MARGIN + 22, y + 12 + titleLines.length * 28);
    }

    // Qty, Unit Price, Line Total
    ctx.fillStyle = COLORS.ink;
    ctx.font = `500 20px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText(String(item.quantity), MARGIN + CONTENT_W - 360, y + 14);

    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.secondary;
    ctx.fillText(formatMmk(item.unitPriceMmk, lang), MARGIN + CONTENT_W - 185, y + 14);

    ctx.fillStyle = COLORS.ink;
    ctx.font = `700 20px ${FONT_MONO}`;
    ctx.fillText(
      formatMmk(item.unitPriceMmk * item.quantity, lang),
      CANVAS_W - MARGIN - 22,
      y + 14
    );
    ctx.textAlign = 'left';

    // Hairline divider
    y += rowHeight;
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(MARGIN + 12, y);
    ctx.lineTo(CANVAS_W - MARGIN - 12, y);
    ctx.stroke();
    y += 8;
  }

  // Totals Box
  if (y + 210 > CANVAS_H - 130) {
    y = startNewPage();
  }
  y += 18;
  const totalsW = 460;
  const totalsX = CANVAS_W - MARGIN - totalsW;
  const hasDiscount = order.discountMmk > 0;
  const totalsH = hasDiscount ? 170 : 130;

  drawRoundedRect(ctx, totalsX, y, totalsW, totalsH, 16, COLORS.alabaster, COLORS.border);

  let ty = y + 22;
  ctx.fillStyle = COLORS.secondary;
  ctx.font = `500 20px ${FONT_SANS}`;
  ctx.fillText(isMm ? 'ပစ္စည်းတန်ဖိုး (Subtotal)' : 'Subtotal', totalsX + 24, ty);
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.ink;
  ctx.font = `600 20px ${FONT_MONO}`;
  ctx.fillText(formatMmk(order.subtotalMmk, lang), totalsX + totalsW - 24, ty);
  ctx.textAlign = 'left';
  ty += 38;

  if (hasDiscount) {
    ctx.fillStyle = COLORS.green;
    ctx.font = `500 20px ${FONT_SANS}`;
    const discountLabel = order.promoCode
      ? `${isMm ? 'လျှော့ဈေး' : 'Discount'} (${order.promoCode})`
      : isMm
        ? 'လျှော့ဈေး'
        : 'Discount';
    ctx.fillText(discountLabel, totalsX + 24, ty);
    ctx.textAlign = 'right';
    ctx.font = `600 20px ${FONT_MONO}`;
    ctx.fillText(`-${formatMmk(order.discountMmk, lang)}`, totalsX + totalsW - 24, ty);
    ctx.textAlign = 'left';
    ty += 38;
  }

  ctx.strokeStyle = COLORS.bronzeBorder;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(totalsX + 24, ty - 6);
  ctx.lineTo(totalsX + totalsW - 24, ty - 6);
  ctx.stroke();

  ctx.fillStyle = COLORS.espresso;
  ctx.font = `700 23px ${FONT_SANS}`;
  ctx.fillText(isMm ? 'ပေးချေပြီး စုစုပေါင်း' : 'Total Paid', totalsX + 24, ty + 8);
  ctx.textAlign = 'right';
  ctx.font = `700 25px ${FONT_MONO}`;
  ctx.fillText(formatMmk(order.totalMmk, lang), totalsX + totalsW - 24, ty + 6);
  ctx.textAlign = 'left';

  y += totalsH + 28;

  // Delivered Payload Box (if present)
  if (order.deliveryPayload) {
    ctx.font = `500 20px ${FONT_MONO}`;
    const payloadLines = wrapText(ctx, order.deliveryPayload, CONTENT_W - 48);
    const boxH = 66 + payloadLines.length * 28;
    if (y + boxH > CANVAS_H - 120) {
      y = startNewPage();
    }
    drawRoundedRect(ctx, MARGIN, y, CONTENT_W, boxH, 16, COLORS.greenBg, COLORS.greenBorder);
    ctx.fillStyle = COLORS.green;
    ctx.font = `700 19px ${FONT_SANS}`;
    ctx.fillText(
      isMm ? 'ပေးပို့ပြီးသော ကုဒ် / Link / ခြေရာခံအချက်အလက်' : 'DELIVERED CREDENTIALS / LINK / TRACKING',
      MARGIN + 24,
      y + 20
    );
    ctx.fillStyle = '#14532D';
    ctx.font = `500 20px ${FONT_MONO}`;
    payloadLines.forEach((line, idx) => {
      ctx.fillText(line, MARGIN + 24, y + 52 + idx * 28);
    });
    y += boxH + 20;
  }

  // Store Note Box (if present)
  if (order.adminNote) {
    ctx.font = `400 20px ${FONT_SANS}`;
    const noteLines = wrapText(ctx, order.adminNote, CONTENT_W - 48);
    const boxH = 62 + noteLines.length * 28;
    if (y + boxH > CANVAS_H - 120) {
      y = startNewPage();
    }
    drawRoundedRect(ctx, MARGIN, y, CONTENT_W, boxH, 16, COLORS.alabaster, COLORS.border);
    ctx.fillStyle = COLORS.titanium;
    ctx.font = `700 18px ${FONT_SANS}`;
    ctx.fillText(isMm ? 'ဆိုင်မှ မှတ်ချက်' : 'STORE NOTE', MARGIN + 24, y + 18);
    ctx.fillStyle = COLORS.ink;
    ctx.font = `400 20px ${FONT_SANS}`;
    noteLines.forEach((line, idx) => {
      ctx.fillText(line, MARGIN + 24, y + 48 + idx * 28);
    });
  }

  drawFooter(ctx, storeSettings, lang, pages.length);

  const safeOrderNum = (order.orderNumber || order.id).replace(/[^a-zA-Z0-9_-]/g, '');
  finalizePdf(pages, `Invoice-${safeOrderNum}.pdf`);
}

/**
 * Generates and downloads a multi-order A4 PDF Summary of all completed orders.
 */
export async function downloadCompletedOrdersSummaryPdf(
  orders: Order[],
  lang: Language,
  storeSettings?: StoreSettings,
  customerLabel?: string
): Promise<void> {
  const completed = orders.filter((o) => o.status === 'verified_delivered');
  if (completed.length === 0) return;

  if (typeof document !== 'undefined' && document.fonts?.ready) {
    await document.fonts.ready;
  }

  const isMm = lang === 'mm';
  const storeName = storeSettings?.storeName || 'Aurelia Commerce';
  const totalSpent = completed.reduce((sum, o) => sum + o.totalMmk, 0);
  const totalItems = completed.reduce(
    (sum, o) => sum + o.items.reduce((s, item) => s + item.quantity, 0),
    0
  );

  const pages: HTMLCanvasElement[] = [];
  let { canvas, ctx } = createPageCanvas();
  pages.push(canvas);

  const startNewPage = () => {
    drawFooter(ctx, storeSettings, lang, pages.length);
    const next = createPageCanvas();
    canvas = next.canvas;
    ctx = next.ctx;
    pages.push(canvas);
    return 76;
  };

  // Header Banner
  drawRoundedRect(ctx, MARGIN, 64, CONTENT_W, 130, 20, COLORS.espresso);
  ctx.fillStyle = COLORS.white;
  ctx.font = `700 32px ${FONT_SANS}`;
  ctx.fillText(storeName, MARGIN + 34, 92);

  ctx.fillStyle = '#F7EEEE';
  ctx.font = `500 20px ${FONT_SANS}`;
  ctx.fillText(
    isMm ? 'အတည်ပြုပြီး အော်ဒါမှတ်တမ်း အနှစ်ချုပ် (PDF)' : 'COMPLETED ORDERS SUMMARY STATEMENT',
    MARGIN + 34,
    138
  );

  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.white;
  ctx.font = `600 19px ${FONT_MONO}`;
  ctx.fillText(
    new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }),
    CANVAS_W - MARGIN - 34,
    98
  );
  if (customerLabel) {
    ctx.fillStyle = '#F7EEEE';
    ctx.font = `400 18px ${FONT_SANS}`;
    ctx.fillText(customerLabel, CANVAS_W - MARGIN - 34, 138);
  }
  ctx.textAlign = 'left';

  // 3 KPI Summary Cards
  let y = 222;
  const kpiGap = 20;
  const kpiW = (CONTENT_W - kpiGap * 2) / 3;
  const kpis = [
    {
      label: isMm ? 'ပြီးစီးပြီး အော်ဒါများ' : 'Completed Orders',
      value: String(completed.length),
      color: COLORS.green,
    },
    {
      label: isMm ? 'ဝယ်ယူထားသော ပစ္စည်းအရေအတွက်' : 'Total Items Purchased',
      value: String(totalItems),
      color: COLORS.ink,
    },
    {
      label: isMm ? 'စုစုပေါင်း ပေးချေပြီးငွေ' : 'Total Verified Spent',
      value: formatMmk(totalSpent, lang),
      color: COLORS.espresso,
    },
  ];

  kpis.forEach((kpi, idx) => {
    const kx = MARGIN + idx * (kpiW + kpiGap);
    drawRoundedRect(ctx, kx, y, kpiW, 108, 16, COLORS.alabaster, COLORS.border);
    ctx.fillStyle = COLORS.secondary;
    ctx.font = `500 18px ${FONT_SANS}`;
    ctx.fillText(kpi.label, kx + 22, y + 20);
    ctx.fillStyle = kpi.color;
    ctx.font = `700 28px ${FONT_MONO}`;
    ctx.fillText(kpi.value, kx + 22, y + 54);
  });

  y += 138;

  const drawSummaryTableHeader = (topY: number) => {
    drawRoundedRect(ctx, MARGIN, topY, CONTENT_W, 50, 12, COLORS.champagne);
    ctx.fillStyle = COLORS.espresso;
    ctx.font = `700 18px ${FONT_SANS}`;
    ctx.textAlign = 'left';
    ctx.fillText(isMm ? 'အော်ဒါ & ရက်စွဲ' : 'ORDER & DATE', MARGIN + 20, topY + 15);
    ctx.fillText(isMm ? 'ပစ္စည်းစာရင်း' : 'ITEMS', MARGIN + 290, topY + 15);
    ctx.fillText(isMm ? 'ငွေလွဲနည်းလမ်း' : 'PAYMENT', MARGIN + 680, topY + 15);
    ctx.textAlign = 'right';
    ctx.fillText(isMm ? 'ပေးချေငွေ' : 'TOTAL', CANVAS_W - MARGIN - 20, topY + 15);
    ctx.textAlign = 'left';
    return topY + 60;
  };

  y = drawSummaryTableHeader(y);

  for (const order of completed) {
    const itemsSummary = order.items
      .map((i) => `${i.quantity}x ${isMm ? i.titleMm || i.titleEn : i.titleEn || i.titleMm}`)
      .join(', ');

    ctx.font = `400 18px ${FONT_SANS}`;
    const itemLines = wrapText(ctx, itemsSummary, 365);
    const rowH = Math.max(70, itemLines.length * 25 + 28);

    if (y + rowH > CANVAS_H - 130) {
      y = startNewPage();
      y = drawSummaryTableHeader(y);
    }

    // Order # + Date
    ctx.fillStyle = COLORS.ink;
    ctx.font = `700 19px ${FONT_MONO}`;
    ctx.fillText(order.orderNumber || order.id, MARGIN + 20, y + 10);
    ctx.fillStyle = COLORS.secondary;
    ctx.font = `400 17px ${FONT_SANS}`;
    ctx.fillText(formatOrderDate(order), MARGIN + 20, y + 38);

    // Items wrapped
    ctx.fillStyle = COLORS.ink;
    ctx.font = `400 18px ${FONT_SANS}`;
    itemLines.forEach((line, idx) => {
      ctx.fillText(line, MARGIN + 290, y + 10 + idx * 25);
    });

    // Payment & Slip #4
    ctx.fillStyle = COLORS.ink;
    ctx.font = `500 18px ${FONT_SANS}`;
    ctx.fillText(order.paymentMethodName || '—', MARGIN + 680, y + 10);
    ctx.fillStyle = COLORS.secondary;
    ctx.font = `400 17px ${FONT_MONO}`;
    ctx.fillText(`Slip #${order.receiptLast4 || '----'}`, MARGIN + 680, y + 38);

    // Total
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.espresso;
    ctx.font = `700 19px ${FONT_MONO}`;
    ctx.fillText(formatMmk(order.totalMmk, lang), CANVAS_W - MARGIN - 20, y + 14);
    ctx.textAlign = 'left';

    y += rowH;
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(MARGIN + 10, y);
    ctx.lineTo(CANVAS_W - MARGIN - 10, y);
    ctx.stroke();
    y += 8;
  }

  drawFooter(ctx, storeSettings, lang, pages.length);
  finalizePdf(pages, `Completed-Orders-Summary.pdf`);
}
