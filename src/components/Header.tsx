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
    <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E7DFD7]">
      {announcement && (
        <div className="hidden sm:block bg-[#4B3427] text-[#FBF8F5] text-xs py-1.5 px-4 text-center truncate">
          {announcement}
        </div>
      )}

      <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleNavClick(() => onNavigate('shop'))}
          className="font-display text-lg sm:text-xl font-bold tracking-tight text-[#1E1612] whitespace-nowrap shrink-0 cursor-pointer hover:text-[#5C4030] transition-colors"
        >
          {settings.storeName}
        </button>

        {/* Zone 2: 4 Clean Single-Line Nav Links */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-[#63554C]">
          <button
            type="button"
            onClick={() => {
              onNavigate('shop');
              onScrollToSection('catalog-section');
            }}
            className={`whitespace-nowrap shrink-0 cursor-pointer pb-0.5 transition-colors ${
              activePage === 'shop'
                ? 'text-[#1E1612] border-b border-[#5C4030]'
                : 'hover:text-[#1E1612]'
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
            className="whitespace-nowrap shrink-0 cursor-pointer pb-0.5 hover:text-[#1E1612] transition-colors"
          >
            {t.navPromos}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('orders')}
            className={`whitespace-nowrap shrink-0 cursor-pointer pb-0.5 transition-colors ${
              activePage === 'orders'
                ? 'text-[#1E1612] border-b border-[#5C4030]'
                : 'hover:text-[#1E1612]'
            }`}
          >
            {t.navOrders}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('admin')}
            className={`whitespace-nowrap shrink-0 cursor-pointer pb-0.5 transition-colors ${
              activePage === 'admin'
                ? 'text-[#5C4030] font-semibold border-b border-[#5C4030]'
                : isAdmin
                  ? 'text-[#5C4030] hover:text-[#38251B]'
                  : 'hover:text-[#1E1612]'
            }`}
          >
            {t.navAdmin}
          </button>
        </nav>

        {/* Zone 3: Compact Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={onToggleLang}
            aria-label="Toggle Language"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E7DFD7] text-xs font-medium text-[#4B3427] hover:bg-[#FAF8F6] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{lang === 'mm' ? 'EN' : 'မြန်မာ'}</span>
          </button>

          {user ? (
            <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigate(isAdmin ? 'admin' : 'orders')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#1E1612] hover:bg-[#FAF8F6] transition-colors whitespace-nowrap shrink-0 cursor-pointer max-w-[140px]"
                title={user.email || ''}
              >
                <User className="w-3.5 h-3.5 text-[#5C4030] shrink-0" />
                <span className="truncate">{user.displayName || user.email?.split('@')[0]}</span>
              </button>
              <button
                type="button"
                onClick={onSignOut}
                className="text-xs text-[#63554C] hover:text-[#1E1612] px-2 py-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {t.signOut}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D2C1B4] text-xs font-medium text-[#1E1612] hover:bg-[#FAF8F6] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-[#5C4030]" />
              <span>{t.signIn}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenCart}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#4B3427] text-white text-xs sm:text-sm font-medium hover:bg-[#38251B] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>{t.cart}</span>
            <span className="font-mono-tabular text-xs opacity-90">({cartCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Open menu"
            className="lg:hidden p-2 rounded-lg text-[#1E1612] hover:bg-[#FAF8F6] cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#E7DFD7] bg-white px-4 py-4 space-y-2">
          <button
            type="button"
            onClick={() =>
              handleNavClick(() => {
                onNavigate('shop');
                onScrollToSection('catalog-section');
              })
            }
            className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-[#1E1612] hover:bg-[#FAF8F6]"
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
            className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-[#1E1612] hover:bg-[#FAF8F6]"
          >
            {t.navPromos}
          </button>
          <button
            type="button"
            onClick={() => handleNavClick(() => onNavigate('orders'))}
            className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-[#1E1612] hover:bg-[#FAF8F6]"
          >
            {t.navOrders}
          </button>
          <button
            type="button"
            onClick={() => handleNavClick(() => onNavigate('admin'))}
            className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-[#5C4030] hover:bg-[#FAF8F6]"
          >
            {t.navAdmin}
          </button>
          <div className="pt-2 border-t border-[#E7DFD7]">
            {user ? (
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-xs text-[#63554C] truncate">{user.email}</span>
                <button
                  type="button"
                  onClick={() => handleNavClick(onSignOut)}
                  className="text-xs font-medium text-[#5C4030]"
                >
                  {t.signOut}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleNavClick(onSignIn)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#FAF8F6] border border-[#E7DFD7] text-sm font-medium text-[#1E1612]"
              >
                {t.signIn}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
