import { useState } from 'react';
import { Product } from '../types';
import { Shield, Sparkles, Cpu, RefreshCw, Layers, CheckCircle2, AlertOctagon } from 'lucide-react';
import { motion } from 'motion/react';

interface FittingRoomProps {
  products: Product[];
  onAddToCart: (product: Product, size: string) => void;
}

export default function FittingRoom({ products, onAddToCart }: FittingRoomProps) {
  const [equipped, setEquipped] = useState<{
    accessories?: Product;
    outerwear?: Product;
    top?: Product;
    bottom?: Product;
    shoes?: Product;
  }>({});

  const [aiAnalysis, setAiAnalysis] = useState<{
    fitRating: number; // e.g. 94%
    verdict: string;
    vibeTags: string[];
    tips: string[];
  } | null>(null);

  const [loading, setLoading] = useState(false);

  const equipItem = (item: Product) => {
    setEquipped(prev => ({
      ...prev,
      [item.category]: item
    }));
    setAiAnalysis(null);
  };

  const unequipItem = (category: keyof typeof equipped) => {
    setEquipped(prev => {
      const copy = { ...prev };
      delete copy[category];
      return copy;
    });
    setAiAnalysis(null);
  };

  const getStyleScore = () => {
    let base = 70;
    const itemsCount = Object.keys(equipped).length;
    if (itemsCount === 0) return 0;
    
    // Calculate custom neo-cyber rating
    if (equipped.accessories) base += 8;
    if (equipped.outerwear) base += 10;
    if (equipped.top && equipped.bottom) base += 12;
    
    // synergy bonuses
    if (equipped.outerwear?.tags.includes('leather') && equipped.shoes?.tags.includes('heavy')) {
      base += 5;
    }
    return Math.min(100, base);
  };

  const analyzeOutfit = async () => {
    setLoading(true);
    
    const itemsList = Object.values(equipped).filter(Boolean) as Product[];
    if (itemsList.length === 0) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartItems: itemsList.map(item => ({ product: item, quantity: 1 })),
          tags: itemsList.flatMap(i => i.tags)
        })
      });

      const data = await response.json();
      
      setAiAnalysis({
        fitRating: getStyleScore(),
        verdict: data.tips?.[0] || 'Силует завершено. Оцінка матричного сумісництва позитивна.',
        vibeTags: data.recommendedTags || ['#void-look', '#sacral-geometry', '#memento-noire'],
        tips: data.tips || [
          'Ідеальний контраст у верхньому секторі.',
          'Рекомендується додати важкі аксесуари у вигляді срібних сигілів.'
        ]
      });
    } catch (e) {
      // elegant fallback
      setAiAnalysis({
        fitRating: getStyleScore(),
        verdict: 'ІНТЕЛЕКТУАЛЬНИЙ ОБХІД: Твій вибір виглядає вкрай модно. Монохром зберігає ідеальний силует.',
        vibeTags: ['#sacral-geometry', '#memento-noire', '#gothic-line'],
        tips: [
          'Чудові пропорції та вільний крій штанин.',
          'Додай окуляри SGL для повного ухилення від вуличного спостереження.'
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddFittedToCart = () => {
    const items = Object.values(equipped) as (Product | undefined)[];
    items.forEach(item => {
      if (item) {
        onAddToCart(item, item.sizes[0] || 'M');
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="fitting-room-canvas">
      {/* LEFT: Item Library selector */}
      <div className="lg:col-span-4 bg-[#050505] border border-[#333333] p-5 rounded-none flex flex-col h-[700px]">
        <div className="border-b border-[#333333] pb-2 mb-4">
          <h2 className="text-sm font-mono tracking-widest font-bold text-white flex items-center gap-2 uppercase">
            <Layers size={14} className="text-zinc-500" />
            СКЛАД РАДИКАЛЬНОГО ГАРДЕРОБУ
          </h2>
          <p className="text-[10px] text-zinc-500 font-mono mt-1">Обери елементи для накладання на манекен</p>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
          {(['accessories', 'outerwear', 'top', 'bottom', 'shoes'] as const).map(cat => {
            const catProducts = products.filter(p => p.category === cat);

            return (
              <div key={cat} className="space-y-2">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block font-bold">
                  {cat === 'accessories' && '◇ Аксесуари'}
                  {cat === 'outerwear' && '◇ Верхній одяг'}
                  {cat === 'top' && '◇ Топи / Светри'}
                  {cat === 'bottom' && '◇ Карго / Низ'}
                  {cat === 'shoes' && '◇ Взуття'}
                </span>

                <div className="grid grid-cols-1 gap-2">
                  {catProducts.map(p => {
                    const active = equipped[cat]?.id === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => equipItem(p)}
                        className={`text-left p-3 border transition-all duration-300 flex justify-between items-center ${
                          active
                            ? 'bg-white border-white text-black'
                            : 'bg-transparent border-[#333333] text-zinc-300 hover:border-white'
                        }`}
                      >
                        <div>
                          <div className="text-[11px] font-mono tracking-tight font-bold">{p.name}</div>
                          <div className="text-[10px] font-mono opacity-60 mt-0.5">{p.price} UAH // {p.riddickRating}</div>
                        </div>
                        {active ? (
                          <span className="text-[10px] font-mono font-bold bg-black text-white px-1.5 py-0.5">FITTED</span>
                        ) : (
                          <span className="text-[10px] font-mono opacity-50">+ EQUIP</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CENTER: Dynamic Mannequin Canvas */}
      <div className="lg:col-span-4 bg-[#050505] border border-[#333333] p-6 rounded-none flex flex-col justify-between items-center relative overflow-hidden h-[700px]">
        {/* Futuristic Grid Layer in Background */}
        <div className="absolute inset-0 bg-radial-grid opacity-15 pointer-events-none" />
        
        {/* Matrix Header */}
        <div className="w-full flex justify-between items-center border-b border-[#333333] pb-2 z-10">
          <span className="text-[9px] font-mono text-zinc-500 tracking-widest uppercase">UNIT // MANNEQUIN_0</span>
          <span className="text-[9px] font-mono text-zinc-300 font-bold bg-[#050505] border border-[#333333] px-2 py-0.5 flex items-center gap-1">
            <Cpu size={10} /> LAYER: 0x8F
          </span>
        </div>

        {/* Mannequin Box with overlaid items */}
        <div className="flex-1 w-full flex items-center justify-center relative my-4">
          
          {/* Mannequin base wireframe */}
          <div className="w-40 h-[480px] border border-zinc-900 absolute opacity-25 rounded-full flex flex-col justify-around items-center py-8 pointer-events-none">
            <div className="w-10 h-10 border border-dashed border-zinc-800 rounded-full" />
            <div className="w-24 h-36 border-y border-zinc-800" />
            <div className="w-20 h-44 border border-dashed border-zinc-800" />
          </div>

          {/* EQUIPPED ITEMS GRAPHICS OVERLAY */}
          <div className="relative w-full h-full flex flex-col justify-center items-center">
            
            {/* Sunglasses Place */}
            <div className="absolute top-[80px] z-30 h-12 flex items-center justify-center">
              {equipped.accessories ? (
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-black/90 text-white border-2 border-white px-3 py-1 font-mono text-[9px] uppercase tracking-wider shadow-lg flex items-center gap-1.5 cursor-pointer"
                  onClick={() => unequipItem('accessories')}
                >
                  🕶 {equipped.accessories.name.split(' ')[0]} 
                  <span className="text-zinc-500 font-bold hover:text-white ml-1">×</span>
                </motion.div>
              ) : (
                <div className="text-[8px] font-mono text-zinc-700 tracking-widest uppercase border border-dashed border-[#333333] px-2 py-0.5 rounded-none">ACCESSORY_SLOT</div>
              )}
            </div>

            {/* Top Gear / Outerwear Combination Place */}
            <div className="absolute top-[130px] z-20 w-44 flex flex-col gap-1 items-center">
              
              {equipped.outerwear && (
                <motion.div
                  initial={{ y: -15, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="bg-black border-2 border-white text-white p-2 font-mono text-[9px] w-full text-center relative cursor-pointer"
                  onClick={() => unequipItem('outerwear')}
                >
                  <div className="font-bold">🧥 {equipped.outerwear.name}</div>
                  <div className="text-[7px] text-zinc-400 mt-0.5">OUTER // {equipped.outerwear.riddickRating}</div>
                  <span className="absolute right-1 top-1 text-[8px] text-zinc-500 font-bold">×</span>
                </motion.div>
              )}

              {equipped.top ? (
                <motion.div
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="bg-[#050505] border border-white text-zinc-100 p-2 font-mono text-[9px] w-full text-center relative cursor-pointer mt-1"
                  onClick={() => unequipItem('top')}
                >
                  <div className="font-bold">👕 {equipped.top.name}</div>
                  <div className="text-[7px] text-zinc-400 mt-0.5">MID-LAYER // {equipped.top.riddickRating}</div>
                  <span className="absolute right-1 top-1 text-[8px] text-zinc-500 font-bold">×</span>
                </motion.div>
              ) : (
                !equipped.outerwear && (
                  <div className="text-[8px] font-mono text-zinc-700 tracking-widest uppercase border border-dashed border-[#333333] w-full text-center py-3">TOP_LAYER_SLOT</div>
                )
              )}
            </div>

            {/* Bottom Gear */}
            <div className="absolute top-[285px] z-10 w-40 flex items-center justify-center">
              {equipped.bottom ? (
                <motion.div
                  initial={{ y: 25, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="bg-black border border-white text-zinc-100 p-2 font-mono text-[9px] w-full text-center relative cursor-pointer"
                  onClick={() => unequipItem('bottom')}
                >
                  <div className="font-bold">👖 {equipped.bottom.name}</div>
                  <div className="text-[7px] text-zinc-400 mt-0.5">LEGWEAR_SYSTEM</div>
                  <span className="absolute right-1 top-1 text-[8px] text-zinc-500 font-bold">×</span>
                </motion.div>
              ) : (
                <div className="text-[8px] font-mono text-zinc-700 tracking-widest uppercase border border-dashed border-[#333333] w-full text-center py-4">BOTTOM_SLOT</div>
              )}
            </div>

            {/* Footwear */}
            <div className="absolute bottom-[40px] z-10 w-36 flex items-center justify-center">
              {equipped.shoes ? (
                <motion.div
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="bg-[#050505] border border-white text-zinc-100 p-1 px-2 font-mono text-[9px] w-full text-center relative cursor-pointer"
                  onClick={() => unequipItem('shoes')}
                >
                  <div className="font-bold">🥾 {equipped.shoes.name}</div>
                  <span className="absolute right-1 top-0.5 text-[8px] text-zinc-500 font-bold">×</span>
                </motion.div>
              ) : (
                <div className="text-[8px] font-mono text-zinc-700 tracking-widest uppercase border border-dashed border-[#333333] w-full text-center py-2">STANCE_SLOT</div>
              )}
            </div>

          </div>

        </div>

        {/* Action Panel for Fitted Outfit */}
        <div className="w-full z-10 space-y-2">
          {Object.keys(equipped).length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setEquipped({})}
                className="bg-zinc-900 hover:bg-zinc-800 border border-[#333333] text-zinc-400 py-2.5 font-mono text-[10px] tracking-wider uppercase transition-all"
              >
                ОЧИСТИТИ
              </button>
              <button
                onClick={handleAddFittedToCart}
                className="bg-white hover:bg-neutral-200 text-black py-2.5 font-mono text-[10px] tracking-wider uppercase font-bold transition-all"
              >
                У КОШИК (+{Object.keys(equipped).length})
              </button>
            </div>
          ) : (
            <div className="text-center p-3 border border-[#333333] bg-[#050505]">
              <p className="text-[10px] font-mono text-zinc-500">МАНЕКЕН ПОРОЖНІЙ. ДОДАЙТЕ ОДЯГ З КАТАЛОГУ ЛІВОРУЧ.</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: AI analysis/styling diagnostic */}
      <div className="lg:col-span-4 bg-[#050505] border border-[#333333] p-5 rounded-none flex flex-col justify-between h-[700px]">
        <div className="space-y-4">
          <div className="border-b border-[#333333] pb-2 flex justify-between items-center">
            <h2 className="text-sm font-mono tracking-widest font-bold text-white flex items-center gap-2 uppercase">
              <Cpu size={14} className="text-zinc-500" />
              НЕЙРО-СТИЛІСТ // VOID_AI
            </h2>
            <Sparkles size={12} className="text-zinc-400 animate-pulse" />
          </div>

          <div className="p-4 bg-[#050505] border border-[#333333] rounded-none relative">
            <span className="text-[8px] font-mono text-zinc-600 block absolute top-2 right-2">STATE: STANDBY</span>
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block mb-2">ПОТОЧНИЙ СИЛУЕТ</span>
            
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500">
                <span>АКСЕСУАР:</span>
                <span className="text-white font-bold">{equipped.accessories?.name || "ВІДСУТНІЙ"}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500">
                <span>ЗОВНІШНІЙ LAYER:</span>
                <span className="text-white font-bold">{equipped.outerwear?.name || "ВІДСУТНІЙ"}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500">
                <span>СВЕТР / ТОП:</span>
                <span className="text-white font-bold">{equipped.top?.name || "ВІДСУТНІЙ"}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500">
                <span>ШТАНИ:</span>
                <span className="text-white font-bold">{equipped.bottom?.name || "ВІДСУТНІЙ"}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500">
                <span>ВЗУТТЯ:</span>
                <span className="text-white font-bold">{equipped.shoes?.name || "ВІДСУТНЄ"}</span>
              </div>
            </div>

            <div className="border-t border-[#333333] mt-3 pt-3 flex justify-between items-center">
              <span className="text-[10px] font-mono text-zinc-500">ІНДЕКС СПОЛУЧУВАНОСТІ:</span>
              <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded-none ${
                getStyleScore() > 80 ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-300'
              }`}>
                {getStyleScore()}%
              </span>
            </div>
          </div>

          {Object.keys(equipped).length > 0 ? (
            <button
              onClick={analyzeOutfit}
              disabled={loading}
              className="w-full bg-zinc-900 hover:bg-zinc-800 border border-[#333333] text-white py-3 font-mono text-[11px] tracking-widest uppercase font-bold transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw size={12} className="animate-spin" />
                  ПІДКЛЮЧЕННЯ ДО ОРАКУЛА...
                </>
              ) : (
                <>
                  <Sparkles size={12} />
                  АНАЛІЗУВАТИ ЛУК // AI
                </>
              )}
            </button>
          ) : (
            <div className="text-center p-6 border border-[#333333] bg-[#050505] text-zinc-600 font-mono text-[10px]">
              АНАЛІЗ БУДЕ ДОСТУПНИЙ ПІСЛЯ КАРТОГРАФУВАННЯ ТІЛА (ХОЧА Б 1 ЕЛЕМЕНТ ОДЯГУ).
            </div>
          )}

          {/* AI DIAGNOSES OUTPUT */}
          {aiAnalysis && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3 pt-3 border-t border-[#333333] w-full"
            >
              <div className="flex gap-2 items-start bg-black border border-[#333333] p-3">
                <Shield size={16} className="text-white shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-zinc-500 block uppercase font-bold tracking-wider">ВЕРДИКТ ІНТЕЛЕКТУ</span>
                  <p className="text-[11px] font-mono text-zinc-100 leading-relaxed">{aiAnalysis.verdict}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-zinc-500 block uppercase tracking-wider">СТИЛІСТИЧНІ МАРКЕРИ</span>
                <div className="flex flex-wrap gap-1">
                  {aiAnalysis.vibeTags.map((t, idx) => (
                    <span key={idx} className="bg-zinc-900 border border-[#333333] text-zinc-300 px-2 py-0.5 font-mono text-[9px]">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-1 bg-[#050505] p-3 border border-[#333333] font-mono">
                <span className="text-[10px] text-zinc-500 block uppercase font-bold mb-1">СИНЕРГЕТИЧНІ СЕКРЕТИ</span>
                {aiAnalysis.tips.slice(1).map((t, idx) => (
                  <div key={idx} className="text-[10.5px] text-zinc-300 leading-normal flex items-start gap-1">
                    <span className="text-zinc-600">❖</span>
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        <div className="border-t border-[#333333] pt-3 mt-4 text-center">
          <span className="text-[8px] font-mono text-zinc-600 block">VOID // NEURAL COMPATIBILITY ALGORITHM // RIDDICK V1.0</span>
        </div>
      </div>
    </div>
  );
}
