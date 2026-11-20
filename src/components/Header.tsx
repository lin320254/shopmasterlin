import { Globe, Menu, ShoppingBag, User, X } from 'lucide-react';
import { useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { translations } from '../lib/i18n';
import type { Language, StoreSettings } from '../types';

export type ActivePage = 'shop' | 'orders' | 'admin';

interface HeaderProps {
  settings: StoreSettings;
  lang: Language;
  onToggleLang: () => void;
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
  onScrollToSection: (id: string) => void;
  cartCount: number;
  onOpenCart: () => void;
  user: FirebaseUser | null;
  isAdmin: boolean;
  signingIn?: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

export function Header({
  settings,
  lang,
  onToggleLang,
  activePage,
  onNavigate,
  onScrollToSection,
  cartCount,
  onOpenCart,
  user,
  isAdmin,
  signingIn = false,
  onSignIn,
  onSignOut,
}: HeaderProps) {
  const t = translations[lang];
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const announcement = lang === 'mm' ? settings.announcementMm : settings.announcementEn;

  const handleNavClick = (action: () => void) => {
    setMobileMenuOpen(false);
    action();
  };

  return (
    <div className="sticky top-0 z-40 bg-[#070709]/92 backdrop-blur-md border-b border-[#24242C]">
      {announcement && (
        <div className="block bg-gradient-to-r from-[#8F060D] via-[#E50914] to-[#8F060D] text-white text-[11px] sm:text-xs font-medium py-1.5 px-4 text-center truncate">
          {announcement}
        </div>
      )}

      <header className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleNavClick(() => onNavigate('shop'))}
          className="font-display text-base sm:text-xl font-bold tracking-tight text-white whitespace-nowrap shrink-0 max-w-[138px] sm:max-w-none truncate cursor-pointer hover:text-[#FF2A36] transition-colors text-left"
        >
          {settings.storeName}
        </button>

        {/* Zone 2: 4 Clean Single-Line Nav Links */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-[#B3B3BE]">
          <button
            type="button"
            onClick={() => {
              onNavigate('shop');
              onScrollToSection('catalog-section');
            }}
            className={`whitespace-nowrap shrink-0 cursor-pointer pb-0.5 transition-colors ${
              activePage === 'shop'
                ? 'text-white border-b-2 border-[#E50914]'
                : 'hover:text-white'
            }`}
          >
            {t.navShop}
          </button>

          <button
            type="button"
            onClick={() => {
              onNavigate('shop');
              onScrollToSection('promotions-section');
            }}
            className="whitespace-nowrap shrink-0 cursor-pointer pb-0.5 hover:text-white transition-colors"
          >
            {t.navPromos}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('orders')}
            className={`whitespace-nowrap shrink-0 cursor-pointer pb-0.5 transition-colors ${
              activePage === 'orders'
                ? 'text-white border-b-2 border-[#E50914]'
                : 'hover:text-white'
            }`}
          >
            {t.navOrders}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('admin')}
            className={`whitespace-nowrap shrink-0 cursor-pointer pb-0.5 transition-colors ${
              activePage === 'admin'
                ? 'text-[#FF2A36] font-semibold border-b-2 border-[#E50914]'
                : isAdmin
                  ? 'text-[#FF4D57] hover:text-white'
                  : 'hover:text-white'
            }`}
          >
            {t.navAdmin}
          </button>
        </nav>

        {/* Zone 3: Compact Action Controls (Zero Mobile Overflow) */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onToggleLang}
            aria-label="Toggle Language"
            className="inline-flex items-center justify-center gap-1 h-9 px-2 sm:px-2.5 rounded-lg border border-[#2A2A34] bg-[#111115] text-xs font-medium text-[#F5F5F7] hover:border-[#E50914]/60 hover:bg-[#17171D] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-[#E50914]" />
            <span>{lang === 'mm' ? 'EN' : 'မြန်မာ'}</span>
          </button>

          {user ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => onNavigate(isAdmin ? 'admin' : 'orders')}
                className="inline-flex items-center gap-1.5 h-9 px-2 sm:px-2.5 rounded-lg border border-[#2A2A34] bg-[#111115] text-xs font-medium text-[#F5F5F7] hover:border-[#E50914]/60 transition-colors whitespace-nowrap shrink-0 cursor-pointer max-w-[92px] sm:max-w-[150px]"
                title={user.email || ''}
              >
                <User className="w-3.5 h-3.5 text-[#E50914] shrink-0" />
                <span className="truncate">{user.displayName || user.email?.split('@')[0]}</span>
              </button>
              <button
                type="button"
                onClick={onSignOut}
                className="hidden sm:inline-flex items-center h-9 text-xs text-[#B3B3BE] hover:text-white px-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {t.signOut}
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={signingIn}
              onClick={onSignIn}
              className="inline-flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-lg border border-[#3D181C] bg-[#140B0D] text-xs font-medium text-white hover:border-[#E50914] hover:bg-[#1E0E11] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-[#E50914]" />
              <span className="max-w-[78px] sm:max-w-none truncate">
                {signingIn ? t.signingIn : t.signIn}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenCart}
            aria-label={t.cart}
            className="inline-flex items-center justify-center gap-1.5 sm:gap-2 h-9 px-2.5 sm:px-3.5 rounded-xl bg-[#E50914] text-white text-xs sm:text-sm font-semibold hover:bg-[#C40812] shadow-[0_0_18px_rgba(229,9,20,0.28)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">{t.cart}</span>
            <span className="font-mono-tabular text-xs opacity-95">({cartCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Open menu"
            className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg border border-[#24242C] bg-[#111115] text-white hover:border-[#E50914]/60 cursor-pointer shrink-0"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#24242C] bg-[#0C0C10] px-4 py-4 space-y-1.5">
          <button
            type="button"
            onClick={() =>
              handleNavClick(() => {
                onNavigate('shop');
                onScrollToSection('catalog-section');
              })
            }
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
              activePage === 'shop'
                ? 'bg-[#1C0D10] text-white border border-[#3D181C]'
                : 'text-[#B3B3BE] hover:bg-[#17171D] hover:text-white'
            }`}
          >
            {t.navShop}
          </button>
          <button
            type="button"
            onClick={() =>
              handleNavClick(() => {
                onNavigate('shop');
                onScrollToSection('promotions-section');
              })
            }
            className="w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium text-[#B3B3BE] hover:bg-[#17171D] hover:text-white cursor-pointer"
          >
            {t.navPromos}
          </button>
          <button
            type="button"
            onClick={() => handleNavClick(() => onNavigate('orders'))}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
              activePage === 'orders'
                ? 'bg-[#1C0D10] text-white border border-[#3D181C]'
                : 'text-[#B3B3BE] hover:bg-[#17171D] hover:text-white'
            }`}
          >
            {t.navOrders}
          </button>
          <button
            type="button"
            onClick={() => handleNavClick(() => onNavigate('admin'))}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
              activePage === 'admin'
                ? 'bg-[#E50914] text-white'
                : 'text-[#FF4D57] hover:bg-[#17171D]'
            }`}
          >
            {t.navAdmin}
          </button>
          <div className="pt-2.5 mt-1 border-t border-[#24242C]">
            {user ? (
              <div className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="text-xs text-[#B3B3BE] truncate">{user.email}</span>
                <button
                  type="button"
                  onClick={() => handleNavClick(onSignOut)}
                  className="text-xs font-semibold text-[#FF4D57] hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {t.signOut}
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={signingIn}
                onClick={() => handleNavClick(onSignIn)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#17171D] border border-[#3D181C] text-sm font-medium text-white hover:border-[#E50914] disabled:opacity-60 cursor-pointer"
              >
                {signingIn ? t.signingIn : t.signIn}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
