/**
 * Compresses an uploaded image file client-side to a clean JPEG data URL
 * guaranteed to fit comfortably under Firestore's 350KB field limit while
 * preserving legibility for payment screenshots, QR codes, and product photos.
 */
export async function compressImageFile(
  file: File,
  options: { maxDim?: number; quality?: number; maxChars?: number } = {}
): Promise<string> {
  const maxDim = options.maxDim ?? 960;
  const maxChars = options.maxChars ?? 300000;
  let quality = options.quality ?? 0.78;

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Invalid image format.'));
    image.src = dataUrl;
  });

  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;

  if (width > maxDim || height > maxDim) {
    if (width >= height) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    } else {
      width = Math.round((width * maxDim) / height);
      height = maxDim;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas compression unavailable.');
  }

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  let output = canvas.toDataURL('image/jpeg', quality);
  while (output.length > maxChars && quality > 0.35) {
    quality -= 0.1;
    output = canvas.toDataURL('image/jpeg', quality);
  }

  if (output.length > maxChars) {
    throw new Error('Image is too large even after compression. Please choose a smaller image.');
  }

  return output;
}

/**
 * Generates a clean Desert Bronze / White QR SVG data URL placeholder
 * for initial payment methods until the Admin uploads their real QR.
 */
export function buildSampleQrDataUrl(label: string, accountNumber: string): string {
  const seed = Array.from(label + accountNumber).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const cells: string[] = [];
  const size = 21;

  const isFinder = (r: number, c: number) =>
    (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7);

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      let dark = false;
      if (isFinder(r, c)) {
        const lr = r >= size - 7 ? r - (size - 7) : r;
        const lc = c >= size - 7 ? c - (size - 7) : c;
        dark =
          lr === 0 ||
          lr === 6 ||
          lc === 0 ||
          lc === 6 ||
          (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4);
      } else if (r !== 6 && c !== 6) {
        dark = ((r * 31 + c * 17 + seed) % 7) < 3;
      }
      if (dark) {
        cells.push(`<rect x="${20 + c * 8}" y="${20 + r * 8}" width="8" height="8" fill="#0B0B0F"/>`);
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="208" height="232" viewBox="0 0 208 232">
    <rect width="208" height="232" rx="12" fill="#FFFFFF"/>
    <rect x="12" y="12" width="184" height="184" rx="8" fill="#FFFFFF" stroke="#E4E4E7" stroke-width="1"/>
    ${cells.join('')}
    <text x="104" y="214" text-anchor="middle" font-family="monospace" font-size="11" font-weight="700" fill="#E50914">${label} · ${accountNumber}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
