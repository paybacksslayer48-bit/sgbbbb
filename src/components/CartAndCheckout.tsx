import { useState } from 'react';
import { CartItem, CustomerDetails } from '../types';
import { ShoppingBag, ChevronRight, Copy, Check, Send, AlertTriangle, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

interface CartAndCheckoutProps {
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, size: string, change: number) => void;
  onUpdateSize?: (productId: string, oldSize: string, newSize: string) => void;
  onRemoveItem: (productId: string, size: string) => void;
  onPlaceOrder: (customer: CustomerDetails, shippingCost: number) => void;
}

export default function CartAndCheckout({
  cartItems,
  onUpdateQuantity,
  onUpdateSize,
  onRemoveItem,
  onPlaceOrder
}: CartAndCheckoutProps) {
  // Step navigation: 'cart' -> 'checkout'
  const [step, setStep] = useState<'cart' | 'checkout'>('cart');
  const [copied, setCopied] = useState(false);

  const cartTotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  // Generate the formatted text order copy block
  const generateOrderText = () => {
    const timestamp = new Date().toLocaleString('uk-UA');
    const border = "================================";
    const divider = "--------------------------------";
    
    let text = `${border}\n`;
    text += `✙ SGB SECUM ORDER REQUEST // ✙\n`;
    text += `${border}\n`;
    text += `ДАТА: ${timestamp}\n\n`;
    text += `ТОВАРИ В ЗАМОВЛЕННІ:\n`;
    
    cartItems.forEach((item, idx) => {
      text += `${divider}\n`;
      text += `${idx + 1}. [${item.product.name}]\n`;
      text += `   • РОЗМІР: ${item.selectedSize || 'не вказано'}\n`;
      text += `   • КІЛЬКІСТЬ: ${item.quantity} шт\n`;
      text += `   • ЦІНА: ${item.product.price} UAH / од\n`;
      text += `   • ПОСИЛАННЯ: ${window.location.origin}/?id=${item.product.id}\n`;
    });
    
    text += `${divider}\n`;
    text += `ЗАГАЛЬНА СУМА: ${cartTotal} UAH\n`;
    text += `${border}\n`;
    text += `Направлено у Telegram: @SGB_secum`;
    return text;
  };

  const handleCopyOrder = () => {
    const textToCopy = generateOrderText();
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
        
        // Save order silently to Firestore/database under the hood
        const anonymousCustomer: CustomerDetails = {
          fullName: "Telegram Client",
          phone: "TG Direct",
          city: "Direct Telegram Contact",
          deliveryMethod: 'self_pickup',
          addressDetails: `Telegram Order Text Copied // Total: ${cartTotal} UAH`,
          paymentMethod: 'crypto_ton'
        };
        onPlaceOrder(anonymousCustomer, 0);
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
      });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="cart-root">
      
      {/* LEFT AREA: CART INVENTORY OR STREAMLINED COPY-ORDER AREA */}
      <div className="lg:col-span-8 bg-[#020202] border-2 border-zinc-900 p-6 md:p-8 rounded-none space-y-6">
        
        {/* Step: CART INVENTORY VIEW */}
        {step === 'cart' && (
          <div className="space-y-6 font-mono text-zinc-300">
            
            {/* INSTRUCTIONS AT THE TOP FOR USER VALIDATION */}
            <div className="bg-[#050505] border border-zinc-800 p-5 rounded-none text-center font-sans">
              <span className="text-sm text-zinc-100 font-extrabold tracking-[0.1em] block">
                ПРОВЕРЬТЕ КОЛИЧЕСТВО И РАЗМЕР ТОВАРОВ !
              </span>
              <span className="text-[10px] text-zinc-500 font-bold tracking-[0.05em] block mt-1 uppercase">
                Перевірте кількість та розмір товарів перед підтвердженням замовлення
              </span>
            </div>

            {/* HEADER */}
            <div className="border-b border-zinc-900 pb-3 flex justify-between items-center">
              <h3 className="text-xs font-black tracking-[0.15em] text-white uppercase flex items-center gap-2">
                <ShoppingBag size={14} className="text-[#ff3c3c]" /> ТОВАРИ У КОШИКУ ({cartItems.length})
              </h3>
            </div>

            {cartItems.length === 0 ? (
              <div className="text-center py-20 space-y-4 border-2 border-dashed border-zinc-950 bg-black/40">
                <p className="text-xs text-zinc-500 uppercase tracking-[0.15em]">Твій кошик абсолютно порожній.</p>
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Оберіть товари в каталозі для початку.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cartItems.map((item, idx) => (
                  <div
                    key={`${item.product.id}-${item.selectedSize}-${idx}`}
                    className="border border-zinc-900 p-4 bg-black/60 hover:bg-black transition-all flex flex-col sm:flex-row gap-5 justify-between items-start sm:items-center text-xs"
                  >
                    <div className="flex gap-4 items-center w-full sm:w-auto">
                      {/* Product Image */}
                      <div className="w-18 h-18 bg-[#050505] border border-zinc-900 flex-shrink-0 overflow-hidden flex items-center justify-center">
                        <img
                          src={item.product?.telegramImage || item.product?.image || ""}
                          alt={item.product?.name}
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      <div className="space-y-2 min-w-0">
                        <span className="text-[8px] text-zinc-500 block uppercase tracking-widest font-black">{item.product.category || 'clothes'} // SGB EDITION</span>
                        <h4 className="text-white font-extrabold tracking-wider text-xs uppercase truncate">{item.product.name}</h4>
                        
                        <div className="flex flex-wrap items-center gap-4 text-[11px] text-zinc-400 font-mono">
                          {/* SIZES SELECTOR inside each product in cart */}
                          <div className="flex items-center gap-1.5 bg-black border border-zinc-900 px-2 py-1">
                            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Розмір:</span>
                            <select
                              value={item.selectedSize}
                              onChange={(e) => onUpdateSize?.(item.product.id, item.selectedSize, e.target.value)}
                              className="bg-black text-white px-1.5 py-0.5 text-[11px] font-mono font-black focus:outline-none focus:text-[#ff3c3c] cursor-pointer uppercase"
                            >
                              {item.product.sizes && item.product.sizes.length > 0 ? (
                                item.product.sizes.map((sz) => (
                                  <option key={sz} value={sz} className="bg-[#050505] text-white font-extrabold">{sz}</option>
                                ))
                              ) : (
                                <option value={item.selectedSize}>{item.selectedSize || 'ONESIZE'}</option>
                              )}
                            </select>
                          </div>

                          <div className="text-zinc-300 font-extrabold">
                            {item.product.price} UAH / од.
                          </div>
                        </div>

                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-0 border-zinc-950 font-mono">
                      {/* QUANTITY SWITCHER inside cart */}
                      <div className="flex border border-zinc-900 bg-[#050505] items-center">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.product.id, item.selectedSize, -1)}
                          className="px-3 py-1.5 text-zinc-500 hover:text-white transition-colors cursor-pointer text-xs font-black select-none"
                        >
                          -
                        </button>
                        <span className="px-3.5 py-1.5 text-white font-black text-xs border-x border-zinc-900 bg-black min-w-[32px] text-center select-none">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.product.id, item.selectedSize, 1)}
                          className="px-3 py-1.5 text-zinc-500 hover:text-white transition-colors cursor-pointer text-xs font-black select-none"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.product.id, item.selectedSize)}
                        className="text-zinc-500 hover:text-[#ff3c3c] text-[10px] uppercase font-black tracking-widest flex items-center gap-1 transition-all"
                      >
                        <Trash2 size={11} />
                        <span>[ВИДАЛИТИ]</span>
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step: OUTSTANDING TELEGRAM REDIRECTOR AND SPEC COPIER */}
        {step === 'checkout' && (
          <div className="space-y-5 font-mono text-zinc-350" id="telegram-checkout-redirector">
            
            {/* Header description */}
            <div className="border-b border-zinc-900 pb-3">
              <h3 className="text-xs font-black tracking-[0.16em] text-white uppercase flex items-center gap-2">
                <Send size={15} className="text-[#ff3c3c] animate-pulse" /> ОФОРМЛЕННЯ ЗАМОВЛЕННЯ
              </h3>
            </div>

            {/* Compact Short Instructions */}
            <div className="border border-zinc-900 bg-[#060606] p-4 font-sans text-[11px] leading-relaxed space-y-1.5 text-zinc-400">
              <p className="text-white font-extrabold text-[11px] uppercase tracking-wider mb-2">ІНСТРУКЦІЯ / INSTRUCTIONS:</p>
              <p>1. Натисніть кнопку <span className="text-white font-black uppercase">"СКОПІЮВАТИ ТЕКСТ"</span> нижче.</p>
              <p>2. Надішліть скопійований текст менеджеру в Телеграм <span className="text-[#ff3c3c] font-black">@SGB_secum</span>.</p>
            </div>



            {/* One-click copier button */}
            <button
              onClick={handleCopyOrder}
              className={`w-full py-4 px-6 text-xs font-black tracking-[0.25em] uppercase border transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                copied
                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg'
                  : 'bg-white hover:bg-neutral-200 text-black border-white'
              }`}
            >
              {copied ? (
                <>
                  <Check size={14} />
                  <span>СПЕЦИФІКАЦІЮ СКОПІЙОВАНО !</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span>СКОПІЮВАТИ ТЕКСТ ЗАМОВЛЕННЯ</span>
                </>
              )}
            </button>

            {/* Reveal Send Button after copying */}
            {copied && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="pt-1"
              >
                <a
                  href="https://t.me/SGB_secum"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full bg-[#ff3c3c] hover:bg-[#ff5555] text-white py-4 px-6 text-xs font-black tracking-[0.25em] uppercase transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(255,60,60,0.4)] text-center font-mono"
                >
                  <Send size={13} />
                  <span>НАДІСЛАТИ ЗАМОВЛЕННЯ В TELEGRAM</span>
                </a>
              </motion.div>
            )}

          </div>
        )}

      </div>

      {/* RIGHT AREA: PRICING RECEIPT / ORDER CHECKOUT BAR */}
      <div className="lg:col-span-4 space-y-4 font-mono">
        
        <div className="bg-[#020202] border-2 border-zinc-900 p-6 rounded-none space-y-5 relative">
          
          <div className="border-b border-zinc-900 pb-3">
            <h4 className="text-xs font-black text-white tracking-[0.16em] uppercase block mb-1">СУМАРНА КВИТАНЦІЯ ПОКУПКИ</h4>
            <span className="text-[8px] text-zinc-600 block font-bold">SGB SECUM COUTURE</span>
          </div>

          <div className="space-y-2.5 text-[11px]">
            <div className="flex justify-between text-zinc-500">
              <span className="font-bold">СУМА ТОВАРІВ:</span>
              <span className="text-white font-extrabold">{cartTotal} UAH</span>
            </div>
            
            <div className="flex justify-between text-zinc-500 border-t border-zinc-950 pt-2 border-dashed">
              <span className="font-bold">ПАРТНЕРСЬКА ДОСТАВКА:</span>
              <span className="text-[#ff3c3c] font-black tracking-wider uppercase">БЕЗКОШТОВНО</span>
            </div>

            <div className="border-t-[2px] border-[#ff3c3c]/30 my-4 pt-3 flex justify-between font-black text-xs text-white">
              <span className="tracking-wider text-zinc-400">ПІДСУМКОВА СУМА:</span>
              <span className="text-[#ff3c3c] text-sm font-black">{cartTotal} UAH</span>
            </div>
          </div>

          {step === 'cart' && (
            <button
              onClick={() => {
                if (cartItems.length === 0) return;
                setStep('checkout');
                setTimeout(() => {
                  document.getElementById('cart-root')?.scrollIntoView({ behavior: 'smooth' });
                }, 50);
              }}
              disabled={cartItems.length === 0}
              className={`w-full py-4 text-xs font-black tracking-[0.2em] uppercase transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                cartItems.length === 0
                  ? 'bg-zinc-950 border border-zinc-900 text-zinc-600 cursor-not-allowed'
                  : 'bg-white hover:bg-neutral-200 text-black hover:translate-y-[-1px]'
              }`}
            >
              <span>ОФОРМИТИ ЗАМОВЛЕННЯ</span>
              <ChevronRight size={13} />
            </button>
          )}

          {step === 'checkout' && (
            <button
              onClick={() => setStep('cart')}
              className="w-full bg-transparent hover:bg-zinc-950 border border-zinc-900 text-zinc-400 py-3.5 text-[10px] tracking-widest uppercase font-black cursor-pointer transition-all"
            >
               повернутися до кошика
            </button>
          )}

          <div className="text-[8px] text-zinc-600 block text-center uppercase pt-3 border-t border-zinc-950 tracking-widest font-black">
            SGB SECUM Shopping Portal v1.99
          </div>
        </div>

      </div>

    </div>
  );
}
