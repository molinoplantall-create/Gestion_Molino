/**
 * Formatea un número con separadores de miles (coma) y decimales opcionales.
 * @param value El número a formatear
 * @param decimals Cantidad de decimales (por defecto 0)
 * @returns String formateado (ej: 4,061)
 */
export const formatNumber = (value: number | string | null | undefined, decimals: number = 0): string => {
  if (value === null || value === undefined || value === '') return '0';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

/**
 * Formatea moneda (opcional)
 */
export const formatCurrency = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '$0.00';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$0.00';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num);
};
