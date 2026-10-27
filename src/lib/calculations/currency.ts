/**
 * Formats a paise integer to Indian Rupee currency format (e.g. ₹1,10,00,000)
 */
export function formatINRFromPaise(paise: number): string {
  const rupees = Math.floor(paise / 100);
  return formatINR(rupees);
}

/**
 * Formats a rupee amount to Indian Rupee format (e.g. ₹5,64,103)
 */
export function formatINR(rupees: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees);
}

/**
 * Formats raw number with Indian digit grouping
 */
export function formatIndianNumber(num: number): string {
  return new Intl.NumberFormat('en-IN').format(num);
}

/**
 * Converts Indian Rupee amount to English words (e.g. "One Lakh Ten Thousand Rupees Only")
 */
export function numberToWordsINR(amountRupees: number): string {
  if (amountRupees === 0) return 'Zero Rupees Only';

  const singleDigits = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teenDigits = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(num: number): string {
    if (num === 0) return '';
    if (num < 10) return singleDigits[num];
    if (num < 20) return teenDigits[num - 10];
    const unit = num % 10;
    return `${tens[Math.floor(num / 10)]}${unit !== 0 ? ' ' + singleDigits[unit] : ''}`;
  }

  function convertThreeDigits(num: number): string {
    const hundred = Math.floor(num / 100);
    const rest = num % 100;
    let res = '';
    if (hundred > 0) res += `${singleDigits[hundred]} Hundred`;
    if (rest > 0) {
      if (res !== '') res += ' ';
      res += convertTwoDigits(rest);
    }
    return res;
  }

  let n = Math.floor(amountRupees);
  let words = '';

  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const rest = n;

  if (crore > 0) words += `${convertTwoDigits(crore)} Crore `;
  if (lakh > 0) words += `${convertTwoDigits(lakh)} Lakh `;
  if (thousand > 0) words += `${convertTwoDigits(thousand)} Thousand `;
  if (rest > 0) words += `${convertThreeDigits(rest)} `;

  return `${words.trim()} Rupees Only`;
}

/**
 * Normalizes an Indian phone number to 10 digits
 */
export function normalizePhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return cleaned.slice(2);
  }
  if (cleaned.length > 10) {
    return cleaned.slice(-10);
  }
  return cleaned;
}
