import { ArrowRight, Search } from 'lucide-react';
import { translations } from '../lib/i18n';
import type { Language, StoreSettings } from '../types';

interface HeroSectionProps {
  settings: StoreSettings;
  lang: Language;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onExploreClick: () => void;
}

export function HeroSection({
  settings,
  lang,
  searchQuery,
  onSearchChange,
  onExploreClick,
}: HeroSectionProps) {
  const t = translations[lang];
  const title = lang === 'mm' ? settings.heroTitleMm : settings.heroTitleEn;
  const subtitle = lang === 'mm' ? settings.heroSubtitleMm : settings.heroSubtitleEn;
  const promoLabel = lang === 'mm' ? settings.sitewidePromoLabelMm : settings.sitewidePromoLabelEn;

  return (
    <section className="bg-[#FCF8F8] border-b border-[#EBDADA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          {/* Left Copy & Search Focal Column */}
          <div className="lg:col-span-6 flex flex-col justify-center">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#9A4D53] font-medium mb-4">
              <span>{settings.storeName}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular">
                1 USD = {settings.exchangeRateMmk.toLocaleString()} MMK
              </span>
              {settings.sitewideDiscountPercent > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#7A2229] font-semibold">
                    {promoLabel} ({settings.sitewideDiscountPercent}% OFF)
                  </span>
                </>
              )}
            </div>

            <h1
              className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight text-[#241113] leading-[1.18] max-w-xl"
              style={{ textWrap: 'balance' }}
            >
              {title}
            </h1>

            <p className="mt-4 text-sm sm:text-base text-[#6A4B4E] leading-relaxed max-w-xl">
              {subtitle}
            </p>

            {/* Search & Primary CTA Row */}
            <div className="mt-7 flex flex-col sm:flex-row gap-3 max-w-xl">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#927275] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="w-full h-11 pl-10 pr-4 rounded-xl bg-white border border-[#D8BEBE] text-sm text-[#241113] placeholder:text-[#927275] focus:outline-none focus:ring-2 focus:ring-[#7A2229]/25 focus:border-[#7A2229]"
                />
              </div>
              <button
                type="button"
                onClick={onExploreClick}
                className="h-11 px-5 rounded-xl bg-[#6B1D24] text-white text-sm font-medium hover:bg-[#52141A] transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>{t.exploreCatalog}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Media Frame */}
          <div className="lg:col-span-6">
            <div className="h-64 sm:h-80 lg:h-full min-h-[280px] rounded-2xl overflow-hidden border border-[#EBDADA] bg-[#F7EEEE]">
              {settings.heroImageUrl ? (
                <img
                  src={settings.heroImageUrl}
                  alt={title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-[#927275]">
                  {settings.storeName}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
