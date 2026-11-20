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
    <section className="relative bg-[#070709] hero-crimson-glow border-b border-[#24242C]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-9 sm:py-14 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          {/* Left Copy & Search Focal Column */}
          <div className="lg:col-span-6 flex flex-col justify-center">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#B3B3BE] font-medium mb-4">
              <span className="text-[#FF2A36] font-semibold">{settings.storeName}</span>
              <span aria-hidden="true" className="text-[#454554]">·</span>
              <span className="font-mono-tabular text-[#D4D4DE]">
                1 USD = {settings.exchangeRateMmk.toLocaleString()} MMK
              </span>
              {settings.sitewideDiscountPercent > 0 && (
                <>
                  <span aria-hidden="true" className="text-[#454554]">·</span>
                  <span className="text-[#FF4D57] font-semibold">
                    {promoLabel} ({settings.sitewideDiscountPercent}% OFF)
                  </span>
                </>
              )}
            </div>

            <h1
              className="font-display text-3xl sm:text-4xl lg:text-[2.85rem] font-extrabold tracking-tight text-white leading-[1.16] max-w-xl"
              style={{ textWrap: 'balance' }}
            >
              {title}
            </h1>

            <p className="mt-4 text-sm sm:text-base text-[#B3B3BE] leading-relaxed max-w-xl">
              {subtitle}
            </p>

            {/* Search & Primary CTA Row */}
            <div className="mt-7 flex flex-col sm:flex-row gap-3 max-w-xl">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#858594] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#111115] border border-[#2A2A34] text-sm text-white placeholder:text-[#787886] focus:outline-none focus:ring-2 focus:ring-[#E50914]/35 focus:border-[#E50914] transition-colors"
                />
              </div>
              <button
                type="button"
                onClick={onExploreClick}
                className="h-11 px-5 rounded-xl bg-[#E50914] text-white text-sm font-semibold hover:bg-[#C40812] shadow-[0_0_24px_rgba(229,9,20,0.3)] transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>{t.exploreCatalog}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Media Frame */}
          <div className="lg:col-span-6">
            <div className="h-56 sm:h-72 lg:h-full min-h-[240px] lg:min-h-[320px] rounded-2xl overflow-hidden border border-[#3D181C] bg-[#111115] shadow-[0_18px_48px_rgba(0,0,0,0.6),0_0_32px_rgba(229,9,20,0.12)]">
              {settings.heroImageUrl ? (
                <img
                  src={settings.heroImageUrl}
                  alt={title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-[#858594]">
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
