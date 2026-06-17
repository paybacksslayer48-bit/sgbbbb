import { useState, useEffect } from 'react';
import { Product, CartItem, Order, SavedLook, CustomerDetails } from './types';
import Catalog from './components/Catalog';
import FittingRoom from './components/FittingRoom';
import CartAndCheckout from './components/CartAndCheckout';
import Cabinet from './components/Cabinet';
import CrmDashboard from './components/CrmDashboard';
import Reviews from './components/Reviews';
import { Language, translations } from './translations';
import { ShoppingBag, Laptop, Layers, Users2, Database, ShieldCheck, Heart, Sparkles, User, HelpCircle, Send, Music } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [activeTab, setActiveTab ] = useState<'home' | 'catalog' | 'info' | 'reviews' | 'cart' | 'admin'>('home');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCatalogDropdownOpen, setIsCatalogDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
  const [products, setProducts] = useState<Product[]>([]);
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
        setProducts(pData);

        const oRes = await fetch('/api/orders');
        const oData = await oRes.json();
        setOrders(oData);

        setDbSynced(true);
      } catch (err) {
        console.warn("Backend loading offline, using local memory fallbacks", err);
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

  const handlePlaceOrder = async (customer: CustomerDetails, shippingCost: number) => {
    const orderPayload = {
      customer,
      items: cart.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        price: Math.round(item.product.price * 0.8),
        size: item.selectedSize
      })),
      totalPrice: cart.reduce((sum, item) => sum + Math.round(item.product.price * 0.8) * item.quantity, 0),
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
            className={`text-base md:text-xl tracking-[0.25em] font-gothic font-black select-none cursor-pointer uppercase transition-colors ${
              theme === 'light' ? 'text-black' : 'text-white'
            }`}
          >
            <span 
              onClick={() => {
                setIsAdminUnlocked(true);
                setActiveTab('admin');
                localStorage.setItem("sgb_admin_unlocked", "true");
              }} 
              className="hover:text-[#8a0303] transition-colors"
              title="SECUM SYSTEM ACCESS"
            >
              S
            </span>
            <span onClick={() => setActiveTab('home')}>GB</span>
          </span>
          <span className={`text-[9px] font-mono uppercase border px-2 py-0.5 tracking-[0.2em] font-bold ${
            theme === 'light' ? 'border-stone-200 bg-stone-100 text-stone-605' : 'border-zinc-800 bg-black/90 text-zinc-400'
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
                    : 'bg-transparent text-zinc-500 hover:text-[#8a0303]'
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
                  { id: 'top', n: t('cat_top') },
                  { id: 'bottom', n: t('cat_bottom') },
                  { id: 'accessories', n: t('cat_accessories') },
                  { id: 'shoes', n: t('cat_shoes') },
                  { id: 'outerwear', n: t('cat_outerwear') }
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setActiveTab('catalog');
                      setIsCatalogDropdownOpen(false);
                    }}
                    className={`text-left px-3 py-2 border border-transparent hover:border-[#8a0303] hover:bg-[#8a0303]/10 hover:text-[#8a0303] transition-all uppercase tracking-wider ${
                      selectedCategory === cat.id 
                        ? theme === 'light' ? 'text-black border-stone-305 bg-stone-50 font-bold' : 'text-white border-zinc-800 bg-[#0d0d0d] font-bold' 
                        : 'text-zinc-405'
                    }`}
                  >
                    ✙ {cat.n}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* SHOP INFO / ІНФО */}
          <button
            onClick={() => {
              setActiveTab('info');
              setIsCatalogDropdownOpen(false);
            }}
            className={`py-2 px-5 border text-sm font-bold tracking-widest uppercase transition-all duration-300 ${
              activeTab === 'info'
                ? theme === 'light' ? 'bg-black text-white border-black font-extrabold shadow-sm' : 'bg-white text-black border-white font-extrabold shadow-[0_0_12px_rgba(255,255,255,0.2)]'
                : theme === 'light' ? 'bg-transparent text-stone-600 border-stone-200 hover:border-black hover:text-black' : 'bg-transparent text-zinc-400 border-zinc-900 hover:border-zinc-700 hover:text-white'
            }`}
          >
            {t('tab_info')}
          </button>

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
              className="py-2 px-5 border text-sm font-bold tracking-widest uppercase transition-all duration-300 bg-[#8a0303] text-white border-white font-extrabold animate-pulse"
            >
              ✙ {t('tab_admin')} // SYSTEM
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
              className="text-base tracking-[0.25em] font-gothic font-black cursor-pointer uppercase text-white hover:text-[#8a0303] transition-colors"
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
              className="p-2 border border-zinc-800 hover:border-[#8a0303] text-zinc-400 hover:text-white transition-all focus:outline-none cursor-pointer"
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

        {/* MOBILE EXTENDED MENU - Dropdown dropdown list of everything with smooth transitions */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="absolute left-0 right-0 top-full bg-[#050505] border-b-2 border-zinc-850 z-[9999] flex flex-col p-4 font-mono text-sm space-y-4 shadow-[0_15px_30px_rgba(0,0,0,0.95)] md:hidden overflow-hidden"
            >
              <div className="flex flex-col space-y-1.5 border-b border-zinc-900 pb-3">
                
                {/* Home */}
                <button
                  onClick={() => {
                    setActiveTab('home');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`text-left px-3 py-2.5 border uppercase tracking-widest font-black text-xs transition-colors duration-250 cursor-pointer ${
                    activeTab === 'home' ? 'bg-white text-black border-white' : 'bg-transparent text-zinc-300 border-zinc-900 hover:border-zinc-700'
                  }`}
                >
                  ✙ {t('tab_home')}
                </button>

                {/* Expanded Catalog Categories inside burger list */}
                <div className="flex flex-col space-y-1 bg-neutral-950 p-2.5 border border-zinc-900">
                  <div className="text-[9px] text-[#8a0303] uppercase tracking-widest font-black px-2 py-0.5">✙ {t('tab_catalog')} // FILES</div>
                  {[
                    { id: 'all', n: t('cat_all') },
                    { id: 'top', n: t('cat_top') },
                    { id: 'bottom', n: t('cat_bottom') },
                    { id: 'accessories', n: t('cat_accessories') },
                    { id: 'shoes', n: t('cat_shoes') },
                    { id: 'outerwear', n: t('cat_outerwear') }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        setActiveTab('catalog');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`text-left px-4 py-1.5 text-xs uppercase tracking-wider transition-all cursor-pointer ${
                        selectedCategory === cat.id 
                          ? 'text-white border-l-2 border-[#8a0303] pl-2 font-bold bg-[#8a0303]/10' 
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      ✙ {cat.n}
                    </button>
                  ))}
                </div>

                {/* Info */}
                <button
                  onClick={() => {
                    setActiveTab('info');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`text-left px-3 py-2.5 border uppercase tracking-widest font-black text-xs transition-colors duration-250 cursor-pointer ${
                    activeTab === 'info' ? 'bg-white text-black border-white' : 'bg-transparent text-zinc-300 border-zinc-900 hover:border-zinc-700'
                  }`}
                >
                  ✙ {t('tab_info')}
                </button>

                {/* Reviews */}
                <button
                  onClick={() => {
                    setActiveTab('reviews');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`text-left px-3 py-2.5 border uppercase tracking-widest font-black text-xs transition-colors duration-250 cursor-pointer ${
                    activeTab === 'reviews' ? 'bg-white text-black border-white' : 'bg-transparent text-zinc-300 border-zinc-900 hover:border-zinc-700'
                  }`}
                >
                  ✙ {t('tab_reviews')}
                </button>

                {/* Cart link */}
                <button
                  onClick={() => {
                    setActiveTab('cart');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`text-left px-3 py-2.5 border uppercase tracking-widest font-black text-xs flex justify-between items-center transition-colors duration-250 cursor-pointer ${
                    activeTab === 'cart' ? 'bg-white text-black border-white' : 'bg-transparent text-zinc-300 border-zinc-900 hover:border-zinc-700'
                  }`}
                >
                  <span>✙ {t('tab_cart')}</span>
                  <span>({cart.reduce((sum, item) => sum + item.quantity, 0)})</span>
                </button>


              </div>

              {/* Language Selection inside mobile dropdown (since header is hidden) */}
              <div className="pt-1 flex flex-col space-y-2">
                <span className="text-[9px] text-[#8a0303] font-bold tracking-[0.25em]">✙ TRANSLATION // SECTOR</span>
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

        {/* LEFT CATHEDRAL COLUMN PILLAR - BEAUTIFUL EXPANDED ARCHITECTURAL FRESCO PANEL (COMPLETELY DRY AS REQUESTED) */}
        <aside className={`w-72 border-r hidden lg:flex flex-col items-center justify-between p-6 select-none shrink-0 z-10 font-mono relative ${
          theme === 'light' ? 'border-stone-200 bg-stone-50/50' : 'border-zinc-900 bg-black/98'
        }`}>
          
          <div className="w-full space-y-4">
            <span className="text-[9px] tracking-[0.4em] text-zinc-500 uppercase block font-bold leading-none">✙ PORTRAIT FRESCO VAULT</span>
            <div className={`h-[1px] w-full ${theme === 'light' ? 'bg-stone-200' : 'bg-zinc-800'}`} />
            
            {/* Highly visible gothic medieval fresco painting with thick frame */}
            <div className={`relative w-full aspect-[4/5] border-4 p-1 group overflow-hidden ${
              theme === 'light' ? 'border-stone-300 bg-stone-105' : 'border-zinc-805 bg-neutral-950'
            }`}>
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-85 grayscale contrast-[130%] transition-transform duration-1000 group-hover:scale-105"
                style={{ backgroundImage: "url('/images/gothic_altar_painting.jpg')" }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/20" />
              <div className="absolute bottom-2 left-2 right-2 text-center text-[9px] text-white font-gothic tracking-widest bg-black/90 py-1.5 border border-zinc-800">
                ALTARPIECE FRESCO ✙
              </div>
            </div>
          </div>

          <div className="w-full space-y-4">
            {/* Secondly visible gothic altar fresco */}
            <div className="relative w-full aspect-[4/3] border border-zinc-850 bg-neutral-950 group overflow-hidden">
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-85 grayscale contrast-[135%] brightness-[50%]"
                style={{ backgroundImage: "url('/images/gothic_carving_detail.jpg')" }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black" />
            </div>

            <div className="writing-mode-vertical text-[9px] tracking-[0.5em] text-zinc-500 uppercase select-none font-bold text-nowrap mx-auto">
              SGB // ESTABLISHED 2026 ✙
            </div>
          </div>

        </aside>

        {/* PRIMARY VIEWS LAYOUT BODY WITH FRAMER MOTION TRANSITIONS */}
        <main className="flex-1 px-3 py-4 md:px-6 md:py-8 overflow-hidden bg-[#020202] relative z-10">
          
          {/* Subtle gothic artwork watermark fresco wallpaper - Rendered with beautiful visibility (opacity-12) according to feedback */}
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-[0.14] pointer-events-none select-none contrast-[125%] brightness-[45%] mix-blend-lighten"
            style={{ 
              backgroundImage: "url('/images/gothic_vampire_fresco.jpg')", 
              backgroundPosition: 'center 20vh',
              backgroundSize: '100% auto', 
              backgroundRepeat: 'no-repeat' 
            }}
          />
          
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
                {/* 1. ATMOSPHERIC LOOKBOOK HERO SECTION */}
                <div className={`relative w-full h-[320px] md:h-[460px] overflow-hidden border-2 bg-black flex items-center justify-center group ${
                  theme === 'light' ? 'border-stone-200' : 'border-zinc-900'
                }`} id="home-hero">
                  <div 
                    className="absolute inset-0 bg-cover bg-center opacity-85 contrast-[135%] grayscale-[15%] brightness-[35%] transition-all duration-[2000ms] group-hover:scale-105"
                    style={{ backgroundImage: "url('/images/gothic_vampire_fresco.jpg')" }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-[#020202]/30 to-[#020202] pointer-events-none" />
                  
                  {/* Collage overlays: semi-visible gothic detail backgrounds instead of product models */}
                  <div className="absolute right-6 top-10 w-28 h-40 border border-white/10 opacity-30 select-none pointer-events-none hidden md:block">
                    <div className="w-full h-full bg-cover bg-center grayscale opacity-80" style={{ backgroundImage: "url('/images/gothic_altar_painting.jpg')" }} />
                  </div>
                  <div className="absolute left-6 bottom-10 w-28 h-40 border border-white/10 opacity-30 select-none pointer-events-none hidden md:block">
                    <div className="w-full h-full bg-cover bg-center grayscale opacity-80" style={{ backgroundImage: "url('/images/gothic_carving_detail.jpg')" }} />
                  </div>

                  {/* High contrast centered plaque */}
                  <div className={`z-10 text-center space-y-6 px-6 py-10 md:px-12 md:py-16 max-w-2xl border-2 shadow-[0_0_50px_rgba(138,3,3,0.35)] relative ${
                    theme === 'light' ? 'bg-white/95 border-black text-black' : 'bg-black/95 border-white/90 text-white'
                  }`}>
                    <div className="absolute -top-3 left-6 bg-black px-3 text-[#ff3c3c] text-[10px] font-mono tracking-widest uppercase">✙ SGB ✙</div>
                    
                    <span className={`text-[10px] md:text-[11.5px] font-mono tracking-[0.4em] uppercase block leading-none font-extrabold ${
                      theme === 'light' ? 'text-stone-500' : 'text-zinc-400'
                    }`}>
                      ✙ {t('header_subtitle')}
                    </span>
                    <h1 className={`text-3xl md:text-6xl font-gothic tracking-[0.35em] font-black uppercase leading-none select-none ${
                      theme === 'light' ? 'text-black' : 'text-white'
                    }`}>
                      SGB // <span 
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setIsAdminUnlocked(true);
                          setActiveTab('admin');
                          localStorage.setItem("sgb_admin_unlocked", "true");
                        }}
                        className="cursor-pointer hover:text-[#8a0303] transition-colors duration-200"
                        title="SECUM SYSTEM LOGIN"
                      >S</span>ECUM
                    </h1>
                    <div className={`h-px w-32 mx-auto ${theme === 'light' ? 'bg-black/30' : 'bg-white/25'}`} />
                    <p className={`text-xs md:text-sm font-mono leading-relaxed uppercase tracking-[0.2em] font-extrabold px-2 ${
                      theme === 'light' ? 'text-stone-800' : 'text-zinc-200'
                    }`}>
                      {t('hero_subtitle')}
                    </p>
                  </div>
                </div>

                {/* 2. CATEGORIES SECTION (USING BEAUTIFUL HIGH-FASHION BACKGROUNDS AS MANDATED) */}
                <div className="space-y-6 pt-6">
                  <div className="text-center space-y-2">
                    <span className="text-[#8a0303] text-sm block">✙ ✙ ✙</span>
                    <h2 className="text-2xl md:text-3xl font-gothic tracking-[0.25em] font-black uppercase text-white">
                      {t('tab_catalog')}
                    </h2>
                    <p className="text-[11px] font-mono uppercase tracking-widest font-bold text-zinc-500">
                      {t('choose_category')}
                    </p>
                  </div>

                  {/* 3 Portrait Columns side-by-side - High-fashion specific model photos for category covers */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* Item 1: TOPS */}
                    <div 
                      onClick={() => {
                        setSelectedCategory('top');
                        setActiveTab('catalog');
                        setTimeout(() => document.getElementById('catalog-root')?.scrollIntoView({ behavior: 'smooth' }), 100);
                      }}
                      className="group cursor-pointer relative h-[360px] md:h-[420px] border-2 border-zinc-900 hover:border-[#8a0303]/80 transition-all duration-700 bg-black overflow-hidden flex flex-col justify-end"
                    >
                      <div 
                        className="absolute inset-0 bg-cover bg-center opacity-85 group-hover:scale-[1.03] transition-all duration-1000 pointer-events-none" 
                        style={{ backgroundImage: "url('/goods/item_4.jpg')" }} 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent pointer-events-none" />
                      
                      <div className="p-5 z-10 w-full">
                        <div className="bg-black/95 border border-zinc-900 group-hover:border-[#8a0303] p-4 transition-all duration-500 text-center backdrop-blur-xs">
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
                      className="group cursor-pointer relative h-[360px] md:h-[420px] border-2 border-zinc-900 hover:border-[#8a0303]/80 transition-all duration-700 bg-black overflow-hidden flex flex-col justify-end"
                    >
                      <div 
                        className="absolute inset-0 bg-cover bg-center opacity-85 group-hover:scale-[1.03] transition-all duration-1000 pointer-events-none" 
                        style={{ backgroundImage: "url('/goods/item_9.jpg')" }} 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent pointer-events-none" />
                      
                      <div className="p-5 z-10 w-full">
                        <div className="bg-black/95 border border-zinc-900 group-hover:border-[#8a0303] p-4 transition-all duration-500 text-center backdrop-blur-xs">
                          <h3 className="text-base md:text-lg font-mono font-extrabold tracking-[0.15em] uppercase text-white">
                            {t('cat_bottom')}
                          </h3>
                        </div>
                      </div>
                    </div>

                    {/* Item 3: ACCESSORIES */}
                    <div 
                      onClick={() => {
                        setSelectedCategory('accessories');
                        setActiveTab('catalog');
                        setTimeout(() => document.getElementById('catalog-root')?.scrollIntoView({ behavior: 'smooth' }), 100);
                      }}
                      className="group cursor-pointer relative h-[360px] md:h-[420px] border-2 border-zinc-900 hover:border-[#8a0303]/80 transition-all duration-700 bg-black overflow-hidden flex flex-col justify-end"
                    >
                      <div 
                        className="absolute inset-0 bg-cover bg-center opacity-85 group-hover:scale-[1.03] transition-all duration-1000 pointer-events-none" 
                        style={{ backgroundImage: "url('/goods/item_8.jpg')" }} 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent pointer-events-none" />
                      
                      <div className="p-5 z-10 w-full">
                        <div className="bg-black/95 border border-zinc-900 group-hover:border-[#8a0303] p-4 transition-all duration-500 text-center backdrop-blur-xs">
                          <h3 className="text-base md:text-lg font-mono font-extrabold tracking-[0.15em] uppercase text-white">
                            {t('cat_accessories')}
                          </h3>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* 1 Wide landscape card under them */}
                  <div 
                    onClick={() => {
                      setSelectedCategory('all');
                      setActiveTab('catalog');
                      setTimeout(() => document.getElementById('catalog-root')?.scrollIntoView({ behavior: 'smooth' }), 100);
                    }}
                    className={`group cursor-pointer relative h-[140px] md:h-[180px] border-2 transition-all duration-700 bg-black overflow-hidden flex flex-col justify-center items-center px-6 ${
                      theme === 'light' ? 'border-stone-300 hover:border-black' : 'border-zinc-900 hover:border-zinc-450'
                    }`}
                  >
                    <div className="absolute inset-0 bg-cover bg-center opacity-55 grayscale group-hover:opacity-75 group-hover:scale-102 transition-all duration-1000 pointer-events-none" style={{ backgroundImage: "url('/images/gothic_vampire_fresco.jpg')" }} />
                    <div className="absolute inset-0 bg-black/60 pointer-events-none" />
                    
                    <div className="z-10 text-center max-w-xl bg-black/90 p-4 border border-zinc-800 transition-all duration-550 relative">
                      <span className="text-[9px] font-mono text-[#8a0303] tracking-widest block mb-1">✙</span>
                      <h3 className="text-xl md:text-3xl font-gothic font-black text-white tracking-[0.3em] uppercase">{t('all_categories_fresco')}</h3>
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
                        href="https://t.me/paybackSSlayer" 
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
                    <span>•</span>
                    <span>НОВА ПОШТА DELIVERED COUTURE</span>
                  </div>
                </footer>
              </motion.div>
            )}

            {activeTab === 'info' && (
              <motion.div
                key="info"
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.2 }}
                className="space-y-8 pb-16 font-mono text-zinc-400 text-xs"
              >
                <div className="border border-zinc-900 p-6 md:p-10 bg-black/95 relative space-y-6">
                  <div className="space-y-1">
                    <span className="text-[#8a0303] text-[9px] tracking-widest uppercase block font-bold">✙ PORTAL GUIDES // INFO</span>
                    <h2 className="text-2xl md:text-4xl text-white font-gothic tracking-widest font-black uppercase">
                      ДЕТАЛІ АРХІВУ // SHIPPING & EXCHANGES
                    </h2>
                  </div>

                  <div className="h-[2px] bg-zinc-900 w-full" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-[11.5px] leading-relaxed uppercase">
                    <div className="space-y-4">
                      <h3 className="text-white font-extrabold text-xs tracking-wider border-b border-[#8a0303] pb-2">
                        {lang === 'uk' ? '1. ДОСТАВКА ТА ОПЛАТА // SHIPPING' : lang === 'ru' ? '1. ДОСТАВКА И ОПЛАТА // SHIPPING' : '1. SHIPPING & DELIVERY // SHIPPING'}
                      </h3>
                      {lang === 'uk' ? (
                        <>
                          <p>• ДОСТАВКА В ТЕЧЕННІ 2-3 ДНІВ ПО УКРАЇНІ.</p>
                          <p>• ВІДПРАВЛЯЄМО НОВОЮ ПОШТОЮ В БУДЬ-ЯКУ ТОЧКУ УКРАЇНИ.</p>
                          <p>• ЯКЩО МИ ЗАПІЗНЮЄМОСЯ З ВІДПРАВКОЮ - ДАЄМО СКИДОЧКУ НА НАСТУПНУ ПОКУПКУ.</p>
                        </>
                      ) : lang === 'ru' ? (
                        <>
                          <p>• ДОСТАВКА В ТЕЧЕНИЕ 2-3 ДНЕЙ ПО УКРАИНЕ.</p>
                          <p>• ОТПРАВЛЯЕМ НОВОЙ ПОЧТОЙ В ЛЮБУЮ ТОЧКУ УКРАИНЫ.</p>
                          <p>• ЕСЛИ ЗАДЕРЖИВАЕМСЯ С ОТПРАВКОЙ - ДАЕМ СКИДОЧКУ НА СЛЕДУЮЩУЮ ПОКУПКУ.</p>
                        </>
                      ) : (
                        <>
                          <p>• DELIVERY WITHIN 2-3 DAYS ACROSS UKRAINE.</p>
                          <p>• WE SHIP VIA NOVA POSHTA TO ANY RESIDENCE IN UKRAINE.</p>
                          <p>• IF DISPATCH IS DELAYED, WE PROVIDE A DISCOUNT CODE FOR YOUR NEXT SELECTION.</p>
                        </>
                      )}
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-white font-extrabold text-xs tracking-wider border-b border-[#8a0303] pb-2">
                        {lang === 'uk' ? '2. ОБМІН ТА ПОВЕРНЕННЯ // EXCHANGES' : lang === 'ru' ? '2. ОБМЕН И ВОЗВРАТ // EXCHANGES' : '2. EXCHANGE PROTOCOL // EXCHANGES'}
                      </h3>
                      {lang === 'uk' ? (
                        <>
                          <p>• ОБМІН ВЕЩЕЙ ТІЛЬКИ В ТЕЧЕННІ 7 ДНІВ ПІСЛЯ ОТРИМАННЯ.</p>
                          <p>• ТОВАР ПОВИНЕН ЗБЕРІГАТИ ВСІ БІРКИ ТА МАТИ ТОВАРНИЙ ВИГЛЯД.</p>
                          <p>• ЗВ'ЯЖІТЬСЯ З НАМИ В ТЕЛЕГРАМ ДЛЯ ШВИДКОГО ОФОРМЛЕННЯ ОБМІНУ.</p>
                        </>
                      ) : lang === 'ru' ? (
                        <>
                          <p>• ОБМЕН ВЕЩЕЙ ТОЛЬКО В ТЕЧЕНИЕ 7 ДНЕЙ ПОСЛЕ ПОЛУЧЕНИЯ.</p>
                          <p>• ТОВАР ДОЛЖЕН СОХРАНЯТЬ ВСЕ БИРКИ И ИМЕТЬ ТОВАРНЫЙ ВИД.</p>
                          <p>• СВЯЖИТЕСЬ С НАМИ В ТЕЛЕГРАМ ДЛЯ БЫСТРОГО ОФОРМЛЕНИЯ ОБМЕНА.</p>
                        </>
                      ) : (
                        <>
                          <p>• PRODUCT EXCHANGES ONLY WITHIN 7 DAYS AFTER CONFIRMED RECEIPT.</p>
                          <p>• ALL ORIGINAL BRAND TAGS MUST BE PRESERVED AND ITEM MUST RETAIN A MERCHANTABLE APPERANCE.</p>
                          <p>• DIRECTLY MESSAGING OUR TELEGRAM CONTACT IS PREFERRED FOR ULTRA-FAST RESOLUTION.</p>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-zinc-900 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <span className="text-[10px] text-zinc-550">✙ SGB COUTURE SECUM SYSTEM // TECHNICAL SUPPORT ACTIVE</span>
                    <a 
                      href="https://t.me/paybackSSlayer" 
                      target="_blank" 
                      referrerPolicy="no-referrer"
                      className="bg-white hover:bg-[#8a0303] text-black hover:text-white px-5 py-2.5 font-bold transition-all uppercase tracking-wider text-[11px] block text-center cursor-pointer"
                    >
                      НАПИСАТИ В ТЕЛЕГРАМ // TG CONTACT
                    </a>
                  </div>
                </div>
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
                    setActiveTab('admin');
                  }}
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
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="tracking-widest uppercase font-extrabold text-white">©2026 SGB // ALL ARTIFACTS INVENTORIED</span>
          <div className="flex gap-4 tracking-widest uppercase font-bold text-[9px]">
            <span className="hover:text-white cursor-pointer transition-colors">NOVA POSHTA DELIVERED</span>
            <span>|</span>
            <span className="hover:text-white cursor-pointer transition-colors">ONLINE ESTORE SYSTEM</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
