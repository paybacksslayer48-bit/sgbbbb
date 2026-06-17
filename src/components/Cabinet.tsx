import { useState, useEffect } from 'react';
import { Order, SavedLook, Product } from '../types';
import { User, Package, Bell, ShieldAlert, BadgeInfo, Tag, Heart, Trash2, KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CabinetProps {
  orders: Order[];
  savedLooks: SavedLook[];
  onDeleteLook: (lookId: string) => void;
  products: Product[];
  onAddLookToCart: (productIds: string[]) => void;
  customerVibe: string;
  onSetCustomerVibe: (vibe: string) => void;
}

export default function Cabinet({
  orders,
  savedLooks,
  onDeleteLook,
  products,
  onAddLookToCart,
  customerVibe,
  onSetCustomerVibe
}: CabinetProps) {
  const [userIdentityId] = useState(() => "VOID-" + Math.floor(1000 + Math.random() * 9000));
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [notifications, setNotifications] = useState<{
    id: string;
    title: string;
    message: string;
    time: string;
    read: boolean;
  }[]>([]);

  // Simulate receiving push notifications about shipping updates for order
  useEffect(() => {
    if (orders.length > 0) {
      const activeOrder = orders[0];
      const itemsText = activeOrder.items.map(i => i.productName).join(', ');

      const initialAlerts = [
        {
          id: 'notif-1',
          title: 'ЗАМОВЛЕННЯ ЗАРЕЄСТРОВАНО',
          message: `Специфікація замовлення ${activeOrder.orderNumber} сформована. Очікуємо на передачу перевізнику.`,
          time: 'Щойно',
          read: false
        },
        {
          id: 'notif-2',
          title: 'НАРАХОВАНО БОНУСИ VOID',
          message: `На баланс твого цифрового гаманця нараховано 250 крипто-сигілів за покупку.`,
          time: '5 хв тому',
          read: false
        }
      ];

      setNotifications(initialAlerts);
    } else {
      setNotifications([
        {
          id: 'notif-init',
          title: 'ВІТАЄМО В СИСТЕМІ VOID',
          message: 'Твій кабінет анонімно підключено до супутник-серверів. Обери свій візуальний архетип нижче.',
          time: 'Щойно',
          read: false
        }
      ]);
    }
  }, [orders]);

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const getStatusLabelAndColor = (status: Order['status']) => {
    switch (status) {
      case 'new':
        return { text: 'ОЧІКУЄ ПІДТВЕРДЖЕННЯ', color: 'border-yellow-500 text-yellow-500 bg-yellow-500/5' };
      case 'processing':
        return { text: 'ПАКУЄТЬСЯ НА СКЛАДІ', color: 'border-blue-500 text-blue-500 bg-blue-500/5' };
      case 'sent':
        return { text: 'ВІДПРАВЛЕНО (НОВА ПОШТА)', color: 'border-white text-white bg-white/5 font-bold' };
      case 'completed':
        return { text: 'ДОСТАВЛЕНО ТА ОТРИМАНО', color: 'border-green-500 text-green-500 bg-green-500/5' };
      case 'cancelled':
        return { text: 'АНУЛЬОВАНО', color: 'border-red-500 text-red-500 bg-red-500/5' };
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="cabinet-root">
      
      {/* LEFT COLUMN: Identity Profile */}
      <div className="lg:col-span-4 bg-[#050505] border border-[#333333] p-5 rounded-none space-y-6">
        
        {/* Cyber ID Card */}
        <div className="border border-white/20 p-5 relative overflow-hidden bg-black">
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-bl-full pointer-events-none" />
          
          <div className="flex items-center gap-4 border-b border-[#333333] pb-4">
            <div className="w-16 h-16 border-2 border-white bg-[#050505] flex items-center justify-center relative">
              <User size={32} className="text-white" />
              <div className="absolute -bottom-1.5 -right-1.5 bg-white text-black font-mono text-[8px] px-1 font-bold">
                ALT_STYL
              </div>
            </div>
            
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-zinc-500 tracking-wider">ЦИФРОВИЙ ПРОФІЛЬ</span>
              <h2 className="text-sm font-mono font-bold text-white tracking-widest">{userIdentityId}</h2>
              <span className="text-[9px] font-mono text-zinc-400 border border-[#333333] px-1.5 py-0.5 bg-black">
                LEVEL_0_AESTHETE
              </span>
            </div>
          </div>

          <div className="pt-4 space-y-2">
            <div className="flex justify-between text-[10px] font-mono text-zinc-500">
              <span>СТАТУС ПОДКЛЮЧЕННЯ:</span>
              <span className="text-green-500 font-bold">● ONLINE // ANONYMOUS</span>
            </div>
            <div className="flex justify-between text-[10px] font-mono text-zinc-500">
              <span>СПОСІБ АВТОРИЗАЦІЇ:</span>
              <span className="text-white">SESSION_COOKIE_GATEWAY</span>
            </div>
            <div className="flex justify-between text-[10px] font-mono text-zinc-500">
              <span>ЛОКАЦІЯ СЕСІЇ:</span>
              <span className="text-white">UKRAINE (UA)</span>
            </div>
          </div>
        </div>

        {/* Dynamic Vibe Archetype Customization */}
        <div className="space-y-3">
          <div className="border-b border-[#333333] pb-2">
            <h3 className="text-xs font-mono tracking-widest text-[#ffffff] font-bold uppercase flex items-center gap-1.5">
              <KeyRound size={12} /> ВІЗУАЛЬНИЙ АРХЕТИП STYLING
            </h3>
            <p className="text-[9px] text-zinc-500 font-mono mt-0.5">Впливає на нейромережеві рекомендації каталогу</p>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: "gorpcore", label: "🌲 GORPCORE STALKER" },
              { id: "neogoth", label: "✥ NEO GOTHIC ALT" },
              { id: "grunge", label: "✥ DARK AVANT-GARDE" },
              { id: "techwear", label: "⚡ BLACKOUT TECHWEAR" }
            ].map(v => (
              <button
                key={v.id}
                onClick={() => onSetCustomerVibe(v.id)}
                className={`py-2 px-2.5 border font-mono text-[9px] text-left transition-all duration-300 ${
                  customerVibe === v.id
                    ? "bg-white text-black border-white font-bold"
                    : "bg-black border-[#333333] text-zinc-400 hover:border-white hover:text-white"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notification / Push alerts board */}
        <div className="space-y-3">
          <div className="flex justify-between items-center border-b border-[#333333] pb-2">
            <h3 className="text-xs font-mono tracking-widest text-zinc-400 font-bold uppercase flex items-center gap-1.5">
              <Bell size={12} /> ЦИФРОВІ PUSH-ПОВІДОМЛЕННЯ
            </h3>
            {notifications.some(n => !n.read) && (
              <button onClick={markAllAsRead} className="text-[9px] font-mono text-zinc-500 hover:text-white underline">
                ЧИТАТИ ВСІ
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {notifications.map(notif => (
              <div
                key={notif.id}
                className={`p-3 border font-mono text-[10px] space-y-1 relative ${
                  notif.read ? 'bg-black border-[#333333] text-zinc-500' : 'bg-zinc-900 border-zinc-700 text-zinc-200'
                }`}
              >
                {!notif.read && <div className="absolute top-3 right-3 w-1.5 h-1.5 bg-white rounded-full animate-pulse" />}
                <div className="font-bold flex justify-between">
                  <span>{notif.title}</span>
                  <span className="text-[8px] opacity-60 font-normal">{notif.time}</span>
                </div>
                <p className="leading-relaxed text-[9.5px] opacity-80">{notif.message}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Active Shipments & Saved looks */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* Active orders / Shipments tracing */}
        <div className="bg-[#050505] border border-[#333333] p-5 rounded-none space-y-4">
          <div className="border-b border-[#333333] pb-2">
            <h3 className="text-xs font-mono tracking-widest text-white font-bold uppercase flex items-center gap-1.5">
              <Package size={14} className="text-zinc-500" />
              ТВОЇ АКТИВНІ ВІДПРАВЛЕННЯ ТА ІСТОРІЯ ЗАМОВЛЕНЬ
            </h3>
            <p className="text-[9px] text-zinc-500 font-mono mt-0.5">Відстеження посилок у реальному часі через API</p>
          </div>

          {orders.length === 0 ? (
            <div className="text-center p-8 border border-[#333333] bg-black font-mono">
              <ShieldAlert size={20} className="mx-auto text-zinc-600 mb-2" />
              <p className="text-[10px] text-zinc-500">У ТЕБЕ НЕМАЄ СТВОРЕНИХ ЗАМОВЛЕНЬ.</p>
              <p className="text-[8px] text-zinc-600 mt-1 uppercase">ПЕРЕЙДИ ДО КАТАЛОГУ ДЛЯ ОФОРМЛЕННЯ КОРЗИНИ.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map(order => {
                const badge = getStatusLabelAndColor(order.status);
                const isSelected = selectedOrder?.id === order.id;

                return (
                  <div key={order.id} className="border border-[#333333] bg-black">
                    {/* Compact Card Header */}
                    <div
                      onClick={() => setSelectedOrder(isSelected ? null : order)}
                      className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 cursor-pointer hover:bg-neutral-950 transition-all font-mono"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white">{order.orderNumber}</span>
                          <span className="text-[9px] text-zinc-500">| {order.date}</span>
                        </div>
                        <div className="text-[9px] text-zinc-400">
                          Елементів: {order.items.reduce((sum, i) => sum + i.quantity, 0)} • Усього: <span className="text-white font-bold">{order.totalPrice + order.shippingCost} UAH</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
                        <span className={`text-[9.5px] px-2 py-0.5 border font-mono ${badge.color}`}>
                          {badge.text}
                        </span>
                        <span className="text-[10px] text-zinc-500">{isSelected ? '[-] ЗГОРНУТИ' : '[+] ДЕТАЛІ'}</span>
                      </div>
                    </div>

                    {/* Detailed Order view */}
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t border-[#333333] bg-black/50"
                        >
                          <div className="p-4 space-y-4 font-mono text-[10px] tracking-tight">
                            
                            {/* Delivery Tracking Bar */}
                            {order.trackingNumber && (
                              <div className="bg-[#050505] border border-[#333333] p-3 space-y-2">
                                <div className="flex justify-between items-center border-b border-[#333333] pb-1.5">
                                  <span className="text-zinc-500">ЕКСПРЕС-НАКЛАДНА ТТН:</span>
                                  <span className="text-white font-bold select-all">{order.trackingNumber}</span>
                                </div>
                                <div className="flex justify-between items-center text-[9px]">
                                  <span className="text-zinc-500">ПЕРЕВІЗНИК:</span>
                                  <span className="text-white font-bold uppercase">
                                    {order.customer.deliveryMethod.startsWith('nova_') ? 'НОВА ПОШТА API' : 'УКРПОШТА API'}
                                  </span>
                                </div>
                                <div className="pt-1 flex items-center gap-2">
                                  <div className="h-1 bg-[#333333] flex-1 relative rounded-full">
                                    <div className={`h-full bg-white rounded-full ${
                                      order.status === 'new' ? 'w-1/4' :
                                      order.status === 'processing' ? 'w-2/4' :
                                      order.status === 'sent' ? 'w-3/4' : 'w-full'
                                    }`} />
                                  </div>
                                  <span className="text-[9px] text-zinc-400 font-bold uppercase">
                                    {order.status === 'new' && 'РЕЄСТРАЦІЯ'}
                                    {order.status === 'processing' && 'ЗБІРКА'}
                                    {order.status === 'sent' && 'У ДОРОЗІ'}
                                    {order.status === 'completed' && 'ПРИБУЛО'}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Customer Specs */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <span className="text-zinc-500 uppercase block">Отримувач:</span>
                                <div className="text-zinc-300 font-bold">{order.customer.fullName}</div>
                                <div className="text-zinc-400">{order.customer.phone} / {order.customer.email}</div>
                              </div>
                              <div className="space-y-1">
                                <span className="text-zinc-500 uppercase block">Пункт доставки:</span>
                                <div className="text-zinc-300 font-bold">{order.customer.city}</div>
                                <div className="text-zinc-400 leading-normal">{order.customer.addressDetails}</div>
                              </div>
                            </div>

                            {/* Items breakdown */}
                            <div className="border-t border-[#333333] pt-3 space-y-1.5">
                              <span className="text-zinc-500 uppercase block mb-1">Склад посилки:</span>
                              {order.items.map((it: any, i: number) => (
                                <div key={i} className="flex justify-between text-[10px] text-zinc-300">
                                  <span>{it.productName} (Размір: <span className="text-white font-bold">{it.size}</span>) × {it.quantity}</span>
                                  <span>{it.price * it.quantity} UAH</span>
                                </div>
                              ))}
                              
                              <div className="border-t border-[#333333] pt-3 flex justify-between font-bold text-zinc-400 mt-2">
                                <span>Доставка:</span>
                                <span className="text-zinc-200">{order.shippingCost} UAH</span>
                              </div>
                              <div className="flex justify-between font-bold text-xs text-white">
                                <span>ЗАГАЛЬНА СУМА ОПЛАТИ:</span>
                                <span>{order.totalPrice + order.shippingCost} UAH ({
                                  order.customer.paymentMethod === 'card_online' ? 'Сплачено онлайн' :
                                  order.customer.paymentMethod === 'crypto_ton' ? 'Сплачено TON COIN' : 'Оплата при отриманні'
                                })</span>
                              </div>
                            </div>

                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Saved Looks / Collections management */}
        <div className="bg-[#050505] border border-[#333333] p-5 rounded-none space-y-4">
          <div className="border-b border-[#333333] pb-2">
            <h3 className="text-xs font-mono tracking-widest text-white font-bold uppercase flex items-center gap-1.5">
              <Heart size={14} className="text-zinc-500 fill-zinc-500" />
              ТВОЇ ЕСТЕТИЧНІ КОЛЕКЦІЇ ТА ЛУКИ
            </h3>
            <p className="text-[9px] text-zinc-500 font-mono mt-0.5">Збережені образи для швидкого замовлення</p>
          </div>

          {savedLooks.length === 0 ? (
            <div className="text-center p-8 border border-[#333333] bg-black font-mono">
              <Heart size={18} className="mx-auto text-zinc-700 mb-2" />
              <p className="text-[10px] text-zinc-500">У ТЕБЕ НЕМАЄ ЗБЕРЕЖЕНИХ ОБРАЗІВ.</p>
              <p className="text-[8px] text-zinc-600 mt-1 uppercase">Тисни 'ЗБЕРЕГТИ ОБРАЗ' у каталозі.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedLooks.map(look => {
                // Find products related to this look
                const matchedProducts = look.productIds
                  .map(id => products.find(p => p.id === id))
                  .filter(Boolean) as Product[];

                return (
                  <div key={look.id} className="border border-[#333333] p-4 space-y-3 bg-black font-mono flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-start">
                        <h4 className="text-xs font-bold text-white tracking-widest">{look.name.toUpperCase()}</h4>
                        <button
                          onClick={() => onDeleteLook(look.id)}
                          className="text-zinc-650 hover:text-white transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      {/* Display custom tags */}
                      <div className="flex flex-wrap gap-1">
                        {look.tags.map((t, i) => (
                          <span key={i} className="text-[8px] text-zinc-400 bg-[#050505] border border-[#333333] px-1 py-0.5">
                            #{t}
                          </span>
                        ))}
                      </div>

                      {/* Matched product list */}
                      <div className="space-y-1 pt-2">
                        {matchedProducts.map(p => (
                          <div key={p.id} className="text-[10px] text-zinc-400 flex justify-between border-b border-dashed border-[#333333] pb-1">
                            <span>✦ {p.name}</span>
                            <span className="text-white">{p.price} UAH</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => onAddLookToCart(look.productIds)}
                      className="w-full bg-white hover:bg-neutral-200 text-black py-2 text-[10px] font-bold tracking-widest transition-all mt-3"
                    >
                      ЗАМОВИТИ ВЕСЬ ОБРАЗ
                    </button>
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
