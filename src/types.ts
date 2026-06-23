export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  images?: string[]; // Multiple photos support
  collection?: string; // Series or Collection name
  category: 'outerwear' | 'top' | 'bottom' | 'skirts' | 'shoes' | 'accessories' | 'swimwear';
  sizes: string[];
  tags: string[];
  stock: number;
  color?: string; // Color of the product for filtering
  riddickRating?: string; // Retro cyber rating, e.g. "THERMAL_APPROVED", "VOID_RESISTANT"
  mannequinYOffset?: number; // Offset for virtual fitting room placement
  mannequinScale?: number; // Scale for virtual fitting room placement
  telegramImage?: string; // Optional custom URL for products uploaded via Telegram Bot
}

export interface TelegramDraft {
  id: string;
  telegramChatId?: number;
  fileId?: string;
  imageUrl?: string;
  name: string;
  description: string;
  price: number;
  category: 'outerwear' | 'top' | 'bottom' | 'skirts' | 'shoes' | 'accessories' | 'swimwear';
  sizes: string[];
  tags: string[];
  createdAt: string;
  simulated?: boolean;
}

export interface CustomerDetails {
  fullName: string;
  firstName?: string;
  lastName?: string;
  phone: string;
  email?: string;
  telegram?: string;
  region?: string;
  postalCode?: string;
  city: string;
  deliveryMethod: 'nova_poshta_office' | 'nova_poshta_locker' | 'ukrposhta' | 'self_pickup';
  addressDetails: string; // branch number or physical address
  paymentMethod: 'card_online' | 'cash_on_delivery' | 'crypto_ton';
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedSize: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customer: CustomerDetails;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    size: string;
  }[];
  totalPrice: number;
  shippingCost: number;
  status: 'new' | 'processing' | 'sent' | 'completed' | 'cancelled';
  trackingNumber?: string;
  date: string;
}

export interface SavedLook {
  id: string;
  name: string;
  tags: string[];
  productIds: string[];
}

export function parseProduct(p: any): Product {
  if (!p) return p;
  
  // Resolve image_filename if present
  let rawImage = p.image || p.image_filename || '';
  let parsedImages = p.images || [];

  if (typeof rawImage === 'string' && rawImage.includes(',')) {
    const parts = rawImage.split(',').map((s: string) => s.trim()).filter(Boolean);
    rawImage = parts[0] || '';
    parsedImages = Array.from(new Set([...parts, ...parsedImages]));
  } else if (typeof rawImage === 'string' && rawImage) {
    if (parsedImages.length === 0) {
      parsedImages = [rawImage];
    }
  }

  // Ensure absolute or correct folder prefix like /implants/ if it's just a filename
  const ensurePathPrefix = (img: string): string => {
    if (!img) return '';
    if (img.startsWith('data:') || img.startsWith('http') || img.startsWith('/')) {
      return img;
    }
    return `/implants/${img}`;
  };

  const finalImage = ensurePathPrefix(rawImage);
  const finalImages = parsedImages.map(img => ensurePathPrefix(img));

  return {
    ...p,
    id: p.id || `prod-${Math.random().toString(36).substring(2, 11)}`,
    image: finalImage,
    images: finalImages,
    category: p.category || 'top',
    sizes: p.sizes || ['S', 'M', 'L'],
    tags: p.tags || [],
    stock: typeof p.stock === 'number' ? p.stock : 10
  };
}

export function parseProducts(items: any[]): Product[] {
  if (!Array.isArray(items)) return [];
  return items.map(p => parseProduct(p));
}
