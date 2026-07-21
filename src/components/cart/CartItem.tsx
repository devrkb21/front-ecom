'use client';

import { CartItem as CartItemType } from '@/types';
import { Button, SmartImage } from '@/components/ui';
import { useCartStore } from '@/stores';
import { getImageUrl, formatPrice } from '@/utils';

interface CartItemProps {
  item: CartItemType;
}

export function CartItem({ item }: CartItemProps) {
  const { updateQuantity, removeItem, isLoading } = useCartStore();

  const displayImage =
    item.product.image_url
    || item.product.image
    || item.product.images?.find((image) => image.is_primary)?.url
    || item.product.images?.[0]?.url
    || undefined;
  
  // Get current stock from variant or product
  const currentStock = item.variant?.stock_quantity ?? 100; // Default high if not specified

  const handleQuantityChange = async (newQuantity: number) => {
    if (newQuantity < 1) return;
    if (newQuantity > currentStock) return;
    await updateQuantity(item.product_id, newQuantity, item.variant_id ?? undefined);
  };

  const handleRemove = async () => {
    await removeItem(item.product_id, item.variant_id ?? undefined);
  };

  // Get variant name if present
  const variantText =
    item.variant?.attributes && item.variant.attributes.length > 0
    ? item.variant.attributes
        .map((attr) => {
          const name = (attr.attribute_name || '').trim();
          const val = (attr.value || '').trim();
          if (!val) return '';
          return name ? `${name}: ${val}` : val;
        })
        .filter(Boolean)
        .join(', ')
    : item.variant?.name;

  return (
    <div className="flex items-start gap-2 sm:gap-4 p-2.5 sm:p-4 bg-white rounded-lg shadow-sm border border-gray-100 max-w-full overflow-hidden">
      <div className="relative w-14 h-14 sm:w-20 sm:h-20 flex-shrink-0 rounded-md overflow-hidden bg-gray-100 border border-gray-50">
        <SmartImage
          src={getImageUrl(displayImage)}
          alt={item.product.name}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 56px, 80px"
        />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1.5 min-w-0">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 text-xs sm:text-base custom-line-clamp-2 leading-tight">{item.product.name}</h3>
            {variantText && (
              <p className="text-[10px] sm:text-sm text-gray-500 truncate">{variantText}</p>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={isLoading}
            className="h-6 px-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 text-[10px] font-bold shrink-0"
          >
            Remove
          </Button>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-y-2 gap-x-2">
          <div className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50 overflow-hidden shrink-0">
            <button
              onClick={() => handleQuantityChange(item.quantity - 1)}
              disabled={isLoading || item.quantity <= 1}
              className="w-6 h-6 flex items-center justify-center text-xs font-bold text-gray-600 hover:bg-gray-200 disabled:opacity-30"
            >
              -
            </button>
            <span className="w-6 text-center text-[11px] font-bold text-gray-900">{item.quantity}</span>
            <button
              onClick={() => handleQuantityChange(item.quantity + 1)}
              disabled={isLoading || item.quantity >= currentStock}
              className="w-6 h-6 flex items-center justify-center text-xs font-bold text-gray-600 hover:bg-gray-200 disabled:opacity-30"
            >
              +
            </button>
          </div>

          <div className="flex flex-1 items-center justify-between min-w-0 gap-1">
            <span className="text-[10px] text-gray-500 truncate">x {formatPrice(item.price)}</span>
            <span className="font-bold text-gray-900 text-xs sm:text-base shrink-0">{formatPrice(item.subtotal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CartItem;
