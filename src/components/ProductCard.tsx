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
      className="group bg-white border border-[#E7DFD7] rounded-2xl overflow-hidden flex flex-col cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-[#C5B2A3]"
    >
      {/* 4:3 Product Media Surface */}
      <div className="aspect-[4/3] w-full bg-[#FAF8F6] border-b border-[#E7DFD7] overflow-hidden relative">
        {product.imageUrl && !imgError ? (
          <img
            src={product.imageUrl}
            alt={title}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-[#FAF8F6] to-[#EFE8E0]">
            <Package className="w-8 h-8 text-[#8C6A52] mb-2" />
            <span className="text-xs font-medium text-[#63554C] line-clamp-1">{title}</span>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col">
        {/* Unboxed Muted Metadata Kicker */}
        <div className="flex items-center justify-between gap-2 text-xs text-[#8B7B71] mb-1.5">
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-medium text-[#8C6A52]">{product.brand}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{product.category}</span>
          </div>
          {badgeText && (
            <span className="text-[#5C4030] font-medium shrink-0">{badgeText}</span>
          )}
        </div>

        <h3 className="font-display text-base font-semibold text-[#1E1612] leading-snug line-clamp-2">
          {title}
        </h3>

        <p className="mt-2 text-sm text-[#63554C] leading-relaxed line-clamp-2">
          {description}
        </p>

        {/* Delivery, Rating & Stock Metadata Row */}
        <div className="mt-4 pt-3 border-t border-[#F4EFE9] flex items-center justify-between gap-2 text-xs text-[#63554C]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate">{deliveryLabel}</span>
            {reviewCount > 0 && typeof ratingAvg === 'number' && (
              <>
                <span aria-hidden="true" className="text-[#D2C1B4]">·</span>
                <span className="inline-flex items-center gap-1 font-mono-tabular font-semibold text-[#5C4030] shrink-0">
                  <Star className="w-3.5 h-3.5 fill-[#B45309] text-[#B45309]" />
                  <span>{ratingAvg.toFixed(1)}</span>
                  <span className="text-[#8B7B71] font-normal">({reviewCount})</span>
                </span>
              </>
            )}
          </div>
          <span className="shrink-0 font-medium text-[#8C6A52]">
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
              <div className="text-xs text-[#8B7B71] line-through tabular-nums">
                {formatMmk(comparePrice, lang)}
              </div>
            )}
            <div className="font-mono-tabular text-lg font-semibold text-[#1E1612]">
              {formatMmk(effectivePrice, lang)}
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(product);
            }}
            className="px-3.5 py-2 rounded-xl bg-[#FAF8F6] border border-[#D2C1B4] text-xs font-medium text-[#4B3427] group-hover:bg-[#4B3427] group-hover:text-white group-hover:border-[#4B3427] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>{t.selectPlan}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}
