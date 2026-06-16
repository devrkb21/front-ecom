export const ALLOWED_PRODUCT_GRID_COLUMNS_DESKTOP = [3, 4, 5, 6] as const;
export const ALLOWED_PRODUCT_GRID_COLUMNS_MOBILE = [1, 2] as const;

export type ProductGridColumnsDesktop = (typeof ALLOWED_PRODUCT_GRID_COLUMNS_DESKTOP)[number];
export type ProductGridColumnsMobile = (typeof ALLOWED_PRODUCT_GRID_COLUMNS_MOBILE)[number];

export const DEFAULT_PRODUCT_GRID_COLUMNS_DESKTOP: ProductGridColumnsDesktop = 5;
export const DEFAULT_PRODUCT_GRID_COLUMNS_MOBILE: ProductGridColumnsMobile = 2;

type GridSpacing = 'compact' | 'normal';

export const normalizeDesktopColumns = (value: unknown): ProductGridColumnsDesktop => {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value || ''), 10);
  if (ALLOWED_PRODUCT_GRID_COLUMNS_DESKTOP.includes(parsed as ProductGridColumnsDesktop)) {
    return parsed as ProductGridColumnsDesktop;
  }
  return DEFAULT_PRODUCT_GRID_COLUMNS_DESKTOP;
};

export const normalizeMobileColumns = (value: unknown): ProductGridColumnsMobile => {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value || ''), 10);
  if (ALLOWED_PRODUCT_GRID_COLUMNS_MOBILE.includes(parsed as ProductGridColumnsMobile)) {
    return parsed as ProductGridColumnsMobile;
  }
  return DEFAULT_PRODUCT_GRID_COLUMNS_MOBILE;
};

export const getProductGridClassName = (
  desktopValue: unknown,
  mobileValue: unknown,
  options?: { spacing?: GridSpacing }
): string => {
  const desktop = normalizeDesktopColumns(desktopValue);
  const mobile = normalizeMobileColumns(mobileValue);
  const spacing = options?.spacing === 'compact' ? 'compact' : 'normal';
  const gap = spacing === 'compact' ? 'gap-1 md:gap-2' : 'gap-2';

  const mobileCols = mobile === 1 ? 'grid-cols-1' : 'grid-cols-2';
  
  const desktopCols = desktop === 3 ? 'md:grid-cols-3' :
                      desktop === 4 ? 'md:grid-cols-3 lg:grid-cols-4' :
                      desktop === 5 ? 'md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' :
                      'md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6';

  return `grid ${mobileCols} ${desktopCols} ${gap}`;
};
