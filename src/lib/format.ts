/**
 * Format utilities for consistent display across components
 */

/**
 * Format a decimal number as a percentage
 * @param decimal - The decimal value (e.g., 0.05 for 5%)
 * @param digits - Number of decimal places (default: 2)
 * @returns Formatted percentage string
 */
export const formatPercent = (decimal: number, digits: number = 2): string => {
  return `${(decimal * 100).toFixed(digits)}%`;
};

/**
 * Format a number as currency
 * @param value - The numeric value
 * @param currency - Currency code (default: 'USD')
 * @param locale - Locale string (default: 'en-US')
 * @returns Formatted currency string
 */
export const formatCurrency = (
  value: number, 
  currency: string = 'USD', 
  locale: string = 'en-US'
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

/**
 * Format a number with specified decimal places
 * @param value - The numeric value
 * @param digits - Number of decimal places (default: 2)
 * @returns Formatted number string
 */
export const formatNumber = (value: number, digits: number = 2): string => {
  return value.toFixed(digits);
};

/**
 * Format a large number with K, M, B suffixes
 * @param value - The numeric value
 * @param digits - Number of decimal places (default: 1)
 * @returns Formatted number string with suffix
 */
export const formatCompactNumber = (value: number, digits: number = 1): string => {
  if (value >= 1e9) {
    return `${(value / 1e9).toFixed(digits)}B`;
  }
  if (value >= 1e6) {
    return `${(value / 1e6).toFixed(digits)}M`;
  }
  if (value >= 1e3) {
    return `${(value / 1e3).toFixed(digits)}K`;
  }
  return value.toFixed(digits);
};

/**
 * Format a timestamp as a relative time string
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Relative time string (e.g., "2 hours ago")
 */
export const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }
  if (hours > 0) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  if (minutes > 0) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }
  return `${seconds} second${seconds === 1 ? '' : 's'} ago`;
};

/**
 * Format a date string
 * @param timestamp - Unix timestamp in milliseconds
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export const formatDate = (
  timestamp: number, 
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }
): string => {
  return new Intl.DateTimeFormat('en-US', options).format(new Date(timestamp));
};
