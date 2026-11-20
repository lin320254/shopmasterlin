import { ArrowUpRight, Package, Star } from 'lucide-react';
import { useState } from 'react';
import { formatMmk, translations } from '../lib/i18n';
import type { Language, Product } from '../types';

interface ProductCardProps {
  product: Product;
  lang: Language;
  sitewideDiscountPercent: number;
  ratingAvg?: number;
  reviewCount?: number;
  onSelect: (product: Product) => void;
}

export function ProductCard({
  product,
  lang,
  sitewideDiscountPercent,
  ratingAvg,
  reviewCount = 0,
  onSelect,
}: ProductCardProps) {
  const t = translations[lang];
  const [imgError, setImgError] = useState(false);

  const title = lang === 'mm' ? product.titleMm : product.titleEn;
  const description = lang === 'mm' ? product.descriptionMm : product.descriptionEn;
  const deliveryLabel = lang === 'mm' ? product.deliveryLabelMm : product.deliveryLabelEn;
  const badgeText = lang === 'mm' ? product.badgeTextMm : product.badgeTextEn;

  const basePrice =
    product.variants.length > 0
      ? Math.min(...product.variants.map((v) => v.priceMmk))
      : product.priceMmk;

  const effectivePrice =
    sitewideDiscountPercent > 0
      ? Math.round(basePrice * (1 - sitewideDiscountPercent / 100))
      : basePrice;

  const comparePrice =
    sitewideDiscountPercent > 0
      ? basePrice
      : product.compareAtMmk > basePrice
        ? product.compareAtMmk
        : 0;

  const totalStock =
    product.variants.length > 0
      ? product.variants.reduce((acc, v) => acc + v.stock, 0)
      : product.stock;

  const optionsCount = Math.max(1, product.variants.length);

  return (
    <article
      onClick={() => onSelect(product)}
      className="group h-full bg-[#111115] border border-[#24242C] rounded-2xl overflow-hidden flex flex-col cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-[#E50914]/65 hover:shadow-[0_12px_32px_rgba(0,0,0,0.55),0_0_20px_rgba(229,9,20,0.12)]"
    >
      {/* 4:3 Product Media Surface */}
      <div className="aspect-[4/3] w-full bg-[#0C0C10] border-b border-[#24242C] overflow-hidden relative">
        {product.imageUrl && !imgError ? (
          <img
            src={product.imageUrl}
            alt={title}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-[#14141A] to-[#09090C]">
            <Package className="w-8 h-8 text-[#E50914] mb-2" />
            <span className="text-xs font-medium text-[#B3B3BE] line-clamp-1">{title}</span>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col">
        {/* Unboxed Muted Metadata Kicker */}
        <div className="flex items-center justify-between gap-2 text-xs text-[#858594] mb-1.5">
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-semibold text-[#FF4D57]">{product.brand}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{product.category}</span>
          </div>
          {badgeText && (
            <span className="text-[#FF2A36] font-semibold shrink-0">{badgeText}</span>
          )}
        </div>

        <h3 className="font-display text-base font-semibold text-white leading-snug line-clamp-2">
          {title}
        </h3>

        <p className="mt-2 text-sm text-[#B3B3BE] leading-relaxed line-clamp-2">
          {description}
        </p>

        {/* Bottom-Aligned Metadata & Price Baseline */}
        <div className="mt-auto pt-4">
          <div className="pt-3 border-t border-[#202028] flex items-center justify-between gap-2 text-xs text-[#858594]">
            <div className="flex items-center gap-2 min-w-0">
              <span className="truncate">{deliveryLabel}</span>
              {reviewCount > 0 && typeof ratingAvg === 'number' && (
                <>
                  <span aria-hidden="true" className="text-[#3C3C48]">·</span>
                  <span className="inline-flex items-center gap-1 font-mono-tabular font-semibold text-white shrink-0">
                    <Star className="w-3.5 h-3.5 fill-[#E50914] text-[#E50914]" />
                    <span>{ratingAvg.toFixed(1)}</span>
                    <span className="text-[#858594] font-normal">({reviewCount})</span>
                  </span>
                </>
              )}
            </div>
            <span className="shrink-0 font-medium text-[#D4D4DE]">
              {totalStock > 0
                ? optionsCount > 1
                  ? `${optionsCount} ${t.optionsCount}`
                  : t.inStock
                : t.outOfStock}
            </span>
          </div>

          <div className="mt-4 pt-1 flex items-end justify-between gap-3">
            <div>
              {comparePrice > effectivePrice && (
                <div className="text-xs text-[#858594] line-through tabular-nums">
                  {formatMmk(comparePrice, lang)}
                </div>
              )}
              <div className="font-mono-tabular text-lg font-bold text-white">
                {formatMmk(effectivePrice, lang)}
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(product);
              }}
              className="px-3.5 py-2 rounded-xl bg-[#180C0E] border border-[#471B20] text-xs font-semibold text-white group-hover:bg-[#E50914] group-hover:border-[#E50914] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>{t.selectPlan}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
