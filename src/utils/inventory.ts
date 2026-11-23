import { db } from '../db/db';
import type { DeliveryItem } from '../types';

export interface StockValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates whether there is enough stock for the catalog items in the delivery.
 */
export async function validateStockAvailability(items: DeliveryItem[]): Promise<StockValidationResult> {
  const settings = await db.settings.get('default');
  if (!settings?.inventoryTracking) {
    return { valid: true, errors: [] };
  }

  const errors: string[] = [];

  for (const item of items) {
    if (!item.productId || item.isCustom) continue;
    const product = await db.products.get(item.productId);
    if (!product) continue;

    const availableStock = product.stock ?? 0;
    if (availableStock < item.quantity) {
      errors.push(
        `Insufficient stock for "${product.name}": requested ${item.quantity}, but only ${availableStock} in stock.`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Deduct stock for all catalog items in this delivery.
 * Uses a Dexie transaction to ensure atomicity.
 */
export async function deductStockForDelivery(items: DeliveryItem[]): Promise<void> {
  const settings = await db.settings.get('default');
  if (!settings?.inventoryTracking) return;

  await db.transaction('rw', db.products, async () => {
    for (const item of items) {
      if (!item.productId || item.isCustom) continue;
      const product = await db.products.get(item.productId);
      if (!product) continue;

      const currentStock = product.stock ?? 0;
      const newStock = Math.max(0, currentStock - item.quantity);
      await db.products.update(item.productId, {
        stock: newStock,
        updatedAt: new Date().toISOString(),
      });
    }
  });
}

/**
 * Restores previously deducted stock (e.g. when delivery is cancelled or deleted).
 */
export async function restoreStockForDelivery(items: DeliveryItem[]): Promise<void> {
  await db.transaction('rw', db.products, async () => {
    for (const item of items) {
      if (!item.productId || item.isCustom) continue;
      const product = await db.products.get(item.productId);
      if (!product) continue;

      const currentStock = product.stock ?? 0;
      await db.products.update(item.productId, {
        stock: currentStock + item.quantity,
        updatedAt: new Date().toISOString(),
      });
    }
  });
}
