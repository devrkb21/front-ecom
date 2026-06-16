'use client';

import { useMemo, useState, useEffect } from 'react';
import { ProductVariant, VariantAttribute } from '@/types';

interface VariantSelectorProps {
  variants: ProductVariant[];
  selectedVariant: ProductVariant | null;
  onVariantChange: (variant: ProductVariant | null) => void;
}

interface AttributeOption {
  valueId: number;
  value: string;
  colorCode?: string;
  available: boolean;
}

interface GroupedAttribute {
  attributeId: number;
  attributeName: string;
  attributeSlug: string;
  displayStyle: string;
  options: AttributeOption[];
}

export function VariantSelector({ variants, selectedVariant, onVariantChange }: VariantSelectorProps) {
  // Group attributes from all variants
  const groupedAttributes = useMemo(() => {
    const attributeMap = new Map<number, GroupedAttribute>();

    variants.forEach((variant) => {
      variant.attributes.forEach((attr) => {
        if (!attributeMap.has(attr.attribute_id)) {
          attributeMap.set(attr.attribute_id, {
            attributeId: attr.attribute_id,
            attributeName: attr.attribute_name,
            attributeSlug: attr.attribute_slug,
            displayStyle: attr.display_style || 'rounded',
            options: [],
          });
        }

        const group = attributeMap.get(attr.attribute_id)!;
        const existingOption = group.options.find((o) => o.valueId === attr.value_id);
        
        if (!existingOption) {
          group.options.push({
            valueId: attr.value_id,
            value: attr.value,
            colorCode: attr.color_code ?? undefined,
            available: variant.is_active && variant.in_stock,
          });
        } else if (variant.is_active && variant.in_stock) {
          existingOption.available = true;
        }
      });
    });

    return Array.from(attributeMap.values());
  }, [variants]);

  const [selectedValues, setSelectedValues] = useState<Record<number, number>>({});

  // Sync from selectedVariant on mount or external change
  useEffect(() => {
    if (selectedVariant) {
      const values: Record<number, number> = {};
      selectedVariant.attributes.forEach((attr) => {
        values[attr.attribute_id] = attr.value_id;
      });
      setSelectedValues(values);
    } else {
      // If selectedVariant is null, but we have some selections, don't clear them 
      // unless we want to reset. To handle reset from parent, we can check if 
      // the variant list changed. For now, keep internal state.
    }
  }, [selectedVariant]);

  // Find variant matching selected attribute values
  const findMatchingVariant = (newValues: Record<number, number>): ProductVariant | null => {
    return variants.find((variant) => {
      // A variant matches if ALL of its attributes match the selected values
      return variant.attributes.every((attr) => {
        return newValues[attr.attribute_id] === attr.value_id;
      });
    }) || null;
  };

  // Check if an option is selectable given current selections
  const isOptionSelectable = (attributeId: number, valueId: number): boolean => {
    const otherSelectedValues = { ...selectedValues };
    delete otherSelectedValues[attributeId];

    return variants.some((variant) => {
      if (!variant.is_active || !variant.in_stock) return false;
      
      const hasValue = variant.attributes.some(
        (attr) => attr.attribute_id === attributeId && attr.value_id === valueId
      );
      
      if (!hasValue) return false;

      // Check if other selected values match
      return Object.entries(otherSelectedValues).every(([attrId, valId]) => {
        return variant.attributes.some(
          (attr) => attr.attribute_id === parseInt(attrId) && attr.value_id === valId
        );
      });
    });
  };

  const handleOptionClick = (attributeId: number, valueId: number) => {
    const newValues = { ...selectedValues, [attributeId]: valueId };
    setSelectedValues(newValues);
    
    const matchingVariant = findMatchingVariant(newValues);
    onVariantChange(matchingVariant);
  };

  if (groupedAttributes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {groupedAttributes.map((attribute) => (
        <div key={attribute.attributeId}>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {attribute.attributeName}
            {selectedValues[attribute.attributeId] && (
              <span className="ml-2 text-gray-500 font-normal">
                : {attribute.options.find(o => o.valueId === selectedValues[attribute.attributeId])?.value}
              </span>
            )}
          </label>
          
          <div className="flex flex-wrap gap-2">
            {attribute.options.map((option) => {
              const isSelected = selectedValues[attribute.attributeId] === option.valueId;
              const isSelectable = isOptionSelectable(attribute.attributeId, option.valueId);
              
              if (attribute.displayStyle === 'circle') {
                if (option.colorCode) {
                  return (
                    <button
                      key={option.valueId}
                      onClick={() => handleOptionClick(attribute.attributeId, option.valueId)}
                      disabled={!isSelectable}
                      className={`
                        relative w-8 h-8 rounded-full border-2 transition-all flex-shrink-0
                        ${isSelected 
                          ? 'border-accent-600 scale-110 shadow-sm'
                          : 'border-gray-200 hover:border-gray-400'
                        }
                        ${!isSelectable ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                      style={{ backgroundColor: option.colorCode }}
                      title={option.value}
                      aria-label={option.value}
                    >
                      {!isSelectable && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span className="w-full h-0.5 bg-gray-500 rotate-45 absolute" />
                        </span>
                      )}
                    </button>
                  );
                } else {
                  return (
                    <button
                      key={option.valueId}
                      onClick={() => handleOptionClick(attribute.attributeId, option.valueId)}
                      disabled={!isSelectable}
                      className={`
                        relative flex items-center justify-center min-w-[2rem] h-8 px-2.5 rounded-full border-2 transition-all text-xs font-medium
                        ${isSelected 
                          ? 'border-accent-600 bg-accent-600 text-white'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                        }
                        ${!isSelectable ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                      title={option.value}
                      aria-label={option.value}
                    >
                      <span className={!isSelectable ? 'line-through' : ''}>
                        {option.value}
                      </span>
                    </button>
                  );
                }
              }

              // Default / Rounded style
              return (
                <button
                  key={option.valueId}
                  onClick={() => handleOptionClick(attribute.attributeId, option.valueId)}
                  disabled={!isSelectable}
                  className={`
                    flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-all
                    ${isSelected
                      ? 'bg-accent-600 text-white border-accent-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                    }
                    ${!isSelectable 
                      ? 'opacity-40 cursor-not-allowed' 
                      : 'cursor-pointer'
                    }
                  `}
                  title={option.value}
                  aria-label={option.value}
                >
                  {option.colorCode && (
                    <span
                      className={`w-3 h-3 rounded-full border flex-shrink-0 ${isSelected ? 'border-white/40' : 'border-gray-200'}`}
                      style={{ backgroundColor: option.colorCode }}
                    />
                  )}
                  <span className={!isSelectable ? 'line-through' : ''}>
                    {option.value}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default VariantSelector;
