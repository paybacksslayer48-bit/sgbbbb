import { useState } from 'react';
import { Star, RotateCw } from 'lucide-react';
import { Language } from '../translations';

interface ReviewsProps {
  lang: Language;
  theme: 'dark' | 'light';
}

// Ordered exactly as requested by user split by languages:
// Order requested:
// 1. "гипертрипергеморой" with the 4th comment ("все очень круто...")
// 2. "катя" with the 1st comment ("ви просто блядь...")
// 3. "маша" with the 2nd comment ("топики очень... ")
// 4. "настя" with the 3rd comment ("всегда очень хотела...")
const reviewsData = {
  uk: [
    {
      id: "rev-1",
      number: "№01",
      name: "гипертрипергеморой",
      city: "Київ",
      date: "15.06.2026",
      rating: 5,
      fit: "Розмір: M",
      comment: "все очень круто купила бабушке труси(бу)(дайте скидку)"
    },
    {
      id: "rev-2",
      number: "№02",
      name: "катя",
      city: "Київ",
      date: "14.06.2026",
      rating: 5,
      fit: "Розмір: S",
      comment: "ви просто блядь не предсятляете насокльо я долго искала себе джинси я реально обходила все магазини оджеди в тц каждий раз когда могла, но как сами пониамтее находила там какойто среднячок. они как би не плохие , но и совесть мучает на такое викинут пару тисяч гривен мне попалось видео про буткати, я немного покапалась на сайте и нашла такие класние, они буклаьно будто с пинтертса. пришли бисренько, качесвто очень хорошее, а сидят просто будто под меня шили. в общем джинсики тут брать еще хоть раз буду))"
    },
    {
      id: "rev-3",
      number: "№03",
      name: "маша",
      city: "Одеса",
      date: "12.06.2026",
      rating: 5,
      fit: "Розмір: XS",
      comment: "топики очень секси"
    },
    {
      id: "rev-4",
      number: "№04",
      name: "настя",
      city: "Львів",
      date: "10.06.2026",
      rating: 5,
      fit: "Розмір: S",
      comment: "всегда очень хотела себе mini-шорти, которие будут знаете, не прям на пол жопи, а такие , акуртние но чтоби вот огонек такой бил в них. если хоитите такие же посомтрите на те которие с флагом какимто , прям идельно попу подчеркунли"
    }
  ],
  ru: [
    {
      id: "rev-1",
      number: "№01",
      name: "гипертрипергеморой",
      city: "Киев",
      date: "15.06.2026",
      rating: 5,
      fit: "Размер: M",
      comment: "все очень круто купила бабушке труси(бу)(дайте скидку)"
    },
    {
      id: "rev-2",
      number: "№02",
      name: "катя",
      city: "Киев",
      date: "14.06.2026",
      rating: 5,
      fit: "Размер: S",
      comment: "ви просто блядь не предсятляете насокльо я долго искала себе джинси я реально обходила все магазини оджеди в тц каждий раз когда могла, но как сами пониамтее находила там какойто среднячок. они как би не плохие , но и совесть мучает на такое викинут пару тисяч гривен мне попалось видео про буткати, я немного покапалась на сайте и нашла такие класние, они буклаьно будто с пинтертса. пришли бисренько, качесвто очень хорошее, а сидят просто будто под меня шили. в общем джинсики тут брать еще хоть раз буду))"
    },
    {
      id: "rev-3",
      number: "№03",
      name: "маша",
      city: "Одесса",
      date: "12.06.2026",
      rating: 5,
      fit: "Размер: XS",
      comment: "топики очень секси"
    },
    {
      id: "rev-4",
      number: "№04",
      name: "настя",
      city: "Львов",
      date: "10.06.2026",
      rating: 5,
      fit: "Размер: S",
      comment: "всегда очень хотела себе mini-шорти, которие будут знаете, не прям на пол жопи, а такие , акуртние но чтоби вот огонек такой бил в них. если хоитите такие же посомтрите на те которие с флагом какимто , прям идельно попу подчеркунли"
    }
  ],
  en: [
    {
      id: "rev-1",
      number: "№01",
      name: "hypertriperhemorrhoids",
      city: "Kyiv",
      date: "15.06.2026",
      rating: 5,
      fit: "Size: M",
      comment: "everything is extremely cool, bought used underwear for my grandma (gimme a discount)"
    },
    {
      id: "rev-2",
      number: "№02",
      name: "katya",
      city: "Kyiv",
      date: "14.06.2026",
      rating: 5,
      fit: "Size: S",
      comment: "you literally fucking can't imagine how long I've been looking for jeans... I literally went through all the shops inside malls every single time, but as you know only found average pieces. They weren't bad, but spending a few thousand hrivnyas felt wrong. Then I saw a video about bootcuts, dug around the site a bit and found these. They are literally straight out of Pinterest. Came fast, quality is great, and they fit like they were custom-made. Long story short, I'll definitely buy jeans here again))"
    },
    {
      id: "rev-3",
      number: "№03",
      name: "masha",
      city: "Odesa",
      date: "12.06.2026",
      rating: 5,
      fit: "Size: XS",
      comment: "tops are so sexy"
    },
    {
      id: "rev-4",
      number: "№04",
      name: "nastya",
      city: "Lviv",
      date: "10.06.2026",
      rating: 5,
      fit: "Size: S",
      comment: "always wanted mini-shorts that are, you know, not showing half of my butt, but neat and with a hot spark. If you want the same, look at the ones with a flag item, they highlighted my ass perfectly"
    }
  ]
};

const headings = {
  uk: {
    title: "ВІДГУКИ КЛІЄНТІВ // REVIEWS",
    verified: "ВЕРИФІКОВАНЕ ЗАМОВЛЕННЯ",
    load_more: "ЗАВАНТАЖИТИ БІЛЬШЕ ВІДГУКІВ",
    loading: "ЗАВАНТАЖЕННЯ ДАНИХ АРХІВУ...",
  },
  ru: {
    title: "ОТЗЫВЫ КЛИЕНТОВ // REVIEWS",
    verified: "ВЕРИФИЦИРОВАННЫЙ ЗАКАЗ",
    load_more: "ЗАГРУЗИТЬ БОЛЬШЕ ОТЗЫВОВ",
    loading: "ЗАГРУЗКА ДАННЫХ АРХИВА...",
  },
  en: {
    title: "CUSTOMER FEEDBACK // REVIEWS",
    verified: "VERIFIED CUSTOMER PURCHASE",
    load_more: "LOAD MORE FEEDBACK",
    loading: "CONNECTING TO ARCHIVE STATS...",
  }
};

export default function Reviews({ lang }: ReviewsProps) {
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const currentReviews = reviewsData[lang] || reviewsData.uk;
  const labels = headings[lang] || headings.uk;

  const handleLoadMore = () => {
    setIsLoadingMore(true);
  };

  return (
    <div className="space-y-12 py-6" id="reviews-subpage">
      
      {/* Title block with Subtitle line completely removed as requested */}
      <div className="text-center space-y-3 pb-8 border-b border-zinc-950">
        <span className="text-[#8a0303] text-sm block">✙ ✙ ✙</span>
        <h2 className="text-2xl md:text-5xl font-gothic tracking-[0.25em] font-black uppercase text-white">
          {labels.title}
        </h2>
      </div>

      {/* Reviews feed: Custom staircase (лесенкой) staggered responsive grid layout with highly readable serif font */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-16 pt-6" id="reviews-grid-staircase">
        {currentReviews.map((rev, index) => {
          // Alternating offsets to build a picturesque "staircase / лесенка" effect on desktop screens
          const staggerClass = index % 2 === 1 
            ? 'md:mt-16 border-l-2 border-[#8a0303] hover:translate-y-1' 
            : 'md:-mt-4 border-r-2 border-zinc-800 hover:-translate-y-1';
          
          return (
            <div 
              key={rev.id}
              className={`w-full border border-zinc-950 bg-[#040404]/99 p-8 transition-all duration-500 shadow-[0_4px_30px_rgba(0,0,0,0.8)] ${staggerClass}`}
            >
              <div className="space-y-6">
                
                {/* Stars & Date Header */}
                <div className="flex justify-between items-center pb-3.5 border-b border-zinc-900/80">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-[#8a0303] font-mono font-black tracking-widest mr-2">{rev.number}</span>
                    {[...Array(rev.rating)].map((_, i) => (
                      <Star key={i} size={13} className="fill-[#8a0303] text-[#8a0303]" />
                    ))}
                  </div>
                  <span className="text-xs font-mono text-zinc-200 bg-[#0f0f0f] border border-zinc-800 px-2.5 py-1 font-bold tracking-widest">{rev.date}</span>
                </div>

                {/* Review Comment - Clean, highly legible sans-serif typography with natural letter-casing */}
                <p className="font-sans leading-relaxed text-zinc-200 text-sm sm:text-base tracking-wide font-normal">
                  "{rev.comment}"
                </p>

              </div>

              {/* Custom Reviewer Footer */}
              <div className="mt-8 pt-4 border-t border-zinc-900/80 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-serif text-xs sm:text-xs tracking-wide capitalize font-light italic text-zinc-100 bg-zinc-900/40 border border-zinc-850 px-3 py-1 hover:text-white hover:border-[#8a0303] hover:bg-[#8a0303]/10 transition-all duration-300">
                    ✙ {rev.name}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">{rev.city}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 pt-1">
                  <span className="font-bold tracking-widest text-[#8a0303] bg-zinc-950 px-2 py-0.5 border border-zinc-900">{rev.fit}</span>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Load More Button - Infinite Loading Effect */}
      <div className="flex justify-center pt-8 border-t border-zinc-950 mt-12">
        <button
          onClick={handleLoadMore}
          disabled={isLoadingMore}
          className={`px-12 py-5 border text-xs font-mono tracking-[0.3em] uppercase font-black flex items-center gap-4 cursor-pointer transition-all duration-500 active:scale-95 ${
            isLoadingMore
              ? 'bg-neutral-950 text-[#8a0303] border-[#8a0303] cursor-not-allowed shadow-[0_0_25px_rgba(138,3,3,0.2)]'
              : 'bg-white text-black border-white hover:bg-[#8a0303] hover:text-white hover:border-[#8a0303] shadow-3xl'
          }`}
        >
          {isLoadingMore ? (
            <>
              <RotateCw size={14} className="animate-spin text-[#8a0303]" />
              {labels.loading}
            </>
          ) : (
            labels.load_more
          )}
        </button>
      </div>

    </div>
  );
}
