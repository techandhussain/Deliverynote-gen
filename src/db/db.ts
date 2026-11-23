import Dexie, { type EntityTable } from 'dexie';
import type { Product, Delivery, BusinessSettings } from '../types';

export const DEFAULT_SETTINGS: BusinessSettings = {
  id: 'default',
  businessName: 'My Delivery Business',
  logo: '',
  address: '123 Commercial Way, Suite 400',
  phone: '+1 (555) 019-2834',
  currency: '$',
  dateFormat: 'YYYY-MM-DD',
  themePreference: 'light',
  defaultFooterNotes: 'Goods received in good condition and order. Thank you for your business!',
  inventoryTracking: true,
  nextDeliverySequence: 1001,
};

export class DeliveryAppDatabase extends Dexie {
  products!: EntityTable<Product, 'id'>;
  deliveries!: EntityTable<Delivery, 'id'>;
  settings!: EntityTable<BusinessSettings, 'id'>;

  constructor() {
    super('DeliverFlowDB');
    this.version(1).stores({
      products: 'id, name, sku, category, updatedAt',
      deliveries: 'id, deliveryNumber, status, createdAt, deliveredAt, [buyer.name]',
      settings: 'id',
    });
  }
}

export const db = new DeliveryAppDatabase();

// Initialize default settings if not exists
export async function initializeDatabase(): Promise<BusinessSettings> {
  try {
    const existing = await db.settings.get('default');
    if (!existing) {
      await db.settings.put(DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    }
    return existing;
  } catch (error) {
    console.error('Error initializing database settings:', error);
    return DEFAULT_SETTINGS;
  }
}

// Helper to generate next unique delivery note number
export async function generateDeliveryNumber(): Promise<string> {
  return await db.transaction('rw', db.settings, async () => {
    let settings = await db.settings.get('default');
    if (!settings) {
      settings = DEFAULT_SETTINGS;
      await db.settings.put(settings);
    }
    const currentSeq = settings.nextDeliverySequence || 1001;
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const formattedNum = `DN-${yearMonth}-${String(currentSeq).padStart(4, '0')}`;
    
    // Update next sequence
    await db.settings.update('default', {
      nextDeliverySequence: currentSeq + 1,
    });
    
    return formattedNum;
  });
}
