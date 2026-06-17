import { useState, useEffect } from 'react';
import { Product } from '../types';
import { ShoppingCart, ArrowLeft } from 'lucide-react';
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
        price: Math.round(p.price * 0.8)
      })
    }).catch(err => {
      console.error("View tracking error:", err);
    });
  };

  // Filter products based on selected category
  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(p => p.category === selectedCategory);

  // Group highly similar products (e.g., same image, highly overlapping names or same description)
  const preprocessProducts = (items: Product[]): Product[] => {
    const groupedList: Product[] = [];
    
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
      } else {
        groupedList.push({
          ...item,
          sizes: [...item.sizes]
        });
      }
    });

    return groupedList;
  };

  const groupedFilteredProducts = preprocessProducts(filteredProducts);

  // Auto-select size on product focus
  useEffect(() => {
    if (selectedProduct) {
      setSelectedSize(selectedProduct.sizes[0] || 'M');
      setAddedToCart(false);
    }
  }, [selectedProduct]);

  if (selectedProduct) {
    return (
      <div className="space-y-10 py-6 px-3 text-zinc-300 relative z-20" id="product-detail-subpage">
        {/* Navigation back bar */}
        <div className="flex justify-between items-center border-b border-zinc-950 pb-4">
          <button
            onClick={() => setSelectedProduct(null)}
            className="group flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-[#8a0303] hover:text-[#8a0303]/85 transition-all cursor-pointer"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> {t('back_to_archive')}
          </button>
          
          <div className="text-[10px] text-zinc-500 hidden sm:block tracking-widest uppercase font-mono">
            SGB // {selectedProduct.category.toUpperCase()} // ID: {selectedProduct.id.toUpperCase()}
          </div>
        </div>

        {/* Presentation layout columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-start pt-4">
          
          {/* LEFT: Spacious image frame - No frame and no dimming on PC or mobile */}
          <div className="lg:col-span-5 space-y-6 flex flex-col items-center">
            
            <div className="w-full max-w-sm aspect-[4/5] bg-transparent flex items-center justify-center relative overflow-hidden min-h-[340px]">
              <img
                src={getProductImageUrl(selectedProduct)}
                alt={selectedProduct.name}
                className="w-full h-full object-contain block"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          {/* RIGHT: Spacious details block */}
          <div className="lg:col-span-7 space-y-8">
            
            <div className="space-y-4 border-b border-zinc-950 pb-6">
              <span className="text-[11px] text-zinc-500 font-mono tracking-[0.35em] uppercase block font-bold">
                ✙ SGB PORTAL // SECUM COUTURE
              </span>
              <h1 className="text-3xl md:text-5xl font-sans tracking-tight text-white font-black uppercase leading-tight">
                {selectedProduct.name}
              </h1>
               <div className="flex flex-wrap items-center gap-3 pt-2">
                <span className="text-zinc-500 line-through text-lg font-mono">
                  {selectedProduct.price} UAH
                </span>
                <span className="text-2xl text-white font-mono tracking-widest font-black">
                  {Math.round(selectedProduct.price * 0.8)} UAH
                </span>
                <div className="relative group/dt">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDiscountTooltip(activeDiscountTooltip === selectedProduct.id ? null : selectedProduct.id);
                    }}
                    className="bg-[#8a0303] text-white text-[10px] md:text-xs uppercase font-black px-2 py-1 rounded animate-pulse cursor-pointer select-none border border-[#8a0303]"
                  >
                    -20% TIKTOK OPENING
                  </button>
                  <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-black border border-[#8a0303] text-xs text-zinc-300 rounded shadow-2xl z-50 text-center leading-relaxed transition-all duration-300 pointer-events-none ${
                    activeDiscountTooltip === selectedProduct.id ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 group-hover/dt:opacity-100 group-hover/dt:scale-100'
                  }`}>
                    <div className="text-[#8a0303] font-black tracking-widest uppercase mb-1">🎁 TIKTOK DISCOUNT</div>
                    Знижка 20% на весь асортимент в честь відкриття нашого нового TikTok акаунту!
                  </div>
                </div>
              </div>


            </div>

            {/* Spacious description */}
            <div className="space-y-4 text-zinc-150 leading-relaxed text-lg md:text-xl font-sans border-l-2 border-[#8a0303] pl-4 uppercase tracking-wider font-semibold">
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
                        ? 'bg-[#8a0303] text-white border-[#8a0303] font-extrabold scale-102 shadow-lg'
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
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600' 
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
    <div className="space-y-12" id="catalog-root">
      
      {/* ATMOSPHERIC COMPACT LOOKBOOK HEADER WITH GOTHIC DISPLAY TYPE */}
      <div className="relative w-full h-[260px] md:h-[320px] overflow-hidden border-2 border-zinc-900 bg-[#020202] flex items-center justify-center group" id="catalog-hero-banner">
        
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-90 contrast-[135%] grayscale-[10%] brightness-[45%] transition-transform duration-1000 group-hover:scale-102 shadow-[inset_0_0_100px_rgba(0,0,0,0.95)]"
          style={{ backgroundImage: "url('/src/assets/images/gothic_vampire_fresco_1781371444695.jpg')" }}
        />
        
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black pointer-events-none" />

        <div className="z-10 text-center space-y-5 px-6 py-8 md:px-10 md:py-12 max-w-2xl bg-black/95 border border-white/80 shadow-[0_0_40px_rgba(138,3,3,0.15)] relative">
          <div className="absolute top-2 left-2 text-[#8a0303] text-sm">✙</div>
          <div className="absolute top-2 right-2 text-[#8a0303] text-sm">✙</div>
          <div className="absolute bottom-2 left-2 text-[#8a0303] text-sm">✙</div>
          <div className="absolute bottom-2 right-2 text-[#8a0303] text-sm">✙</div>
          
          <span className="text-[9px] md:text-[10px] font-mono text-zinc-400 tracking-[0.45em] uppercase block leading-none font-bold">✙ SECUM FRESCO COLLECTION // EST. 2026</span>
          <h1 className="text-3xl md:text-6xl font-gothic tracking-[0.3em] text-white font-black uppercase leading-none select-none">
            SGB // <span 
              onClick={handleSClick} 
              className="cursor-default"
            >S</span>ECUM
          </h1>
          <div className="h-px bg-[#8a0303] w-24 mx-auto" />
          <p className="text-[11px] md:text-[12px] font-mono text-zinc-350 leading-relaxed uppercase tracking-widest font-bold">
            {t('hero_subtitle')}
          </p>
        </div>
      </div>

      {/* FILTER BUTTONS & OUTLET SELECTOR ROW */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-950 pb-4 font-mono">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'all', n: t('cat_all') },
            { id: 'outerwear', n: t('cat_outerwear') },
            { id: 'top', n: t('cat_top') },
            { id: 'bottom', n: t('cat_bottom') },
            { id: 'shoes', n: t('cat_shoes') },
            { id: 'accessories', n: t('cat_accessories') }
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`py-1.5 px-3 border text-[11px] tracking-widest uppercase transition-all duration-300 font-bold ${
                selectedCategory === cat.id
                  ? 'bg-black text-white border-black font-extrabold shadow-sm'
                  : 'bg-transparent text-zinc-550 border-zinc-800/40 hover:text-black'
              }`}
            >
              {cat.n}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-550 uppercase tracking-widest font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-[#8a0303] rounded-full block animate-pulse" />
            {t('view_details')}
          </span>
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
                />
                
                {/* Visual Accent Corner Mark */}
                <div className="absolute top-2 left-2 text-[10px] text-zinc-700 font-serif leading-none opacity-40 group-hover:opacity-100 transition-opacity">✙</div>
              </div>

              {/* Minimal Text Details - Immediately under image, increased text sizes, zero excess elements as instructed */}
              <div className="mt-3.5 space-y-1.5 px-1">
                <h3 className="text-base md:text-xl text-zinc-100 group-hover:text-white font-serif font-black uppercase tracking-[0.16em] transition-colors leading-snug line-clamp-2">
                  {p.name}
                </h3>
                <div className="flex flex-wrap items-center gap-2 font-mono text-xs md:text-sm">
                  <span className="text-zinc-550 line-through text-xs font-semibold">
                    {p.price} UAH
                  </span>
                  <span className="text-zinc-350 font-black tracking-wider text-sm md:text-base">
                    {Math.round(p.price * 0.8)} UAH
                  </span>
                  
                  {/* Tooltip on grid item - hover & click toggles */}
                  <div className="relative group/gt inline-block">
                    <span 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDiscountTooltip(activeDiscountTooltip === p.id ? null : p.id);
                      }}
                      className="bg-[#8a0303] text-white text-[9px] uppercase font-bold px-1 py-0.5 rounded animate-pulse cursor-help select-none"
                    >
                      -20%
                    </span>
                    <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-black border border-[#8a0303] text-[10px] text-zinc-300 rounded shadow-xl z-55 text-center leading-normal transition-all duration-300 pointer-events-none ${
                      activeDiscountTooltip === p.id ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 group-hover/gt:opacity-100 group-hover/gt:scale-100'
                    }`}>
                      Знижка 20% на весь асортимент в честь відкриття нашого нового TikTok акаунту!
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
