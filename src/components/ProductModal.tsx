import {
  Check,
  CheckCircle2,
  Minus,
  Package,
  Plus,
  ShoppingBag,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, getReadableFirestoreError, OperationType } from '../lib/firebase';
import { formatMmk, translations } from '../lib/i18n';
import type { CartItem, Language, Order, Product, ProductReview } from '../types';

interface ProductModalProps {
  product: Product;
  lang: Language;
  sitewideDiscountPercent: number;
  reviews: ProductReview[];
  user: FirebaseUser | null;
  isAdmin: boolean;
  eligibleOrder: Order | null;
  onSignIn: () => void;
  onClose: () => void;
  onAddToCart: (item: CartItem, openCheckout: boolean) => void;
}

export function ProductModal({
  product,
  lang,
  sitewideDiscountPercent,
  reviews,
  user,
  isAdmin,
  eligibleOrder,
  onSignIn,
  onClose,
  onAddToCart,
}: ProductModalProps) {
  const t = translations[lang];
  const variants = product.variants.length > 0
    ? product.variants
    : [
        {
          id: 'default',
          labelEn: 'Standard',
          labelMm: 'ပုံမှန်',
          priceMmk: product.priceMmk,
          compareAtMmk: product.compareAtMmk,
          stock: product.stock,
        },
      ];

  const [selectedVariantId, setSelectedVariantId] = useState(variants[0].id);
  const [quantity, setQuantity] = useState(1);
  const [addedFeedback, setAddedFeedback] = useState(false);

  const existingUserReview = user
    ? reviews.find((r) => r.userId === user.uid) || null
    : null;

  const [ratingInput, setRatingInput] = useState<number>(existingUserReview?.rating ?? 5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [commentInput, setCommentInput] = useState<string>(existingUserReview?.comment ?? '');
  const [savingReview, setSavingReview] = useState(false);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);
  const [reviewNotice, setReviewNotice] = useState('');
  const [reviewError, setReviewError] = useState('');

  useEffect(() => {
    setRatingInput(existingUserReview?.rating ?? 5);
    setCommentInput(existingUserReview?.comment ?? '');
    setReviewError('');
  }, [product.id, existingUserReview?.id, existingUserReview?.rating, existingUserReview?.comment]);

  const selectedVariant = variants.find((v) => v.id === selectedVariantId) || variants[0];
  const title = lang === 'mm' ? product.titleMm : product.titleEn;
  const description = lang === 'mm' ? product.descriptionMm : product.descriptionEn;
  const deliveryLabel = lang === 'mm' ? product.deliveryLabelMm : product.deliveryLabelEn;

  const discountedUnitPrice =
    sitewideDiscountPercent > 0
      ? Math.round(selectedVariant.priceMmk * (1 - sitewideDiscountPercent / 100))
      : selectedVariant.priceMmk;

  const comparePrice =
    sitewideDiscountPercent > 0
      ? selectedVariant.priceMmk
      : selectedVariant.compareAtMmk > selectedVariant.priceMmk
        ? selectedVariant.compareAtMmk
        : 0;

  const maxQty = Math.max(1, selectedVariant.stock);
  const outOfStock = selectedVariant.stock <= 0;

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  const buildCartItem = (): CartItem => ({
    key: `${product.id}__${selectedVariant.id}`,
    productId: product.id,
    titleEn: product.titleEn,
    titleMm: product.titleMm,
    variantId: selectedVariant.id,
    variantLabelEn: selectedVariant.labelEn,
    variantLabelMm: selectedVariant.labelMm,
    unitPriceMmk: discountedUnitPrice,
    quantity,
    imageUrl: product.imageUrl,
    deliveryType: product.deliveryType,
  });

  const handleAdd = (buyNow: boolean) => {
    if (outOfStock) return;
    onAddToCart(buildCartItem(), buyNow);
    if (!buyNow) {
      setAddedFeedback(true);
      setTimeout(() => setAddedFeedback(false), 1200);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewError('');
    setReviewNotice('');

    if (!user || !eligibleOrder) {
      setReviewError(t.reviewEligibilityHint);
      return;
    }
    const cleanComment = commentInput.trim();
    if (!cleanComment) {
      setReviewError(
        lang === 'mm' ? 'သုံးသပ်ချက် စာသား ထည့်သွင်းပါ' : 'Please enter a review comment.'
      );
      return;
    }

    const reviewId = `${product.id}__${user.uid}`;
    const authorName = (
      user.displayName ||
      eligibleOrder.customerName ||
      user.email?.split('@')[0] ||
      'Verified Buyer'
    )
      .trim()
      .slice(0, 80);

    setSavingReview(true);
    try {
      await setDoc(doc(db, 'product_reviews', reviewId), {
        productId: product.id,
        userId: user.uid,
        orderId: existingUserReview?.orderId || eligibleOrder.id,
        orderNumber: existingUserReview?.orderNumber || eligibleOrder.orderNumber,
        authorName,
        rating: Math.min(5, Math.max(1, Math.round(ratingInput))),
        comment: cleanComment.slice(0, 600),
        verifiedPurchase: true,
        createdAt: existingUserReview?.createdAt ?? serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setReviewNotice(t.reviewSaved);
      setTimeout(() => setReviewNotice(''), 2500);
    } catch (err) {
      setReviewError(
        getReadableFirestoreError(
          err,
          existingUserReview ? OperationType.UPDATE : OperationType.CREATE,
          `product_reviews/${reviewId}`
        )
      );
    } finally {
      setSavingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    setDeletingReviewId(reviewId);
    setReviewError('');
    try {
      await deleteDoc(doc(db, 'product_reviews', reviewId));
      setReviewNotice(t.reviewDeleted);
      setTimeout(() => setReviewNotice(''), 2200);
    } catch (err) {
      setReviewError(
        getReadableFirestoreError(err, OperationType.DELETE, `product_reviews/${reviewId}`)
      );
    } finally {
      setDeletingReviewId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#111115] border border-[#2C2C36] rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-[0_24px_64px_rgba(0,0,0,0.75)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Split Purchase Module */}
        <div className="grid grid-cols-1 md:grid-cols-12">
          {/* Left Studio Image */}
          <div className="md:col-span-5 bg-[#0C0C10] border-b md:border-b-0 md:border-r border-[#24242C] flex items-center justify-center p-5 sm:p-6">
            <div className="aspect-[4/3] w-full rounded-xl overflow-hidden bg-[#14141A] border border-[#24242C]">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-10 h-10 text-[#E50914]" />
                </div>
              )}
            </div>
          </div>

          {/* Right Purchase Module */}
          <div className="md:col-span-7 p-5 sm:p-7 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-4">
                <div className="text-xs text-[#FF4D57] font-semibold">
                  {product.brand} · {product.category}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="p-1.5 rounded-lg text-[#B3B3BE] hover:bg-[#1C1C24] hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <h2 className="font-display text-xl sm:text-2xl font-bold text-white mt-1.5">
                {title}
              </h2>

              {reviews.length > 0 && (
                <div className="mt-2 flex items-center gap-2 text-xs text-[#B3B3BE]">
                  <span className="inline-flex items-center gap-1 font-mono-tabular font-semibold text-white">
                    <Star className="w-3.5 h-3.5 fill-[#E50914] text-[#E50914]" />
                    <span>{avgRating.toFixed(1)}</span>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">
                    {reviews.length} {reviews.length === 1 ? t.reviewLabel : t.reviewsLabel}
                  </span>
                </div>
              )}

              <p className="mt-3 text-sm text-[#B3B3BE] leading-relaxed">{description}</p>

              <div className="mt-3 text-xs text-[#FF4D57] font-medium">{deliveryLabel}</div>

              {/* Variant Selector */}
              <div className="mt-5">
                <div className="text-xs font-semibold text-white mb-2">
                  {lang === 'mm' ? 'ရွေးချယ်နိုင်သော Plan / အမျိုးအစား' : 'Select Plan / Variant'}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {variants.map((variant) => {
                    const isSelected = variant.id === selectedVariant.id;
                    const vPrice =
                      sitewideDiscountPercent > 0
                        ? Math.round(variant.priceMmk * (1 - sitewideDiscountPercent / 100))
                        : variant.priceMmk;
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => {
                          setSelectedVariantId(variant.id);
                          setQuantity(1);
                        }}
                        className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'border-[#E50914] bg-[#1E0C0F]'
                            : 'border-[#2A2A34] bg-[#17171D] hover:border-[#471B20]'
                        }`}
                      >
                        <div className="text-xs font-semibold text-white">
                          {lang === 'mm' ? variant.labelMm : variant.labelEn}
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs">
                          <span className="font-mono-tabular font-semibold text-[#FF4D57]">
                            {formatMmk(vPrice, lang)}
                          </span>
                          <span className="text-[#858594]">
                            {variant.stock > 0 ? `${variant.stock} left` : t.outOfStock}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Price + Quantity + Actions */}
            <div className="mt-6 pt-5 border-t border-[#24242C] space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  {comparePrice > discountedUnitPrice && (
                    <div className="text-xs text-[#858594] line-through tabular-nums">
                      {formatMmk(comparePrice * quantity, lang)}
                    </div>
                  )}
                  <div className="font-mono-tabular text-2xl font-bold text-white">
                    {formatMmk(discountedUnitPrice * quantity, lang)}
                  </div>
                </div>

                <div className="inline-flex items-center border border-[#2A2A34] rounded-xl bg-[#0C0C10]">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="p-2.5 text-white hover:bg-[#1C1C24] rounded-l-xl cursor-pointer"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-3.5 text-sm font-mono-tabular font-semibold text-white">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                    className="p-2.5 text-white hover:bg-[#1C1C24] rounded-r-xl cursor-pointer"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={outOfStock}
                  onClick={() => handleAdd(false)}
                  className="h-11 px-4 rounded-xl border border-[#471B20] bg-[#180C0E] text-sm font-semibold text-white hover:border-[#E50914] hover:bg-[#240F13] disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  {addedFeedback ? <Check className="w-4 h-4 text-[#22C55E]" /> : <ShoppingBag className="w-4 h-4 text-[#FF2A36]" />}
                  <span>{addedFeedback ? t.addedToCart : t.addToCart}</span>
                </button>
                <button
                  type="button"
                  disabled={outOfStock}
                  onClick={() => handleAdd(true)}
                  className="h-11 px-4 rounded-xl bg-[#E50914] text-white text-sm font-semibold hover:bg-[#C40812] shadow-[0_0_20px_rgba(229,9,20,0.28)] disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {outOfStock ? t.outOfStock : t.buyNow}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Verified Customer Reviews Section */}
        <div className="border-t border-[#24242C] bg-[#0C0C10] p-5 sm:p-7 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="font-display text-base font-bold text-white">
              {t.reviewsTitle}
            </h3>
            {reviews.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-[#B3B3BE]">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-3.5 h-3.5 ${
                        star <= Math.round(avgRating)
                          ? 'fill-[#E50914] text-[#E50914]'
                          : 'text-[#3C3C48]'
                      }`}
                    />
                  ))}
                </div>
                <span className="font-mono-tabular font-semibold text-white">
                  {avgRating.toFixed(1)} / 5.0
                </span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">
                  {reviews.length} {reviews.length === 1 ? t.reviewLabel : t.reviewsLabel}
                </span>
              </div>
            )}
          </div>

          {/* Review Submission Form for Verified Buyers */}
          {eligibleOrder ? (
            <form
              onSubmit={handleSubmitReview}
              className="bg-[#111115] border border-[#24242C] rounded-2xl p-4 sm:p-5 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-white">
                  {existingUserReview ? t.editReview : t.writeReview}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-[#22C55E]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {t.verifiedPurchase} · {eligibleOrder.orderNumber}
                  </span>
                </span>
              </div>

              <div>
                <div className="text-xs text-[#B3B3BE] mb-1.5">{t.yourRating}</div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = star <= (hoverRating || ratingInput);
                    return (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRatingInput(star)}
                        aria-label={`${star} stars`}
                        className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-[#17171D] transition-colors cursor-pointer"
                      >
                        <Star
                          className={`w-5 h-5 transition-colors ${
                            active ? 'fill-[#E50914] text-[#E50914]' : 'text-[#3C3C48]'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-[#B3B3BE] mb-1">
                  <label htmlFor="product-review-comment">{t.yourComment}</label>
                  <span className="font-mono-tabular text-[11px] text-[#858594]">
                    {commentInput.length}/600
                  </span>
                </div>
                <textarea
                  id="product-review-comment"
                  rows={3}
                  maxLength={600}
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder={t.commentPlaceholder}
                  className="w-full p-3 rounded-xl bg-[#0C0C10] border border-[#2A2A34] text-sm text-white placeholder:text-[#787886] focus:outline-none focus:border-[#E50914]"
                />
              </div>

              {reviewError && <p className="text-xs text-[#FF5C67]">{reviewError}</p>}
              {reviewNotice && <p className="text-xs font-medium text-[#22C55E]">{reviewNotice}</p>}

              <div className="flex items-center justify-between gap-3">
                {existingUserReview ? (
                  <button
                    type="button"
                    disabled={deletingReviewId === existingUserReview.id}
                    onClick={() => handleDeleteReview(existingUserReview.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-[#FF5C67] hover:bg-[#230B0F] cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t.deleteReview}</span>
                  </button>
                ) : (
                  <span />
                )}

                <button
                  type="submit"
                  disabled={savingReview}
                  className="px-4 py-2 rounded-xl bg-[#E50914] text-white text-xs font-semibold hover:bg-[#C40812] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {savingReview
                    ? '...'
                    : existingUserReview
                      ? t.updateReview
                      : t.submitReview}
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-[#111115] border border-[#24242C] rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[#B3B3BE]">
              <span>{user ? t.reviewEligibilityHint : t.signInToReview}</span>
              {!user && (
                <button
                  type="button"
                  onClick={onSignIn}
                  className="px-3 py-1.5 rounded-lg border border-[#3D181C] bg-[#180C0E] font-medium text-white hover:border-[#E50914] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {t.signIn}
                </button>
              )}
            </div>
          )}

          {/* Review List */}
          {reviews.length === 0 ? (
            <p className="text-xs text-[#858594]">{t.noReviewsYet}</p>
          ) : (
            <div className="space-y-3">
              {reviews.map((rev) => {
                const dateLabel = rev.createdAt?.toDate
                  ? rev.createdAt.toDate().toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : '';
                const canDelete = Boolean(isAdmin || (user && user.uid === rev.userId));
                return (
                  <div
                    key={rev.id}
                    className="bg-[#111115] border border-[#24242C] rounded-2xl p-4 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-white">{rev.authorName}</span>
                        <span aria-hidden="true" className="text-[#3C3C48]">·</span>
                        <span className="inline-flex items-center gap-1 text-[#22C55E] font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{t.verifiedPurchase}</span>
                        </span>
                        {dateLabel && (
                          <>
                            <span aria-hidden="true" className="text-[#3C3C48]">·</span>
                            <span className="text-[#858594]">{dateLabel}</span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5" aria-label={`${rev.rating} out of 5`}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3.5 h-3.5 ${
                                star <= rev.rating
                                  ? 'fill-[#E50914] text-[#E50914]'
                                  : 'text-[#3C3C48]'
                              }`}
                            />
                          ))}
                        </div>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDeleteReview(rev.id)}
                            disabled={deletingReviewId === rev.id}
                            aria-label={t.deleteReview}
                            className="p-1 text-[#858594] hover:text-[#FF5C67] cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-[#D4D4DE] leading-relaxed whitespace-pre-wrap">
                      {rev.comment}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
