export type CurrencyCode = 'USD' | 'MXN' | 'CRC' | 'COP';

export const formatCurrency = (value: number, currency: CurrencyCode) => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    const symbol =
      currency === 'USD' ? '$' :
      currency === 'MXN' ? '$' :
      currency === 'CRC' ? '₡' :
      currency === 'COP' ? '$' : '$';
    return `${symbol}${Number(value || 0).toLocaleString()}`;
  }
};

export const getCurrencyLabel = (currency: CurrencyCode) => {
  switch (currency) {
    case 'USD': return 'USD ($)';
    case 'MXN': return 'MXN ($)';
    case 'CRC': return 'CRC (₡)';
    case 'COP': return 'COP ($)';
    default: return currency;
  }
};
