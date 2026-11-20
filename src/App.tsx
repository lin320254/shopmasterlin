import { AlertCircle, Check, Copy, Tag, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { AdminDashboard } from './components/AdminDashboard';
import { CartCheckoutDrawer } from './components/CartCheckoutDrawer';
import { CustomerOrdersDashboard } from './components/CustomerOrdersDashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { type ActivePage, Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { ProductCard } from './components/ProductCard';
import { ProductModal } from './components/ProductModal';
import {
  auth,
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  handleFirestoreError,
  OperationType,
  signInWithGoogle,
  signOutUser,
  testConnection,
} from './lib/firebase';
import { formatMmk, translations } from './lib/i18n';
import {
  DEFAULT_STORE_SETTINGS,
  STARTER_PAYMENT_METHODS,
  STARTER_PRODUCTS,
  STARTER_PROMOTIONS,
} from './lib/seedData';
import type {
  CartItem,
  Language,
  Order,
  PaymentMethod,
  Product,
  ProductReview,
  Promotion,
  StoreSettings,
} from './types';

function StorefrontApp() {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('aurelia_lang');
    return saved === 'en' ? 'en' : 'mm';
  });
  const [activePage, setActivePage] = useState<ActivePage>('shop');

  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdminDoc, setIsAdminDoc] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [storeSettings, setStoreSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [hasStoreSettingsDoc, setHasStoreSettingsDoc] = useState<boolean | null>(null);
  const [rawProducts, setRawProducts] = useState<Product[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [rawPaymentMethods, setRawPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentsLoaded, setPaymentsLoaded] = useState(false);
  const [rawPromotions, setRawPromotions] = useState<Promotion[]>([]);
  const [promosLoaded, setPromosLoaded] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<ProductReview[]>([]);

  // Storefront interaction states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'featured' | 'price_asc' | 'price_desc'>('featured');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('aurelia_cart');
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch {
      return [];
    }
  });
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const seededRef = useRef(false);

  const t = translations[lang];

  const isAdmin = Boolean(
    user &&
      user.emailVerified &&
      (user.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase() || isAdminDoc)
  );

  useEffect(() => {
    localStorage.setItem('aurelia_lang', lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('aurelia_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    testConnection();
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      if (nextUser) {
        let hasAdminDoc = false;
        try {
          const adminSnap = await getDoc(doc(db, 'admins', nextUser.uid));
          hasAdminDoc = adminSnap.exists();
        } catch {
          hasAdminDoc = false;
        }
        // Ensure user profile doc exists for non-admin or regular tracking
        try {
          const userRef = doc(db, 'users', nextUser.uid);
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists() && nextUser.emailVerified) {
            await setDoc(userRef, {
              uid: nextUser.uid,
              email: (nextUser.email || '').slice(0, 160),
              displayName: (nextUser.displayName || '').slice(0, 100),
              phone: '',
              defaultAddress: '',
              preferredLang: lang,
              role: 'customer',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        } catch {
          // Non-fatal if user profile already exists or unverified
        }
        setIsAdminDoc(hasAdminDoc);
        setUser(nextUser);
        setAuthError(null);
      } else {
        setIsAdminDoc(false);
        setUser(null);
      }
      setAuthReady(true);
    });
    return unsub;
  }, []);

  // Listen to Store Settings in real time for all visitors
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'store_settings', 'global'),
      (snap) => {
        if (snap.exists()) {
          setHasStoreSettingsDoc(true);
          setStoreSettings({
            ...DEFAULT_STORE_SETTINGS,
            ...(snap.data() as Partial<StoreSettings>),
          });
        } else {
          setHasStoreSettingsDoc(false);
          setStoreSettings(DEFAULT_STORE_SETTINGS);
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'store_settings/global')
    );
    return unsub;
  }, []);

  // Listen to Products (all if Admin, active-only if visitor/customer)
  useEffect(() => {
    if (!authReady) return;
    const q = isAdmin
      ? query(collection(db, 'products'))
      : query(collection(db, 'products'), where('active', '==', true));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product);
        setRawProducts(list);
        setProductsLoaded(true);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'products')
    );
    return unsub;
  }, [authReady, isAdmin]);

  // Listen to Payment Methods
  useEffect(() => {
    if (!authReady) return;
    const q = isAdmin
      ? query(collection(db, 'payment_methods'))
      : query(collection(db, 'payment_methods'), where('active', '==', true));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as PaymentMethod)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        setRawPaymentMethods(list);
        setPaymentsLoaded(true);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'payment_methods')
    );
    return unsub;
  }, [authReady, isAdmin]);

  // Listen to Promotions in real time for all visitors (active-only for guests/customers, all for Admin)
  useEffect(() => {
    if (!authReady) return;
    const q = isAdmin
      ? query(collection(db, 'promotions'))
      : query(collection(db, 'promotions'), where('active', '==', true));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Promotion);
        setRawPromotions(list);
        setPromosLoaded(true);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'promotions')
    );
    return unsub;
  }, [authReady, isAdmin]);

  // Listen to Orders (all if Admin, own userId if customer; client-sorted to avoid composite index requirement)
  useEffect(() => {
    if (!authReady || !user) {
      setOrders([]);
      return;
    }
    const q = isAdmin
      ? query(collection(db, 'orders'))
      : query(collection(db, 'orders'), where('userId', '==', user.uid));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as Order)
          .sort(
            (a, b) =>
              (b.createdAt?.toMillis?.() ?? Date.now()) -
              (a.createdAt?.toMillis?.() ?? Date.now())
          );
        setOrders(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'orders')
    );
    return unsub;
  }, [authReady, user, isAdmin]);

  // Listen to Verified Product Reviews (publicly readable, zero PII)
  useEffect(() => {
    const q = query(
      collection(db, 'product_reviews'),
      where('verifiedPurchase', '==', true)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as ProductReview)
          .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
        setReviews(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'product_reviews')
    );
    return unsub;
  }, []);

  // Auto-seed initial Store Settings, Products, Payment Methods, and Promotions ONLY on first-ever store initialization
  useEffect(() => {
    if (!authReady || !isAdmin || seededRef.current) return;
    if (!productsLoaded || !paymentsLoaded || !promosLoaded || hasStoreSettingsDoc === null) {
      return;
    }
    if (hasStoreSettingsDoc) {
      // Store already initialized; never resurrect deleted starter items
      seededRef.current = true;
      return;
    }

    seededRef.current = true;

    const runSeed = async () => {
      try {
        await setDoc(doc(db, 'store_settings', 'global'), {
          ...DEFAULT_STORE_SETTINGS,
          updatedAt: serverTimestamp(),
        });
        if (rawProducts.length === 0) {
          await Promise.all(
            STARTER_PRODUCTS.map((p, idx) =>
              setDoc(doc(db, 'products', `starter_prod_${idx + 1}`), {
                ...p,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              })
            )
          );
        }
        if (rawPaymentMethods.length === 0) {
          await Promise.all(
            STARTER_PAYMENT_METHODS.map((pm, idx) =>
              setDoc(doc(db, 'payment_methods', `starter_pm_${idx + 1}`), {
                ...pm,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              })
            )
          );
        }
        if (rawPromotions.length === 0) {
          await Promise.all(
            STARTER_PROMOTIONS.map((pr, idx) =>
              setDoc(doc(db, 'promotions', `starter_promo_${idx + 1}`), {
                ...pr,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              })
            )
          );
        }
      } catch (err) {
        seededRef.current = false;
        console.error('Initial store seed failed:', err);
      }
    };

    runSeed();
  }, [
    authReady,
    isAdmin,
    productsLoaded,
    paymentsLoaded,
    promosLoaded,
    hasStoreSettingsDoc,
    rawProducts.length,
    rawPaymentMethods.length,
    rawPromotions.length,
  ]);

  // Display starter catalog preview ONLY before first Admin initialization (hasStoreSettingsDoc === false)
  const displayProducts = useMemo<Product[]>(() => {
    if (rawProducts.length > 0) return rawProducts;
    if (hasStoreSettingsDoc === false && productsLoaded && !isAdmin) {
      return STARTER_PRODUCTS.map((p, idx) => ({
        ...p,
        id: `preview_prod_${idx + 1}`,
      }));
    }
    return rawProducts;
  }, [rawProducts, hasStoreSettingsDoc, productsLoaded, isAdmin]);

  const activeCatalogProducts = useMemo(
    () => displayProducts.filter((p) => p.active),
    [displayProducts]
  );

  const selectedProduct = useMemo(
    () => (selectedProductId ? displayProducts.find((p) => p.id === selectedProductId) || null : null),
    [displayProducts, selectedProductId]
  );

  const syncedCart = useMemo<CartItem[]>(() => {
    if (cart.length === 0) return [];
    const discountFactor =
      storeSettings.sitewideDiscountPercent > 0
        ? 1 - storeSettings.sitewideDiscountPercent / 100
        : 1;
    return cart.map((item) => {
      const liveProd = activeCatalogProducts.find((p) => p.id === item.productId);
      if (!liveProd) return item;
      const liveVariant = liveProd.variants.find((v) => v.id === item.variantId);
      const rawPrice = liveVariant ? liveVariant.priceMmk : liveProd.priceMmk;
      const liveUnitPrice =
        discountFactor < 1 ? Math.round(rawPrice * discountFactor) : rawPrice;
      return {
        ...item,
        titleEn: liveProd.titleEn,
        titleMm: liveProd.titleMm,
        variantLabelEn: liveVariant ? liveVariant.labelEn : item.variantLabelEn,
        variantLabelMm: liveVariant ? liveVariant.labelMm : item.variantLabelMm,
        unitPriceMmk: liveUnitPrice,
        imageUrl: liveProd.imageUrl,
        deliveryType: liveProd.deliveryType,
      };
    });
  }, [cart, activeCatalogProducts, storeSettings.sitewideDiscountPercent]);

  const displayPromotions = useMemo<Promotion[]>(() => {
    if (rawPromotions.length > 0) return rawPromotions.filter((p) => p.active);
    if (hasStoreSettingsDoc === false && promosLoaded && !isAdmin) {
      return STARTER_PROMOTIONS.map((p, idx) => ({ ...p, id: `preview_promo_${idx + 1}` }));
    }
    return [];
  }, [rawPromotions, hasStoreSettingsDoc, promosLoaded, isAdmin]);

  const activePaymentMethods = useMemo(
    () => rawPaymentMethods.filter((pm) => pm.active),
    [rawPaymentMethods]
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    activeCatalogProducts.forEach((p) => set.add(p.category));
    return ['all', ...Array.from(set)];
  }, [activeCatalogProducts]);

  const filteredCatalog = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = activeCatalogProducts.filter((p) => {
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        p.titleEn.toLowerCase().includes(q) ||
        p.titleMm.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.descriptionEn.toLowerCase().includes(q)
      );
    });

    if (sortBy === 'price_asc') {
      return [...list].sort((a, b) => a.priceMmk - b.priceMmk);
    }
    if (sortBy === 'price_desc') {
      return [...list].sort((a, b) => b.priceMmk - a.priceMmk);
    }
    return [...list].sort((a, b) => Number(b.featured) - Number(a.featured));
  }, [activeCatalogProducts, selectedCategory, searchQuery, sortBy]);

  const reviewStatsByProduct = useMemo(() => {
    const map = new Map<string, { sum: number; count: number; avg: number; items: ProductReview[] }>();
    for (const r of reviews) {
      const prev = map.get(r.productId) || { sum: 0, count: 0, avg: 0, items: [] };
      const sum = prev.sum + r.rating;
      const count = prev.count + 1;
      prev.items.push(r);
      map.set(r.productId, { sum, count, avg: sum / count, items: prev.items });
    }
    return map;
  }, [reviews]);

  const reviewedProductIds = useMemo(() => {
    const set = new Set<string>();
    if (!user) return set;
    for (const r of reviews) {
      if (r.userId === user.uid) {
        set.add(r.productId);
      }
    }
    return set;
  }, [reviews, user]);

  const selectedProductReviews = useMemo(
    () => (selectedProduct ? reviewStatsByProduct.get(selectedProduct.id)?.items || [] : []),
    [selectedProduct, reviewStatsByProduct]
  );

  const eligibleOrderForSelectedProduct = useMemo(() => {
    if (!selectedProduct || !user || !user.emailVerified) return null;
    return (
      orders.find(
        (o) =>
          o.userId === user.uid &&
          o.status === 'verified_delivered' &&
          o.items.some((item) => item.productId === selectedProduct.id)
      ) || null
    );
  }, [selectedProduct, orders, user]);

  const handleSignIn = async () => {
    if (signingIn) return;
    setAuthError(null);
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code)
          : '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return;
      }
      if (code === 'auth/popup-blocked') {
        setAuthError(t.authPopupBlocked);
      } else if (code === 'auth/unauthorized-domain') {
        setAuthError(`${t.authUnauthorizedDomain} ${window.location.hostname}`);
      } else {
        setAuthError(`${t.authGenericError}${code ? ` (${code})` : ''}`);
      }
    } finally {
      setSigningIn(false);
    }
  };

  const handleAddToCart = (newItem: CartItem, openCheckout: boolean) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.key === newItem.key);
      if (existing) {
        return prev.map((i) =>
          i.key === newItem.key ? { ...i, quantity: i.quantity + newItem.quantity } : i
        );
      }
      return [...prev, newItem];
    });
    if (openCheckout) {
      setSelectedProductId(null);
      setCartOpen(true);
    }
  };

  const handleUpdateQty = (key: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.key !== key));
      return;
    }
    setCart((prev) => prev.map((i) => (i.key === key ? { ...i, quantity: qty } : i)));
  };

  const scrollToSection = (id: string) => {
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }, 60);
  };

  const cartCount = syncedCart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-[#070709] text-[#F5F5F7]">
      <Header
        settings={storeSettings}
        lang={lang}
        onToggleLang={() => setLang((l) => (l === 'mm' ? 'en' : 'mm'))}
        activePage={activePage}
        onNavigate={setActivePage}
        onScrollToSection={scrollToSection}
        cartCount={cartCount}
        onOpenCart={() => setCartOpen(true)}
        user={user}
        isAdmin={isAdmin}
        signingIn={signingIn}
        onSignIn={handleSignIn}
        onSignOut={signOutUser}
      />

      <main className="flex-1">
        {authError && (
          <div className="bg-[#230B0F] border-b border-[#6E1721] px-4 py-3">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs font-medium text-[#FF8A92]">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#FF2A36] shrink-0" />
                <span>{authError}</span>
              </div>
              <button
                type="button"
                onClick={() => setAuthError(null)}
                aria-label="Dismiss sign-in error"
                className="p-1 text-[#FF8A92] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        {activePage === 'shop' && (
          <>
            <HeroSection
              settings={storeSettings}
              lang={lang}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onExploreClick={() => scrollToSection('catalog-section')}
            />

            {/* Featured Collection Catalog */}
            <section
              id="catalog-section"
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-7 sm:mb-8">
                <div>
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
                    {t.featuredCollection}
                  </h2>
                  <p className="text-xs text-[#858594] mt-1">
                    {filteredCatalog.length}{' '}
                    {lang === 'mm' ? 'မျိုး ပြသထားပါသည်' : 'items available'}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3">
                  {/* Category Filter Segmented Controls */}
                  <div className="flex items-center gap-1 p-1 bg-[#111115] border border-[#24242C] rounded-xl overflow-x-auto no-scrollbar max-w-full">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          selectedCategory === cat
                            ? 'bg-[#E50914] text-white'
                            : 'text-[#B3B3BE] hover:text-white hover:bg-[#1A1A22]'
                        }`}
                      >
                        {cat === 'all' ? t.allCategories : cat}
                      </button>
                    ))}
                  </div>

                  {/* Sort Select */}
                  <select
                    value={sortBy}
                    onChange={(e) =>
                      setSortBy(e.target.value as 'featured' | 'price_asc' | 'price_desc')
                    }
                    className="h-9 px-3 rounded-xl bg-[#111115] border border-[#2A2A34] text-xs font-medium text-white cursor-pointer shrink-0"
                  >
                    <option value="featured">{t.sortFeatured}</option>
                    <option value="price_asc">{t.sortPriceAsc}</option>
                    <option value="price_desc">{t.sortPriceDesc}</option>
                  </select>
                </div>
              </div>

              {filteredCatalog.length === 0 ? (
                <div className="bg-[#111115] border border-[#24242C] rounded-2xl p-12 text-center text-sm text-[#B3B3BE]">
                  {lang === 'mm'
                    ? 'ရှာဖွေမှုနှင့် ကိုက်ညီသော ပစ္စည်း မတွေ့ရှိပါ။'
                    : 'No products match your search or category filter.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                  {filteredCatalog.map((product) => {
                    const stats = reviewStatsByProduct.get(product.id);
                    return (
                      <ProductCard
                        key={product.id}
                        product={product}
                        lang={lang}
                        sitewideDiscountPercent={storeSettings.sitewideDiscountPercent}
                        ratingAvg={stats?.avg}
                        reviewCount={stats?.count || 0}
                        onSelect={(p) => setSelectedProductId(p.id)}
                      />
                    );
                  })}
                </div>
              )}
            </section>

            {/* Active Promotions Strip */}
            {displayPromotions.length > 0 && (
              <section
                id="promotions-section"
                className="bg-[#0B0B0F] border-y border-[#24242C] py-10 sm:py-12"
              >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-display text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                      <Tag className="w-5 h-5 text-[#E50914]" />
                      <span>{t.activePromoBanner}</span>
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayPromotions.map((promo) => (
                      <div
                        key={promo.id}
                        className="bg-[#111115] border border-[#3D181C] rounded-2xl p-5 flex items-center justify-between gap-4 hover:border-[#E50914]/70 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="font-mono-tabular text-base font-bold text-[#FF2A36]">
                            {promo.code}
                          </div>
                          <div className="text-sm font-medium text-white mt-0.5 truncate">
                            {lang === 'mm' ? promo.titleMm : promo.titleEn}
                          </div>
                          <div className="text-xs text-[#858594] mt-1">
                            {t.minOrder}: {formatMmk(promo.minOrderMmk, lang)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(promo.code);
                            setCopiedCode(promo.code);
                            setTimeout(() => setCopiedCode(null), 1400);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-[#180C0E] border border-[#471B20] text-xs font-semibold text-white hover:bg-[#E50914] hover:border-[#E50914] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          {copiedCode === promo.code ? (
                            <Check className="w-3.5 h-3.5 text-[#22C55E]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>{copiedCode === promo.code ? t.copied : t.useCode}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* How Ordering Works Section */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-14">
              <h2 className="font-display text-lg sm:text-xl font-bold text-white mb-6">
                {t.howItWorksTitle}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
                <div className="p-5 sm:p-6 rounded-2xl bg-[#111115] border border-[#24242C] hover:border-[#3D181C] transition-colors">
                  <h3 className="font-display text-sm font-bold text-[#FF2A36]">{t.step1Title}</h3>
                  <p className="mt-2 text-sm text-[#B3B3BE] leading-relaxed">{t.step1Desc}</p>
                </div>
                <div className="p-5 sm:p-6 rounded-2xl bg-[#111115] border border-[#24242C] hover:border-[#3D181C] transition-colors">
                  <h3 className="font-display text-sm font-bold text-[#FF2A36]">{t.step2Title}</h3>
                  <p className="mt-2 text-sm text-[#B3B3BE] leading-relaxed">{t.step2Desc}</p>
                </div>
                <div className="p-5 sm:p-6 rounded-2xl bg-[#111115] border border-[#24242C] hover:border-[#3D181C] transition-colors">
                  <h3 className="font-display text-sm font-bold text-[#FF2A36]">{t.step3Title}</h3>
                  <p className="mt-2 text-sm text-[#B3B3BE] leading-relaxed">{t.step3Desc}</p>
                </div>
              </div>
            </section>
          </>
        )}

        {activePage === 'orders' && (
          <CustomerOrdersDashboard
            orders={orders}
            lang={lang}
            user={user}
            storeSettings={storeSettings}
            reviewedProductIds={reviewedProductIds}
            onReviewProduct={(productId) => {
              const target = displayProducts.find((p) => p.id === productId);
              if (target) {
                setSelectedProductId(target.id);
              }
            }}
            onSignIn={handleSignIn}
            onBackToShop={() => setActivePage('shop')}
          />
        )}

        {activePage === 'admin' && (
          <AdminDashboard
            lang={lang}
            user={user}
            isAdmin={isAdmin}
            onSignIn={handleSignIn}
            settings={storeSettings}
            products={displayProducts}
            paymentMethods={rawPaymentMethods}
            promotions={rawPromotions}
            orders={orders}
          />
        )}
      </main>

      {/* Clean Minimal Footer */}
      <footer className="bg-[#0B0B0F] border-t border-[#24242C] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#858594]">
          <div>
            <span className="font-display font-bold text-white mr-2">
              {storeSettings.storeName}
            </span>
            <span>
              {lang === 'mm' ? storeSettings.footerNoteMm : storeSettings.footerNoteEn}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 font-mono-tabular text-[#B3B3BE]">
            {storeSettings.supportPhone && <span>Tel: {storeSettings.supportPhone}</span>}
            {storeSettings.supportTelegram && (
              <span>Telegram: {storeSettings.supportTelegram}</span>
            )}
          </div>
        </div>
      </footer>

      {/* Product Detail / Plan Modal */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          lang={lang}
          sitewideDiscountPercent={storeSettings.sitewideDiscountPercent}
          reviews={selectedProductReviews}
          user={user}
          isAdmin={isAdmin}
          eligibleOrder={eligibleOrderForSelectedProduct}
          onSignIn={handleSignIn}
          onClose={() => setSelectedProductId(null)}
          onAddToCart={handleAddToCart}
        />
      )}

      {/* Cart & Checkout Drawer */}
      <CartCheckoutDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        lang={lang}
        cart={syncedCart}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={(key) => setCart((prev) => prev.filter((i) => i.key !== key))}
        onClearCart={() => setCart([])}
        paymentMethods={activePaymentMethods}
        promotions={displayPromotions}
        user={user}
        storeName={storeSettings.storeName}
        onSignIn={handleSignIn}
        onViewOrders={() => setActivePage('orders')}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <StorefrontApp />
    </ErrorBoundary>
  );
}
