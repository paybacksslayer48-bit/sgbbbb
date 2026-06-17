import { useState, useEffect, FormEvent, useRef } from 'react';
import { Order, Product, TelegramDraft } from '../types';
import { Plus, Database, TrendingUp, Users, ShoppingBag, ShieldCheck, RefreshCw, Send, CheckCircle, Bell, X, Smartphone, Trash, Settings, ChevronRight, Laptop, Edit, Eye, Upload, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const getProductImageUrl = (p: any): string => {
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
    const tops = [4, 6, 7, 8];
    idx = tops[sum % tops.length];
  }
  return `/goods/item_${idx}.jpg`;
};

interface CrmDashboardProps {
  orders: Order[];
  products: Product[];
  onAddProduct: (newProduct: any) => void;
  onUpdateOrderStatus: (orderId: string, status: Order['status'], ttn?: string) => void;
  onDeleteProduct: (productId: string) => void;
  onBulkImport?: (newProducts: any[]) => void;
}

export default function CrmDashboard({
  orders,
  products,
  onAddProduct,
  onUpdateOrderStatus,
  onDeleteProduct,
  onBulkImport
}: CrmDashboardProps) {
  
  // Tab within CRM
  const [activeSubTab, setActiveSubTab] = useState<'orders' | 'inventory' | 'customers' | 'telegram' | 'drafts' | 'bulk_import'>('orders');

  // States for BULK JSON IMPORT
  const [importJsonProducts, setImportJsonProducts] = useState<any[]>([]);
  const [uploadedPhotosMap, setUploadedPhotosMap] = useState<{ [filename: string]: string }>({});
  const [isImporting, setIsImporting] = useState(false);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const bulkPhotoImportInputRef = useRef<HTMLInputElement>(null);

  const handleJsonFileSelect = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        if (typeof text === 'string') {
          const parsed = JSON.parse(text);
          const rawProducts = Array.isArray(parsed) ? parsed : [parsed];
          
          // Map to local products format
          const formatted = rawProducts.map((p, index) => {
            const tempId = `temp-import-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 5)}`;
            // Check if we already have an image uploaded with matching filename
            const matchedImage = uploadedPhotosMap[p.image_filename || ''] || null;
            return {
              tempId,
              name: p.name || '',
              description: p.description || '',
              price: p.price || '',
              category: p.category || 'top',
              sizes: p.sizes || ['S', 'M', 'L', 'XL'],
              tags: p.tags || ['imported'],
              image_filename: p.image_filename || '',
              image: matchedImage
            };
          });
          
          setImportJsonProducts(formatted);
          triggerToast(`✙ Успішно зчитано ${formatted.length} товарів з JSON!`);
        }
      } catch (err) {
        console.error(err);
        triggerToast("❌ Помилка: Невірний формат файлу JSON. Перевірте дужки та коми.");
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = "";
  };

  const handleBulkPhotosSelect = (e: any) => {
    const files = e.target.files;
    if (!files) return;
    
    const newPhotos: { [filename: string]: string } = {};
    let loadedCount = 0;
    const filesArr = Array.from(files) as File[];
    
    filesArr.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          newPhotos[file.name] = reader.result;
          loadedCount++;
          
          if (loadedCount === filesArr.length) {
            // Update the map
            setUploadedPhotosMap(prev => {
              const updated = { ...prev, ...newPhotos };
              
              // Also update already loaded products' images if filename matches
              setImportJsonProducts(prevProds => 
                prevProds.map(p => {
                  if (p.image_filename && updated[p.image_filename]) {
                    return { ...p, image: updated[p.image_filename] };
                  }
                  return p;
                })
              );
              
              return updated;
            });
            triggerToast(`✙ Завантажено ${filesArr.length} фото для автозв'язку.`);
          }
        }
      };
      reader.readAsDataURL(file);
    });
    if (e.target) e.target.value = "";
  };

  const handleIndividualPhotoSelect = (tempId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const b64 = reader.result;
        setImportJsonProducts(prev => 
          prev.map(p => p.tempId === tempId ? { ...p, image: b64, image_filename: file.name } : p)
        );
        triggerToast(`✙ Додано фото для товару!`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBulkImportSubmit = async () => {
    if (importJsonProducts.length === 0) return;
    
    // Check if any product has no image
    const missingImage = importJsonProducts.find(p => !p.image);
    if (missingImage) {
      if (!confirm(`У деяких товарів немає зображення (наприклад, "${missingImage.name}"). Вони будуть імпортовані зі стандартним плейсхолдером. Продовжити?`)) {
        return;
      }
    }
    
    setIsImporting(true);
    try {
      const res = await fetch("/api/products/import-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          products: importJsonProducts.map(p => ({
            name: p.name,
            description: p.description,
            price: p.price,
            category: p.category,
            sizes: p.sizes,
            tags: p.tags,
            image: p.image
          }))
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        if (onBulkImport) {
          onBulkImport(data);
        } else {
          data.forEach((p: any) => onAddProduct(p));
        }
        triggerToast(`✙ Успішно імпортовано ${data.length} нових товарів!`);
        setImportJsonProducts([]);
        setUploadedPhotosMap({});
        setActiveSubTab('inventory');
      } else {
        const errData = await res.json();
        triggerToast(`❌ Помилка імпорту: ${errData.error || "Спроба збію"}`);
      }
    } catch (err) {
      console.error(err);
      triggerToast("❌ Помилка мережі при завантаженні товарів.");
    } finally {
      setIsImporting(false);
    }
  };

  // Add Product form state
  const [newProdName, setNewProdName] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdCat, setNewProdCat] = useState<'outerwear' | 'top' | 'bottom' | 'shoes' | 'accessories'>('top');
  const [newProdSizes, setNewProdSizes] = useState('S, M, L, XL');
  const [newProdTags, setNewProdTags] = useState('alt, grunge');
  const [newProdStock, setNewProdStock] = useState('10');
  const [newProdRating, setNewProdRating] = useState('VOID_APPROVED');
  const [uploadImageB64, setUploadImageB64] = useState<string | null>(null);
  const [isAnalyzingDirect, setIsAnalyzingDirect] = useState(false);
  const directFileInputRef = useRef<HTMLInputElement>(null);

  // TG connection state
  const [tgToken, setTgToken] = useState('');
  const [tgConnected, setTgConnected] = useState(false);
  const [tgBotUsername, setTgBotUsername] = useState('SecumSgbArchiveBot');

  // New Telegram States
  const [telegramDrafts, setTelegramDrafts] = useState<TelegramDraft[]>([]);
  const [isEditingDraft, setIsEditingDraft] = useState<TelegramDraft | null>(null);
  const [sizesInputText, setSizesInputText] = useState("");
  const [tagsInputText, setTagsInputText] = useState("");

  // States for bulk photo uploads
  const [bulkQueue, setBulkQueue] = useState<{ id: string; name: string; base64: string; status: 'waiting' | 'processing' | 'success' | 'failed' }[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  const handleBulkFileSelect = (e: any) => {
    const files = e.target.files;
    if (!files) return;
    addFilesToBulkQueue(Array.from(files) as File[]);
    if (e.target) {
      e.target.value = ""; // reset input so same file can be chosen again
    }
  };

  const addFilesToBulkQueue = (files: File[]) => {
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setBulkQueue(prev => [...prev, {
            id: 'bulk-itm-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
            name: file.name,
            base64: reader.result,
            status: 'waiting'
          }]);
        }
      };
      reader.readAsDataURL(file);
    });
    triggerToast(`✙ Додано ${files.length} файлів до черги пакетного завантаження.`);
  };

  const handleBulkProcess = async () => {
    if (bulkQueue.length === 0 || isBulkProcessing) return;
    setIsBulkProcessing(true);
    triggerToast(`✙ Починаємо пакетну обробку ШІ для ${bulkQueue.length} завантажених фотографій.`);

    try {
      // Set all to processing
      setBulkQueue(prev => prev.map(item => ({ ...item, status: 'processing' })));

      const res = await fetch("/api/upload-bulk-drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: bulkQueue.map(item => ({ base64: item.base64, name: item.name }))
        })
      });

      if (res.ok) {
        const data = await res.json();
        setBulkQueue([]); // clear queue on success
        triggerToast(`✙ ПАКЕТНА ОБРОБКА ШІ ЗАВЕРШИЛАСЬ УСПІШНО!`);
        loadTelegramData(); // reload drafts to show them immediately
      } else {
        const errData = await res.json();
        setBulkQueue(prev => prev.map(item => ({ ...item, status: 'failed' })));
        triggerToast(`❌ Помилка обробки: ${errData.error || "Невідома помилка"}`);
      }
    } catch (err) {
      console.error(err);
      setBulkQueue(prev => prev.map(item => ({ ...item, status: 'failed' })));
      triggerToast("❌ Збій пакетної обробки через мережеву помилку.");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const startEditingDraft = (draft: TelegramDraft) => {
    setIsEditingDraft(draft);
    setSizesInputText((draft.sizes || []).join(', '));
    setTagsInputText((draft.tags || []).join(', '));
  };
  const [isScanningGoods, setIsScanningGoods] = useState(false);

  const handleScanGoods = async () => {
    setIsScanningGoods(true);
    try {
      const res = await fetch("/api/process-goods", { method: "POST" });
      if (!res.ok) throw new Error("Processing goods failed");
      const data = await res.json();
      triggerToast(`✙ ${data.message} (${data.processedCount || 0} додано)`);
      loadTelegramData();
    } catch (err) {
      console.error(err);
      triggerToast("❌ Помилка сканування папки public/goods");
    } finally {
      setIsScanningGoods(false);
    }
  };

  // States for Smartphone Simulator Chat
  const [simMessages, setSimMessages] = useState<any[]>([
    {
      id: "welcome",
      sender: "bot",
      text: "✙ SGB // TELEGRAM CLOTHING CLASSIFIER ACTIVE ✙\n\nВітаємо у ШІ-інтеграторі SECUM SGB alternative high-fashion (Coastal).\n\n📸 Надішліть мені фото будь-якої речі. Наш штучний інтелект розпізнає дизайн, створить унікальну назву SGB // та концептуальний опис для вашого сайту!\n\nВи зможете встановити ціну, розміри і опублікувати товар на сайт двома кліками!",
      time: "12:00"
    }
  ]);
  const [simSelectedTemplate, setSimSelectedTemplate] = useState<string>("jacket");
  const [simCaption, setSimCaption] = useState("");
  const [simCustomImageB64, setSimCustomImageB64] = useState<string | null>(null);
  const [simIsAnalyzing, setSimIsAnalyzing] = useState(false);
  const simHiddenFileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadTelegramData = async () => {
    try {
      const configRes = await fetch("/api/telegram-config");
      if (configRes.ok) {
        const configData = await configRes.json();
        setTgToken(configData.token || "");
        setTgConnected(configData.connected || false);
      }

      const draftsRes = await fetch("/api/telegram-drafts");
      if (draftsRes.ok) {
        const draftsData = await draftsRes.json();
        setTelegramDrafts(draftsData);
      }
    } catch (err) {
      console.error("Error loading Telegram data:", err);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'drafts') {
      loadTelegramData();
      const interval = setInterval(loadTelegramData, 3500);
      return () => clearInterval(interval);
    }
  }, [activeSubTab]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [simMessages]);

  const handleSaveTgConfig = async (overrideConnected?: boolean) => {
    const targetConnected = overrideConnected !== undefined ? overrideConnected : tgConnected;
    try {
      const res = await fetch("/api/telegram-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tgToken, connected: targetConnected })
      });
      if (res.ok) {
        const data = await res.json();
        setTgToken(data.token);
        setTgConnected(data.connected);
        triggerToast(data.connected 
          ? "✙ ШЛЮЗ TELEGRAM БОТА АКТИВОВАНО" 
          : "✙ ШЛЮЗ БОТА АВТОНОМНО ЗУПИНЕНО"
        );
      }
    } catch (err) {
      console.error("Failed to save TG config:", err);
      triggerToast("❌ Помилка підключення до сервера Telegram шлюзу");
    }
  };

  const handleResetTgConfig = async () => {
    try {
      const res = await fetch("/api/telegram-config/reset", {
        method: "POST"
      });
      if (res.ok) {
        setTgToken("");
        setTgConnected(false);
        setTelegramDrafts([]);
        triggerToast("✙ СИНХРОНІЗАЦІЮ БОТА ТА ЧЕРНЕТКИ СКИНУТО // СТАРТ З НУЛЯ");
      }
    } catch (err) {
      console.error(err);
      triggerToast("❌ Помилка під час скидання конфігурації.");
    }
  };

  const handleCustomImageUpload = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSimCustomImageB64(reader.result);
        triggerToast("✙ Зображення завантажено. Готово до відправлення!");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSendSimulatedPhoto = async () => {
    if (simIsAnalyzing) return;

    const currentTimeString = new Date().toLocaleTimeString("uk-UA", { hour: '2-digit', minute: '2-digit' });
    const isJustNumber = /^\d+$/.test(simCaption.trim());

    if (isJustNumber && !simCustomImageB64) {
      if (telegramDrafts.length > 0) {
        setSimIsAnalyzing(true);
        const latestDraft = telegramDrafts[0];
        const newPrice = Number(simCaption.trim());

        // Add user msg
        setSimMessages(prev => [...prev, {
          id: "user-" + Date.now(),
          sender: "user",
          text: simCaption.trim(),
          time: currentTimeString
        }]);

        try {
          const res = await fetch(`/api/telegram-drafts/${latestDraft.id}/price`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ price: newPrice })
          });
          if (res.ok) {
            const updatedDraft = await res.json();
            setSimMessages(prev => [...prev, {
              id: "bot-" + Date.now(),
              sender: "bot",
              text: `💰 ЦІНУ УСПІШНО ЗМІНЕНО НА ${newPrice} UAH!\n\n` +
                    `🏷 Назва: ${updatedDraft.name}\n` +
                    `💰 Нова ціна: ${updatedDraft.price} UAH\n` +
                    `📁 Категорія: ${updatedDraft.category.toUpperCase()}\n` +
                    `📐 Розміри: ${updatedDraft.sizes.join(", ")}\n\n` +
                    `Ви можете опублікувати товар на сайт прямо звідси!`,
              time: currentTimeString,
              draftId: updatedDraft.id,
              isInteractive: true
            }]);
            triggerToast(`✙ Ціну успішно змінено на ${newPrice} UAH!`);
            setSimCaption("");
            loadTelegramData();
          }
        } catch (err) {
          console.error(err);
        } finally {
          setSimIsAnalyzing(false);
        }
      } else {
        triggerToast("❌ Немає чернетки для зміни ціни. Спочатку надішліть фото або оберіть шаблон!");
      }
      return;
    }

    setSimIsAnalyzing(true);

    // Choose base64 source (either user uploaded file, or placeholder template image metadata)
    const activeImage = simCustomImageB64 || getTemplateMockImageB64(simSelectedTemplate);

    // Add user sent message to simulator logs
    const userMsgId = "user-" + Date.now();
    setSimMessages(prev => [...prev, {
      id: userMsgId,
      sender: "user",
      text: simCaption ? `[Коментар]: ${simCaption}` : "[Надсилаю фото одягу на аналіз]",
      image: activeImage,
      time: currentTimeString
    }]);

    // Add typing loader
    const typingId = "typing-" + Date.now();
    setSimMessages(prev => [...prev, {
      id: typingId,
      sender: "bot",
      text: "✥ SGB ШІ // ОБРОБКА ТА АНАЛІЗ СИЛУЕТУ СИЛУЕТУ... ✥\n(Генеруємо концепцію дизайну та завантажуємо чернетку...)",
      isTyping: true,
      time: currentTimeString
    }]);

    try {
      const res = await fetch("/api/telegram-drafts/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64: simCustomImageB64 ? simCustomImageB64 : undefined,
          caption: simCaption,
          templateType: simCustomImageB64 ? undefined : simSelectedTemplate
        })
      });

      if (!res.ok) throw new Error("Simulator endpoint offline");
      const draftResult = await res.json();

      setSimMessages(prev => prev.filter(m => m.id !== typingId));

      const botReplyMsg = {
        id: "reply-" + Date.now(),
        sender: "bot",
        text: `✙ СТВОРЕНО ЧЕРНЕТКУ SGB // ARCHIVE ✙\n\n` +
              `🏷 Назва: ${draftResult.name}\n` +
              `💰 Ціна: ${draftResult.price} UAH\n` +
              `📁 Категорія: ${draftResult.category.toUpperCase()}\n` +
              `📐 Розміри: ${draftResult.sizes.join(", ")}\n\n` +
              `📝 Опис:\n${draftResult.description}`,
        time: currentTimeString,
        draftId: draftResult.id,
        isInteractive: true
      };

      setSimMessages(prev => [...prev, botReplyMsg]);
      triggerToast("✙ СТВОРЕНО НОВУ ЧЕРНЕТКУ З СИМУЛЯТОРА!");
      
      // Cleanup inputs
      setSimCaption("");
      setSimCustomImageB64(null);
      loadTelegramData();

    } catch (err) {
      console.error(err);
      setSimMessages(prev => prev.filter(m => m.id !== typingId));
      setSimMessages(prev => [...prev, {
        id: "err-" + Date.now(),
        sender: "bot",
        text: "❌ Помилка аналізу. Перевірте, чи запущено сервер і працездатність ШІ ключа.",
        time: currentTimeString
      }]);
    } finally {
      setSimIsAnalyzing(false);
    }
  };

  const handlePublishDraft = async (draftId: string, customFields?: any) => {
    try {
      const payload = customFields || {};
      const res = await fetch(`/api/telegram-drafts/${draftId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Publish failed");
      const data = await res.json();
      
      // Call parent callback to sync product to core database
      onAddProduct(data);
      triggerToast(`✙ ТОВАР "${data.name}" ОПУБЛІКОВАНО НА САЙТІ!`);

      // Mark the simulator message as processed
      setSimMessages(prev => prev.map(m => {
        if (m.draftId === draftId) {
          return { ...m, isInteractive: false, text: m.text + "\n\n✙ [ СТУТАС: ТОВАР ОПУБЛІКОВАНО НА САЙТ ]" };
        }
        return m;
      }));

      setIsEditingDraft(null);
      loadTelegramData();
    } catch (err) {
      console.error(err);
      triggerToast("❌ Помилка під час публікації на сайт.");
    }
  };

  const handleDeleteDraft = async (draftId: string) => {
    try {
      const res = await fetch(`/api/telegram-drafts/${draftId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        triggerToast("✙ Чернетку успішно видалено");
        setSimMessages(prev => prev.map(m => {
          if (m.draftId === draftId) {
            return { ...m, isInteractive: false, text: m.text + "\n\n❌ [ СТАТУС: ЧЕРНЕТКУ ВИДАЛЕНО ]" };
          }
          return m;
        }));
        loadTelegramData();
      }
    } catch (err) {
      console.error(err);
      triggerToast("❌ Не вдалося видалити чернетку.");
    }
  };

  // Preloaded template background options
  const getTemplateMockImageB64 = (t: string) => {
    // Return relative layout images that already exist
    if (t === 'jacket') return '/src/assets/images/gothic_vampire_fresco_1781371444695.jpg';
    return '/src/assets/images/lookbook_hero_1781370265591.jpg';
  };

  // Custom Toast State (replaces standard alert)
  const [toast, setToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast(null);
    }, 5000);
  };

  // Calculate stats
  const totalRevenue = orders
    .filter(o => o.status === 'completed' || o.status === 'sent')
    .reduce((sum, o) => sum + o.totalPrice, 0);

  const pendingOrdersCount = orders.filter(o => o.status === 'new' || o.status === 'processing').length;

  const uniqueCustomers = Array.from(new Set(orders.map(o => o.customer.phone)));

  const handleAnalyzeWithGeminiDirect = async () => {
    if (!uploadImageB64) {
      triggerToast("❌ Спочатку завантажте фото товару для аналізу ШІ!");
      return;
    }
    setIsAnalyzingDirect(true);
    try {
      const res = await fetch("/api/products/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64: uploadImageB64 })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.name) setNewProdName(data.name);
        if (data.price) setNewProdPrice(String(data.price));
        if (data.description) setNewProdDesc(data.description);
        if (data.category) setNewProdCat(data.category);
        if (data.sizes) setNewProdSizes(data.sizes.join(', '));
        if (data.tags) setNewProdTags(data.tags.join(', '));
        triggerToast("✙ GEMINI ШІ УСПІШНО РОЗПІЗНАВ ТОВАР І ЗАПОВНИВ ХАРАКТЕРИСТИКИ!");
      } else {
        const errorData = await res.json();
        triggerToast(`❌ Помилка аналізу ШІ: ${errorData.error || "Невідома помилка"}`);
      }
    } catch (err) {
      console.error(err);
      triggerToast("❌ Не вдалося з'єднатися з сервісом ШІ Gemini.");
    } finally {
      setIsAnalyzingDirect(false);
    }
  };

  const handleAddProductSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!uploadImageB64) {
      triggerToast("❌ Помилка: завантаження фотографії товару є обов'язковим!");
      return;
    }
    if (!newProdName || !newProdPrice) return;

    onAddProduct({
      name: newProdName,
      description: newProdDesc,
      price: Number(newProdPrice),
      category: newProdCat,
      sizes: newProdSizes.split(',').map(s => s.trim()),
      tags: newProdTags.split(',').map(t => t.trim()),
      stock: Number(newProdStock) || 10,
      riddickRating: newProdRating,
      image: uploadImageB64
    });

    // Reset fields
    setNewProdName('');
    setNewProdPrice('');
    setNewProdDesc('');
    setNewProdSizes('S, M, L, XL');
    setNewProdTags('alt, grunge');
    setNewProdStock('10');
    setNewProdRating('VOID_APPROVED');
    setUploadImageB64(null);

    triggerToast('КАРТКУ ТОВАРУ УСПІШНО ЗАВАНТАЖЕНО В СИСТЕМУ АРХІВУ.');
  };

  const syncNovaPoshta = (order: Order) => {
    const generatedTtn = "204" + Math.floor(50000000000 + Math.random() * 49999999999);
    onUpdateOrderStatus(order.id, 'sent', generatedTtn);
    triggerToast(`ЕКСПРЕС-НАКЛАДНУ СФОРМОВАНО: Створено ТТН ${generatedTtn} для посилки через API.`);
  };

  return (
    <div className="space-y-6 relative" id="crm-root">
      
      {/* Toast Overlay */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-[#050505] border-2 border-white text-white p-4 font-mono text-[11px] max-w-sm flex items-start gap-3 shadow-2xl"
          >
            <Bell size={16} className="text-white shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <div className="font-bold tracking-widest uppercase">СПООВІЩЕННЯ СИСТЕМИ</div>
              <p className="text-zinc-400 font-medium leading-relaxed">{toast}</p>
            </div>
            <button onClick={() => setToast(null)} className="text-zinc-500 hover:text-white cursor-pointer select-none">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analytics bento grids */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-[#050505] border border-[#333333] p-4 font-mono space-y-1">
          <span className="text-[9px] text-zinc-500 uppercase tracking-widest block">ЗАГАЛЬНИЙ ОБОРОТ // ОПЛАЧЕНО</span>
          <div className="text-xl font-bold text-white flex justify-between items-center">
            <span>{totalRevenue} UAH</span>
            <TrendingUp size={16} className="text-zinc-500" />
          </div>
          <span className="text-[8px] text-zinc-600 block uppercase">За замовленнями зі статусом SENT/COMPLETED</span>
        </div>

        <div className="bg-[#050505] border border-[#333333] p-4 font-mono space-y-1">
          <span className="text-[9px] text-zinc-500 uppercase tracking-widest block">АКТИВНІ ЗАПИТИ</span>
          <div className="text-xl font-bold text-white flex justify-between items-center">
            <span>{pendingOrdersCount} ЗАМОВЛЕНЬ</span>
            <ShoppingBag size={16} className="text-zinc-500" />
          </div>
          <span className="text-[8px] text-zinc-600 block uppercase">Потребують збірки чи ТТН відправки</span>
        </div>

        <div className="bg-[#050505] border border-[#333333] p-4 font-mono space-y-1">
          <span className="text-[9px] text-zinc-500 uppercase tracking-widest block">БАЗА КЛІЄНТІВ // АКТИВНІ</span>
          <div className="text-xl font-bold text-white flex justify-between items-center">
            <span>{uniqueCustomers.length} КОРИСТУВАЧІВ</span>
            <Users size={16} className="text-zinc-500" />
          </div>
          <span className="text-[8px] text-zinc-600 block uppercase">Анонімно зареєстровані сесії</span>
        </div>

        <div className="bg-[#050505] border border-[#333333] p-4 font-mono space-y-1">
          <span className="text-[9px] text-zinc-500 uppercase tracking-widest block">СИНХРОНІЗАЦІЯ СУПУТНИКІВ</span>
          <div className="text-xl font-bold text-white flex justify-between items-center">
            <span className="text-xs text-zinc-400 flex items-center gap-1">● АКТИВНИЙ ШЛЮЗ</span>
            <Database size={16} className="text-zinc-500" />
          </div>
          <span className="text-[8px] text-zinc-600 block uppercase">База даних: void_archive_db.json</span>
        </div>

      </div>

      {/* CRM Inner Navigation Tab Header */}
      <div className="flex border-b border-[#333333]">
        <button
          onClick={() => setActiveSubTab('orders')}
          className={`py-2 px-4 font-mono text-[11px] uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'orders' ? 'border-white text-white font-bold' : 'border-transparent text-zinc-500 hover:text-white'
          }`}
        >
          ЗАКУПКИ ТА ТТН ({orders.length})
        </button>
        <button
          onClick={() => setActiveSubTab('inventory')}
          className={`py-2 px-4 font-mono text-[11px] uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'inventory' ? 'border-white text-white font-bold' : 'border-transparent text-zinc-500 hover:text-white'
          }`}
        >
          КАТАЛОГ ОДЯГУ ({products.length})
        </button>
        <button
          onClick={() => setActiveSubTab('drafts')}
          className={`py-2 px-4 font-mono text-[11px] uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'drafts' ? 'border-[#8a0303] text-white font-bold' : 'border-transparent text-zinc-500 hover:text-white'
          }`}
        >
          ЧЕРНЕТКИ // DRAFTS ({telegramDrafts.length})
        </button>
        <button
          onClick={() => setActiveSubTab('customers')}
          className={`py-2 px-4 font-mono text-[11px] uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'customers' ? 'border-white text-white font-bold' : 'border-transparent text-zinc-500 hover:text-white'
          }`}
        >
          КАРТКИ КЛІЄНТІВ
        </button>
        <button
          onClick={() => setActiveSubTab('bulk_import')}
          className={`py-2 px-4 font-mono text-[11px] uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'bulk_import' ? 'border-[#10b981] text-emerald-400 font-bold' : 'border-transparent text-zinc-500 hover:text-white'
          }`}
        >
          ✙ ПАКЕТНИЙ ІМПОРТ
        </button>

      </div>

      {/* CRM MAIN PANELS */}
      <div className="bg-[#050505] border border-[#333333] p-5 rounded-none min-h-[420px]">
        
        {/* SUBTAB: Orders tracker */}
        {activeSubTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[#333333]">
              <h3 className="text-xs font-mono font-bold tracking-widest text-white uppercase">ТАБЛИЦЯ ЗАМОВЛЕНЬ CRM // NOVO POSHTA ENGINE</h3>
              <span className="text-[9px] font-mono text-[#ffffff] tracking-wider font-bold">Керування статусом замовлення</span>
            </div>

            {orders.length === 0 ? (
              <div className="text-center p-8 text-zinc-500 font-mono text-[11px]">
                НЕМАЄ АКТИВНИХ ЗАКУПОК ДЛЯ ОБРОБКИ.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-[10.5px]">
                  <thead>
                    <tr className="border-b border-[#333333] text-zinc-500 uppercase tracking-widest text-[9px]">
                      <th className="py-2">Код / Дата</th>
                      <th className="py-2">Клієнт / Специфікація</th>
                      <th className="py-2">Канал доставки</th>
                      <th className="py-2">Експрес-Накладна</th>
                      <th className="py-2">Статус</th>
                      <th className="py-2">Опції статусу</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#333333]">
                    {orders.map(order => (
                      <tr key={order.id} className="hover:bg-black">
                        <td className="py-3 pr-2">
                          <span className="text-white font-bold block">{order.orderNumber}</span>
                          <span className="text-[9px] text-zinc-500">{order.date}</span>
                        </td>
                        <td className="py-3 pr-2">
                          <div className="text-white font-bold flex items-center gap-1.5 flex-wrap">
                            <span>{order.customer.fullName}</span>
                            {order.customer.telegram && (
                              <span className="text-[9px] text-sky-400 bg-sky-400/5 px-1 py-0.5 border border-sky-400/20 font-mono">
                                {order.customer.telegram.startsWith('@') ? order.customer.telegram : `@${order.customer.telegram}`}
                              </span>
                            )}
                          </div>
                          <div className="text-[9px] text-zinc-400 font-mono mt-0.5">
                            {order.customer.phone}
                          </div>
                          <div className="text-[9px] text-zinc-400 font-medium">
                            {order.items.map(it => `${it.productName} [${it.size}] x${it.quantity}`).join(', ')}
                          </div>
                        </td>
                        <td className="py-3 pr-2">
                          <div className="text-zinc-300 capitalize font-medium">{order.customer.deliveryMethod.replace(/_/g, ' ')}</div>
                          <div className="text-[9px] text-zinc-500 leading-normal font-medium">{order.customer.city} : {order.customer.addressDetails}</div>
                        </td>
                        <td className="py-3 pr-2 text-zinc-300">
                          {order.trackingNumber ? (
                            <span className="select-all font-bold bg-black border border-[#333333] px-1 py-0.5">{order.trackingNumber}</span>
                          ) : (
                            <span className="text-zinc-600 block">[Очікує ТТН]</span>
                          )}
                        </td>
                        <td className="py-3 pr-2">
                          <span className={`px-1.5 py-0.5 border font-bold text-[9.5px] uppercase ${
                            order.status === 'new' ? 'border-yellow-500 text-yellow-500 bg-yellow-500/5' :
                            order.status === 'processing' ? 'border-blue-500 text-blue-500 bg-blue-500/5' :
                            order.status === 'sent' ? 'border-white text-white bg-white/5' :
                            order.status === 'completed' ? 'border-green-500 text-green-500 bg-green-500/5' :
                            'border-red-500 text-red-500 bg-red-500/5'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-1">
                            {order.status === 'new' && (
                              <button
                                onClick={() => onUpdateOrderStatus(order.id, 'processing')}
                                className="bg-black border border-[#333333] hover:border-white text-zinc-300 px-1.5 py-0.5 text-[9px] cursor-pointer"
                              >
                                В ЗБІРКУ
                              </button>
                            )}

                            {order.status === 'processing' && (
                              <button
                                onClick={() => syncNovaPoshta(order)}
                                className="bg-white text-black font-bold px-1.5 py-0.5 text-[9px] flex items-center gap-1 cursor-pointer hover:bg-zinc-200"
                              >
                                <CheckCircle size={10} /> ГЕНЕРУВАТИ ТТН
                              </button>
                            )}

                            {order.status === 'sent' && (
                              <button
                                onClick={() => onUpdateOrderStatus(order.id, 'completed')}
                                className="bg-black text-green-500 hover:border-green-500 border border-[#333333] px-1.5 py-0.5 text-[9px] cursor-pointer"
                              >
                                ОТРИМАНО
                              </button>
                            )}

                            {order.status !== 'completed' && order.status !== 'cancelled' && (
                              <button
                                onClick={() => onUpdateOrderStatus(order.id, 'cancelled')}
                                className="bg-black hover:bg-neutral-900 text-red-500 border border-[#333333] px-1.5 py-0.5 text-[9px] cursor-pointer"
                              >
                                СКАСУВАТИ
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* SUBTAB: Inventory management */}
        {activeSubTab === 'inventory' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: Inventory items list */}
            <div className="lg:col-span-8 space-y-4">
              <h3 className="text-xs font-mono font-bold tracking-widest text-white uppercase pb-2 border-b border-[#333333]">ІНВЕНТАРНИЙ ОПИС КАТАЛОГУ</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
                {products.map(p => (
                  <div key={p.id} className="border border-[#333333] bg-black p-4 font-mono text-[10.5px] relative flex flex-col justify-between">
                    <button
                      onClick={() => onDeleteProduct(p.id)}
                      className="absolute top-3 right-3 text-red-500 hover:text-white text-[9px] font-bold cursor-pointer z-10"
                    >
                      [ВИДАЛИТИ]
                    </button>

                    <div className="flex gap-3">
                      <div className="w-12 h-16 shrink-0 bg-zinc-950 border border-zinc-900 overflow-hidden flex items-center justify-center">
                        <img
                          src={getProductImageUrl(p)}
                          alt={p.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      <div className="space-y-1 flex-1 min-w-0 pr-12">
                        <span className="text-[8px] text-zinc-500 block uppercase font-mono">{p.category} // {p.riddickRating}</span>
                        <h4 className="text-white font-bold text-xs tracking-wider truncate uppercase">{p.name}</h4>
                        <p className="text-zinc-400 text-[9.5px] leading-relaxed line-clamp-2 mt-1">{p.description}</p>
                      </div>
                    </div>

                    <div className="border-t border-[#333333] mt-3 pt-2 flex justify-between items-center text-[10px]">
                      <span className="text-zinc-500">Залишок: <span className="text-white font-bold">{p.stock} од.</span></span>
                      <span className="text-white font-bold font-mono">{p.price} UAH</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Add dynamic product */}
            <div className="lg:col-span-4 bg-black border border-[#333333] p-4">
              <h3 className="text-xs font-mono font-bold tracking-widest text-white uppercase pb-2 border-b border-[#333333] flex items-center gap-1.5 justify-center">
                <Plus size={12} /> ДОДАТИ НОВИЙ ТОВАР
              </h3>

              <form onSubmit={handleAddProductSubmit} className="space-y-4 font-mono text-[10px] mt-4">
                
                {/* Image Upload Zone (MANDATORY) */}
                <div className="space-y-2">
                  <span className="text-zinc-500 block uppercase tracking-wider text-[8px] font-bold">
                    ФОТОГРАФІЯ ТОВАРУ <span className="text-red-500">*ОБОВ'ЯЗКОВО СКАНИРУВАТИ</span>
                  </span>

                  {uploadImageB64 ? (
                    <div className="relative border border-[#222222] bg-[#050505] p-2 flex flex-col items-center justify-center group">
                      <img
                        src={uploadImageB64}
                        alt="Preview"
                        className="max-h-48 object-contain border border-zinc-900 rounded"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        onClick={() => setUploadImageB64(null)}
                        className="absolute top-2 right-2 bg-black/80 text-red-500 hover:text-white px-2 py-1 text-[8px] border border-red-950/60 uppercase font-mono font-bold transition-colors cursor-pointer"
                      >
                        [ВИДАЛИТИ]
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => directFileInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            if (typeof reader.result === 'string') {
                              setUploadImageB64(reader.result);
                              triggerToast("✙ Зображення успішно додано. Натисніть кнопку нижче для автозаповнення!");
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="border border-dashed border-[#444] hover:border-zinc-500 bg-[#050505] p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2 h-36 group"
                    >
                      <Upload size={16} className="text-zinc-500 group-hover:text-white transition-colors" />
                      <div className="text-[9px] text-zinc-400 font-mono tracking-tight uppercase">
                        Перетягніть фото сюди або <span className="text-white underline font-bold">оберіть файл</span>
                      </div>
                      <div className="text-[7.5px] text-zinc-600 font-mono uppercase">
                        ЗАВАНТАЖЕННЯ ЗНІМКУ ДЛЯ ГЕНЕРАЦІЇ ШІ
                      </div>
                    </div>
                  )}

                  <input
                    type="file"
                    ref={directFileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={(e: any) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (typeof reader.result === 'string') {
                            setUploadImageB64(reader.result);
                            triggerToast("✙ Зображення завантажено. Тепер ви можете згенерувати опис ШІ!");
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>

                {/* Gemini AI Auto-Generation Hub */}
                <div className="pt-1">
                  <button
                    type="button"
                    disabled={isAnalyzingDirect || !uploadImageB64}
                    onClick={handleAnalyzeWithGeminiDirect}
                    className="w-full bg-zinc-950 hover:bg-neutral-900 text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-500 p-2.5 flex items-center justify-center gap-2 font-mono text-[9px] tracking-widest uppercase font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isAnalyzingDirect ? (
                      <RefreshCw size={12} className="animate-spin text-zinc-500" />
                    ) : (
                      <Database size={12} className="text-zinc-400" />
                    )}
                    {isAnalyzingDirect ? "ШІ РОЗПІЗНАЄ ТОВАР..." : "✙ ЗГЕНЕРУВАТИ ЧЕРЕЗ ШІ // GEMINI"}
                  </button>
                  {!uploadImageB64 && (
                    <p className="text-[7.5px] text-zinc-650 uppercase mt-1 leading-normal">
                      * Спочатку завантажте зображення речі, щоб активувати магію генерації описів та цін через Gemini.
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-500 block">НАЗВА ОДЯГУ (АБО АВТО-ШІ):</label>
                  <input
                    type="text"
                    required
                    value={newProdName}
                    onChange={e => setNewProdName(e.target.value)}
                    placeholder="e.g. SGB // COLD HOODIE ZIP"
                    className="w-full bg-[#050505] border border-[#333333] text-white p-2 focus:border-white focus:outline-none uppercase"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-zinc-500 block">ЦІНА (UAH):</label>
                    <input
                      type="number"
                      required
                      value={newProdPrice}
                      onChange={e => setNewProdPrice(e.target.value)}
                      placeholder="e.g. 2900"
                      className="w-full bg-[#050505] border border-[#333333] text-white p-2 focus:border-white focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-zinc-500 block">КАТЕГОРІЯ:</label>
                    <select
                      value={newProdCat}
                      onChange={e => setNewProdCat(e.target.value as any)}
                      className="w-full bg-[#050505] border border-[#333333] text-white p-2 focus:border-white focus:outline-none capitalize"
                    >
                      <option value="outerwear">Верхній одяг</option>
                      <option value="top">Топ / Лонг</option>
                      <option value="bottom">Карго штани</option>
                      <option value="shoes">Взуття</option>
                      <option value="accessories">Аксесуари</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-500 block">ОПИС ЕСТЕТИКИ ТОВАРУ (АБО АВТО-ШІ):</label>
                  <textarea
                    value={newProdDesc}
                    onChange={e => setNewProdDesc(e.target.value)}
                    placeholder="SPECIFY AESTHETICS, FIT STYLING..."
                    className="w-full h-20 bg-[#050505] border border-[#333333] text-white p-2 focus:border-white focus:outline-none text-[9px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-zinc-500 block">РОЗМІРИ (ком):</label>
                    <input
                      type="text"
                      value={newProdSizes}
                      onChange={e => setNewProdSizes(e.target.value)}
                      className="w-full bg-[#050505] border border-[#333333] text-white p-2 focus:border-white focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-zinc-500 block">ТЕГИ (ком):</label>
                    <input
                      type="text"
                      value={newProdTags}
                      onChange={e => setNewProdTags(e.target.value)}
                      className="w-full bg-[#050505] border border-[#333333] text-white p-2 focus:border-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-zinc-500 block">ЗАПАС (ОД):</label>
                    <input
                      type="number"
                      value={newProdStock}
                      onChange={e => setNewProdStock(e.target.value)}
                      className="w-full bg-[#050505] border border-[#333333] text-white p-2 focus:border-white focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-zinc-500 block">РЕЙТИНГ RIDDICK:</label>
                    <input
                      type="text"
                      value={newProdRating}
                      onChange={e => setNewProdRating(e.target.value)}
                      className="w-full bg-[#050505] border border-[#333333] text-white p-2 focus:border-white focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-white hover:bg-zinc-200 text-black py-2.5 text-[10px] tracking-widest font-bold uppercase transition-all mt-2 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Plus size={11} className="stroke-[3]" /> ЗАВАНТАЖИТИ В КАТАЛОГ // PUBLISH
                </button>
              </form>
            </div>

          </div>
        )}

        {/* SUBTAB: Customers database */}
        {activeSubTab === 'customers' && (
          <div className="space-y-4">
            <h3 className="text-xs font-mono font-bold tracking-widest text-white uppercase pb-2 border-b border-[#333333]">БАЗА ДАНИХ КЛІЄНТІВ // CRM PORTAL</h3>
            
            {orders.length === 0 ? (
              <div className="text-center p-8 text-zinc-500 font-mono text-[11px]">
                НЕМАЄ ЗАРЕЄСТРОВАНИХ КЛІЄНТІВ (ОЧІКУЄМО НА ПЕРШІ ЗАМОВЛЕННЯ).
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from(new Set(orders.map(o => o.customer.phone))).map(phone => {
                  const customerOrders = orders.filter(o => o.customer.phone === phone);
                  const firstOrder = customerOrders[0];
                  const totalSpent = customerOrders.reduce((sum, o) => sum + o.totalPrice, 0);

                  return (
                    <div key={phone} className="border border-[#333333] bg-black p-4 font-mono text-[10.5px] space-y-2">
                      <div className="flex justify-between items-start border-b border-[#333333] pb-2">
                        <div>
                          <h4 className="text-white font-bold text-xs flex items-center gap-1.5 flex-wrap">
                            <span>{firstOrder.customer.fullName}</span>
                            {firstOrder.customer.telegram && (
                              <span className="text-[8px] text-sky-400 bg-sky-400/5 px-1 py-0.5 border border-sky-400/25">
                                {firstOrder.customer.telegram.startsWith('@') ? firstOrder.customer.telegram : `@${firstOrder.customer.telegram}`}
                              </span>
                            )}
                          </h4>
                          <span className="text-[9px] text-zinc-500 font-bold">{phone} / {firstOrder.customer.email}</span>
                        </div>
                        <span className="text-zinc-200 font-bold bg-[#050505] px-1.5 py-0.5 border border-[#333333]">
                          {totalSpent} UAH
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[9px] text-zinc-500">
                        <div>
                          <span>ОСТАННІЙ ОПИС ДОСТАВКИ:</span>
                          <span className="text-zinc-300 block leading-tight mt-0.5">
                            {firstOrder.customer.city}, {firstOrder.customer.addressDetails}
                          </span>
                        </div>
                        <div>
                          <span>МЕДІУМ-АРХЕТИП СТИЛЮ:</span>
                          <span className="text-white font-bold block uppercase mt-0.5 font-mono">
                            NEO GOTH ALT
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 text-[9px] text-zinc-650 border-t border-[#333333]">
                        ВСЬОГО ЗАМОВЛЕНЬ У СИСТЕМІ: <span className="text-white font-bold">{customerOrders.length} од.</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SUBTAB: Bulk Import via JSON and Photos */}
        {activeSubTab === 'bulk_import' && (
          <div className="space-y-6 font-mono tracking-tight pb-16">
            
            {/* Header Block */}
            <div className="border-b border-[#222222] pb-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-sm font-mono font-bold tracking-widest text-[#10b981] uppercase flex items-center gap-2">
                  <Database size={15} className="animate-pulse" />
                  ПАКЕТНИЙ ІМПОРТ ТОВАРІВ // BULK DATA & PHOTO INTERLACE
                </h3>
                <p className="text-[10px] text-zinc-500 mt-1 uppercase font-semibold leading-normal">
                  Завантажуйте заздалегідь підготовлений JSON-файл із метаданими товарів разом із купою відповідних фотографій. Система автоматично зв'яже їх за іменами файлів та підготує картки до публікації!
                </p>
              </div>
            </div>

            {/* AI Prompt Generator Card / Help Box */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-12 bg-[#0b0b0b] border border-[#222222] p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-[#222222] pb-2">
                  <span className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    🤖 ПРОМПТ ДЛЯ ШІ // AI METADATA HARVESTER
                  </span>
                  <button
                    onClick={() => {
                      const promptText = `Ти — професійний контент-менеджер модного альтернативного бренду (gothic, y2k, street goth).
Проаналізуй завантажені фотографії одягу. Для кожної фотографії створи одну запис у JSON масиві. Нам потрібна максимальна конкретика, лаконічність і точність у стилях та характеристиках.
Описи мають бути лаконічними (до 8-10 слів), наприклад: "Буткат джинси темно-сині з готичним візерунком" або "Об'ємний лонгслів чорного кольору з принтом черепа".

Поверни ПРАВИЛЬНИЙ JSON МАСИВ БЕЗ зайвого тексту за такою схемою:
[
  {
    "name": "Коротка назва товару",
    "description": "Конкретний, лаконічний опис (наприклад: буткат джинси темно сині з узором)",
    "price": 2400,
    "category": "outerwear" або "top" або "bottom" або "shoes" або "accessories",
    "sizes": ["S", "M", "L", "XL"],
    "tags": ["gothic", "alt", "grunge"],
    "image_filename": "Впиши точне оригінальне ім'я завантаженого файлу з розширенням (наприклад: photo1.jpg)"
  }
]`;
                      navigator.clipboard.writeText(promptText);
                      triggerToast("✙ Промпт скопійовано! Тепер можете вставити його у ChatGPT/Gemini разом із фотографіями.");
                    }}
                    className="text-[9px] font-bold bg-white text-black px-2 py-1 uppercase tracking-widest hover:bg-emerald-500 hover:text-black transition-all cursor-pointer"
                  >
                    Скопіювати промпт
                  </button>
                </div>
                <p className="text-[10px] text-zinc-400 leading-relaxed uppercase">
                  Киньте купу фотографій свого одягу в улюблену нейромережу (Gemini, Copilot, ChatGPT) разом із цим промптом. Вона проаналізує їх і видасть готовий JSON-файл, який ви завантажите сюди разом із тими ж фотографіями:
                </p>
                <div className="bg-[#050505] p-3 border border-[#222222] rounded max-h-48 overflow-y-auto font-mono text-[9px] text-emerald-500/80 leading-normal select-all">
                  {`Ти — професійний контент-менеджер модного альтернативного бренду (gothic, y2k, street goth).
Проаналізуй завантажені фотографії одягу. Для кожної фотографії створи одну запис у JSON масиві. Нам потрібна максимальна конкретика, лаконічність і точність у стилях та характеристиках.
Описи мають бути лаконічними (до 8-10 слів), наприклад: "Буткат джинси темно-сині з готичним візерунком" або "Об'ємний лонгслів чорного кольору з принтом черепа".

Поверни ПРАВИЛЬНИЙ JSON МАСИВ БЕЗ зайвого тексту за такою схемою:
[`}
                  <span className="text-zinc-500">{`\n  {\n    "name": "Butcut Jeans with Pattern",\n    "description": "буткат джинси темно сині з узором",\n    "price": 2400,\n    "category": "bottom",\n    "sizes": ["S", "M", "L"],\n    "tags": ["gothic", "alt"],\n    "image_filename": "photo_jean.jpg"\n  }\n`}</span>
                  {`]`}
                </div>
              </div>

              <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                {/* JSON Upload Drag-and-Drop / Button */}
                <div className="border border-dashed border-[#333333] bg-[#070707] p-6 text-center space-y-3 flex flex-col items-center justify-center">
                  <Database size={24} className="text-[#10b981]" />
                  <div>
                    <span className="text-[11px] font-bold text-white uppercase block">1. КРОК: ЗАВАНТАЖИТИ JSON ФАЙЛ</span>
                    <span className="text-[9px] text-zinc-500 uppercase block mt-1">Опис товару та назви файлів знімків</span>
                  </div>
                  <input
                    type="file"
                    accept=".json"
                    ref={jsonFileInputRef}
                    onChange={handleJsonFileSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => jsonFileInputRef.current?.click()}
                    className="bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700 py-1.5 px-4 text-[9px] uppercase font-bold tracking-wider cursor-pointer font-mono"
                  >
                    Обрати JSON файл
                  </button>
                  {importJsonProducts.length > 0 && (
                    <div className="text-[9px] text-[#10b981] font-bold bg-[#10b981]/5 border border-[#10b981]/20 px-2 py-1 uppercase animate-pulse">
                      ▲ Зчитано товарів: {importJsonProducts.length} од.
                    </div>
                  )}
                </div>

                {/* Bulk Photos Upload Drag-and-Drop / Button */}
                <div className="border border-dashed border-[#333333] bg-[#070707] p-6 text-center space-y-3 flex flex-col items-center justify-center">
                  <Upload size={24} className="text-[#10b981]" />
                  <div>
                    <span className="text-[11px] font-bold text-white uppercase block">2. КРОК: ЗАВАНТАЖИТИ ВСІ ФОТОГРАФІЇ</span>
                    <span className="text-[9px] text-zinc-500 uppercase block mt-1">Оберіть відразу купу файлів для автозв'язку</span>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    ref={bulkPhotoImportInputRef}
                    onChange={handleBulkPhotosSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => bulkPhotoImportInputRef.current?.click()}
                    className="bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700 py-1.5 px-4 text-[9px] uppercase font-bold tracking-wider cursor-pointer font-mono"
                  >
                    Завантажити фотографії ({Object.keys(uploadedPhotosMap).length} шт.)
                  </button>
                  {Object.keys(uploadedPhotosMap).length > 0 && (
                    <div className="text-[9px] text-[#10b981] font-bold bg-[#10b981]/5 border border-[#10b981]/20 px-2 py-1 uppercase">
                      ▲ Кешовано у пам'яті: {Object.keys(uploadedPhotosMap).length} фото
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* PREVIEW CONTAINER */}
            {importJsonProducts.length > 0 && (
              <div className="space-y-4 border-t border-[#222222] pt-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <h4 className="text-xs font-bold text-white tracking-widest uppercase flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    ПЕРЕДОГЛЯД ПАКЕТНОГО КАТАЛОГУ ДЛЯ ОПУБЛІКУВАННЯ ({importJsonProducts.length} ТОП-ЗАПИСІВ)
                  </h4>
                  <div className="flex gap-2 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Очистити поточний пакетний імпорт?")) {
                          setImportJsonProducts([]);
                          setUploadedPhotosMap({});
                        }
                      }}
                      className="text-[9px] font-bold border border-zinc-800 hover:border-red-500 text-zinc-500 hover:text-red-500 px-3 py-1.5 uppercase transition-colors cursor-pointer"
                    >
                      Очистити все
                    </button>
                    <button
                      type="button"
                      disabled={isImporting}
                      onClick={handleBulkImportSubmit}
                      className="text-[9px] font-bold bg-[#10b981] hover:bg-emerald-400 text-black px-4 py-1.5 uppercase tracking-wider transition-colors font-mono cursor-pointer flex items-center gap-1.5"
                    >
                      {isImporting ? "ІМПОРТУВАННЯ..." : "ОПУБЛІКУВАТИ ВСІ ТОВАРИ"}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {importJsonProducts.map((p, index) => (
                    <div key={p.tempId} className="bg-black border border-[#222222] p-4 text-[10.5px] font-mono grid grid-cols-12 gap-4 relative hover:border-zinc-700 transition-all">
                      
                      {/* Left: Info editing / viewing */}
                      <div className="col-span-8 space-y-2">
                        <div className="flex gap-2 items-center">
                          <span className="text-[9px] font-bold text-zinc-500 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5">
                            #{index + 1}
                          </span>
                          <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 uppercase tracking-widest font-black">
                            {p.category}
                          </span>
                        </div>

                        <div>
                          <label className="text-[8px] text-zinc-500 block uppercase font-bold">Назва товару</label>
                          <input
                            type="text"
                            value={p.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setImportJsonProducts(prev => prev.map(item => item.tempId === p.tempId ? { ...item, name: val } : item));
                            }}
                            className="bg-[#050505] text-white border border-[#222222] px-2 py-1 w-full text-[10.5px] focus:border-zinc-500 outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[8px] text-zinc-500 block uppercase font-bold">Ціна (UAH)</label>
                            <input
                              type="number"
                              value={p.price}
                              onChange={(e) => {
                                const val = e.target.value;
                                setImportJsonProducts(prev => prev.map(item => item.tempId === p.tempId ? { ...item, price: val } : item));
                              }}
                              className="bg-[#050505] text-white border border-[#222222] px-2 py-1 w-full text-[10.5px] focus:border-zinc-500 outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[8px] text-zinc-500 block uppercase font-bold">Цільовий Файл фото</label>
                            <span className="text-[9.5px] text-zinc-400 block py-1 font-mono truncate" title={p.image_filename}>
                              {p.image_filename || "⚠️ Не вказано"}
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="text-[8px] text-zinc-500 block uppercase font-bold">Короткий опис або Деталі</label>
                          <input
                            type="text"
                            value={p.description}
                            onChange={(e) => {
                              const val = e.target.value;
                              setImportJsonProducts(prev => prev.map(item => item.tempId === p.tempId ? { ...item, description: val } : item));
                            }}
                            className="bg-[#050505] text-white border border-[#222222] px-2 py-1 w-full text-[10px] focus:border-zinc-500 outline-none"
                          />
                        </div>

                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {p.sizes && p.sizes.map((s: string) => (
                            <span key={s} className="bg-zinc-900 border border-zinc-800 text-zinc-300 px-1 py-0.5 text-[8.5px] uppercase font-bold">
                              {s}
                            </span>
                          ))}
                          {p.tags && p.tags.map((t: string) => (
                            <span key={t} className="bg-zinc-900/40 border border-zinc-900 text-zinc-500 px-1 py-0.5 text-[8.5px] uppercase font-bold">
                              #{t}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Right: Picture handler */}
                      <div className="col-span-4 flex flex-col justify-between items-center border border-[#222222] bg-[#070707] p-2 relative h-full min-h-[145px]">
                        {p.image ? (
                          <div className="w-full flex flex-col items-center gap-1">
                            <img
                              src={p.image}
                              alt="Matched"
                              className="max-h-24 max-w-full object-contain rounded border border-zinc-900"
                              referrerPolicy="no-referrer"
                            />
                            <span className="text-[7.5px] text-emerald-400 bg-emerald-500/5 px-1 py-0.5 border border-emerald-500/25 uppercase font-bold text-center block max-w-full truncate">
                              ✦ ЗВ'ЯЗАНО
                            </span>
                          </div>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-center text-zinc-650 gap-1 min-h-[96px]">
                            <span className="text-[8px] uppercase font-bold leading-tight block">⚠ НЕ ЗВ'ЯЗАНО</span>
                            <span className="text-[7px] text-zinc-500 uppercase leading-snug">Файл {p.image_filename || "порожній"} не знайдено</span>
                          </div>
                        )}

                        <div className="w-full pt-2">
                          <label className="block text-center text-[8px] bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 py-1 cursor-pointer uppercase font-bold transition-all w-full">
                            {p.image ? "Замінити фото" : "Додати фото"}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleIndividualPhotoSelect(p.tempId, file);
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>

                      {/* Delete action button */}
                      <button
                        type="button"
                        onClick={() => {
                          setImportJsonProducts(prev => prev.filter(item => item.tempId !== p.tempId));
                        }}
                        className="absolute top-2 right-2 text-zinc-500 hover:text-red-500 transition-colors uppercase font-mono font-bold text-[8.5px] cursor-pointer"
                        title="Видалити запис із пакету"
                      >
                        [ВИДАЛИТИ]
                      </button>

                    </div>
                  ))}
                </div>

                {/* Submitting block at the end */}
                <div className="border border-zinc-900 bg-[#090909] p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="text-[10px] text-zinc-400 uppercase leading-relaxed">
                    Якщо всі товарні картки виглядають чудово, і кожна з них має правильне фото, натисніть кнопку "Опублікувати всі товари", щоб завантажити їх у базу даних вашого онлайн-бутіка.
                  </div>
                  <button
                    type="button"
                    disabled={isImporting}
                    onClick={handleBulkImportSubmit}
                    className="w-full md:w-auto bg-[#10b981] hover:bg-emerald-400 text-black px-6 py-3 font-mono font-bold uppercase tracking-widest text-[11px] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {isImporting ? "ЗБЕРЕЖЕННЯ..." : "ОПУБЛІКУВАТИ ВСІ ТОВАРИ"}
                  </button>
                </div>

              </div>
            )}
          </div>
        )}

        {/* SUBTAB: Dedicated Drafts workspace */}
        {activeSubTab === 'drafts' && (
          <div className="space-y-6 font-mono tracking-tight pb-16">
            
            {/* Header Block */}
            <div className="border-b border-[#222222] pb-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-sm font-mono font-bold tracking-widest text-white uppercase flex items-center gap-2">
                  <Database size={15} className="text-[#8a0303] animate-pulse" />
                  ЧЕРНЕТКИ САКРАЛЬНОГО ОДЯГУ // CONCEPT DRAFTS
                </h3>
                <p className="text-[10px] text-zinc-500 mt-1 uppercase font-semibold leading-normal">
                  Чернетки створюються автоматично за допомогою ШІ при розміщенні файлів у папці <span className="text-zinc-300">public/goods</span> або через ТГ-бот. Відредагуйте та опублікуйте в один клік!
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleScanGoods}
                  disabled={isScanningGoods}
                  className={`text-[10px] font-bold py-2 px-4 border uppercase tracking-wider transition-all duration-200 ${
                    isScanningGoods
                      ? "bg-zinc-850 text-zinc-500 border-zinc-700 cursor-wait animate-pulse"
                      : "bg-[#8a0303] text-red-50 hover:bg-neutral-200 hover:text-black border-[#8a0303] hover:border-white font-extrabold cursor-pointer"
                  }`}
                >
                  {isScanningGoods ? "✦ ШІ ПОРТ АКТИВНИЙ..." : "✙ Обробити розсип public/goods // SCAN GOODS"}
                </button>
                
                <button 
                  type="button"
                  onClick={loadTelegramData}
                  className="bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-500 text-zinc-300 hover:text-white font-bold py-2 px-4 text-[10px] uppercase font-mono transition-colors tracking-widest cursor-pointer"
                >
                  ↺ Оновити чернетки
                </button>
              </div>
            </div>

            {/* Multi-Photo Bulk Upload Zone (Direct Web Import) */}
            <div className="border border-zinc-850 p-5 bg-[#030303] space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    ✙ ПАКЕТНЕ ЗАВАНТАЖЕННЯ ТА ШІ-ОБРОБКА ФОТОГРАФІЙ // BATCH UPLOAD
                  </h4>
                  <p className="text-[9px] text-zinc-500 uppercase mt-0.5">
                    Завантажте декілька фотографій одразу — наш ШІ Gemini паралельно розпізнає та опише українською мовою кожен виріб!
                  </p>
                </div>
                <span className="text-[8px] bg-red-950/25 border border-red-900/40 text-red-500 px-2 py-0.5 font-bold uppercase tracking-wider">
                  BULK UPLOAD PORT
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
                {/* Drag-n-drop Dropzone */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e: any) => {
                    e.preventDefault();
                    if (isBulkProcessing) return;
                    const items = e.dataTransfer?.files;
                    if (items) {
                      const files = Array.from(items).filter((f: any) => f.type && f.type.startsWith('image/')) as File[];
                      if (files.length > 0) addFilesToBulkQueue(files);
                    }
                  }}
                  onClick={() => !isBulkProcessing && bulkFileInputRef.current?.click()}
                  className={`md:col-span-1 border border-dashed text-center p-6 flex flex-col items-center justify-center space-y-2 cursor-pointer transition-all ${
                    isBulkProcessing 
                      ? 'border-zinc-800 bg-zinc-950 opacity-50 cursor-not-allowed' 
                      : 'border-zinc-750 hover:border-zinc-500 bg-black min-h-36'
                  }`}
                >
                  <Upload size={18} className="text-zinc-500" />
                  <div className="text-[10px] text-zinc-300 font-bold uppercase tracking-wide">
                    Оберіть або перетягніть купу фоток
                  </div>
                  <p className="text-[8px] text-zinc-650 uppercase">
                    ПІДТРИМКА .JPG, .PNG, .WEBP
                  </p>
                  <input
                    type="file"
                    ref={bulkFileInputRef}
                    onChange={handleBulkFileSelect}
                    multiple
                    accept="image/*"
                    className="hidden"
                    disabled={isBulkProcessing}
                  />
                </div>

                {/* Queue Display Zone */}
                <div className="md:col-span-2 border border-zinc-900 bg-black p-3 min-h-[100px] flex flex-col justify-between">
                  {bulkQueue.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center py-6">
                      <span className="text-[9px] text-zinc-600 uppercase tracking-widest">
                        Черга завантаження порожня — додайте фотографії зліва
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[9.5px] font-bold text-zinc-400 uppercase">
                          ФОТО ДО ОБРОБКИ ({bulkQueue.length}):
                        </span>
                        <button
                          type="button"
                          disabled={isBulkProcessing}
                          onClick={() => setBulkQueue([])}
                          className="text-[8px] border border-zinc-800 text-zinc-500 hover:text-white px-2 py-0.5 uppercase disabled:opacity-30 cursor-pointer"
                        >
                          Очистити все
                        </button>
                      </div>

                      {/* Flex grid of images previews */}
                      <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto p-1.5 border border-zinc-950 bg-[#020202]">
                        {bulkQueue.map((item) => (
                          <div key={item.id} className="w-12 h-12 bg-black border border-zinc-850 relative group flex-shrink-0">
                            <img
                              src={item.base64}
                              alt="Queue thumb"
                              className="w-full h-full object-cover opacity-80"
                            />
                            {item.status === 'processing' && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <RefreshCw size={11} className="animate-spin text-zinc-400" />
                              </div>
                            )}
                            {item.status === 'success' && (
                              <div className="absolute inset-0 bg-green-950/85 flex items-center justify-center text-[10px] text-green-400 font-bold">
                                ✓
                              </div>
                            )}
                            {item.status === 'failed' && (
                              <div className="absolute inset-0 bg-red-950/85 flex items-center justify-center text-[10px] text-red-500 font-bold">
                                ✗
                              </div>
                            )}
                            {item.status === 'waiting' && !isBulkProcessing && (
                              <button
                                type="button"
                                onClick={() => setBulkQueue(prev => prev.filter(q => q.id !== item.id))}
                                className="absolute -top-1 -right-1 bg-black text-red-500 border border-zinc-800 rounded-full w-4 h-4 flex items-center justify-center text-[8px] font-bold hover:bg-[#8a0303] cursor-pointer"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={handleBulkProcess}
                        disabled={isBulkProcessing}
                        className="w-full bg-[#8a0303] hover:bg-[#a10505] text-white py-2 px-4 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 border border-red-900 transition-colors disabled:opacity-45 cursor-pointer"
                      >
                        {isBulkProcessing ? (
                          <>
                            <RefreshCw size={12} className="animate-spin text-white" />
                            ШІ АВТОМАТИЧНО РОЗПІЗНАЄ ТА СТВОРЮЄ ТОВАРИ...
                          </>
                        ) : (
                          <>
                            <Database size={11} className="text-zinc-200" />
                            ЗАПУСТИТИ ШІ ОБРОБКУ [ {bulkQueue.length} ФОТО ] // BATCH ENGINE
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* List of drafts */}
            {telegramDrafts.length === 0 ? (
              <div className="py-16 text-center border-2 border-dashed border-zinc-900 bg-[#020202] space-y-4 max-w-3xl mx-auto rounded-sm">
                <span className="text-[24px] block text-[#8a0303]">✙</span>
                <p className="text-[11px] text-zinc-400 uppercase tracking-widest max-w-md mx-auto leading-relaxed font-bold">
                  Чернеток не виявлено в системі.<br />
                  <span className="text-zinc-650 block text-[9.5px] mt-1">Додайте нові фотографії (напр. .jpg, .png) у каталог <strong className="text-zinc-500 font-bold">public/goods/</strong> і завершіть сканування через червону кнопку вгорі.</span>
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {telegramDrafts.map((draft) => (
                  <div key={draft.id} className="border border-zinc-850 bg-[#020202] p-4 flex flex-col justify-between relative hover:border-zinc-700 transition-colors">
                    <div className="flex gap-4 items-start">
                      <div className="w-16 h-20 bg-black border border-zinc-900 flex-shrink-0 relative overflow-hidden select-none">
                        {draft.imageUrl ? (
                          <img 
                            src={draft.imageUrl} 
                            alt="Draft Preview" 
                            className="w-full h-full object-cover opacity-85 hover:opacity-100 transition-opacity"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-700">👗</div>
                        )}
                        <span className="absolute bottom-1 right-1 bg-black/80 px-1 text-[7px] text-zinc-600 font-bold uppercase">PREVIEW</span>
                      </div>

                      <div className="space-y-1.5 flex-1 min-w-0">
                        <span className="text-[8px] text-zinc-500 block uppercase font-mono tracking-widest">
                          {draft.category.toUpperCase()} // STATUS: DRAFT
                        </span>
                        <h4 className="text-xs font-bold text-white uppercase truncate tracking-wider">
                          {draft.name}
                        </h4>
                        <p className="text-[10px] text-zinc-400 leading-relaxed font-sans line-clamp-2 pr-2">
                          {draft.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[9.5px] font-mono font-bold text-zinc-500 uppercase">
                          <span className="text-red-500 border border-red-950 px-1.5 bg-red-950/20">{draft.price} UAH</span>
                          <span>Розміри: <label className="text-zinc-300">{draft.sizes.join(', ')}</label></span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-zinc-900 mt-4 pt-3 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleDeleteDraft(draft.id)}
                        className="text-[9px] text-[#444] hover:text-red-600 uppercase font-bold tracking-widest cursor-pointer transition-colors"
                      >
                        [ВИДАЛИТИ // DELETE]
                      </button>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => startEditingDraft(draft)}
                          className="bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white py-1 px-2.5 text-[9px] uppercase transition-all tracking-wider font-bold cursor-pointer"
                        >
                          Редагувати
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePublishDraft(draft.id)}
                          className="bg-white hover:bg-zinc-200 text-black text-[9px] font-bold uppercase py-1 px-3 transition-all tracking-widest cursor-pointer"
                        >
                          ОПУБЛІКУВАТИ →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SUBTAB: Telegram Integration parameters */}
        {activeSubTab === 'telegram' && null}
        {false && (
          <div className="space-y-10 font-mono tracking-tight pb-16">
            
            {/* Main Header plaque */}
            <div className="border-b border-[#222222] pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-sm font-mono font-bold tracking-widest text-white uppercase flex items-center gap-2">
                  <Send size={15} className="text-white animate-pulse" />
                  СИНХРОНІЗАЦІЯ З TELEGRAM BOT // ШІ-ІНТЕГРАТОР
                </h3>
                <p className="text-[10px] text-zinc-500 mt-1 uppercase font-semibold">
                  Створюйте нові картки альтернативного одягу безпосередньо з Telegram за допомогою комп'ютерного зору Gemini 3.5 Flash!
                </p>
              </div>
              
              <div className="flex items-center gap-2 text-[9px] bg-zinc-950 border border-zinc-900 rounded-sm px-3 py-1 font-mono uppercase">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
                <span className="text-zinc-400 font-bold">ПОТОЧНИЙ СЕРВЕРНИЙ РЕЖИМ БОТА: СТЕНДБАЙ</span>
              </div>
            </div>

            {/* 2 Column Workspace Grid: Left CRM and Drafts, Right: Virtual Smartphone Simulator */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* LEFT COLUMN: Controls & Drafts Inbox */}
              <div className="lg:col-span-7 space-y-8">
                
                {/* Panel 1: Telegram Bot Connector configuration */}
                <div className="bg-black/90 border border-zinc-900 rounded-sm p-5 space-y-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-radial-grid opacity-5 pointer-events-none" />
                  
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-2.5">
                    <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Settings size={12} className="text-zinc-500" />
                      1. Наш налаштований Telegram бот
                    </span>
                    <span className="text-[9px] text-zinc-500 uppercase">Void Server</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] text-zinc-400 block mb-1 uppercase font-bold">Ім'я ТГ-Бота:</label>
                      <input 
                        type="text" 
                        value={tgBotUsername}
                        onChange={(e) => setTgBotUsername(e.target.value)}
                        placeholder="e.g. SgbApparelBot"
                        className="w-full bg-zinc-950 border border-zinc-900 text-white font-mono text-xs px-2.5 py-1.5 focus:outline-none focus:border-zinc-500"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] text-zinc-400 block mb-1 uppercase font-bold">Статус з'єднання:</label>
                      <button
                        onClick={() => {
                          const nextState = !tgConnected;
                          setTgConnected(nextState);
                          handleSaveTgConfig(nextState);
                        }}
                        className={`w-full py-1.5 text-[9.5px] font-mono font-bold tracking-widest uppercase transition-all duration-300 ${
                          tgConnected 
                            ? 'bg-neutral-100 hover:bg-neutral-300 text-black' 
                            : 'bg-zinc-900 hover:bg-zinc-800 border-2 border-dashed border-zinc-800 text-zinc-400'
                        }`}
                      >
                        {tgConnected ? '● ШЛЮЗ АКТИВНИЙ' : '✙ ЗАПУСТИТИ ПУЛІНГ GATEWAY'}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-zinc-400 uppercase font-extrabold">Токен ТГ-Бота (Token від @BotFather):</span>
                      <span className="text-[8px] text-zinc-650 tracking-wide font-medium">Клієнт-серверна валідація</span>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder="Вставте токен (напр.: 123456:ABC-DEF1234ghIkl-zyx)"
                        value={tgToken}
                        onChange={(e) => setTgToken(e.target.value)}
                        className="flex-1 bg-zinc-950 border border-zinc-900 text-zinc-100 p-2 text-xs focus:outline-none font-mono tracking-widest"
                      />
                      <button
                        onClick={() => handleSaveTgConfig()}
                        className="bg-white hover:bg-neutral-200 text-black font-extrabold px-3.5 text-[9.5px] uppercase font-mono transition-colors tracking-widest cursor-pointer whitespace-nowrap"
                      >
                        Зберегти токен
                      </button>
                    </div>
                    <p className="text-[8.5px] text-zinc-500 uppercase leading-normal tracking-wide">
                      * Бот самостійно буде зчитувати фотографії одягу, відправляти їх на Gemini ШІ та створювати чернетки в кабінеті реального часу.
                    </p>
                    
                    <div className="pt-3 border-t border-zinc-950 flex justify-end">
                      <button
                        onClick={handleResetTgConfig}
                        className="bg-red-950/20 hover:bg-neutral-900 text-red-400 border border-red-950/60 hover:border-zinc-800 px-3 py-1.5 text-[8.5px] uppercase font-mono font-bold transition-all tracking-widest cursor-pointer"
                      >
                        ❌ Скинути конфігурацію бота та очистити чернетки
                      </button>
                    </div>
                  </div>
                </div>

                {/* Panel 2: Live Archive Products Drafts Inbox Table */}
                <div className="bg-black/80 border border-zinc-900 rounded-sm p-5 space-y-4">
                  <div className="flex justify-between items-center border-b border-zinc-900 pb-2.5 flex-wrap gap-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 min-w-max">
                      <Database size={13} className="text-zinc-500" />
                      2. Чернетки з боту (Inbox: {telegramDrafts.length} шт)
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleScanGoods}
                        disabled={isScanningGoods}
                        className={`text-[9px] font-bold py-1 px-2.5 border uppercase tracking-wider transition-all duration-200 ${
                          isScanningGoods
                            ? "bg-zinc-850 text-zinc-500 border-zinc-700 cursor-wait"
                            : "bg-red-950 text-red-100 hover:bg-neutral-200 hover:text-black border-red-900 hover:border-white font-extrabold cursor-pointer"
                        }`}
                      >
                        {isScanningGoods ? "Обробка ШІ..." : "✙ Обробити розсип public/goods // BATCH SCAN"}
                      </button>
                      <button 
                        onClick={loadTelegramData}
                        className="text-[9px] font-bold text-[#b0b0b0] hover:text-white flex items-center gap-1 uppercase tracking-widest transition-colors cursor-pointer"
                      >
                        <RefreshCw size={10} className="animate-spin-slow" />
                        Оновити Inbox
                      </button>
                    </div>
                  </div>

                  {telegramDrafts.length === 0 ? (
                    <div className="py-12 text-center border-2 border-dashed border-zinc-900 bg-zinc-950/30 space-y-3">
                      <span className="text-[17px] block text-zinc-700">✙</span>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest max-w-sm mx-auto leading-relaxed">
                        Немає активних чернеток для публікації.<br />
                        Надішліть фотографію в бот або скористайтеся <span className="text-zinc-400 font-bold">Віртуальним Симулятором</span> праворуч.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4 divide-y divide-zinc-950">
                      {telegramDrafts.map((draft) => (
                        <div key={draft.id} className="pt-4 first:pt-0 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                          
                          {/* Left contents preview details */}
                          <div className="flex gap-3 items-start flex-1 min-w-0">
                            <div className="w-14 h-14 bg-zinc-950 border border-zinc-900 flex-shrink-0 relative overflow-hidden select-none">
                              {draft.imageUrl ? (
                                <img 
                                  src={draft.imageUrl} 
                                  alt="Draft Preview" 
                                  className="w-full h-full object-cover grayscale opacity-80"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-600">👗</div>
                              )}
                              <span className="absolute bottom-0 right-0 bg-black/80 px-1 text-[7px] text-zinc-500">PREVIEW</span>
                            </div>

                            <div className="space-y-1 min-w-0">
                              <h4 className="text-xs font-bold text-white uppercase truncate flex items-center gap-1.5 tracking-wider">
                                {draft.name}
                                {draft.simulated && (
                                  <span className="bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono text-[7px] px-1 uppercase scale-90">SIMULATED</span>
                                )}
                              </h4>
                              <p className="text-[10px] text-zinc-300 leading-relaxed font-sans line-clamp-2 pr-4">
                                {draft.description}
                              </p>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] font-mono font-bold text-zinc-500 uppercase pt-0.5">
                                <span className="text-white bg-zinc-900 px-1">{draft.price} UAH</span>
                                <span>Категорія: <label className="text-zinc-300">{draft.category.toUpperCase()}</label></span>
                                <span>Розміри: <label className="text-zinc-300">{draft.sizes.join(', ')}</label></span>
                              </div>
                            </div>
                          </div>

                          {/* Action button container */}
                          <div className="flex md:flex-col gap-2 w-full md:w-auto self-stretch md:self-center justify-end">
                            <button
                              onClick={() => handlePublishDraft(draft.id)}
                              className="bg-white hover:bg-neutral-200 text-black text-[9px] font-extrabold uppercase py-1.5 px-3 transition-all tracking-wider flex-1 md:flex-initial"
                            >
                              ОПУБЛІКУВАТИ
                            </button>
                            
                            <div className="flex gap-2">
                              <button
                                onClick={() => startEditingDraft(draft)}
                                className="flex-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-500 text-zinc-400 hover:text-white py-1 px-2.5 text-[9px] uppercase transition-all tracking-widest text-center"
                              >
                                Редагувати
                              </button>
                              <button
                                onClick={() => handleDeleteDraft(draft.id)}
                                className="bg-zinc-950 border border-zinc-900 hover:bg-red-950 hover:border-red-900 text-zinc-500 hover:text-red-400 p-1.5 transition-all"
                                title="Видалити"
                              >
                                <Trash size={12} />
                              </button>
                            </div>
                          </div>

                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Step-by-step creation instruction with BotFather */}
                <div className="bg-zinc-950/40 border border-zinc-900 rounded-sm p-5 space-y-3 font-mono">
                  <span className="text-[10px] text-white font-bold block uppercase tracking-wider">❖ ІНСТРУКЦІЯ СТВОРЕННЯ БОТА ЧЕРЕЗ @BOTFATHER:</span>
                  <div className="space-y-2 text-zinc-400 font-medium text-[9.5px] leading-relaxed">
                    <p>
                      1. Знайдіть у Telegram користувача <span className="text-white font-bold">@BotFather</span> та відправте команду <span className="text-white font-semibold">/newbot</span>.
                    </p>
                    <p>
                      2. Введіть назву бота (наприклад, <span className="text-zinc-300 font-medium">Secum SGB Store</span>) та унікальний username, який закінчується на <span className="text-white">bot</span>.
                    </p>
                    <p>
                      3. Скопіюйте наданий числовий <span className="text-white font-bold font-mono">HTTP API Token</span>.
                    </p>
                    <p>
                      4. Вставте його у поле синхронізації вище та натисніть <span className="text-white font-bold">"ЗБЕРЕГТИ ТОКЕН"</span> та запустіть шлюз. Тепер бот працюватиме у реальному часі!
                    </p>
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN: Virtual Smartphone & Interactive Poller Simulator */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Smartphone Device Mockup Box */}
                <div className="border border-zinc-800 bg-[#09090b] rounded-3xl p-4 shadow-2xl relative overflow-hidden max-w-sm mx-auto">
                  
                  {/* Smartphone top camera plate */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4.5 bg-black rounded-b-xl z-30 flex justify-center items-center">
                    <div className="w-10 h-1 bg-zinc-850 rounded-full" />
                    <div className="w-2.5 h-2.5 bg-zinc-900 rounded-full ml-2 border border-zinc-800" />
                  </div>

                  {/* Inner Phone Layout */}
                  <div className="border border-zinc-900 rounded-2xl bg-[#030303] overflow-hidden flex flex-col h-[600px] relative">
                    
                    {/* Simulated App Top Bar */}
                    <div className="bg-[#0b0b0c] border-b border-zinc-900 pt-5 pb-3 px-4 flex justify-between items-center relative z-20">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full border border-zinc-800 bg-neutral-950 flex items-center justify-center text-xs text-white">
                          ✙
                        </div>
                        <div>
                          <h4 className="text-[10px] font-bold text-white uppercase tracking-wider leading-none">SECUM SGB ШІ-Бот</h4>
                          <span className="text-[8px] text-zinc-400 font-mono">bot poller active</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
                        <span className="text-[7.5px] text-zinc-500 uppercase font-mono tracking-widest select-none">TEST MODE</span>
                      </div>
                    </div>

                    {/* Chat Logs Canvas */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-3.5 flex flex-col scrollbar-thin bg-black/60 relative">
                      
                      {simMessages.map((msg) => {
                        const isBot = msg.sender === 'bot';
                        return (
                          <div 
                            key={msg.id} 
                            className={`flex flex-col ${isBot ? 'items-start' : 'items-end'} max-w-[85%] ${isBot ? 'self-start' : 'self-end'}`}
                          >
                            <div className={`p-3 rounded-lg text-[9.5px] font-mono leading-normal shadow-md ${
                              isBot 
                                ? 'bg-[#0f0f10] border border-zinc-900 text-zinc-300 rounded-tl-none' 
                                : 'bg-[#dedede] text-black font-semibold rounded-tr-none'
                            }`}>
                              
                              {/* Attached image preview */}
                              {msg.image && (
                                <div className="mb-2.5 rounded-sm border border-zinc-800 overflow-hidden select-none">
                                  <img 
                                    src={msg.image} 
                                    alt="Telegram Upload" 
                                    className="max-h-[140px] w-full object-cover grayscale group-hover:grayscale-0 transition-all"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              )}

                              <p className="whitespace-pre-line tracking-wide">
                                {msg.text}
                              </p>

                              {/* Interactive Inline Keyboard Buttons inside simulated telegram screen */}
                              {msg.isInteractive && (
                                <div className="mt-3.5 space-y-1.5 border-t border-zinc-900/60 pt-2.5">
                                  <button
                                    onClick={() => handlePublishDraft(msg.draftId)}
                                    className="w-full bg-white hover:bg-neutral-200 text-black py-1.5 text-[8.5px] font-black uppercase text-center transition-colors cursor-pointer"
                                  >
                                    ✙ ОПУБЛІКУВАТИ НА САЙТ ✙
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDraft(msg.draftId)}
                                    className="w-full bg-zinc-950 hover:bg-neutral-900 text-zinc-400 py-1 text-[8px] font-bold uppercase text-center transition-colors cursor-pointer border border-zinc-900"
                                  >
                                    ❌ Видалити чернетку
                                  </button>
                                </div>
                              )}
                            </div>
                            
                            <span className="text-[7px] text-zinc-650 block mt-1 tracking-widest uppercase font-bold font-mono">
                              {isBot ? 'SGB ARCH BOT' : 'YOU'} • {msg.time}
                            </span>
                          </div>
                        );
                      })}

                      <div ref={chatEndRef} />
                    </div>

                    {/* Chat Control Input Deck */}
                    <div className="bg-[#0b0b0c] p-3 border-t border-zinc-900 space-y-3 relative z-20">
                      
                      {/* Presets Row to mimic clothing photo uploads */}
                      <div className="space-y-1">
                        <span className="text-[7.5px] text-zinc-500 font-bold block uppercase tracking-widest font-mono">
                          Оберіть одяг для імітації завантаження:
                        </span>
                        
                        <div className="grid grid-cols-4 gap-1.5 font-mono">
                          {[
                            { id: 'jacket', label: '🧥 КУРТКА', icon: '🧥' },
                            { id: 'knitwear', label: '👕 СВЕТР', icon: '👕' },
                            { id: 'balaclava', label: '🕶 МАСКА', icon: '🕶' },
                            { id: 'boots', label: '🥾 ЧЕРЕВ', icon: '🥾' }
                          ].map((t) => (
                            <button
                              key={t.id}
                              onClick={() => {
                                setSimSelectedTemplate(t.id);
                                setSimCustomImageB64(null); // clears uploaded file to prioritize template
                                triggerToast(`✙ Обрано шаблон: ${t.label}`);
                              }}
                              className={`py-1 text-[7.5px] font-bold rounded-sm cursor-pointer uppercase transition-all duration-200 truncate ${
                                simSelectedTemplate === t.id && !simCustomImageB64
                                  ? 'bg-white text-black font-extrabold focus:outline-none'
                                  : 'bg-zinc-950 border border-zinc-900 text-zinc-400 hover:text-white'
                              }`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* File Upload Alternative to pick real files */}
                      <div className="flex justify-between items-center py-1 border-t border-b border-zinc-950">
                        <span className="text-[7.5px] text-[#cccccc] font-medium uppercase tracking-wide">
                          Або завантажте власне фото одягу:
                        </span>
                        
                        <input 
                          type="file" 
                          accept="image/*" 
                          ref={simHiddenFileInputRef}
                          onChange={handleCustomImageUpload}
                          className="hidden"
                        />
                        <button
                          onClick={() => simHiddenFileInputRef.current?.click()}
                          className={`flex items-center gap-1.5 px-2 py-0.5 border text-[7.5px] font-mono font-bold uppercase transition-all cursor-pointer ${
                            simCustomImageB64 
                              ? 'bg-green-950 border-green-800 text-green-300' 
                              : 'bg-zinc-950 border-zinc-900 text-zinc-400 hover:border-zinc-500 hover:text-white'
                          }`}
                        >
                          <Upload size={8} />
                          {simCustomImageB64 ? '✓ ФОТО ПРИКРІПЛЕНО' : 'ОБРАТИ ФАЙЛ'}
                        </button>
                      </div>

                      {/* Caption text entry */}
                      <div className="space-y-1">
                        <textarea
                          placeholder="Додати коментар (наприклад: куртка, ціна 4500 грн, розмір L)..."
                          value={simCaption}
                          onChange={(e) => setSimCaption(e.target.value)}
                          rows={2}
                          className="w-full bg-zinc-950 border border-zinc-900 text-[9px] text-zinc-100 p-2 focus:outline-none focus:border-zinc-500 font-sans leading-relaxed tracking-wider rounded-sm resize-none"
                        />
                      </div>

                      {/* Submit Simulated Update */}
                      <button
                        onClick={handleSendSimulatedPhoto}
                        disabled={simIsAnalyzing}
                        className="w-full bg-[#eeeeee] hover:bg-white text-black py-2 rounded-sm text-[9px] font-extrabold uppercase transition-all tracking-widest flex justify-center items-center gap-1.5 cursor-pointer disabled:opacity-40"
                      >
                        {simIsAnalyzing ? (
                          <>
                            <RefreshCw size={10} className="animate-spin" />
                            ОБРОБКА СИЛУЕТУ ШІ...
                          </>
                        ) : (
                          <>
                            <Send size={9} />
                            НАДІСЛАТИ НА ІНТЕГРАЦІЮ
                          </>
                        )}
                      </button>

                    </div>

                  </div>

                </div>

              </div>

            </div>

            {/* EDITING DRAFT DIALOG DIALOG OVERLAY (PORTAL TYPE BLOCK) */}
            {/* Modal was moved globally below to prevent tab masking */}
          </div>
        )}

        {/* GLOBAL EDITING DRAFT DIALOG DIALOG OVERLAY */}
        <AnimatePresence>
          {isEditingDraft && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#0c0c0d] border border-zinc-900 max-w-lg w-full p-6 space-y-6 relative rounded-sm font-mono"
              >
                
                <button
                  type="button"
                  onClick={() => setIsEditingDraft(null)}
                  className="absolute top-4 right-4 text-zinc-500 hover:text-white cursor-pointer"
                >
                  <X size={15} />
                </button>

                <div className="border-b border-zinc-900 pb-2.5">
                  <h4 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
                    <Edit size={12} className="text-zinc-400" />
                    Редагування чернетки одягу
                  </h4>
                  <p className="text-[8px] text-zinc-500 uppercase font-semibold">Модифікуйте параметри розпізнаної моделі перед публікацією</p>
                </div>

                <div className="space-y-4">
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] text-zinc-400 block mb-1 uppercase font-extrabold">Назва товару:</label>
                      <input 
                        type="text"
                        value={isEditingDraft.name}
                        onChange={(e) => setIsEditingDraft({ ...isEditingDraft, name: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-900 text-white font-mono text-xs p-2 focus:outline-none focus:border-zinc-500"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] text-zinc-400 block mb-1 uppercase font-extrabold">Ціна (UAH):</label>
                      <input 
                        type="number"
                        value={isEditingDraft.price}
                        onChange={(e) => setIsEditingDraft({ ...isEditingDraft, price: Number(e.target.value) })}
                        className="w-full bg-zinc-950 border border-zinc-900 text-white font-mono text-xs p-2 focus:outline-none focus:border-zinc-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] text-zinc-400 block mb-1 uppercase font-extrabold">Опис виробу для каталогу:</label>
                    <textarea 
                      value={isEditingDraft.description}
                      onChange={(e) => setIsEditingDraft({ ...isEditingDraft, description: e.target.value })}
                      rows={4}
                      className="w-full bg-zinc-950 border border-zinc-900 text-zinc-100 font-sans text-xs p-2.5 focus:outline-none focus:border-zinc-500 leading-relaxed rounded-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] text-zinc-400 block mb-1 uppercase font-extrabold">Категорія:</label>
                      <select
                        value={isEditingDraft.category}
                        onChange={(e: any) => setIsEditingDraft({ ...isEditingDraft, category: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-900 text-white font-mono text-xs p-1.5 focus:outline-none focus:border-zinc-500"
                      >
                        <option value="outerwear">Outerwear (🧥 Одяг)</option>
                        <option value="top">Top (👕 Верх)</option>
                        <option value="bottom">Bottom (👖 Низ)</option>
                        <option value="shoes">Shoes (🥾 Взуття)</option>
                        <option value="accessories">Accessories (🕶 Аксесуари)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[9px] text-zinc-400 block mb-1 uppercase font-extrabold">Доступні розміри (через кому):</label>
                      <input 
                        type="text"
                        value={sizesInputText}
                        onChange={(e) => {
                          setSizesInputText(e.target.value);
                          setIsEditingDraft({ 
                            ...isEditingDraft, 
                            sizes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) 
                          });
                        }}
                        placeholder="e.g. S, M, L, XL"
                        className="w-full bg-zinc-950 border border-zinc-900 text-white font-mono text-xs p-2 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] text-zinc-400 block mb-1 uppercase font-extrabold">Теги стилю (через кому):</label>
                    <input 
                      type="text"
                      value={tagsInputText}
                      onChange={(e) => {
                        setTagsInputText(e.target.value);
                        setIsEditingDraft({ 
                          ...isEditingDraft, 
                          tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) 
                        });
                      }}
                      placeholder="e.g. goth, alternative, avant-garde"
                      className="w-full bg-zinc-950 border border-zinc-900 text-zinc-300 font-mono text-xs p-2 focus:outline-none"
                    />
                  </div>

                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handlePublishDraft(isEditingDraft.id, isEditingDraft)}
                    className="flex-1 bg-white hover:bg-zinc-200 text-black py-2.5 text-[10px] font-bold uppercase tracking-wider text-center cursor-pointer"
                  >
                    ✙ ОПУБЛІКУВАТИ НА САЙТ ПОТОЧНИЙ СТИЛЬ ✙
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingDraft(null)}
                    className="bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800 px-4 py-2.5 text-[9px] font-bold uppercase tracking-widest cursor-pointer"
                  >
                    Скасувати
                  </button>
                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>

    </div>
  );
}
