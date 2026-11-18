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
    <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#EBDADA]">
      {announcement && (
        <div className="block bg-[#6B1D24] text-[#FFFFFF] text-[11px] sm:text-xs py-1.5 px-4 text-center truncate">
          {announcement}
        </div>
      )}

      <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleNavClick(() => onNavigate('shop'))}
          className="font-display text-lg sm:text-xl font-bold tracking-tight text-[#241113] whitespace-nowrap shrink-0 cursor-pointer hover:text-[#7A2229] transition-colors"
        >
          {settings.storeName}
        </button>

        {/* Zone 2: 4 Clean Single-Line Nav Links */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-[#6A4B4E]">
          <button
            type="button"
            onClick={() => {
              onNavigate('shop');
              onScrollToSection('catalog-section');
            }}
            className={`whitespace-nowrap shrink-0 cursor-pointer pb-0.5 transition-colors ${
              activePage === 'shop'
                ? 'text-[#241113] border-b border-[#7A2229]'
                : 'hover:text-[#241113]'
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
            className="whitespace-nowrap shrink-0 cursor-pointer pb-0.5 hover:text-[#241113] transition-colors"
          >
            {t.navPromos}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('orders')}
            className={`whitespace-nowrap shrink-0 cursor-pointer pb-0.5 transition-colors ${
              activePage === 'orders'
                ? 'text-[#241113] border-b border-[#7A2229]'
                : 'hover:text-[#241113]'
            }`}
          >
            {t.navOrders}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('admin')}
            className={`whitespace-nowrap shrink-0 cursor-pointer pb-0.5 transition-colors ${
              activePage === 'admin'
                ? 'text-[#7A2229] font-semibold border-b border-[#7A2229]'
                : isAdmin
                  ? 'text-[#7A2229] hover:text-[#52141A]'
                  : 'hover:text-[#241113]'
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
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#EBDADA] text-xs font-medium text-[#6B1D24] hover:bg-[#FCF8F8] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{lang === 'mm' ? 'EN' : 'မြန်မာ'}</span>
          </button>

          {user ? (
            <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigate(isAdmin ? 'admin' : 'orders')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#241113] hover:bg-[#FCF8F8] transition-colors whitespace-nowrap shrink-0 cursor-pointer max-w-[140px]"
                title={user.email || ''}
              >
                <User className="w-3.5 h-3.5 text-[#7A2229] shrink-0" />
                <span className="truncate">{user.displayName || user.email?.split('@')[0]}</span>
              </button>
              <button
                type="button"
                onClick={onSignOut}
                className="text-xs text-[#6A4B4E] hover:text-[#241113] px-2 py-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {t.signOut}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D8BEBE] text-xs font-medium text-[#241113] hover:bg-[#FCF8F8] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-[#7A2229]" />
              <span>{t.signIn}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenCart}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#6B1D24] text-white text-xs sm:text-sm font-medium hover:bg-[#52141A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>{t.cart}</span>
            <span className="font-mono-tabular text-xs opacity-90">({cartCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Open menu"
            className="lg:hidden p-2 rounded-lg text-[#241113] hover:bg-[#FCF8F8] cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#EBDADA] bg-white px-4 py-4 space-y-2">
          <button
            type="button"
            onClick={() =>
              handleNavClick(() => {
                onNavigate('shop');
                onScrollToSection('catalog-section');
              })
            }
            className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-[#241113] hover:bg-[#FCF8F8]"
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
            className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-[#241113] hover:bg-[#FCF8F8]"
          >
            {t.navPromos}
          </button>
          <button
            type="button"
            onClick={() => handleNavClick(() => onNavigate('orders'))}
            className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-[#241113] hover:bg-[#FCF8F8]"
          >
            {t.navOrders}
          </button>
          <button
            type="button"
            onClick={() => handleNavClick(() => onNavigate('admin'))}
            className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-[#7A2229] hover:bg-[#FCF8F8]"
          >
            {t.navAdmin}
          </button>
          <div className="pt-2 border-t border-[#EBDADA]">
            {user ? (
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-xs text-[#6A4B4E] truncate">{user.email}</span>
                <button
                  type="button"
                  onClick={() => handleNavClick(onSignOut)}
                  className="text-xs font-medium text-[#7A2229]"
                >
                  {t.signOut}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleNavClick(onSignIn)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#FCF8F8] border border-[#EBDADA] text-sm font-medium text-[#241113]"
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
