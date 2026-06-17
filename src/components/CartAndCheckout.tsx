import { useState, useEffect, FormEvent } from 'react';
import { CartItem, CustomerDetails } from '../types';
import { ShoppingBag, ChevronRight, Truck, CreditCard, Search, CheckCircle2, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CartAndCheckoutProps {
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, size: string, change: number) => void;
  onRemoveItem: (productId: string, size: string) => void;
  onPlaceOrder: (customer: CustomerDetails, shippingCost: number) => void;
}

export default function CartAndCheckout({
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onPlaceOrder
}: CartAndCheckoutProps) {
  // Navigation inside panel: 'cart' -> 'checkout' -> 'success'
  const [step, setStep] = useState<'cart' | 'checkout' | 'success'>('cart');

  // Checkout inputs
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [telegram, setTelegram] = useState('');
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [email, setEmail] = useState('');
  const [customBranchText, setCustomBranchText] = useState('');
  
  // Delivery search
  const [citySearch, setCitySearch] = useState('');
  const [citiesList, setCitiesList] = useState<any[]>([]);
  const [selectedCity, setSelectedCity] = useState<any | null>(null);

  const [deliveryMethod, setDeliveryMethod] = useState<'nova_poshta_office' | 'nova_poshta_locker' | 'ukrposhta' | 'self_pickup'>('nova_poshta_office');
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<any | null>(null);
  
  const [paymentMethod, setPaymentMethod] = useState<'card_online' | 'cash_on_delivery' | 'crypto_ton'>('card_online');
  const [shippingCost, setShippingCost] = useState(85);
  const [deliveryDays, setDeliveryDays] = useState(1);
  const [loading, setLoading] = useState(false);

  const cartTotal = cartItems.reduce((sum, item) => sum + Math.round(item.product.price * 0.8) * item.quantity, 0);

  // Search cities
  useEffect(() => {
    if (citySearch.trim().length === 0) {
      setCitiesList([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/novaposhta/cities?q=${encodeURIComponent(citySearch)}`);
        const data = await response.json();
        setCitiesList(data);
      } catch (err) {
        console.error("Error searching cities:", err);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [citySearch]);

  // Load branches once city is elected / method changes
  useEffect(() => {
    if (deliveryMethod === 'self_pickup') {
      setShippingCost(0);
      setDeliveryDays(1);
      setBranches([]);
      setSelectedBranch(null);
      return;
    }

    if (deliveryMethod === 'ukrposhta') {
      setShippingCost(65);
      setDeliveryDays(3);
      setBranches([]);
      setSelectedBranch(null);
      return;
    }

    if (!selectedCity) {
      setBranches([]);
      setSelectedBranch(null);
      return;
    }

    const loadBranchesAndCosts = async () => {
      setLoading(true);
      try {
        // Load branches
        const responseB = await fetch(`/api/novaposhta/branches/${selectedCity.id}`);
        const dataB = await responseB.json();
        
        // Filter branches based on delivery method
        const filtered = dataB.filter((b: any) => {
          if (deliveryMethod === 'nova_poshta_locker') return b.type === 'locker';
          if (deliveryMethod === 'nova_poshta_office') return b.type === 'office';
          return true; // Ukrposhta uses custom listing
        });
        setBranches(filtered);
        setSelectedBranch(filtered[0] || null);

        // Load delivery cost and days from Nova Poshta API helper
        const responseC = await fetch('/api/novaposhta/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cityId: selectedCity.id,
            deliveryMethod,
            items: cartItems.map(it => ({ productId: it.product.id, quantity: it.quantity }))
          })
        });
        const dataC = await responseC.json();
        setShippingCost(dataC.shippingCost);
        setDeliveryDays(dataC.days);

      } catch (err) {
        console.error("Error loading delivery specifics:", err);
      } finally {
        setLoading(false);
      }
    };

    loadBranchesAndCosts();
  }, [selectedCity, deliveryMethod, cartItems]);

  const handleCheckoutSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !phone) {
      alert('Будь ласка, заповніть Ваше ім’я, прізвище та номер телефону');
      return;
    }

    if (!city && !selectedCity && deliveryMethod !== 'self_pickup') {
      alert('Будь ласка, вкажіть або оберіть місто для доставки');
      return;
    }

    const finalCityName = city || (selectedCity ? selectedCity.name : 'Не вказано');
    
    // Address Details compiler
    let finalAddressDetails = '';
    if (deliveryMethod === 'self_pickup') {
      finalAddressDetails = 'Шоурум SGB у центрі (анонімно)';
    } else if (deliveryMethod === 'ukrposhta') {
      finalAddressDetails = customBranchText ? `Укрпошта: Відділення ${customBranchText}` : 'Укрпошта';
    } else if (deliveryMethod === 'nova_poshta_office') {
      finalAddressDetails = selectedBranch ? selectedBranch.name : (customBranchText ? `НП: Відділення ${customBranchText}` : 'НП Відділення');
    } else if (deliveryMethod === 'nova_poshta_locker') {
      finalAddressDetails = selectedBranch ? selectedBranch.name : (customBranchText ? `НП: Поштомат ${customBranchText}` : 'НП Поштомат');
    }

    // Append optional index and region to provide maximum clarity to admin
    let addressWithMeta = finalAddressDetails;
    if (region) {
      addressWithMeta = `${region} область, ${addressWithMeta}`;
    }
    if (postalCode) {
      addressWithMeta = `${addressWithMeta} (Індекс: ${postalCode})`;
    }

    const computedFullName = `${lastName} ${firstName}`.trim();

    const customerDetails: CustomerDetails = {
      fullName: computedFullName,
      firstName,
      lastName,
      phone,
      telegram,
      region,
      city: finalCityName,
      postalCode,
      email: email || `${phone}@void-customer.com`,
      deliveryMethod,
      addressDetails: addressWithMeta,
      paymentMethod
    };

    onPlaceOrder(customerDetails, shippingCost);
    setStep('success');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="cart-root">
      
      {/* LEFT AREA: CART INVENTORY OR SHIPPING ENTRY FORM */}
      <div className="lg:col-span-8 bg-[#050505] border border-[#333333] p-6 rounded-none space-y-6">
        
        {/* Step: CART REVIEW */}
        {step === 'cart' && (
          <div className="space-y-4 font-mono">
            <div className="border-b border-[#333333] pb-2 flex justify-between items-center">
              <h3 className="text-xs font-bold tracking-widest text-white uppercase flex items-center gap-1.5">
                <ShoppingBag size={14} /> ОБРАНИЙ АРХІВ ТОВАРІВ ({cartItems.length})
              </h3>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">КОШИК</span>
            </div>

            {cartItems.length === 0 ? (
              <div className="text-center py-12 space-y-2 border border-dashed border-[#333333] rounded-none bg-black">
                <p className="text-[11px] text-zinc-500 uppercase tracking-wider">Твій кошик абсолютно пустий.</p>
                <p className="text-[9px] text-zinc-600 uppercase tracking-widest">Повертайся до каталогу та обери кращі альт луки.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cartItems.map((item, idx) => (
                  <div
                    key={`${item.product.id}-${item.selectedSize}-${idx}`}
                    className="border border-[#333333] p-4 bg-black flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center text-xs"
                  >
                    <div className="flex gap-4 items-center w-full sm:w-auto">
                      {/* Product Image */}
                      <div className="w-16 h-16 bg-zinc-950 border border-[#222222] flex-shrink-0 overflow-hidden flex items-center justify-center">
                        <img
                          src={item.product?.telegramImage || item.product?.image || ""}
                          alt={item.product?.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      <div className="space-y-1 min-w-0">
                        <span className="text-[8px] text-zinc-500 block uppercase tracking-widest">{item.product.category}</span>
                        <h4 className="text-white font-bold tracking-wider truncate">{item.product.name}</h4>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-zinc-400">
                          <span>РАЗМІР: <span className="text-white font-bold">{item.selectedSize}</span></span>
                          <div className="flex items-center gap-1.5">
                            <span className="line-through text-zinc-600">{item.product.price} UAH</span>
                            <span className="text-white font-bold">{Math.round(item.product.price * 0.8)} UAH / од.</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 border-[#222222]">
                      {/* Quantity Toggles */}
                      <div className="flex border border-[#333333] bg-[#050505]">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.product.id, item.selectedSize, -1)}
                          className="px-2.5 py-1 text-zinc-400 hover:text-white transition-colors"
                        >
                          -
                        </button>
                        <span className="px-3 py-1 text-white font-bold text-[11.5px] border-x border-[#333333] bg-black">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.product.id, item.selectedSize, 1)}
                          className="px-2.5 py-1 text-zinc-400 hover:text-white transition-colors"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.product.id, item.selectedSize)}
                        className="text-zinc-500 hover:text-white text-[10px] uppercase underline transition-colors"
                      >
                        [ВИДАЛИТИ]
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step: DETAILED UKRAINIAN SHIPPING FORM */}
        {step === 'checkout' && (
          <form onSubmit={handleCheckoutSubmit} className="space-y-8 font-mono text-zinc-300 pb-6" id="ukrainian-checkout-form">
            
            {/* Form Header */}
            <div className="border-b border-[#333333] pb-4">
              <h3 className="text-sm md:text-base font-black tracking-widest text-white uppercase flex items-center gap-2">
                <Truck size={18} className="text-[#8a0303]" /> ОФОРМЛЕННЯ ЗАМОВЛЕННЯ / CHECKOUT
              </h3>
              <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">
                Будь ласка, заповніть форму нижче. Ми розробили її максимально простою та зручною.
              </p>
            </div>

            {/* 1. Recipient Identity Details */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold tracking-[0.2em] text-white uppercase border-b border-[#2e2e2e] pb-1.5 flex items-center gap-2">
                <span className="text-[#8a0303]">▍</span> 1. ОСОБИСТІ ДАНІ ОТРИМУВАЧА
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-400 block uppercase font-bold tracking-wider">
                    Прізвище отримувача <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="наприклад: Шевченко"
                    className="w-full bg-[#0a0a0a] border border-[#2e2e2e] hover:border-zinc-500 focus:border-white focus:bg-black text-sm md:text-base text-white py-3.5 px-4 font-mono transition-all duration-200 focus:outline-none placeholder-zinc-700"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-400 block uppercase font-bold tracking-wider">
                    Ім'я отримувача <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="наприклад: Андрій"
                    className="w-full bg-[#0a0a0a] border border-[#2e2e2e] hover:border-zinc-500 focus:border-white focus:bg-black text-sm md:text-base text-white py-3.5 px-4 font-mono transition-all duration-200 focus:outline-none placeholder-zinc-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-400 block uppercase font-bold tracking-wider">
                    Номер телефону <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+380 (XX) XXX XX XX"
                    className="w-full bg-[#0a0a0a] border border-[#2e2e2e] hover:border-zinc-500 focus:border-white focus:bg-black text-sm md:text-base text-white py-3.5 px-4 font-mono transition-all duration-200 focus:outline-none placeholder-zinc-700"
                  />
                  <span className="text-[9px] text-zinc-500 block">Використовується для створення ТТН посилки.</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-400 block uppercase font-bold tracking-wider">
                    Telegram @Нікнейм або ім'я <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={telegram}
                    onChange={e => setTelegram(e.target.value)}
                    placeholder="@nickname"
                    className="w-full bg-[#0a0a0a] border border-[#2e2e2e] hover:border-zinc-500 focus:border-white focus:bg-black text-sm md:text-base text-white py-3.5 px-4 font-mono transition-all duration-200 focus:outline-none placeholder-zinc-700"
                  />
                  <span className="text-[9px] text-zinc-500 block">Для швидкого обговорення статусу або уточнення замовлення.</span>
                </div>
              </div>
            </div>

            {/* 2. Delivery Method Selection */}
            <div className="space-y-4 pt-2">
              <h4 className="text-xs font-bold tracking-[0.2em] text-white uppercase border-b border-[#2e2e2e] pb-1.5 flex items-center gap-2">
                <span className="text-[#8a0303]">▍</span> 2. СПОСІБ ДОСТАВКИ
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { 
                    id: 'nova_poshta_office', 
                    title: 'Нова Пошта', 
                    sub: 'На відділення',
                    badge: 'Швидко (1-2 дні)' 
                  },
                  { 
                    id: 'nova_poshta_locker', 
                    title: 'Нова Пошта', 
                    sub: 'У поштомат',
                    badge: 'Зручно 24/7' 
                  },
                  { 
                    id: 'ukrposhta', 
                    title: 'Укрпошта', 
                    sub: 'На відділення',
                    badge: 'Економно' 
                  }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setDeliveryMethod(item.id as any);
                    }}
                    className={`p-4 md:p-5 border text-left transition-all duration-300 relative rounded-sm flex flex-col justify-between cursor-pointer ${
                      deliveryMethod === item.id
                        ? 'bg-white text-black border-white shadow-xl scale-[1.02]'
                        : 'bg-black text-zinc-400 border-[#222222] hover:border-zinc-500 hover:text-white'
                    }`}
                  >
                    <div className="flex justify-between items-start w-full">
                      <span className="text-xs font-bold uppercase tracking-wider">{item.title}</span>
                      <span className={`text-[8px] px-1.5 py-0.5 uppercase font-bold ${
                        deliveryMethod === item.id ? 'bg-black text-white' : 'bg-zinc-900 text-zinc-400'
                      }`}>
                        {item.badge}
                      </span>
                    </div>
                    <div className="mt-3">
                      <p className="text-sm md:text-base font-black uppercase tracking-tight">{item.sub}</p>
                    </div>
                    {deliveryMethod === item.id && (
                      <span className="absolute bottom-2 right-3 text-xs">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Address details */}
            <div className="space-y-4 pt-2">
              <h4 className="text-xs font-bold tracking-[0.2em] text-white uppercase border-b border-[#2e2e2e] pb-1.5 flex items-center gap-2">
                <span className="text-[#8a0303]">▍</span> 3. АДРЕСА ТА ВІДДІЛЕННЯ ДОСТАВКИ
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Oblast / Region input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-400 block uppercase font-bold tracking-wider">
                    Область <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={region}
                    onChange={e => setRegion(e.target.value)}
                    placeholder="наприклад: Київська область"
                    className="w-full bg-[#0a0a0a] border border-[#2e2e2e] hover:border-zinc-500 focus:border-white focus:bg-black text-sm md:text-base text-white py-3.5 px-4 font-mono transition-all duration-200 focus:outline-none placeholder-zinc-700"
                  />
                  <span className="text-[9px] text-zinc-500 block">Вкажіть область проживання отримувача.</span>
                </div>

                {/* City select / input */}
                <div className="space-y-1.5 relative">
                  <label className="text-[10px] text-zinc-400 block uppercase font-bold tracking-wider">
                    Місто або населений пункт <span className="text-red-500">*</span>
                  </label>
                  
                  {deliveryMethod.startsWith('nova_poshta') ? (
                    // Autocomplete for Nova Poshta
                    <div className="relative">
                      <input
                        type="text"
                        value={citySearch}
                        onChange={e => {
                          setCitySearch(e.target.value);
                          setCity(e.target.value);
                          if (selectedCity) setSelectedCity(null);
                        }}
                        placeholder="Почніть вводити місто..."
                        className="w-full bg-[#0a0a0a] border border-[#2e2e2e] hover:border-zinc-500 focus:border-white focus:bg-black text-sm md:text-base text-white py-3.5 px-4 pl-10 font-mono transition-all duration-200 focus:outline-none"
                      />
                      <Search size={16} className="text-zinc-500 absolute left-3 top-4" />
                      
                      {citiesList.length > 0 && !selectedCity && (
                        <div className="absolute left-0 right-0 top-full bg-[#080808] border border-[#333333] z-50 max-h-48 overflow-y-auto mt-1 divide-y divide-[#222222] shadow-2xl">
                          {citiesList.map(c => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setSelectedCity(c);
                                setCitySearch(c.name);
                                setCity(c.name);
                                if (c.region) {
                                  setRegion(c.region);
                                }
                                setCitiesList([]);
                              }}
                              className="w-full text-left py-3 px-4 hover:bg-zinc-900 text-xs text-zinc-300 font-mono transition-colors block cursor-pointer"
                            >
                              {c.name} ({c.region} область)
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    // Standard manual text input for Ukrposhta/fallback
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      placeholder="наприклад: м. Львів"
                      className="w-full bg-[#0a0a0a] border border-[#2e2e2e] hover:border-zinc-500 focus:border-white focus:bg-black text-sm md:text-base text-white py-3.5 px-4 font-mono transition-all duration-200 focus:outline-none placeholder-zinc-700"
                    />
                  )}
                  
                  {selectedCity && (
                    <div className="text-[9px] text-green-500 uppercase mt-1 font-bold">
                      ✓ Вибрано із системи: {selectedCity.name}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                {/* Branch / Location Picker */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-400 block uppercase font-bold tracking-wider">
                    {deliveryMethod === 'nova_poshta_office' && 'Оберіть відділення Нової Пошти:'}
                    {deliveryMethod === 'nova_poshta_locker' && 'Оберіть поштомат Нової Пошти:'}
                    {deliveryMethod === 'ukrposhta' && 'Вкажіть номер чи адресу відділення Укрпошти:'}
                  </label>

                  {deliveryMethod.startsWith('nova_poshta') ? (
                    loading ? (
                      <div className="py-3.5 px-4 border border-[#2e2e2e] bg-[#0a0a0a] text-zinc-600 text-xs animate-pulse">
                        Оновлення списку точок видачі...
                      </div>
                    ) : branches.length > 0 ? (
                      <select
                        value={selectedBranch ? selectedBranch.id : ''}
                        onChange={e => {
                          const match = branches.find(b => b.id === e.target.value);
                          setSelectedBranch(match || null);
                        }}
                        className="w-full bg-[#0a0a0a] border border-[#2e2e2e] text-white py-3.5 px-4 focus:border-white focus:bg-black focus:outline-none text-xs text-zinc-200"
                      >
                        {branches.map(b => (
                          <option key={b.id} value={b.id} className="bg-black text-zinc-300">
                            {b.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="space-y-2">
                        <input
                          type="text"
                          required
                          value={customBranchText}
                          onChange={e => setCustomBranchText(e.target.value)}
                          placeholder="наприклад: Відділення №25, вул. Зелена 12"
                          className="w-full bg-[#0a0a0a] border border-[#2e2e2e] text-sm py-3.5 px-4 text-white hover:border-zinc-500 focus:border-white focus:bg-black transition-all outline-none"
                        />
                        <span className="text-[9px] text-zinc-500 block leading-normal uppercase">
                          Вкажіть номер відділення/поштомату вручну (не знайшли у автосписку або не вибрали місто).
                        </span>
                      </div>
                    )
                  ) : (
                    // Ukrposhta manual input
                    <div>
                      <input
                        type="text"
                        required
                        value={customBranchText}
                        onChange={e => setCustomBranchText(e.target.value)}
                        placeholder="наприклад: Відділення №79005 (або адреса)"
                        className="w-full bg-[#0a0a0a] border border-[#2e2e2e] hover:border-zinc-500 focus:border-white focus:bg-black text-sm md:text-base text-white py-3.5 px-4 font-mono transition-all duration-200 focus:outline-none placeholder-zinc-700"
                      />
                      <span className="text-[9px] text-zinc-500 block mt-1">Вкажіть індекс чи адресу відділення зв'язку Укрпошти.</span>
                    </div>
                  )}
                </div>

                {/* Postal Code input (optional) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-400 block uppercase font-bold tracking-wider">
                    Поштовий індекс <span className="text-zinc-650 font-normal">(за бажанням)</span>
                  </label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={e => setPostalCode(e.target.value)}
                    placeholder="наприклад: 79005"
                    className="w-full bg-[#0a0a0a] border border-[#2e2e2e] hover:border-zinc-500 focus:border-white focus:bg-black text-sm md:text-base text-white py-3.5 px-4 font-mono transition-all duration-200 focus:outline-none placeholder-zinc-700"
                  />
                  <span className="text-[9px] text-zinc-500 block">Поштовий індекс одержувача посилки.</span>
                </div>
              </div>
            </div>

            {/* 4. Payment Method Selection */}
            <div className="space-y-4 pt-2">
              <h4 className="text-xs font-bold tracking-[0.2em] text-white uppercase border-b border-[#2e2e2e] pb-1.5 flex items-center gap-2">
                <span className="text-[#8a0303]">▍</span> 4. МЕТОД ОПЛАТИ / PAYMENT
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    id: 'cash_on_delivery',
                    title: '💸 Накладений платіж (при отриманні)',
                    desc: 'Оплата готівкою або картою безпосередньо у відділенні або поштоматі пошти при отриманні.'
                  },
                  {
                    id: 'card_online',
                    title: '💳 Переказ на карту (Реквізити)',
                    desc: 'Миттєве замовлення. Ми надішлемо Вам банківські реквізити Monobank у Telegram для швидкої оплати.'
                  }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPaymentMethod(item.id as any)}
                    className={`p-5 border text-left transition-all duration-300 relative rounded-sm cursor-pointer flex flex-col justify-between ${
                      paymentMethod === item.id || (item.id === 'card_online' && paymentMethod === 'crypto_ton')
                        ? 'bg-white text-black border-white shadow-xl scale-[1.01]'
                        : 'bg-black text-zinc-400 border-[#222222] hover:border-zinc-500 hover:text-white'
                    }`}
                  >
                    <div>
                      <span className="text-xs md:text-sm font-black uppercase tracking-wider block">{item.title}</span>
                      <p className={`text-[10px] mt-2 leading-relaxed ${
                        paymentMethod === item.id || (item.id === 'card_online' && paymentMethod === 'crypto_ton') ? 'text-zinc-800' : 'text-zinc-500'
                      }`}>
                        {item.desc}
                      </p>
                    </div>
                    {paymentMethod === item.id && (
                      <span className="absolute bottom-2 right-3 text-xs font-bold">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit checkout CTA button */}
            <div className="pt-4 border-t border-[#333333]">
              <button
                type="submit"
                className="w-full bg-white hover:bg-neutral-200 text-black py-4.5 text-xs font-black tracking-[0.25em] uppercase transition-all duration-300 cursor-pointer shadow-lg hover:translate-y-[-1px] text-center"
                id="submit-order-checkout-btn"
              >
                ПІДТВЕРДИТИ ТА ОФОРМИТИ ЗАМОВЛЕННЯ 
              </button>
            </div>

          </form>
        )}

        {/* Step: SUCCESS ORDER VIEW */}
        {step === 'success' && (
          <div className="text-center py-12 px-6 font-mono space-y-6">
            <CheckCircle2 size={44} className="text-white mx-auto animate-bounce" />
            
            <div className="space-y-2">
              <span className="text-[10px] text-zinc-500 tracking-widest block uppercase">ТЕЛЕМЕТРІЯ ПРАЦЮЄ</span>
              <h2 className="text-lg font-bold text-white tracking-widest uppercase">ЗАМОВЛЕННЯ УСПІШНО ЗАРЕЄСТРОВАНО В CRM</h2>
              <p className="text-zinc-400 leading-relaxed uppercase tracking-tight text-[10px] max-w-md mx-auto">
                Нова партія одягу вже бронюється у сховищі. Специфікація відправлена операторам. Твій ТТН-номер автоматично згенеровано.
              </p>
            </div>

            <div className="bg-[#050505] border border-[#333333] p-5 max-w-md mx-auto text-left space-y-2.5 text-[10.5px]">
              <div className="flex justify-between items-center border-b border-[#333333] pb-1.5">
                <span className="text-zinc-500">КАНАЛ ЗАКУПКИ:</span>
                <span className="text-white font-bold">EX_CORP_VOID</span>
              </div>
              <div className="flex justify-between items-center border-b border-[#333333] pb-1.5">
                <span className="text-zinc-500">ОЧІКУВАНА ДОСТАВКА (ДНІВ):</span>
                <span className="text-white font-bold">{deliveryDays} - {deliveryDays + 1} дн</span>
              </div>
              <div className="flex justify-between items-center bg-black p-2 border border-[#333333] font-bold">
                <span className="text-zinc-400 font-mono text-[9px] uppercase tracking-wider">ТТН ЕКС_НАКЛАДНА (НОВА ПОШТА):</span>
                <span className="text-white font-mono text-xs select-all">
                  204{Math.floor(50000000000 + Math.random() * 49999999999)}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <p className="text-[9.5px] text-zinc-500 uppercase font-bold tracking-widest">
                Переглядай статус ТТН посилки у реальному часі в особистому кабінеті користувача
              </p>
            </div>
          </div>
        )}

      </div>

      {/* RIGHT AREA: PRICING RECEIPT / ORDER CHECKOUT BAR */}
      <div className="lg:col-span-4 space-y-4">
        
        <div className="bg-[#050505] border border-[#333333] p-5 rounded-none font-mono space-y-4 relative">
          
          <div className="border-b border-[#333333] pb-3">
            <h4 className="text-xs font-bold text-white tracking-widest uppercase block mb-1">СУМАРНА КВИТАНЦІЯ ПОКУПКИ</h4>
            <span className="text-[8px] text-zinc-600 block">VOID // CHECKOUT PORTAL</span>
          </div>

          <div className="space-y-2 text-[10.5px]">
            <div className="flex justify-between text-zinc-500">
              <span>СУМА ТОВАРІВ:</span>
              <span className="text-white">{cartTotal} UAH</span>
            </div>
            
            <div className="flex justify-between text-zinc-500">
              <span>ДОСТАВКА В:{selectedCity ? ` ${selectedCity.name}` : '...'}</span>
              <span className="text-white">
                {deliveryMethod === 'self_pickup' ? '0 UAH (Безкоштовно)' : `${shippingCost} UAH`}
              </span>
            </div>

            <div className="border-t border-[#333333] my-4 pt-3 flex justify-between font-bold text-xs text-white">
              <span>ПІДСУМКОВА СУМА:</span>
              <span>{cartTotal + (deliveryMethod === 'self_pickup' ? 0 : shippingCost)} UAH</span>
            </div>
          </div>

          {step === 'cart' && (
            <button
              onClick={() => {
                if (cartItems.length === 0) return;
                setStep('checkout');
              }}
              disabled={cartItems.length === 0}
              className={`w-full py-3.5 text-[11px] font-bold tracking-widest uppercase transition-colors flex items-center justify-center gap-2 ${
                cartItems.length === 0
                  ? 'bg-zinc-900 border border-[#333333] text-zinc-600 cursor-not-allowed'
                  : 'bg-white hover:bg-zinc-200 text-black'
              }`}
            >
              <span>ПЕРЕЙТИ ДО ОФОРМЛЕННЯ</span>
              <ChevronRight size={13} />
            </button>
          )}

          {step === 'checkout' && (
            <button
              onClick={() => setStep('cart')}
              className="w-full bg-zinc-900 hover:bg-neutral-800 border border-[#333333] text-zinc-400 py-2.5 text-[10px] tracking-wider uppercase font-bold"
            >
               повернутися в кошик
            </button>
          )}

          {step === 'success' && (
            <button
              onClick={() => {
                setStep('cart');
              }}
              className="w-full bg-white hover:bg-zinc-200 text-black py-2.5 text-[10px] tracking-wider uppercase font-bold"
            >
               КУПИТИ ЩЕ ТОВАРИ
            </button>
          )}

          <div className="text-[8px] text-zinc-600 block text-center uppercase pt-2 border-t border-[#333333] tracking-widest">
            Secure high-contrast cyber shopping portal
          </div>
        </div>

        {/* Dynamic style advisory frame based on current items */}
        {cartItems.length > 0 && step === 'cart' && (
          <div className="bg-[#050505] border border-[#333333] p-4 font-mono space-y-3">
            <span className="text-[9px] text-[#ffffff] uppercase block font-bold tracking-wider">СИНДРОМ СТИЛЮ // НЕЙРОННИЙ ОЦІНЮВАЧ</span>
            <div className="text-[10px] text-zinc-400 leading-normal bg-black p-3 border border-[#333333]">
              У тебе в кошику <span className="text-white font-bold">{cartItems.length}</span> модних речей. Перейди до віртуальної примірочної під цим текстом, щоб накласти їх на 3D манекен та дізнатись індекс сумісності!
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
