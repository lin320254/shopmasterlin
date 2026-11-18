import { Check, Copy, Tag } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
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
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
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
      (user.email === BOOTSTRAPPED_ADMIN_EMAIL || isAdminDoc)
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
      setUser(nextUser);
      if (nextUser) {
        try {
          const adminSnap = await getDoc(doc(db, 'admins', nextUser.uid));
          setIsAdminDoc(adminSnap.exists());
        } catch {
          setIsAdminDoc(false);
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
      } else {
        setIsAdminDoc(false);
      }
      setAuthReady(true);
    });
    return unsub;
  }, []);

  // Listen to Store Settings
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'store_settings', 'global'),
      (snap) => {
        if (snap.exists()) {
          setHasStoreSettingsDoc(true);
          setStoreSettings(snap.data() as StoreSettings);
        } else {
          setHasStoreSettingsDoc(false);
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

  // Listen to Promotions (only when signed in, per Firestore security rule)
  useEffect(() => {
    if (!authReady || !user) {
      setRawPromotions([]);
      setPromosLoaded(true);
      return;
    }
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
  }, [authReady, user, isAdmin]);

  // Listen to Orders (all if Admin, own userId if customer)
  useEffect(() => {
    if (!authReady || !user) {
      setOrders([]);
      return;
    }
    const q = isAdmin
      ? query(collection(db, 'orders'), orderBy('createdAt', 'desc'))
      : query(
          collection(db, 'orders'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Order);
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

  // Auto-seed initial Store Settings, Products, Payment Methods, and Promotions on first Admin login
  useEffect(() => {
    if (!authReady || !isAdmin || seededRef.current) return;
    if (!productsLoaded || !paymentsLoaded || !promosLoaded || hasStoreSettingsDoc === null) {
      return;
    }

    seededRef.current = true;

    const runSeed = async () => {
      try {
        if (!hasStoreSettingsDoc) {
          await setDoc(doc(db, 'store_settings', 'global'), {
            ...DEFAULT_STORE_SETTINGS,
            updatedAt: serverTimestamp(),
          });
        }
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
        handleFirestoreError(err, OperationType.WRITE, 'initial_seed');
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

  // Display starter catalog preview if Admin hasn't signed in yet to seed Firestore
  const displayProducts = useMemo<Product[]>(() => {
    if (rawProducts.length > 0) return rawProducts;
    if (productsLoaded && !isAdmin) {
      return STARTER_PRODUCTS.map((p, idx) => ({
        ...p,
        id: `preview_prod_${idx + 1}`,
      }));
    }
    return [];
  }, [rawProducts, productsLoaded, isAdmin]);

  const activeCatalogProducts = useMemo(
    () => displayProducts.filter((p) => p.active),
    [displayProducts]
  );

  const displayPromotions = useMemo<Promotion[]>(() => {
    if (rawPromotions.length > 0) return rawPromotions.filter((p) => p.active);
    return STARTER_PROMOTIONS.map((p, idx) => ({ ...p, id: `preview_promo_${idx + 1}` }));
  }, [rawPromotions]);

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
    try {
      await signInWithGoogle();
    } catch {
      // User closed popup
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
      setSelectedProduct(null);
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

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#1E1612]">
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
        onSignIn={handleSignIn}
        onSignOut={signOutUser}
      />

      <main className="flex-1">
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
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                  <h2 className="font-display text-2xl font-bold text-[#1E1612]">
                    {t.featuredCollection}
                  </h2>
                  <p className="text-xs text-[#63554C] mt-1">
                    {filteredCatalog.length}{' '}
                    {lang === 'mm' ? 'မျိုး ပြသထားပါသည်' : 'items available'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Category Filter Segmented Controls */}
                  <div className="flex flex-wrap items-center gap-1 p-1 bg-[#FAF8F6] border border-[#E7DFD7] rounded-xl">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                          selectedCategory === cat
                            ? 'bg-white text-[#1E1612] border border-[#E7DFD7]'
                            : 'text-[#63554C] hover:text-[#1E1612]'
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
                    className="h-9 px-3 rounded-xl bg-white border border-[#D2C1B4] text-xs font-medium text-[#1E1612] cursor-pointer"
                  >
                    <option value="featured">{t.sortFeatured}</option>
                    <option value="price_asc">{t.sortPriceAsc}</option>
                    <option value="price_desc">{t.sortPriceDesc}</option>
                  </select>
                </div>
              </div>

              {filteredCatalog.length === 0 ? (
                <div className="bg-[#FAF8F6] border border-[#E7DFD7] rounded-2xl p-12 text-center text-sm text-[#63554C]">
                  {lang === 'mm'
                    ? 'ရှာဖွေမှုနှင့် ကိုက်ညီသော ပစ္စည်း မတွေ့ရှိပါ။'
                    : 'No products match your search or category filter.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                        onSelect={setSelectedProduct}
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
                className="bg-[#FAF8F6] border-y border-[#E7DFD7] py-12"
              >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-display text-xl font-bold text-[#1E1612] flex items-center gap-2">
                      <Tag className="w-5 h-5 text-[#5C4030]" />
                      <span>{t.activePromoBanner}</span>
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayPromotions.map((promo) => (
                      <div
                        key={promo.id}
                        className="bg-white border border-[#E7DFD7] rounded-2xl p-5 flex items-center justify-between gap-4"
                      >
                        <div>
                          <div className="font-mono-tabular text-base font-bold text-[#5C4030]">
                            {promo.code}
                          </div>
                          <div className="text-sm font-medium text-[#1E1612] mt-0.5">
                            {lang === 'mm' ? promo.titleMm : promo.titleEn}
                          </div>
                          <div className="text-xs text-[#63554C] mt-1">
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
                          className="px-3.5 py-2 rounded-xl border border-[#D2C1B4] text-xs font-medium text-[#4B3427] hover:bg-[#FAF8F6] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          {copiedCode === promo.code ? (
                            <Check className="w-3.5 h-3.5 text-[#15803D]" />
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
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
              <h2 className="font-display text-xl font-bold text-[#1E1612] mb-6">
                {t.howItWorksTitle}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-2xl bg-[#FAF8F6] border border-[#E7DFD7]">
                  <h3 className="font-display text-sm font-bold text-[#5C4030]">{t.step1Title}</h3>
                  <p className="mt-2 text-sm text-[#63554C] leading-relaxed">{t.step1Desc}</p>
                </div>
                <div className="p-6 rounded-2xl bg-[#FAF8F6] border border-[#E7DFD7]">
                  <h3 className="font-display text-sm font-bold text-[#5C4030]">{t.step2Title}</h3>
                  <p className="mt-2 text-sm text-[#63554C] leading-relaxed">{t.step2Desc}</p>
                </div>
                <div className="p-6 rounded-2xl bg-[#FAF8F6] border border-[#E7DFD7]">
                  <h3 className="font-display text-sm font-bold text-[#5C4030]">{t.step3Title}</h3>
                  <p className="mt-2 text-sm text-[#63554C] leading-relaxed">{t.step3Desc}</p>
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
                setSelectedProduct(target);
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
      <footer className="bg-[#FAF8F6] border-t border-[#E7DFD7] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#63554C]">
          <div>
            <span className="font-display font-bold text-[#1E1612] mr-2">
              {storeSettings.storeName}
            </span>
            <span>
              {lang === 'mm' ? storeSettings.footerNoteMm : storeSettings.footerNoteEn}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 font-mono-tabular">
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
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
        />
      )}

      {/* Cart & Checkout Drawer */}
      <CartCheckoutDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        lang={lang}
        cart={cart}
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
