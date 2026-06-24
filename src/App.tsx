import { useState, useEffect } from 'react';
import { Product, CartItem, Order, SavedLook, CustomerDetails, parseProducts } from './types';
import { DEFAULT_PRODUCTS } from './defaultProducts';
import Catalog from './components/Catalog';
import FittingRoom from './components/FittingRoom';
import CartAndCheckout from './components/CartAndCheckout';
import Cabinet from './components/Cabinet';
import CrmDashboard from './components/CrmDashboard';
import Reviews from './components/Reviews';
import { Language, translations } from './translations';
import { ShoppingBag, Laptop, Layers, Users2, Database, ShieldCheck, Heart, Sparkles, User, HelpCircle, Send, Music, ArrowRight, ChevronLeft, ChevronRight, ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [activeTab, rawSetActiveTab ] = useState<'home' | 'catalog' | 'info' | 'reviews' | 'cart' | 'admin'>('home');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCatalogDropdownOpen, setIsCatalogDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Synchronize with popstate (browser back/forward button, iOS swipe etc)
  useEffect(() => {
    // Parse URL on initial load to open correct tab/product
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get('id');
    const tabParam = params.get('tab');

    if (idParam) {
      rawSetActiveTab('catalog');
      setSelectedProductId(idParam);
    } else if (tabParam) {
      if (['home', 'catalog', 'reviews', 'cart', 'admin'].includes(tabParam)) {
        rawSetActiveTab(tabParam as any);
      }
    }

    const handlePopState = (event: PopStateEvent) => {
      if (event.state && typeof event.state === 'object') {
        const { tab, productId } = event.state;
        if (tab) rawSetActiveTab(tab);
        setSelectedProductId(productId || null);
      } else {
        // Fallback parsing
        const p = new URLSearchParams(window.location.search);
        const idVal = p.get('id');
        const tabVal = p.get('tab');
        if (idVal) {
          rawSetActiveTab('catalog');
          setSelectedProductId(idVal);
        } else if (tabVal) {
          rawSetActiveTab(tabVal as any);
          setSelectedProductId(null);
        } else {
          rawSetActiveTab('home');
          setSelectedProductId(null);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync state & push history
  const navigateTo = (tab: 'home' | 'catalog' | 'reviews' | 'cart' | 'admin' | 'info', productId: string | null = null) => {
    rawSetActiveTab(tab as any);
    setSelectedProductId(productId);

    const params = new URLSearchParams();
    if (productId) {
      params.set('id', productId);
    } else if (tab !== 'home') {
      params.set('tab', tab);
    }

    const searchStr = params.toString() ? '?' + params.toString() : '';
    window.history.pushState({ tab, productId }, '', window.location.pathname + searchStr);
  };

  const setActiveTab = (tab: 'home' | 'catalog' | 'info' | 'reviews' | 'cart' | 'admin') => {
    rawSetActiveTab(tab);
    setSelectedProductId(null);

    const params = new URLSearchParams();
    if (tab !== 'home') {
      params.set('tab', tab);
    }
    const searchStr = params.toString() ? '?' + params.toString() : '';
    window.history.pushState({ tab, productId: null }, '', window.location.pathname + searchStr);
  };

  // Default theme & language selector logic
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('sgb_lang');
    if (saved === 'uk' || saved === 'ru' || saved === 'en') return saved as Language;
    const sys = navigator.language?.toLowerCase() || '';
    if (sys.includes('uk') || sys.includes('ua')) return 'uk';
    if (sys.includes('ru')) return 'ru';
    return 'en';
  });

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Scroll to top on every tab/page change, category change, or product change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeTab, selectedCategory, selectedProductId]);

  // Monitor scroll for Scroll-to-Top button visibility
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const changeLanguage = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('sgb_lang', newLang);
  };

  const changeTheme = (newTheme: 'dark' | 'light') => {
    // Light theme removed, lock as dark
    setTheme('dark');
  };

  const t = (key: keyof typeof translations['uk']) => {
    const dict = translations[lang] || translations['uk'];
    return dict[key] || translations['uk'][key] || key;
  };

  // Check secret links or persistent storage for unlocking admin panel
  useEffect(() => {
    const checkAdminAccess = () => {
      const query = new URLSearchParams(window.location.search);
      if (
        query.get("admin") === "true" || 
        query.get("access") === "secret" || 
        window.location.hash === "#admin" ||
        localStorage.getItem("sgb_admin_unlocked") === "true"
      ) {
        setIsAdminUnlocked(true);
        localStorage.setItem("sgb_admin_unlocked", "true");
      }
    };
    checkAdminAccess();
    window.addEventListener("hashchange", checkAdminAccess);
    return () => window.removeEventListener("hashchange", checkAdminAccess);
  }, []);

  // Unified State
  const [products, setProducts] = useState<Product[]>(() => parseProducts(DEFAULT_PRODUCTS));

  const [heroActiveIndex, setHeroActiveIndex] = useState(0);
  const [heroTheme, setHeroTheme] = useState<'swiss' | 'japanese'>('japanese');

  // Auto-slideshow for the new home hero
  useEffect(() => {
    if (activeTab === 'home') {
      const timer = setInterval(() => {
        setHeroActiveIndex(prev => (prev + 1) % DEFAULT_PRODUCTS.length);
      }, 6000);
      return () => clearInterval(timer);
    }
  }, [activeTab]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [savedLooks, setSavedLooks] = useState<SavedLook[]>([]);
  const [customerVibe, setCustomerVibe] = useState<string>('neogoth');
  
  // Visitor ID & Category tracking
  const [visitorNum, setVisitorNum] = useState<number | null>(null);
  const [hasMountedCategory, setHasMountedCategory] = useState(false);

  // Register visitor ID on mount
  useEffect(() => {
    const cached = localStorage.getItem('sgb_visitor_num');
    if (cached) {
      setVisitorNum(Number(cached));
    } else {
      fetch('/api/visitors/register', { method: 'POST' })
        .then(res => res.json())
        .then(data => {
          if (data && data.visitorNum) {
            setVisitorNum(data.visitorNum);
            localStorage.setItem('sgb_visitor_num', String(data.visitorNum));
          }
        })
        .catch(err => {
          console.error("Failed to register visitor ID:", err);
        });
    }
  }, []);

  // Automatically track category views after initial registration
  useEffect(() => {
    if (!hasMountedCategory) {
      setHasMountedCategory(true);
      return;
    }
    const currentVisitor = visitorNum || Number(localStorage.getItem('sgb_visitor_num'));
    if (!currentVisitor) return;

    fetch('/api/track/view-category', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorNum: currentVisitor, category: selectedCategory })
    }).catch(err => console.error("Error tracking category view:", err));
  }, [selectedCategory, visitorNum]);
  
  // App System Stats
  const [dbSynced, setDbSynced] = useState(false);

  // 1. Initial State Syncing (Fetch Database from Express Node backend)
  useEffect(() => {
    const fetchDatabase = async () => {
      try {
        const pRes = await fetch('/api/products');
        const pData = await pRes.json();
        if (Array.isArray(pData) && pData.length > 0) {
          // Keep the default static products always visible, and merge any server custom goods
          const merged = [...pData];
          for (const defProd of DEFAULT_PRODUCTS) {
            if (!merged.some(p => p.id === defProd.id)) {
              merged.push(defProd);
            }
          }
          setProducts(parseProducts(merged));
        } else {
          setProducts(parseProducts(DEFAULT_PRODUCTS));
        }

        const oRes = await fetch('/api/orders');
        const oData = await oRes.json();
        setOrders(oData);

        setDbSynced(true);
      } catch (err) {
        console.warn("Backend loading offline, using local memory fallbacks", err);
        setProducts(parseProducts(DEFAULT_PRODUCTS));
      }
    };

    fetchDatabase();
  }, []);

  const handleAddToCart = (product: Product, size: string) => {
    setCart(prev => {
      const matchIdx = prev.findIndex(item => item.product.id === product.id && item.selectedSize === size);
      if (matchIdx > -1) {
        const updated = [...prev];
        updated[matchIdx].quantity += 1;
        return updated;
      } else {
        return [...prev, { product, quantity: 1, selectedSize: size }];
      }
    });
    alert(`ДОДАНО ДО КОРЗИНИ: ${product.name} [Розмір: ${size}]`);
  };

  const handleUpdateCartQty = (productId: string, size: string, change: number) => {
    setCart(prev => {
      const matchIdx = prev.findIndex(item => item.product.id === productId && item.selectedSize === size);
      if (matchIdx > -1) {
        const updated = [...prev];
        const newQty = updated[matchIdx].quantity + change;
        if (newQty <= 0) {
          return updated.filter((_, idx) => idx !== matchIdx);
        } else {
          updated[matchIdx].quantity = newQty;
          return updated;
        }
      }
      return prev;
    });
  };

  const handleRemoveFromCart = (productId: string, size: string) => {
    setCart(prev => prev.filter(item => !(item.product.id === productId && item.selectedSize === size)));
  };

  const handleUpdateCartSize = (productId: string, oldSize: string, newSize: string) => {
    setCart(prev => {
      const matchIdx = prev.findIndex(item => item.product.id === productId && item.selectedSize === oldSize);
      if (matchIdx > -1) {
        const updated = [...prev];
        const currentItem = updated[matchIdx];
        const targetIdx = prev.findIndex(item => item.product.id === productId && item.selectedSize === newSize && item !== currentItem);
        if (targetIdx > -1) {
          updated[targetIdx].quantity += currentItem.quantity;
          return updated.filter((_, idx) => idx !== matchIdx);
        } else {
          updated[matchIdx].selectedSize = newSize;
          return updated;
        }
      }
      return prev;
    });
  };

  const handlePlaceOrder = async (customer: CustomerDetails, shippingCost: number) => {
    const orderPayload = {
      customer,
      items: cart.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        size: item.selectedSize
      })),
      totalPrice: cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
      shippingCost
    };

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });
      const data = await response.json();
      
      // Update local orders state
      setOrders(prev => [data, ...prev]);
      
      // Sync products inventory (stock counts updated on server)
      const pRes = await fetch('/api/products');
      const pData = await pRes.json();
      setProducts(pData);

      // Empty cart
      setCart([]);
    } catch (err) {
      console.error("Order submit failed, adding locally", err);
      // Fallback
      const mockOrder: Order = {
        id: "mock-" + Date.now(),
        orderNumber: "ORD-" + Math.floor(10000 + Math.random() * 90000),
        customer,
        items: orderPayload.items,
        totalPrice: orderPayload.totalPrice,
        shippingCost,
        status: 'new',
        date: new Date().toLocaleString("uk-UA")
      };
      setOrders(prev => [mockOrder, ...prev]);
      setCart([]);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: Order['status'], ttn?: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, trackingNumber: ttn })
      });
      const data = await response.json();
      
      setOrders(prev => prev.map(o => o.id === orderId ? data : o));
    } catch (err) {
      console.error("Failed to update status on server", err);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status, trackingNumber: ttn || o.trackingNumber } : o));
    }
  };

  const handleSaveLook = (name: string, tags: string[], productIds: string[]) => {
    const newLook: SavedLook = {
      id: "look-" + Date.now(),
      name,
      tags,
      productIds
    };
    setSavedLooks(prev => [newLook, ...prev]);
  };

  const handleDeleteLook = (lookId: string) => {
    setSavedLooks(prev => prev.filter(l => l.id !== lookId));
  };

  const handleAddLookToCart = (productIds: string[]) => {
    productIds.forEach(id => {
      const productObj = products.find(p => p.id === id);
      if (productObj) {
        handleAddToCart(productObj, productObj.sizes[0] || 'M');
      }
    });
    alert(`ВЕСЬ ОБРАЗ ДОДАНО ДО ТВОГО КОШИКА!`);
    setActiveTab('cart');
  };

  const handleAddProduct = async (prodPayload: any) => {
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prodPayload)
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Server responded with ${response.status}: ${errText.substring(0, 200)}`);
      }
      const data = await response.json();
      setProducts(prev => [...prev, data]);
    } catch (err) {
      console.error("Adding product to catalog failed server-side:", err);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      await fetch(`/api/products/${productId}`, { method: 'DELETE' });
      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch (it) {
      console.error(it);
    }
  };

  const handleBulkImport = (importedProducts: any[]) => {
    setProducts(prev => [...prev, ...importedProducts]);
  };

  return (
    <div className={`min-h-screen flex flex-col relative font-sans transition-colors duration-300 ${
      theme === 'light' ? 'bg-[#fbfbf9] text-zinc-900 border-stone-200' : 'bg-[#020202] text-white border-zinc-900'
    }`} id="app-wrapper">
      
      {/* GEOMETRIC BALANCE HEADER - COMPACT BUT WITH HIGHER CONTRAST & TYPOGRAPHY */}
      <header className={`border-b ${
        theme === 'light' ? 'border-stone-200 bg-white/95 text-stone-900' : 'border-zinc-800 bg-black/95 text-white'
      } sticky top-0 z-[1000] px-4 md:px-6 min-h-[48px] py-2 hidden md:flex flex-col sm:flex-row justify-between items-center font-mono text-xs gap-3`}>
        
        {/* Stark branding with elegant serif styling */}
        <div className="flex items-center gap-6">
          <span 
            className={`text-lg md:text-2xl tracking-tighter font-sans font-extrabold select-none cursor-pointer uppercase transition-colors ${
              theme === 'light' ? 'text-black' : 'text-white'
            }`}
          >
            <span 
              onClick={() => {
                setIsAdminUnlocked(true);
                setActiveTab('admin');
                localStorage.setItem("sgb_admin_unlocked", "true");
              }} 
              className="hover:text-[#ff3c3c] transition-colors"
              title="SECUM SYSTEM ACCESS"
            >
              S
            </span>
            <span onClick={() => setActiveTab('home')}>GB</span>
          </span>
          <span className={`text-[9.5px] font-mono uppercase border px-2.5 py-0.5 tracking-wider font-bold ${
            theme === 'light' ? 'border-stone-200 bg-stone-100 text-stone-600' : 'border-zinc-800 bg-black/90 text-zinc-400'
          }`}>
            {t('header_subtitle')}
          </span>
        </div>

        {/* Minimalist Controls with high ergonomics */}
        <div className="flex items-center gap-4 flex-wrap justify-center font-mono">
          
          {/* Language Selector */}
          <div className="flex items-center border border-zinc-805 rounded-sm overflow-hidden text-[10px]">
            {(['uk', 'ru', 'en'] as Language[]).map((l) => (
              <button
                key={l}
                onClick={() => changeLanguage(l)}
                className={`px-3.5 py-1.5 transition-all uppercase font-extrabold cursor-pointer ${
                  lang === l
                    ? 'bg-white text-black'
                    : 'bg-transparent text-zinc-500 hover:text-[#ff3c3c]'
                }`}
              >
                {l}
              </button>
            ))}
          </div>

        </div>

      </header>

      {/* GLITCH LINE */}
      <div className="glitch-line" />

      {/* CORE WEB APP LAYOUT NAVIGATION TABS */}
      <nav className={`border-b ${
        theme === 'light' ? 'border-stone-200 bg-white/90 text-stone-900 shadow-xs' : 'border-zinc-800 bg-black/80 text-white'
      } px-4 md:px-6 py-2.5 flex justify-between items-center text-sm font-mono select-none relative z-[999] gap-4`}>
        
        {/* DESKTOP NAV GROUP - Hidden on mobile, visible on medium and up */}
        <div className="hidden md:flex flex-wrap items-center gap-3 shrink-0 relative">
          
          {/* HOME / ГОЛОВНА */}
          <button
            onClick={() => {
              setActiveTab('home');
              setIsCatalogDropdownOpen(false);
            }}
            className={`py-2 px-5 border text-sm font-bold tracking-widest uppercase transition-all duration-300 ${
              activeTab === 'home'
                ? theme === 'light' ? 'bg-black text-white border-black font-extrabold shadow-sm' : 'bg-white text-black border-white font-extrabold shadow-[0_0_12px_rgba(255,255,255,0.2)]'
                : theme === 'light' ? 'bg-transparent text-stone-600 border-stone-200 hover:border-black hover:text-black' : 'bg-transparent text-zinc-400 border-zinc-900 hover:border-zinc-700 hover:text-white'
            }`}
          >
            {t('tab_home')}
          </button>

          {/* CATALOG / КАТАЛОГ WITH DROP-DOWN */}
          <div className="relative">
            <button
              onClick={() => {
                setActiveTab('catalog');
                setIsCatalogDropdownOpen(!isCatalogDropdownOpen);
              }}
              onMouseEnter={() => setIsCatalogDropdownOpen(true)}
              className={`py-2 px-5 border text-sm font-bold tracking-widest uppercase transition-all duration-300 flex items-center gap-1.5 ${
                activeTab === 'catalog'
                  ? theme === 'light' ? 'bg-black text-white border-black font-extrabold shadow-sm' : 'bg-white text-black border-white font-extrabold shadow-[0_0_12px_rgba(255,255,255,0.2)]'
                  : theme === 'light' ? 'bg-transparent text-stone-600 border-stone-200 hover:border-black hover:text-black' : 'bg-transparent text-zinc-400 border-zinc-900 hover:border-zinc-700 hover:text-white'
              }`}
            >
              {t('tab_catalog')} <span className="text-[9px]">{isCatalogDropdownOpen ? '▲' : '▼'}</span>
            </button>

            {/* Premium Gothic Y2K Dropdown List */}
            {isCatalogDropdownOpen && (
              <div 
                className={`absolute left-0 mt-2 w-64 border-2 p-2 shadow-2xl z-[9999] flex flex-col font-mono text-[11px] space-y-1 ${
                  theme === 'light' ? 'bg-white border-stone-300 text-black' : 'bg-black border-zinc-800 text-white'
                }`}
                onMouseLeave={() => setIsCatalogDropdownOpen(false)}
              >
                <div className={`text-[8.5px] px-2 py-1 border-b uppercase tracking-widest font-bold ${
                  theme === 'light' ? 'text-stone-400 border-stone-100' : 'text-zinc-600 border-zinc-900'
                }`}>{t('choose_category')}:</div>
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
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setActiveTab('catalog');
                      setIsCatalogDropdownOpen(false);
                    }}
                    className={`text-left px-3 py-2 border border-transparent hover:border-[#ff3c3c] hover:bg-[#ff3c3c]/10 hover:text-[#ff3c3c] transition-all uppercase tracking-wider ${
                      selectedCategory === cat.id 
                        ? theme === 'light' ? 'text-black border-stone-305 bg-stone-50 font-bold' : 'text-white border-zinc-800 bg-[#0d0d0d] font-bold' 
                        : 'text-zinc-400'
                    }`}
                  >
                    ● {cat.n}
                  </button>
                ))}
              </div>
            )}
          </div>


          {/* CUSTOMER REVIEWS / ВІДГУКИ */}
          <button
            onClick={() => {
              setActiveTab('reviews');
              setIsCatalogDropdownOpen(false);
            }}
            className={`py-2 px-5 border text-sm font-bold tracking-widest uppercase transition-all duration-300 ${
              activeTab === 'reviews'
                ? theme === 'light' ? 'bg-black text-white border-black font-extrabold shadow-sm' : 'bg-white text-black border-white font-extrabold shadow-[0_0_12px_rgba(255,255,255,0.2)]'
                : theme === 'light' ? 'bg-transparent text-stone-600 border-stone-200 hover:border-black hover:text-black' : 'bg-transparent text-zinc-400 border-zinc-900 hover:border-zinc-700 hover:text-white'
            }`}
          >
            {t('tab_reviews')}
          </button>

          {/* HASHED ADMIN ONLY VISIBLE IF ACTIVATED */}
          {activeTab === 'admin' && (
            <button
              onClick={() => setActiveTab('admin')}
              className="py-2 px-5 border text-sm font-bold tracking-widest uppercase transition-all duration-300 bg-[#ff3c3c] text-white border-white font-extrabold animate-pulse"
            >
              ● {t('tab_admin')} // SYSTEM
            </button>
          )}

        </div>

        {/* DESKTOP CART DISPLAY - Hidden on mobile */}
        <button
          onClick={() => {
            setActiveTab('cart');
            setIsCatalogDropdownOpen(false);
          }}
          className={`py-2 px-5 border transition-all text-sm font-bold uppercase tracking-widest shrink-0 hidden md:flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'cart'
              ? theme === 'light' ? 'bg-black text-white border-black font-extrabold shadow-sm' : 'bg-white text-black border-white font-extrabold'
              : theme === 'light' ? 'bg-transparent border-stone-200 text-stone-800 hover:border-black' : 'bg-transparent border-zinc-850 text-zinc-200 hover:border-zinc-500'
          }`}
        >
          <ShoppingBag size={13} />
          {t('tab_cart')} ({cart.reduce((sum, item) => sum + item.quantity, 0)})
        </button>


        {/* MOBILE LAYOUT BAR: Visible on mobile screens, hidden on desktop */}
        <div className="flex md:hidden items-center justify-between w-full font-mono text-sm">
          
          {/* Subtle Branding */}
          <div className="flex items-center gap-3">
            <span 
              onClick={() => {
                setActiveTab('home');
                setIsMobileMenuOpen(false);
              }}
              className="text-lg tracking-tighter font-sans font-extrabold cursor-pointer uppercase text-white hover:text-[#ff3c3c] transition-colors"
            >
              SGB
            </span>
            <span className="text-[9px] font-mono uppercase border border-zinc-850 bg-black/90 text-zinc-400 px-2.5 py-0.5 tracking-[0.2em] font-bold">
              {t('header_subtitle')}
            </span>
          </div>

          {/* Right items: compact basket & hamburger "три палочки" button */}
          <div className="flex items-center gap-3">
            
            {/* Minimal Mobile Cart Flag */}
            <button
              onClick={() => {
                setActiveTab('cart');
                setIsMobileMenuOpen(false);
              }}
              className={`py-1 px-3.5 border transition-all text-xs font-bold uppercase tracking-[0.15em] flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'cart'
                  ? 'bg-white text-black border-white font-extrabold'
                  : 'bg-transparent border-zinc-800 text-zinc-200 hover:border-zinc-500'
              }`}
            >
              <ShoppingBag size={11} />
              ({cart.reduce((sum, item) => sum + item.quantity, 0)})
            </button>

            {/* Custom animated 3-lines menu icon ("три палочки") */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 border border-zinc-800 hover:border-[#ff3c3c] text-zinc-400 hover:text-white transition-all focus:outline-none cursor-pointer"
              aria-label="Toggle Navigation"
            >
              <div className="w-5 h-3 flex flex-col justify-between items-center shrink-0">
                <span className={`block h-[2px] w-5 bg-current transition-all duration-300 ${isMobileMenuOpen ? 'rotate-45 translate-y-[5px]' : ''}`}></span>
                <span className={`block h-[2px] w-5 bg-current transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0 scale-x-0' : ''}`}></span>
                <span className={`block h-[2px] w-5 bg-current transition-all duration-300 ${isMobileMenuOpen ? '-rotate-45 -translate-y-[5px]' : ''}`}></span>
              </div>
            </button>

          </div>

        </div>

        {/* MOBILE EXTENDED MENU */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="absolute left-0 right-0 top-full bg-black/95 border-b-2 border-[#ff3c3c]/80 z-[9999] flex flex-col p-5 font-mono text-sm space-y-4 shadow-[0_20px_40px_rgba(255,60,60,0.15)] md:hidden overflow-hidden backdrop-blur-md"
            >
              {/* JAPAN VIBE HEADER DECORATOR */}
              <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                <span className="text-[10px] text-[#ff3c3c] font-black tracking-[0.25em] uppercase">セクム // SGB SECUM COUTURE</span>
                <span className="text-[8px] border border-[#ff3c3c]/40 text-zinc-400 px-1.5 py-0.5 tracking-wider">MOBI_SYS_v2.0</span>
              </div>

              <div className="flex flex-col space-y-2">
                
                {/* Home */}
                <button
                  onClick={() => {
                    setActiveTab('home');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`text-left px-4 py-3 border uppercase tracking-widest font-black text-xs transition-all duration-200 cursor-pointer ${
                    activeTab === 'home' 
                      ? 'bg-white text-black border-white shadow-md' 
                      : 'bg-transparent text-zinc-300 border-zinc-900 hover:border-[#ff3c3c]/50'
                  }`}
                >
                  ● {t('tab_home')}
                </button>

                {/* Expanded Catalog Categories inside burger list */}
                <div className="flex flex-col space-y-1.5 bg-zinc-950 p-3 border border-zinc-900">
                  <div className="text-[9px] text-[#ff3c3c] uppercase tracking-widest font-black px-1 pb-1 flex justify-between">
                    <span>● {t('tab_catalog')} // CATEGORIES</span>
                    <span className="animate-pulse">Active</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
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
                        onClick={() => {
                          setSelectedCategory(cat.id);
                          setActiveTab('catalog');
                          setIsMobileMenuOpen(false);
                        }}
                        className={`text-center py-2 text-[10px] uppercase tracking-wider transition-all duration-150 border cursor-pointer ${
                          selectedCategory === cat.id 
                            ? 'text-white border-[#ff3c3c] font-black bg-[#ff3c3c]/10' 
                            : 'text-zinc-500 border-transparent hover:text-zinc-200 hover:bg-zinc-900/50'
                        }`}
                      >
                        {cat.n}
                      </button>
                    ))}
                  </div>
                </div>


                {/* Reviews */}
                <button
                  onClick={() => {
                    setActiveTab('reviews');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`text-left px-4 py-3 border uppercase tracking-widest font-black text-xs transition-colors duration-250 cursor-pointer ${
                    activeTab === 'reviews' 
                      ? 'bg-white text-black border-white shadow-md' 
                      : 'bg-transparent text-zinc-300 border-zinc-900 hover:border-[#ff3c3c]/50'
                  }`}
                >
                  ● {t('tab_reviews')}
                </button>

                {/* Cart link */}
                <button
                  onClick={() => {
                    setActiveTab('cart');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`text-left px-4 py-3 border uppercase tracking-widest font-black text-xs flex justify-between items-center transition-colors duration-250 cursor-pointer ${
                    activeTab === 'cart' 
                      ? 'bg-[#ff3c3c] text-white border-[#ff3c3c] shadow-lg shadow-[#ff3c3c]/20' 
                      : 'bg-transparent text-zinc-300 border-zinc-900 hover:border-[#ff3c3c]/50'
                  }`}
                >
                  <span>● {t('tab_cart')}</span>
                  <span className={`px-2 py-0.5 text-[10px] font-black font-mono rounded ${activeTab === 'cart' ? 'bg-white text-black' : 'bg-[#ff3c3c] text-white'}`}>
                    {cart.reduce((sum, item) => sum + item.quantity, 0)} од
                  </span>
                </button>

              </div>

              {/* Language Selection inside mobile dropdown */}
              <div className="pt-1 flex flex-col space-y-2">
                <span className="text-[10px] text-zinc-400 font-bold tracking-wider uppercase">● МОВА / LANGUAGE</span>
                <div className="grid grid-cols-3 border border-zinc-900 text-xs overflow-hidden rounded-sm bg-[#0a0a0a]">
                  {(['uk', 'ru', 'en'] as Language[]).map((l) => (
                    <button
                      key={l}
                      onClick={() => {
                        changeLanguage(l);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`py-2 text-center transition-all uppercase cursor-pointer ${
                        lang === l
                          ? 'bg-white text-black font-extrabold'
                          : 'bg-transparent text-zinc-500 hover:text-white'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </nav>

      {/* GEOMETRIC ASYMMETRICAL WRAPPER - STRETCHES WIDER & SIT CLOSER TO SCREEN EDGES */}
      <div className={`flex-1 flex max-w-[1550px] mx-auto w-full border-x relative ${
        theme === 'light' ? 'border-stone-100' : 'border-zinc-900'
      }`}>
        
        {/* ARCHITECTURAL OUTERSIDE DESIGN ELEMENTS / GOTHIC CROSS CORNER NOTCHES FOR THE BUILDINGS VIBE */}
        <div className={`absolute top-3 left-3 pointer-events-none z-50 mix-blend-difference select-none`}>
          <div className="w-8 h-px bg-white" />
          <div className="h-8 w-px bg-white absolute top-0 left-0" />
          <span className="text-[16px] text-white absolute -top-[8px] -left-[4.5px] font-serif leading-none select-none font-bold">✙</span>
        </div>
        <div className={`absolute top-3 right-3 pointer-events-none z-50 mix-blend-difference select-none`}>
          <div className="w-8 h-px bg-white" />
          <div className="h-8 w-px bg-white absolute top-0 right-0" />
          <span className="text-[16px] text-white absolute -top-[8px] -right-[4.5px] font-serif leading-none select-none font-bold">✙</span>
        </div>
        <div className={`absolute bottom-3 left-3 pointer-events-none z-50 mix-blend-difference select-none`}>
          <div className="w-8 h-px bg-white" />
          <div className="h-8 w-px bg-white absolute bottom-0 left-0" />
          <span className="text-[16px] text-white absolute -bottom-[10px] -left-[4.5px] font-serif leading-none select-none font-bold">✙</span>
        </div>
        <div className={`absolute bottom-3 right-3 pointer-events-none z-50 mix-blend-difference select-none`}>
          <div className="w-8 h-px bg-white" />
          <div className="h-8 w-px bg-white absolute bottom-0 right-0" />
          <span className="text-[16px] text-white absolute -bottom-[10px] -right-[4.5px] font-serif leading-none select-none font-bold">✙</span>
        </div>

        {/* PRIMARY VIEWS LAYOUT BODY WITH FRAMER MOTION TRANSITIONS */}
        <main className="flex-1 px-3 py-4 md:px-6 md:py-8 overflow-hidden bg-[#020202] relative z-10">
          
          <AnimatePresence mode="wait">
            {activeTab === 'home' && (
              <motion.div
                key="home"
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.2 }}
                className="space-y-12 pb-16 relative"
              >
                {/* 1. MULTI-THEME DYNAMIC HERO SECTION (SWISS MODULAR VS. JAPANESE VINTAGE) */}
                <div 
                  className={`relative w-full overflow-hidden border-2 grid grid-cols-1 lg:grid-cols-12 gap-0 transition-all duration-700 min-h-[580px] lg:min-h-[520px] ${
                    heroTheme === 'japanese' 
                      ? 'border-[#ff3c3c]/40 shadow-[0_0_50px_rgba(255,60,60,0.12)]' 
                      : theme === 'light' ? 'border-stone-200 bg-stone-50' : 'border-zinc-900 bg-black/40'
                  }`} 
                  id="home-hero"
                >
                  
                  {/* BACKGROUND LAYER 1 - JAPANESE VINTAGE PICTURE IN PERFECT CROSSFADE */}
                  <div 
                    className={`absolute inset-y-0 left-0 w-full lg:w-[58.333333%] z-0 transition-all duration-1000 ease-in-out pointer-events-none bg-[#020202] ${
                      heroTheme === 'japanese' ? 'opacity-[0.95] scale-100 rotate-0 filter blur-0' : 'opacity-0 scale-105 rotate-1 filter blur-sm'
                    }`}
                    style={{
                      backgroundImage: `linear-gradient(to right, rgba(0,0,0,1.0) 0%, rgba(0,0,0,0.85) 25%, rgba(0,0,0,0.6) 65%, rgba(0,0,0,0.45) 100%), url('/images/japanese_vntg_bg_1782107684656.jpg')`,
                      backgroundPosition: 'right center',
                      backgroundSize: 'auto 100%',
                      backgroundRepeat: 'no-repeat'
                    }}
                  />

                  {/* BACKGROUND LAYER 2 - SWISS THEME RADIAL BACKGROUND PATTERN */}
                  <div 
                    className={`absolute inset-0 z-0 transition-opacity duration-1000 ease-in-out pointer-events-none bg-radial-grid ${
                      heroTheme === 'swiss' ? 'opacity-100' : 'opacity-0'
                    }`}
                  />

                  {/* LEFT COLUMN: BRAND GRID (SWISS OR JAPANESE VIBE) */}
                  <div className={`lg:col-span-7 flex flex-col justify-between p-6 md:p-10 relative z-10 border-b lg:border-b-0 lg:border-r transition-colors duration-500 ${
                    heroTheme === 'japanese' ? 'border-[#ff3c3c]/30 bg-black/10' : 'border-zinc-900'
                  }`}>
                    
                    {/* Upper Clean Branding Row / Replaces technical-larping info with pristine high-fashion metadata */}
                    <div className="flex items-center justify-between text-[11px] font-sans text-zinc-400 font-semibold uppercase tracking-wider select-none">
                      <span className={heroTheme === 'japanese' ? 'text-[#ff3c3c] font-black animate-pulse' : 'text-zinc-400'}>
                        {heroTheme === 'japanese' ? '● VINTAGE JAPANESE' : '● SWISS ARCHITECTURE'}
                      </span>
                      <span>COLLECTION 2026</span>
                    </div>

                    {/* DYNAMIC CONTENT DEPENDING ON THE ACTIVE THEME */}
                    {heroTheme === 'swiss' ? (
                      /* SWISS THEME TYPOGRAPHY */
                      <div className="space-y-6 my-10 lg:my-14 text-left">
                        <div className="inline-block py-1 px-3 bg-white text-black font-sans text-[11px] font-bold tracking-[0.2em] uppercase">
                          {t('header_subtitle')}
                        </div>
                        <h1 className="text-4xl sm:text-6xl md:text-7xl font-sans font-bold tracking-tighter leading-[0.9] text-white uppercase select-none">
                          SGB <br />
                          <span className="text-zinc-500 font-light tracking-wide inline-flex items-center gap-3">
                            <span 
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                setIsAdminUnlocked(true);
                                setActiveTab('admin');
                                localStorage.setItem("sgb_admin_unlocked", "true");
                              }} 
                              className="cursor-pointer hover:text-[#ff3c3c] transition-colors duration-200"
                              title="SECUM SYSTEM LOGIN"
                            >SECUM</span>
                          </span>
                        </h1>
                        <p className="text-xs sm:text-sm md:text-base font-sans text-zinc-400 font-medium tracking-wide uppercase leading-relaxed max-w-xl">
                          {t('hero_subtitle')}
                        </p>

                      </div>
                    ) : (
                      /* JAPANESE VINTAGE // MACHINE GIRL // IRESUMI THEME TYPOGRAPHY */
                      <div className="space-y-6 my-8 lg:my-12 text-left relative overflow-hidden">
                        {/* Huge Japanese Vertical Watermark on background */}
                        <div className="absolute right-0 top-0 bottom-0 select-none pointer-events-none opacity-20 text-[55px] font-sans font-black uppercase text-[#ff3c3c] leading-none text-right flex flex-col justify-center select-none" style={{ writingMode: 'vertical-rl' }}>
                          セкам • 雅
                        </div>

                        <div className="inline-block py-1 px-3 bg-[#ff3c3c] text-white font-mono text-[10px] font-black tracking-[0.25em] uppercase">
                          LIMITED SPECIAL JAPANESE SECTOR
                        </div>
                        <h1 className="text-4xl sm:text-6xl md:text-[66px] font-sans font-extrabold tracking-tight leading-[0.85] text-white uppercase select-none">
                          <span className="text-[#ff3c3c] font-black glitch-text">エスジービー</span> <br />
                          SGB // SECUM
                        </h1>
                        <div className="text-xs sm:text-sm md:text-base font-sans text-zinc-300 font-bold tracking-wide uppercase leading-relaxed max-w-lg border-l-2 border-[#ff3c3c] pl-4 space-y-3">
                          <p className="text-white">-піздеееец єто што те самие вещі с пінтереста y2k japanese vintage goth fagot minet 3000 pro aesthetic по самой низкой цене і іх нігде не найті в украине !!??!?!?!</p>
                          <p className="text-white font-extrabold">-да</p>
                        </div>

                      </div>
                    )}

                    {/* Bottom controls and theme selections */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-6 border-t border-zinc-900/60 font-sans">
                      
                      {/* Catalog Redirection Button */}
                      <button
                        onClick={() => {
                          setSelectedCategory('all');
                          setActiveTab('catalog');
                        }}
                        className={`group flex items-center justify-between gap-4 px-6 py-4 transition-all duration-300 font-sans font-bold text-xs uppercase tracking-widest cursor-pointer ${
                          heroTheme === 'japanese' 
                            ? 'bg-[#ff3c3c] hover:bg-white hover:text-black text-white' 
                            : 'bg-white hover:bg-zinc-100 text-black'
                        }`}
                      >
                        <span>{t('tab_catalog')}</span>
                        <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1.5" />
                      </button>

                      {/* COLLECTION SELECTOR BETWEEN THEMES */}
                      <div className="flex items-center gap-3 bg-black/95 border border-zinc-900 px-3.5 py-2.5 rounded-sm select-none">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setHeroTheme(prev => prev === 'swiss' ? 'japanese' : 'swiss');
                          }}
                          className="w-7 h-7 rounded-sm border border-zinc-800 hover:border-[#ff3c3c] hover:text-[#ff3c3c] flex items-center justify-center transition-all bg-black cursor-pointer text-zinc-400"
                          title="PREVIOUS COLLECTION"
                        >
                          <ChevronLeft size={15} />
                        </button>
                        <div className="flex flex-col items-center min-w-[125px] text-center">
                          <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest block mb-0.5">THEME STYLING</span>
                          <span className="text-[10px] font-sans font-black tracking-widest text-white uppercase whitespace-nowrap">
                            {heroTheme === 'swiss' ? 'SWISS MODULAR' : 'JAPANESE VINTAGE'}
                          </span>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setHeroTheme(prev => prev === 'swiss' ? 'japanese' : 'swiss');
                          }}
                          className="w-7 h-7 rounded-sm border border-zinc-800 hover:border-[#ff3c3c] hover:text-[#ff3c3c] flex items-center justify-center transition-all bg-black cursor-pointer text-zinc-400"
                          title="NEXT COLLECTION"
                        >
                          <ChevronRight size={15} />
                        </button>
                      </div>

                    </div>
                  </div>

                  {/* RIGHT COLUMN: REIMAGINED SHOWCASE (COLOR PRODUCTS, ARTWORK POSITION FIXED HIGHER) */}
                  <div className={`lg:col-span-5 relative h-[440px] lg:h-auto overflow-hidden flex flex-col justify-between p-6 select-none transition-all duration-700 ${
                    heroTheme === 'japanese' ? 'bg-zinc-950/90 border-t lg:border-t-0 border-[#ff3c3c]/20' : 'bg-zinc-950'
                  }`}>
                    
                    {/* FLIPPED PIXELATED COSMIC SIGIL BACKGROUND OVERLAY INSIDE THE PRODUCT SWITCHER */}
                    <div 
                      className={`absolute top-0 bottom-0 left-0 w-full z-0 pointer-events-none scale-x-[-1] bg-cover mix-blend-screen transition-all duration-1000 ${
                        heroTheme === 'japanese' ? 'opacity-[0.45] translate-x-0' : 'opacity-[0.08] -translate-x-4'
                      }`}
                      style={{
                        backgroundImage: `url('/images/sigil_bg.jpg')`,
                        backgroundPosition: 'left center'
                      }}
                    />
                    
                    {/* Background featured product artwork with luxurious Liquid Morph transition */}
                    {DEFAULT_PRODUCTS.length > 0 && (() => {
                      const activeProd = DEFAULT_PRODUCTS[heroActiveIndex % DEFAULT_PRODUCTS.length];
                      return (
                        <>
                          {/* Slideshow Top Meta Row */}
                          <div className="relative z-10 flex items-start justify-between">
                            <div className={`font-mono text-[9px] tracking-[0.25em] uppercase font-bold bg-black/80 px-2.5 py-1 border ${
                              heroTheme === 'japanese' ? 'text-[#ff3c3c] border-[#ff3c3c]/30' : 'text-white border-zinc-900'
                            }`}>
                              OBJECT // {activeProd.category.toUpperCase()}
                            </div>
                            <span className="font-mono text-xs text-zinc-500 font-bold bg-black/40 px-1.5 py-0.5 rounded-sm">
                              {(heroActiveIndex % DEFAULT_PRODUCTS.length + 1).toString().padStart(2, '0')} / {DEFAULT_PRODUCTS.length.toString().padStart(2, '0')}
                            </span>
                          </div>

                          {/* DEDICATED CENTERED PRODUCT STAGE (PREVENTS JUMPING) */}
                          <div className="relative flex-1 min-h-[190px] lg:min-h-[250px] flex items-center justify-center my-2 z-10 overflow-hidden">
                            <AnimatePresence mode="popLayout" initial={false}>
                              <motion.div 
                                key={activeProd.id}
                                initial={{ opacity: 0, scale: 0.85, filter: 'blur(20px) contrast(140%)', rotate: -6 }}
                                animate={{ opacity: 1, scale: 1, filter: 'blur(0px) contrast(100%)', rotate: 0 }}
                                exit={{ opacity: 0, scale: 1.15, filter: 'blur(20px) contrast(140%)', rotate: 6 }}
                                transition={{ 
                                  duration: 0.45, 
                                  ease: "easeInOut"
                                }}
                                className="absolute inset-0 m-auto w-[85%] h-[85%] flex items-center justify-center pointer-events-none"
                              >
                                <img 
                                  src={activeProd.image} 
                                  alt={activeProd.name}
                                  className="max-h-full max-w-full object-contain filter drop-shadow-[0_12px_32px_rgba(0,0,0,0.95)]"
                                />
                              </motion.div>
                            </AnimatePresence>
                          </div>
                          
                          <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black via-black/85 to-transparent pointer-events-none z-10" />
 
                          {/* Slideshow Bottom Info Card - Morph Animated with Info box */}
                          <div className="relative z-20 space-y-3.5">
                            <AnimatePresence mode="wait">
                              <motion.div 
                                key={activeProd.id}
                                initial={{ opacity: 0, y: 15, rotateX: 6 }}
                                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                                exit={{ opacity: 0, y: -15, rotateX: -6 }}
                                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                                className={`p-4 border backdrop-blur-sm space-y-1.5 transition-colors duration-500 ${
                                  heroTheme === 'japanese' ? 'bg-black/95 border-[#ff3c3c]/20 shadow-[0_4px_24px_rgba(255,60,60,0.08)]' : 'bg-black/90 border-zinc-900'
                                }`}
                              >
                                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block font-extrabold">
                                  {activeProd.riddickRating || "COLLECTION 2026"}
                                </span>
                                <h3 className="text-base md:text-lg font-sans font-extrabold tracking-tight text-white uppercase leading-none">
                                  {activeProd.name}
                                </h3>
                                <div className="flex items-center justify-between pt-1 text-xs">
                                  <span className={`font-mono font-bold text-sm ${heroTheme === 'japanese' ? 'text-[#ff3c3c]' : 'text-white'}`}>
                                    {activeProd.price} UAH
                                  </span>
                                  <span className="font-mono text-zinc-400 uppercase text-[9.5px] tracking-wider bg-zinc-900/60 px-2 py-0.5 border border-zinc-800">
                                    {activeProd.sizes.join(', ')}
                                  </span>
                                </div>
                              </motion.div>
                            </AnimatePresence>
 
                            {/* Controls */}
                            <div className="grid grid-cols-2 gap-2">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setHeroActiveIndex(prev => prev === 0 ? DEFAULT_PRODUCTS.length - 1 : prev - 1);
                                }}
                                className={`bg-black hover:bg-zinc-900 border text-white p-2.5 transition-all duration-300 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer ${
                                  heroTheme === 'japanese' ? 'border-[#ff3c3c]/20 hover:border-[#ff3c3c] text-zinc-300 hover:text-[#ff3c3c]' : 'border-zinc-900 hover:text-zinc-200'
                                }`}
                              >
                                <ChevronLeft className="w-3.5 h-3.5" />
                                <span>PREV</span>
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setHeroActiveIndex(prev => (prev + 1) % DEFAULT_PRODUCTS.length);
                                }}
                                className={`bg-black hover:bg-zinc-900 border text-white p-2.5 transition-all duration-300 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer ${
                                  heroTheme === 'japanese' ? 'border-[#ff3c3c]/20 hover:border-[#ff3c3c] text-zinc-300 hover:text-[#ff3c3c]' : 'border-zinc-900 hover:text-zinc-200'
                                }`}
                              >
                                <span>NEXT</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                </div>

                {/* 2. CATEGORIES SECTION (USING BEAUTIFUL HIGH-FASHION BACKGROUNDS AS MANDATED) */}
                <div className="space-y-6 pt-6">
                  <div className="text-center space-y-2">
                    <span className="text-zinc-600 text-xs block tracking-widest">● ● ●</span>
                    <h2 className="text-xl md:text-3xl font-sans tracking-tight font-extrabold uppercase text-white">
                      {t('tab_catalog')}
                    </h2>
                    <p className="text-[10px] font-mono uppercase tracking-wider font-bold text-zinc-500">
                      {t('choose_category')}
                    </p>
                  </div>

                  {/* HIGH-FIDELITY ERGONOMIC WIDE WHITE BUTTON - SHOWN FIRST ON MOBILE */}
                  <div className="flex justify-center w-full px-4 sm:px-0">
                    <button
                      onClick={() => {
                        setSelectedCategory('all');
                        setActiveTab('catalog');
                        setTimeout(() => document.getElementById('catalog-root')?.scrollIntoView({ behavior: 'smooth' }), 100);
                      }}
                      className="w-full max-w-2xl bg-white hover:bg-zinc-100 text-black py-4.5 px-6 text-xs sm:text-sm font-sans font-black uppercase tracking-[0.2em] transition-all border border-zinc-200 flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl active:scale-98 cursor-pointer rounded-sm"
                    >
                      <span>ДИВИТИСЯ ВСІ ТОВАРИ</span>
                      <ArrowRight className="w-4.5 h-4.5 text-black transition-transform duration-300 shrink-0" />
                    </button>
                  </div>

                  {/* 2 Portrait Columns side-by-side - High-fashion specific model photos for category covers */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Item 1: TOPS */}
                    <div 
                      onClick={() => {
                        setSelectedCategory('top');
                        setActiveTab('catalog');
                        setTimeout(() => document.getElementById('catalog-root')?.scrollIntoView({ behavior: 'smooth' }), 100);
                      }}
                      className="group cursor-pointer relative h-[360px] md:h-[420px] border-2 border-zinc-900 hover:border-[#ff3c3c]/80 transition-all duration-700 bg-black overflow-hidden flex flex-col justify-end"
                    >
                      <div 
                        className="absolute inset-0 bg-cover bg-center opacity-85 group-hover:scale-[1.03] transition-all duration-1000 pointer-events-none" 
                        style={{ backgroundImage: "url('/implants/photo_21_2026-06-22_02-37-00.png')" }} 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent pointer-events-none" />
                      
                      <div className="p-5 z-10 w-full">
                        <div className="bg-black/95 border border-zinc-900 group-hover:border-[#ff3c3c] p-4 transition-all duration-500 text-center backdrop-blur-xs">
                          <h3 className="text-base md:text-lg font-mono font-extrabold tracking-[0.15em] uppercase text-white">
                            {t('cat_top')}
                          </h3>
                        </div>
                      </div>
                    </div>

                    {/* Item 2: PANTS */}
                    <div 
                      onClick={() => {
                        setSelectedCategory('bottom');
                        setActiveTab('catalog');
                        setTimeout(() => document.getElementById('catalog-root')?.scrollIntoView({ behavior: 'smooth' }), 100);
                      }}
                      className="group cursor-pointer relative h-[360px] md:h-[420px] border-2 border-zinc-900 hover:border-[#ff3c3c]/80 transition-all duration-700 bg-black overflow-hidden flex flex-col justify-end"
                    >
                      <div 
                        className="absolute inset-0 bg-cover bg-center opacity-85 group-hover:scale-[1.03] transition-all duration-1000 pointer-events-none" 
                        style={{ backgroundImage: "url('/implants/photo_1_2026-06-22_02-37-00.png')" }} 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent pointer-events-none" />
                      
                      <div className="p-5 z-10 w-full">
                        <div className="bg-black/95 border border-zinc-900 group-hover:border-[#ff3c3c] p-4 transition-all duration-500 text-center backdrop-blur-xs">
                          <h3 className="text-base md:text-lg font-mono font-extrabold tracking-[0.15em] uppercase text-white">
                            {t('cat_bottom')}
                          </h3>
                        </div>
                      </div>
                    </div>

                  </div>

                </div>
                {/* 4. FOOTER WITH RECTIFIED COMPACT ERGONOMIC BUTTONS */}
                <footer className={`border-t pt-8 pb-4 text-center space-y-6 ${
                  theme === 'light' ? 'border-stone-200' : 'border-zinc-800'
                }`}>
                  <div className="flex flex-col md:flex-row justify-between items-center gap-6 pb-6">
                    <div className="text-left font-mono">
                      <span className={`font-extrabold tracking-widest text-[11px] uppercase block ${
                        theme === 'light' ? 'text-black' : 'text-white'
                      }`}>© 2026 SGB // SECUM COUTURE</span>
                      <span className="text-zinc-500 text-[9px] uppercase tracking-widest block mt-1">Coastal workspace. Technical description focus.</span>
                    </div>

                    {/* Highly ergonomic social switches containing ONLY BIG ICONS with zero usernames/handles explicitly displayed */}
                    <div className="flex flex-wrap gap-4 font-mono text-sm">
                      <a 
                        href="https://www.tiktok.com/@truekman" 
                        target="_blank" 
                        referrerPolicy="no-referrer"
                        className={`border px-6 py-4 font-black transition-all flex items-center justify-center gap-3 active:scale-95 ${
                          theme === 'light' 
                            ? 'bg-stone-50 border-stone-250 text-black hover:bg-black hover:text-white shadow-xs' 
                            : 'bg-zinc-950 border-zinc-805 text-zinc-200 hover:border-white hover:text-white shadow-xl'
                        }`}
                        title="TIKTOK"
                      >
                        <Music className="w-6 h-6 shrink-0" />
                        <span className="tracking-[0.2em] font-extrabold">TIKTOK</span>
                      </a>
                      <a 
                        href="https://t.me/SGB_secum" 
                        target="_blank" 
                        referrerPolicy="no-referrer"
                        className={`px-6 py-4 font-black transition-all flex items-center justify-center gap-3 active:scale-95 ${
                          theme === 'light'
                            ? 'bg-black text-white hover:bg-zinc-800 shadow-sm'
                            : 'bg-white text-black hover:bg-zinc-200 shadow-xl'
                        }`}
                        title="TELEGRAM"
                      >
                        <Send className="w-6 h-6 shrink-0" />
                        <span className="tracking-[0.2em] font-extrabold">TELEGRAM</span>
                      </a>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-center gap-6 text-[8.5px] text-zinc-500 font-mono uppercase tracking-widest pt-4 border-t border-zinc-950">
                    <span>ПОЛІТИКА КОНФІДЕНЦІЙНОСТІ // PRIVACY POLICY</span>
                    <span>•</span>
                    <span>ПРАВА СПОЖИВАЧІВ // 14-DAYS RETURN VALUE</span>
                    <span>•</span>
                    <span>ОБМІН ТА ПОВЕРНЕННЯ // EXCH POLICY</span>
                  </div>
                </footer>
              </motion.div>
            )}


            {activeTab === 'catalog' && (
              <motion.div
                key="catalog"
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.2 }}
              >
                <Catalog
                  products={products}
                  onAddToCart={handleAddToCart}
                  onSaveLook={handleSaveLook}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  onUnlockAdmin={() => {
                    setIsAdminUnlocked(true);
                    localStorage.setItem('sgb_admin_unlocked', 'true');
                    navigateTo('admin');
                  }}
                  selectedProductId={selectedProductId}
                  onSelectProductId={(id) => navigateTo('catalog', id)}
                />
              </motion.div>
            )}

            {activeTab === 'cart' && (
              <motion.div
                key="cart"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.25 }}
              >
                <CartAndCheckout
                  cartItems={cart}
                  onUpdateQuantity={handleUpdateCartQty}
                  onUpdateSize={handleUpdateCartSize}
                  onRemoveItem={handleRemoveFromCart}
                  onPlaceOrder={handlePlaceOrder}
                />
              </motion.div>
            )}

            {activeTab === 'admin' && (
              <motion.div
                key="admin"
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.2 }}
              >
                <CrmDashboard
                  orders={orders}
                  products={products}
                  onAddProduct={handleAddProduct}
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                  onDeleteProduct={handleDeleteProduct}
                  onBulkImport={handleBulkImport}
                />
              </motion.div>
            )}

            {activeTab === 'reviews' && (
              <motion.div
                key="reviews"
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.2 }}
              >
                <Reviews lang={lang} theme={theme} />
              </motion.div>
            )}
          </AnimatePresence>

        </main>
      </div>

      {/* GLITCH LINE */}
      <div className="glitch-line" />

      {/* FOOTER */}
      <footer className="border-t-2 border-white py-8 px-6 text-center font-mono text-[10px] text-zinc-400 bg-[#050505]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-center items-center gap-4">
          <span className="tracking-widest uppercase font-extrabold text-white">©2026 SGB // ALL ARTIFACTS INVENTORIED</span>
        </div>
      </footer>

      {/* FLOATING MOBILE CART BUTTON */}
      {cart.reduce((sum, item) => sum + item.quantity, 0) > 0 && (
        <button
          onClick={() => setActiveTab('cart')}
          className="fixed bottom-6 right-6 md:hidden z-[9999] h-14 w-14 rounded-full bg-black border-2 border-[#ff3c3c] flex items-center justify-center shadow-[0_0_20px_rgba(255,60,60,0.5)] active:scale-90 transition-transform cursor-pointer"
        >
          <ShoppingBag className="w-6 h-6 text-white" />
          <span className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] bg-[#ff3c3c] text-white text-[11px] font-black rounded-full flex items-center justify-center px-1 font-mono border border-black animate-pulse">
            {cart.reduce((sum, item) => sum + item.quantity, 0)}
          </span>
        </button>
      )}

      {/* SCROLL TO TOP BUTTON */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-24 right-6 md:bottom-8 md:right-8 z-50 h-12 w-12 bg-[#ff3c3c] hover:bg-white text-white hover:text-black border-2 border-transparent hover:border-black flex items-center justify-center shadow-lg active:scale-90 transition-all cursor-pointer rounded-none group"
            title="Вгору"
          >
            <ArrowUp className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>

    </div>
  );
}
