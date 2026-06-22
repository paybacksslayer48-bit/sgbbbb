import { useState, useEffect } from 'react';
import { Product } from '../types';
import { ShoppingCart, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { Language, translations } from '../translations';

export const getProductImageUrl = (p: any): string => {
  if (p.image && (p.image.startsWith("data:") || p.image.startsWith("http") || p.image.startsWith("/"))) {
    return p.image;
  }
  if (p.telegramImage && (p.telegramImage.startsWith("data:") || p.telegramImage.startsWith("http") || p.telegramImage.startsWith("/"))) {
    return p.telegramImage;
  }
  const cat = (p.category || "").toLowerCase();
  const sum = (p.id || "").split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
  let idx = 21;
  if (cat.includes("bottom") || cat.includes("pant") || cat.includes("jean")) {
    const pants = [3, 9];
    idx = pants[sum % pants.length];
  } else if (cat.includes("accessories") || cat.includes("accessory") || cat.includes("choker") || cat.includes("bag")) {
    const accs = [5, 8, 21];
    idx = accs[sum % accs.length];
  } else if (cat.includes("shoes") || cat.includes("boot") || cat.includes("kick")) {
    const shoes = [21, 3];
    idx = shoes[sum % shoes.length];
  } else {
    // tops, outerwear, and list of generic fallback items
    const tops = [4, 6, 7, 8];
    idx = tops[sum % tops.length];
  }
  return `/goods/item_${idx}.jpg`;
};

export const getProductColor = (p: Product): string => {
  if (p.color) {
    const raw = p.color.trim().toLowerCase();
    if (raw.includes('біл') || raw.includes('бел') || raw.includes('white')) return 'white';
    if (raw.includes('син') || raw.includes('blue')) return 'blue';
    if (raw.includes('чорн') || raw.includes('черн') || raw.includes('black')) return 'black';
    if (raw.includes('сір') || raw.includes('сер') || raw.includes('grey') || raw.includes('gray')) return 'grey';
    if (raw.includes('черв') || raw.includes('красн') || raw.includes('red')) return 'red';
    if (raw.includes('зелен') || raw.includes('green')) return 'green';
    if (raw.includes('бежев') || raw.includes('beige')) return 'beige';
    return raw;
  }
  
  const cat = (p.category || "").toLowerCase();
  if (cat === 'top') {
    return 'white';
  }
  if (cat === 'bottom') {
    return 'blue';
  }
  
  const desc = (p.description || "").toLowerCase();
  const name = (p.name || "").toLowerCase();
  
  if (desc.includes('чорн') || desc.includes('черн') || name.includes('black') || desc.includes('black') || desc.includes('dark')) {
    return 'black';
  }
  if (desc.includes('сір') || desc.includes('сер') || name.includes('grey') || desc.includes('grey') || name.includes('gray') || desc.includes('gray')) {
    return 'grey';
  }
  if (desc.includes('черв') || desc.includes('красн') || name.includes('red') || desc.includes('red')) {
    return 'red';
  }
  if (desc.includes('зелен') || name.includes('green') || desc.includes('green')) {
    return 'green';
  }
  if (desc.includes('бежев') || name.includes('beige') || desc.includes('beige')) {
    return 'beige';
  }
  if (desc.includes('син') || name.includes('blue') || desc.includes('blue')) {
    return 'blue';
  }
  
  return 'white';
};

export const handleImageError = (e: any, p: any) => {
  const target = e.currentTarget;
  if (!target.dataset.fallbackTried) {
    target.dataset.fallbackTried = "1";
    
    const srcStr = p.image || p.telegramImage || "";
    const numMatch = srcStr.match(/photo_(\d+)/);
    if (numMatch) {
      const num = numMatch[1];
      // Try fallback to the JPG file matching the visual asset number (since we have JPGs 1-21 in /implants)
      target.src = `/implants/photo_${num}_2026-06-17_12-43-23.jpg`;
      return;
    }
  }
  
  if (target.dataset.fallbackTried === "1") {
    target.dataset.fallbackTried = "2";
    // Second tier fallback to generic placeholder goods
    const sum = (p.id || "").split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    const cat = (p.category || "").toLowerCase();
    let idx = 21;
    if (cat.includes("bottom") || cat.includes("pant") || cat.includes("jean")) {
      const pants = [3, 9];
      idx = pants[sum % pants.length];
    } else if (cat.includes("accessories") || cat.includes("accessory") || cat.includes("choker") || cat.includes("bag")) {
      const accs = [5, 8, 21];
      idx = accs[sum % accs.length];
    } else if (cat.includes("shoes") || cat.includes("boot") || cat.includes("kick")) {
      const shoes = [21, 3];
      idx = shoes[sum % shoes.length];
    } else {
      const tops = [4, 6, 7, 8];
      idx = tops[sum % tops.length];
    }
    target.src = `/goods/item_${idx}.jpg`;
    return;
  }
  
  // Last resort: empty SVG transparent image
  target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E";
};

interface CatalogProps {
  products: Product[];
  onAddToCart: (product: Product, size: string) => void;
  onSaveLook: (name: string, tags: string[], productIds: string[]) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  onUnlockAdmin?: () => void;
}

export default function Catalog({ 
  products, 
  onAddToCart, 
  onSaveLook, 
  selectedCategory, 
  setSelectedCategory, 
  onUnlockAdmin 
}: CatalogProps) {
  const [sClickCount, setSClickCount] = useState(0);

  const [lang, setLang] = useState<Language>('uk');

  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('sgb_lang');
      if (saved === 'uk' || saved === 'ru' || saved === 'en') {
        setLang(saved as Language);
      }
    };
    handleStorageChange();
    window.addEventListener('storage', handleStorageChange);
    // Poll to keep in perfect sync with App.tsx switches instantly
    const interval = setInterval(handleStorageChange, 500);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const t = (key: string) => {
    return translations[lang]?.[key as keyof typeof translations['uk']] || translations['en']?.[key as keyof typeof translations['uk']] || key;
  };

  const handleSClick = () => {
    setSClickCount(prev => {
      const next = prev + 1;
      if (next >= 2) {
        onUnlockAdmin?.();
        return 0;
      }
      setTimeout(() => {
        setSClickCount(0);
      }, 1000);
      return next;
    });
  };

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [activeDiscountTooltip, setActiveDiscountTooltip] = useState<string | null>(null);
  const [addedToCart, setAddedToCart] = useState<boolean>(false);
  const [showDiscountInfo, setShowDiscountInfo] = useState<boolean>(false);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  
  // Filtering & Sorting States
  const [selectedCollection, setSelectedCollection] = useState<'all' | 'swiss' | 'japanese'>('all');
  const [selectedColor, setSelectedColor] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'popularity' | 'price-asc' | 'price-desc'>('popularity');

  const handleAddToCartWithFeedback = () => {
    if (!selectedProduct) return;
    onAddToCart(selectedProduct, selectedSize);
    setAddedToCart(true);
    setTimeout(() => {
      setAddedToCart(false);
    }, 2500);
  };

  const handleSelectProduct = (p: Product) => {
    setSelectedProduct(p);
    const cachedVisitor = localStorage.getItem('sgb_visitor_num');
    const visNum = cachedVisitor ? Number(cachedVisitor) : null;
    fetch(`/api/track/view-product`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitorNum: visNum,
        productId: p.id,
        productName: p.name,
        price: p.price
      })
    }).catch(err => {
      console.error("View tracking error:", err);
    });
  };

  // Filter products based on selected category, collection, and color
  let rawFiltered = products;
  
  if (selectedCategory !== 'all') {
    rawFiltered = rawFiltered.filter(p => p.category === selectedCategory);
  }

  if (selectedColor !== 'all') {
    rawFiltered = rawFiltered.filter(p => getProductColor(p) === selectedColor);
  }
  
  if (selectedCollection === 'japanese') {
    rawFiltered = rawFiltered.filter(p => 
      p.tags?.includes('japanese') || 
      p.name.toLowerCase().includes('япон') ||
      p.name.toLowerCase().includes('тигр') ||
      p.description.toLowerCase().includes('япон')
    );
  } else if (selectedCollection === 'swiss') {
    rawFiltered = rawFiltered.filter(p => 
      !(p.tags?.includes('japanese') || 
        p.name.toLowerCase().includes('япон') ||
        p.name.toLowerCase().includes('тигр') ||
        p.description.toLowerCase().includes('япон'))
    );
  }

  // Sort raw filtered items before routing to preprocessor
  let sortedProducts = [...rawFiltered];
  if (sortBy === 'price-asc') {
    sortedProducts.sort((a, b) => a.price - b.price);
  } else if (sortBy === 'price-desc') {
    sortedProducts.sort((a, b) => b.price - a.price);
  } else {
    // sort by deterministic popularity
    sortedProducts.sort((a, b) => {
      const scoreA = (a.stock * 17) % 50;
      const scoreB = (b.stock * 17) % 50;
      return scoreB - scoreA;
    });
  }

  const filteredProducts = sortedProducts;

  // Group highly similar products (e.g., same image, highly overlapping names or same description)
  const preprocessProducts = (items: Product[]): Product[] => {
    const groupedList: Product[] = [];
    
    const collectImages = (p: Product): string[] => {
      const list: string[] = [];
      if (p.images && p.images.length > 0) {
        list.push(...p.images);
      }
      if (p.image) list.push(p.image);
      if (p.telegramImage) list.push(p.telegramImage);
      return Array.from(new Set(list.filter(Boolean)));
    };
    
    items.forEach(item => {
      const imgItem = getProductImageUrl(item);
      
      const match = groupedList.find(target => {
        const imgTarget = getProductImageUrl(target);
        if (imgTarget && imgItem && imgTarget === imgItem) {
          return true;
        }
        
        // Overlapping names
        const wordsTarget = target.name.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        const wordsItem = item.name.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        if (wordsTarget.length > 0 && wordsItem.length > 0) {
          const common = wordsTarget.filter(w => wordsItem.includes(w));
          const ratio = common.length / Math.max(wordsTarget.length, wordsItem.length);
          if (ratio >= 0.8) return true;
        }

        // Same description
        if (target.description && item.description && target.description.trim() === item.description.trim()) {
          return true;
        }

        return false;
      });

      if (match) {
        // Merge sizes uniquely
        const combinedSizes = Array.from(new Set([...match.sizes, ...item.sizes]));
        const sizeWeights: Record<string, number> = { 'XS': 1, 'S': 2, 'M': 3, 'L': 4, 'XL': 5, 'XXL': 6, 'OS': 7 };
        combinedSizes.sort((a, b) => (sizeWeights[a] || 50) - (sizeWeights[b] || 50));
        match.sizes = combinedSizes;
        
        // Merge images uniquely
        const existingImages = collectImages(match);
        const newImages = collectImages(item);
        match.images = Array.from(new Set([...existingImages, ...newImages]));
      } else {
        const itemCopy = {
          ...item,
          sizes: [...item.sizes]
        };
        itemCopy.images = collectImages(item);
        groupedList.push(itemCopy);
      }
    });

    return groupedList;
  };

  const groupedFilteredProducts = preprocessProducts(filteredProducts);

  // Auto-select size on product focus and reset active index
  useEffect(() => {
    if (selectedProduct) {
      setSelectedSize(selectedProduct.sizes[0] || 'M');
      setAddedToCart(false);
      setActiveImageIndex(0);
    }
  }, [selectedProduct]);

  if (selectedProduct) {
    return (
      <div className="space-y-10 py-6 px-3 text-zinc-300 relative z-20" id="product-detail-subpage">
        {/* Navigation back bar */}
        <div className="flex justify-between items-center border-b border-zinc-950 pb-4">
          <button
            onClick={() => setSelectedProduct(null)}
            className="group flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-[#ff3c3c] hover:text-[#ff3c3c]/85 transition-all cursor-pointer"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> {t('back_to_archive')}
          </button>
          
          <div className="text-[10px] text-zinc-500 hidden sm:block tracking-widest uppercase font-mono">
            SGB // {selectedProduct.category.toUpperCase()} // ID: {selectedProduct.id.toUpperCase()}
          </div>
        </div>

        {/* Presentation layout columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-start pt-4">
          
          {/* LEFT: Spacious image frame with multi-image carousel capability */}
          <div className="lg:col-span-5 space-y-4 flex flex-col items-center">
            
            <div className="w-full max-w-sm aspect-[4/5] bg-transparent flex items-center justify-center relative overflow-hidden min-h-[340px] border border-zinc-900 group">
              <img
                src={
                  selectedProduct.images && selectedProduct.images.length > 0
                    ? (selectedProduct.images[activeImageIndex] || getProductImageUrl(selectedProduct))
                    : getProductImageUrl(selectedProduct)
                }
                alt={selectedProduct.name}
                className="w-full h-full object-contain block transition-all duration-300"
                referrerPolicy="no-referrer"
                onError={(e) => handleImageError(e, selectedProduct)}
              />

              {/* Carousel Arrows */}
              {selectedProduct.images && selectedProduct.images.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveImageIndex((prev) => (prev === 0 ? selectedProduct.images!.length - 1 : prev - 1))}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 bg-black/80 hover:bg-black text-white p-2 border border-zinc-900 hover:border-zinc-500 transition-all duration-200 cursor-pointer rounded-none"
                    title="Previous Image"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setActiveImageIndex((prev) => (prev === selectedProduct.images!.length - 1 ? 0 : prev + 1))}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-black/80 hover:bg-black text-white p-2 border border-zinc-900 hover:border-zinc-500 transition-all duration-200 cursor-pointer rounded-none"
                    title="Next Image"
                  >
                    <ChevronRight size={16} />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Indicators */}
            {selectedProduct.images && selectedProduct.images.length > 1 && (
              <div className="flex flex-wrap justify-center gap-2 max-w-sm">
                {selectedProduct.images.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-12 h-15 aspect-[4/5] border transition-all duration-200 overflow-hidden cursor-pointer ${
                      activeImageIndex === idx
                        ? 'border-white scale-105 shadow-md shadow-white/10'
                        : 'border-zinc-900 hover:border-zinc-650 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={imgUrl}
                      alt={`${selectedProduct.name} preview ${idx + 1}`}
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                      onError={(e) => handleImageError(e, selectedProduct)}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Spacious details block */}
          <div className="lg:col-span-7 space-y-8">
            
            <div className="space-y-4 border-b border-zinc-950 pb-6">
              <div className="flex flex-col gap-2">
                <span className="text-[11px] text-zinc-500 font-mono tracking-[0.35em] uppercase block font-bold">
                  ✙ SGB PORTAL // SECUM COUTURE
                </span>
                {selectedProduct.collection && (
                  <div className="flex">
                    <span className="inline-block bg-[#800020] text-black text-[9px] font-mono font-black uppercase tracking-[0.2em] px-2.5 py-1 select-none">
                      СЕРІЯ: {selectedProduct.collection}
                    </span>
                  </div>
                )}
              </div>
              <h1 className="text-3xl md:text-5xl font-sans tracking-tight text-white font-black uppercase leading-tight">
                {selectedProduct.name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <span className="text-2xl text-white font-mono tracking-widest font-black">
                  {selectedProduct.price} UAH
                </span>
              </div>
            </div>

              {/* Red Discount Ask Button */}
              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => setShowDiscountInfo(!showDiscountInfo)}
                  className="bg-red-600 hover:bg-red-700 text-white font-mono text-[10.5px] font-extrabold uppercase tracking-widest px-4 py-2 flex items-center justify-center gap-2 border border-red-500 rounded transition-all cursor-pointer shadow-lg active:scale-95 whitespace-nowrap"
                >
                  🔥 ХОЧУ СКИДКУ
                </button>
                {showDiscountInfo && (
                  <div className="mt-2 border border-red-800 bg-red-950/15 p-3 rounded text-[11px] leading-relaxed text-zinc-300 uppercase font-mono tracking-wider">
                    <p className="text-white font-bold mb-1">
                      💥 Скинь в ТГ скриншот товару та розмір і отримай знижку!
                    </p>
                    <p className="text-zinc-400 text-[10px] mb-2 leading-snug">
                      контактний менеджер зв'яжеться з вами та нарахує дисконт.
                    </p>
                    <a
                      href="https://t.me/SGB_secum"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 text-[9.5px] uppercase tracking-widest font-black transition-all rounded"
                    >
                      ✉ НАПИСАТИ @SGB_secum
                    </a>
                  </div>
                )}
              </div>

            {/* Spacious description */}
            <div className="space-y-4 text-zinc-150 leading-relaxed text-lg md:text-xl font-sans border-l-2 border-[#ff3c3c] pl-4 uppercase tracking-wider font-semibold">
              <p>
                {selectedProduct.description}
              </p>
            </div>

            {/* Active size picker */}
            <div className="space-y-3">
              <span className="text-white font-mono font-black tracking-widest text-[10px] uppercase block">{t('choose_size')}:</span>
              <div className="flex flex-wrap gap-2">
                {selectedProduct.sizes.map(size => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`py-3 px-6 border text-xs font-mono tracking-widest uppercase transition-all duration-300 ${
                      selectedSize === size
                        ? 'bg-[#ff3c3c] text-white border-[#ff3c3c] font-extrabold scale-102 shadow-lg'
                        : 'bg-black text-zinc-400 border-zinc-900 hover:border-zinc-650 hover:text-white'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Action buttons list */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 font-mono">
              <button
                onClick={handleAddToCartWithFeedback}
                className={`flex-1 py-4 px-6 text-xs font-extrabold tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                  addedToCart 
                    ? 'bg-[#ff3c3c] hover:bg-[#ff5555] text-white border-[#ff3c3c]' 
                    : 'bg-white hover:bg-neutral-200 text-black'
                }`}
              >
                <ShoppingCart size={13} /> {addedToCart ? 'ТОВАР ДОДАНО !' : t('add_to_cart')}
              </button>
            </div>

          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="catalog-root">
      
      {/* UPGRADED CATEGORIES LINE (LARGER, BOLDER, MORE SPACE) */}
      <div className="border-b-2 border-zinc-800 pb-6 pt-3 font-mono">
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between text-[11px] text-zinc-500 uppercase tracking-[0.25em] font-black pb-1">
            <span>✙ SGB CATALOG SELECTOR</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-[#ff3c3c] rounded-full animate-pulse" />
              SELECT CATEGORY
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:gap-3">
            {[
              { id: 'all', n: t('cat_all') },
              { id: 'outerwear', n: t('cat_outerwear') },
              { id: 'top', n: t('cat_top') },
              { id: 'skirts', n: t('cat_skirts') },
              { id: 'bottom', n: t('cat_bottom') },
              { id: 'swimwear', n: t('cat_swimwear') },
              { id: 'shoes', n: t('cat_shoes') },
              { id: 'accessories', n: t('cat_accessories') }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`py-3.5 px-4 md:py-4 md:px-7 border text-[11.5px] md:text-xs tracking-[0.15em] uppercase transition-all duration-300 font-mono font-black cursor-pointer text-center flex items-center justify-center gap-1.5 rounded-none ${
                  selectedCategory === cat.id
                    ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.25)]'
                    : 'bg-[#800020] text-black border-[#800020] hover:bg-[#990a2c] hover:border-[#990a2c]'
                }`}
              >
                <span>{cat.n}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SECONDARY ROW: COLLECTIONS FILTER & SORTING BAR */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 pt-1 pb-4 border-b border-zinc-950 text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">
        
        {/* Collection Selector with elegant pill look */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#030303] border border-zinc-900/60 p-1.5 rounded-sm">
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest pl-2 pr-1.5 select-none font-black">Колекція:</span>
          {[
            { id: 'all', n: 'Всі' },
            { id: 'swiss', n: 'Swiss Minimalist' },
            { id: 'japanese', n: 'Japanese Vintage' }
          ].map(col => (
            <button
              key={col.id}
              onClick={() => setSelectedCollection(col.id as any)}
              className={`py-2 px-3.5 rounded-xs transition-all duration-200 text-[10px] uppercase font-black cursor-pointer ${
                selectedCollection === col.id
                  ? 'bg-[#ff3c3c] text-white shadow-md'
                  : 'text-zinc-500 hover:text-white hover:bg-zinc-900/40'
              }`}
            >
              {col.n}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Color Filter Dropdown */}
          <div className="flex items-center justify-between sm:justify-start gap-2.5 bg-[#050505] border border-zinc-900 px-4 py-2 text-zinc-400 rounded-sm">
            <span className="text-[10px] text-zinc-500 tracking-wider font-extrabold uppercase">{t('filter_color')}:</span>
            <select
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              className="bg-transparent text-white font-extrabold text-[10.5px] uppercase tracking-widest outline-none border-none py-1 select-none pr-3 cursor-pointer"
            >
              {[
                { id: 'all', n: t('color_all') },
                { id: 'white', n: t('color_white') },
                { id: 'blue', n: t('color_blue') },
                { id: 'black', n: t('color_black') },
                { id: 'grey', n: t('color_grey') },
                { id: 'red', n: t('color_red') },
                { id: 'green', n: t('color_green') },
                { id: 'beige', n: t('color_beige') }
              ].map(colorOpt => (
                <option key={colorOpt.id} value={colorOpt.id} className="bg-[#050505] text-white">
                  {colorOpt.n}
                </option>
              ))}
            </select>
          </div>

          {/* Sorting Dropdown */}
          <div className="flex items-center justify-between sm:justify-start gap-2.5 bg-[#050505] border border-zinc-900 px-4 py-2 text-zinc-400 rounded-sm">
            <span className="text-[10px] text-zinc-500 tracking-wider font-extrabold uppercase">Сортувати:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-white font-extrabold text-[10.5px] uppercase tracking-widest outline-none border-none py-1 select-none pr-3 cursor-pointer"
            >
              <option value="popularity" className="bg-[#050505] text-white">🔥 Популярність</option>
              <option value="price-asc" className="bg-[#050505] text-white">💰 Ціна: від дешевих</option>
              <option value="price-desc" className="bg-[#050505] text-white">💎 Ціна: від дорогих</option>
            </select>
          </div>
        </div>
      </div>

      {/* PRODUCTS GRID - Enriched layout density to let 1.5 - 2 rows fit on standard computer screens perfectly */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-x-6 sm:gap-x-8 gap-y-12 bg-transparent pb-16" id="catalog-products-grid">
        {groupedFilteredProducts.map((p) => {
          const itemImageUrl = getProductImageUrl(p);

          return (
            <div 
              key={p.id} 
              onClick={() => handleSelectProduct(p)}
              className="group flex flex-col bg-transparent relative cursor-pointer select-none transition-all duration-300 hover:scale-[1.01]"
            >
              {/* Image Area - minimal with no dimming or hover overlays */}
              <div className="relative w-full aspect-[4/5] bg-transparent overflow-hidden border border-zinc-900 group-hover:border-zinc-500 transition-all duration-300">
                <img 
                  src={itemImageUrl} 
                  alt={p.name} 
                  className="h-full w-full object-contain block transition-transform duration-700 ease-out"
                  referrerPolicy="no-referrer"
                  onError={(e) => handleImageError(e, p)}
                />
                
                {/* Visual Accent Corner Mark */}
                <div className="absolute top-2 left-2 text-[10px] text-zinc-700 font-sans leading-none opacity-40 group-hover:opacity-100 transition-opacity">+</div>
              </div>

              {/* Minimal Text Details - Immediately under image, increased text sizes, zero excess elements as instructed */}
              <div className="mt-3.5 space-y-1.5 px-1">
                {p.collection && (
                  <span className="text-[9px] text-[#ff3c3c] font-mono tracking-[0.15em] block uppercase font-black">
                    СЕРІЯ: {p.collection}
                  </span>
                )}
                <h3 className="text-base md:text-xl text-zinc-100 group-hover:text-white font-sans font-extrabold uppercase tracking-tight transition-colors leading-snug line-clamp-2">
                  {p.name}
                </h3>
                <div className="flex flex-wrap items-center gap-2 font-mono text-xs md:text-sm">
                  <span className="text-zinc-350 font-black tracking-wider text-sm md:text-base">
                    {p.price} UAH
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
