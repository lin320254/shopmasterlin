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
      className="group bg-white border border-[#EBDADA] rounded-2xl overflow-hidden flex flex-col cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-[#CCA9A9]"
    >
      {/* 4:3 Product Media Surface */}
      <div className="aspect-[4/3] w-full bg-[#FCF8F8] border-b border-[#EBDADA] overflow-hidden relative">
        {product.imageUrl && !imgError ? (
          <img
            src={product.imageUrl}
            alt={title}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-[#FCF8F8] to-[#F2E4E4]">
            <Package className="w-8 h-8 text-[#9A4D53] mb-2" />
            <span className="text-xs font-medium text-[#6A4B4E] line-clamp-1">{title}</span>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col">
        {/* Unboxed Muted Metadata Kicker */}
        <div className="flex items-center justify-between gap-2 text-xs text-[#927275] mb-1.5">
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-medium text-[#9A4D53]">{product.brand}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{product.category}</span>
          </div>
          {badgeText && (
            <span className="text-[#7A2229] font-medium shrink-0">{badgeText}</span>
          )}
        </div>

        <h3 className="font-display text-base font-semibold text-[#241113] leading-snug line-clamp-2">
          {title}
        </h3>

        <p className="mt-2 text-sm text-[#6A4B4E] leading-relaxed line-clamp-2">
          {description}
        </p>

        {/* Delivery, Rating & Stock Metadata Row */}
        <div className="mt-4 pt-3 border-t border-[#F7EEEE] flex items-center justify-between gap-2 text-xs text-[#6A4B4E]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate">{deliveryLabel}</span>
            {reviewCount > 0 && typeof ratingAvg === 'number' && (
              <>
                <span aria-hidden="true" className="text-[#D8BEBE]">·</span>
                <span className="inline-flex items-center gap-1 font-mono-tabular font-semibold text-[#7A2229] shrink-0">
                  <Star className="w-3.5 h-3.5 fill-[#7A2229] text-[#7A2229]" />
                  <span>{ratingAvg.toFixed(1)}</span>
                  <span className="text-[#927275] font-normal">({reviewCount})</span>
                </span>
              </>
            )}
          </div>
          <span className="shrink-0 font-medium text-[#9A4D53]">
            {totalStock > 0
              ? optionsCount > 1
                ? `${optionsCount} ${t.optionsCount}`
                : t.inStock
              : t.outOfStock}
          </span>
        </div>

        {/* Aligned Price & Action Baseline */}
        <div className="mt-4 pt-2 flex items-end justify-between gap-3">
          <div>
            {comparePrice > effectivePrice && (
              <div className="text-xs text-[#927275] line-through tabular-nums">
                {formatMmk(comparePrice, lang)}
              </div>
            )}
            <div className="font-mono-tabular text-lg font-semibold text-[#241113]">
              {formatMmk(effectivePrice, lang)}
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(product);
            }}
            className="px-3.5 py-2 rounded-xl bg-[#FCF8F8] border border-[#D8BEBE] text-xs font-medium text-[#6B1D24] group-hover:bg-[#6B1D24] group-hover:text-white group-hover:border-[#6B1D24] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>{t.selectPlan}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}
