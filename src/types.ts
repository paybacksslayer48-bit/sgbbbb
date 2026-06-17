export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: 'outerwear' | 'top' | 'bottom' | 'shoes' | 'accessories';
  sizes: string[];
  tags: string[];
  stock: number;
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
  category: 'outerwear' | 'top' | 'bottom' | 'shoes' | 'accessories';
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
