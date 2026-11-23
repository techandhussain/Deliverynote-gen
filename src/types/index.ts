export interface Product {
  id: string;
  name: string;
  sku?: string;
  description?: string;
  price?: number;
  stock?: number;
  category?: string;
  image?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryItem {
  id: string;
  productId?: string;
  name: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  total: number;
  isCustom?: boolean;
}

export interface BuyerInfo {
  name: string;
  phone?: string;
  address?: string;
  city?: string;
  notes?: string;
}

export type DeliveryStatus = 'pending' | 'in_transit' | 'delivered' | 'cancelled';

export interface Delivery {
  id: string;
  deliveryNumber: string;
  status: DeliveryStatus;
  items: DeliveryItem[];
  totalItems: number;
  totalQuantity: number;
  subtotal: number;
  discount: number;
  grandTotal: number;
  deliveryNotes?: string;
  buyer: BuyerInfo;
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string;
  receivedBy?: string;
  stockDeducted: boolean;
}

export interface BusinessSettings {
  id: 'default';
  businessName: string;
  logo?: string;
  address?: string;
  phone?: string;
  currency: string;
  dateFormat: 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'MMM D, YYYY';
  themePreference: 'light' | 'system';
  defaultFooterNotes: string;
  inventoryTracking: boolean;
  nextDeliverySequence: number;
}

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}
