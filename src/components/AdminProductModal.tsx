import { ImagePlus, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { compressImageFile } from '../lib/imageUtils';
import { PRESET_IMAGES } from '../lib/seedData';
import type { DeliveryType, Language, Product, ProductVariant } from '../types';

interface AdminProductModalProps {
  product: Product | null;
  lang: Language;
  onClose: () => void;
}

export function AdminProductModal({ product, lang, onClose }: AdminProductModalProps) {
  const [titleEn, setTitleEn] = useState(product?.titleEn ?? '');
  const [titleMm, setTitleMm] = useState(product?.titleMm ?? '');
  const [brand, setBrand] = useState(product?.brand ?? '');
  const [category, setCategory] = useState(product?.category ?? 'Smartphones & Hardware');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>(
    product?.deliveryType ?? 'physical'
  );
  const [descriptionEn, setDescriptionEn] = useState(product?.descriptionEn ?? '');
  const [descriptionMm, setDescriptionMm] = useState(product?.descriptionMm ?? '');
  const [deliveryLabelEn, setDeliveryLabelEn] = useState(
    product?.deliveryLabelEn ?? 'Express Delivery'
  );
  const [deliveryLabelMm, setDeliveryLabelMm] = useState(
    product?.deliveryLabelMm ?? 'အမြန်ပို့ဆောင်မှု'
  );
  const [imageUrl, setImageUrl] = useState(
    product?.imageUrl ?? PRESET_IMAGES[0].url
  );
  const [priceMmk, setPriceMmk] = useState(String(product?.priceMmk ?? 10000));
  const [compareAtMmk, setCompareAtMmk] = useState(String(product?.compareAtMmk ?? 0));
  const [stock, setStock] = useState(String(product?.stock ?? 10));
  const [featured, setFeatured] = useState(product?.featured ?? true);
  const [active, setActive] = useState(product?.active ?? true);
  const [badgeTextEn, setBadgeTextEn] = useState(product?.badgeTextEn ?? '');
  const [badgeTextMm, setBadgeTextMm] = useState(product?.badgeTextMm ?? '');
  const [variants, setVariants] = useState<ProductVariant[]>(
    product?.variants && product.variants.length > 0 ? product.variants : []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const compressed = await compressImageFile(file, {
        maxDim: 900,
        quality: 0.8,
        maxChars: 280000,
      });
      setImageUrl(compressed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image upload failed');
    }
  };

  const addVariant = () => {
    if (variants.length >= 10) return;
    setVariants([
      ...variants,
      {
        id: `var_${Date.now().toString().slice(-5)}`,
        labelEn: 'New Option',
        labelMm: 'ရွေးချယ်စရာအသစ်',
        priceMmk: Number(priceMmk) || 10000,
        compareAtMmk: Number(compareAtMmk) || 0,
        stock: 10,
      },
    ]);
  };

  const updateVariant = (idx: number, patch: Partial<ProductVariant>) => {
    setVariants((prev) => prev.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  };

  const removeVariant = (idx: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!titleEn.trim() || !titleMm.trim() || !brand.trim() || !category.trim()) {
      setError(
        lang === 'mm'
          ? 'အင်္ဂလိပ်/မြန်မာ အမည်၊ Brand နှင့် Category ဖြည့်သွင်းပါ'
          : 'Please complete Product Name (EN/MM), Brand, and Category.'
      );
      return;
    }

    setSaving(true);
    const productId =
      product?.id || `prod_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    const payload = {
      titleEn: titleEn.trim().slice(0, 120),
      titleMm: titleMm.trim().slice(0, 120),
      brand: brand.trim().slice(0, 60),
      category: category.trim().slice(0, 60),
      deliveryType,
      descriptionEn: descriptionEn.trim().slice(0, 1000),
      descriptionMm: descriptionMm.trim().slice(0, 1000),
      deliveryLabelEn: deliveryLabelEn.trim().slice(0, 120),
      deliveryLabelMm: deliveryLabelMm.trim().slice(0, 120),
      imageUrl: imageUrl.trim().slice(0, 350000),
      priceMmk: Math.max(0, Number(priceMmk) || 0),
      compareAtMmk: Math.max(0, Number(compareAtMmk) || 0),
      stock: Math.max(0, Number(stock) || 0),
      variants: variants.slice(0, 10).map((v) => ({
        id: v.id || `v_${Math.random().toString(36).slice(2, 6)}`,
        labelEn: v.labelEn.trim().slice(0, 80) || 'Option',
        labelMm: v.labelMm.trim().slice(0, 80) || 'ရွေးချယ်မှု',
        priceMmk: Math.max(0, Number(v.priceMmk) || 0),
        compareAtMmk: Math.max(0, Number(v.compareAtMmk) || 0),
        stock: Math.max(0, Number(v.stock) || 0),
      })),
      featured,
      active,
      badgeTextEn: badgeTextEn.trim().slice(0, 40),
      badgeTextMm: badgeTextMm.trim().slice(0, 40),
      createdAt: product?.createdAt ?? serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'products', productId), payload);
      onClose();
    } catch (err) {
      handleFirestoreError(
        err,
        product ? OperationType.UPDATE : OperationType.CREATE,
        `products/${productId}`
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#1E1612]/50 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white border border-[#E7DFD7] rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 bg-[#FAF8F6] border-b border-[#E7DFD7] flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-[#1E1612]">
            {product
              ? lang === 'mm'
                ? 'ပစ္စည်းအချက်အလက် ပြင်ဆင်ရန်'
                : 'Edit Product'
              : lang === 'mm'
                ? 'ပစ္စည်းအသစ် ထည့်သွင်းရန်'
                : 'Add New Product'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#63554C] hover:bg-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Titles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#63554C] mb-1">
                Product Name (English) *
              </label>
              <input
                type="text"
                required
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#D2C1B4] text-[#1E1612]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#63554C] mb-1">
                ပစ္စည်းအမည် (မြန်မာ) *
              </label>
              <input
                type="text"
                required
                value={titleMm}
                onChange={(e) => setTitleMm(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#D2C1B4] text-[#1E1612]"
              />
            </div>
          </div>

          {/* Brand, Category, Delivery Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#63554C] mb-1">Brand *</label>
              <input
                type="text"
                required
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Apple / Adobe / Custom"
                className="w-full h-10 px-3 rounded-xl border border-[#D2C1B4] text-[#1E1612]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#63554C] mb-1">Category *</label>
              <input
                type="text"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Smartphones, Digital Tools..."
                className="w-full h-10 px-3 rounded-xl border border-[#D2C1B4] text-[#1E1612]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#63554C] mb-1">
                Delivery Type
              </label>
              <select
                value={deliveryType}
                onChange={(e) => setDeliveryType(e.target.value as DeliveryType)}
                className="w-full h-10 px-3 rounded-xl border border-[#D2C1B4] bg-white text-[#1E1612]"
              >
                <option value="physical">Physical Shipping</option>
                <option value="digital">Digital Key / Invite</option>
                <option value="service">Service / Voucher</option>
              </select>
            </div>
          </div>

          {/* Price, CompareAt, Stock */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#63554C] mb-1">
                Base Price (MMK) *
              </label>
              <input
                type="number"
                min={0}
                required
                value={priceMmk}
                onChange={(e) => setPriceMmk(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#D2C1B4] font-mono-tabular text-[#1E1612]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#63554C] mb-1">
                Original Price / Strikethrough (MMK)
              </label>
              <input
                type="number"
                min={0}
                value={compareAtMmk}
                onChange={(e) => setCompareAtMmk(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#D2C1B4] font-mono-tabular text-[#1E1612]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#63554C] mb-1">Stock *</label>
              <input
                type="number"
                min={0}
                required
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#D2C1B4] font-mono-tabular text-[#1E1612]"
              />
            </div>
          </div>

          {/* Descriptions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#63554C] mb-1">
                Description (English)
              </label>
              <textarea
                rows={3}
                value={descriptionEn}
                onChange={(e) => setDescriptionEn(e.target.value)}
                className="w-full p-3 rounded-xl border border-[#D2C1B4] text-[#1E1612]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#63554C] mb-1">
                အသေးစိတ် ဖော်ပြချက် (မြန်မာ)
              </label>
              <textarea
                rows={3}
                value={descriptionMm}
                onChange={(e) => setDescriptionMm(e.target.value)}
                className="w-full p-3 rounded-xl border border-[#D2C1B4] text-[#1E1612]"
              />
            </div>
          </div>

          {/* Delivery Labels & Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#63554C] mb-1">
                Delivery Label (EN)
              </label>
              <input
                type="text"
                value={deliveryLabelEn}
                onChange={(e) => setDeliveryLabelEn(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#D2C1B4]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#63554C] mb-1">
                ပေးပို့မှုပုံစံ (မြန်မာ)
              </label>
              <input
                type="text"
                value={deliveryLabelMm}
                onChange={(e) => setDeliveryLabelMm(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#D2C1B4]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#63554C] mb-1">
                Highlight Note (EN, optional)
              </label>
              <input
                type="text"
                value={badgeTextEn}
                onChange={(e) => setBadgeTextEn(e.target.value)}
                placeholder="Best Seller / New"
                className="w-full h-10 px-3 rounded-xl border border-[#D2C1B4]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#63554C] mb-1">
                အထူးမှတ်ချက် (မြန်မာ, optional)
              </label>
              <input
                type="text"
                value={badgeTextMm}
                onChange={(e) => setBadgeTextMm(e.target.value)}
                placeholder="ရောင်းအားကောင်း"
                className="w-full h-10 px-3 rounded-xl border border-[#D2C1B4]"
              />
            </div>
          </div>

          {/* Image Upload & Preset Picker */}
          <div className="p-4 rounded-2xl bg-[#FAF8F6] border border-[#E7DFD7] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#1E1612]">
                {lang === 'mm' ? 'ပစ္စည်း ဓာတ်ပုံ' : 'Product Image'}
              </span>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#D2C1B4] text-xs font-medium text-[#4B3427] cursor-pointer hover:bg-[#F4EFE9]">
                <ImagePlus className="w-3.5 h-3.5" />
                <span>{lang === 'mm' ? 'ပုံတင်ရန်' : 'Upload Photo'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadImage}
                  className="hidden"
                />
              </label>
            </div>
            <div className="flex items-center gap-4">
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="w-24 h-18 rounded-xl object-cover border border-[#E7DFD7] bg-white shrink-0"
                />
              )}
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Or paste image URL / select preset below"
                  className="w-full h-9 px-3 rounded-lg bg-white border border-[#D2C1B4] text-xs"
                />
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_IMAGES.map((preset) => (
                    <button
                      key={preset.url}
                      type="button"
                      onClick={() => setImageUrl(preset.url)}
                      className="px-2 py-1 rounded-md bg-white border border-[#E7DFD7] text-[11px] text-[#63554C] hover:border-[#5C4030] cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Variants / Plans */}
          <div className="p-4 rounded-2xl bg-[#FAF8F6] border border-[#E7DFD7] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#1E1612]">
                {lang === 'mm'
                  ? 'Plan / အရွယ်အစား ခွဲများ (Optional)'
                  : 'Plans / Variants (Optional, max 10)'}
              </span>
              <button
                type="button"
                onClick={addVariant}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#4B3427] text-white text-xs font-medium cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{lang === 'mm' ? 'Plan ထည့်ရန်' : 'Add Option'}</span>
              </button>
            </div>

            {variants.map((v, idx) => (
              <div
                key={v.id}
                className="p-3 rounded-xl bg-white border border-[#E7DFD7] grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
              >
                <input
                  type="text"
                  value={v.labelEn}
                  onChange={(e) => updateVariant(idx, { labelEn: e.target.value })}
                  placeholder="Label EN (e.g. 6 Months)"
                  className="sm:col-span-3 h-9 px-2.5 rounded-lg border border-[#D2C1B4] text-xs"
                />
                <input
                  type="text"
                  value={v.labelMm}
                  onChange={(e) => updateVariant(idx, { labelMm: e.target.value })}
                  placeholder="Label MM (e.g. ၆ လ)"
                  className="sm:col-span-3 h-9 px-2.5 rounded-lg border border-[#D2C1B4] text-xs"
                />
                <input
                  type="number"
                  value={v.priceMmk}
                  onChange={(e) => updateVariant(idx, { priceMmk: Number(e.target.value) })}
                  placeholder="Price MMK"
                  className="sm:col-span-2 h-9 px-2.5 rounded-lg border border-[#D2C1B4] font-mono-tabular text-xs"
                />
                <input
                  type="number"
                  value={v.compareAtMmk}
                  onChange={(e) =>
                    updateVariant(idx, { compareAtMmk: Number(e.target.value) })
                  }
                  placeholder="Old MMK"
                  className="sm:col-span-2 h-9 px-2.5 rounded-lg border border-[#D2C1B4] font-mono-tabular text-xs"
                />
                <div className="sm:col-span-2 flex items-center gap-1.5">
                  <input
                    type="number"
                    value={v.stock}
                    onChange={(e) => updateVariant(idx, { stock: Number(e.target.value) })}
                    placeholder="Stock"
                    className="w-full h-9 px-2 rounded-lg border border-[#D2C1B4] font-mono-tabular text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => removeVariant(idx)}
                    className="p-1.5 text-[#BE123C] hover:bg-[#FFF1F2] rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-6">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-[#1E1612] cursor-pointer">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="accent-[#4B3427] w-4 h-4"
              />
              <span>{lang === 'mm' ? 'စတိုးတွင် ဖော်ပြမည် (Active)' : 'Visible in Storefront'}</span>
            </label>
            <label className="inline-flex items-center gap-2 text-xs font-medium text-[#1E1612] cursor-pointer">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="accent-[#4B3427] w-4 h-4"
              />
              <span>{lang === 'mm' ? 'အကြံပြုပစ္စည်း (Featured)' : 'Featured Item'}</span>
            </label>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-[#FFF1F2] border border-[#FECDD3] text-xs text-[#BE123C]">
              {error}
            </div>
          )}

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#D2C1B4] text-xs font-medium text-[#63554C] cursor-pointer"
            >
              {lang === 'mm' ? 'ပယ်ဖျက်မည်' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-[#4B3427] text-white text-xs font-medium hover:bg-[#38251B] disabled:opacity-50 cursor-pointer"
            >
              {saving
                ? lang === 'mm'
                  ? 'သိမ်းဆည်းနေသည်...'
                  : 'Saving...'
                : lang === 'mm'
                  ? 'သိမ်းဆည်းမည်'
                  : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
