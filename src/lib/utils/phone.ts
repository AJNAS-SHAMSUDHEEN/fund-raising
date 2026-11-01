export interface CountryCodeItem {
  code: string;       // e.g. "+91"
  dialCode: string;   // e.g. "91"
  country: string;    // e.g. "India"
  flag: string;       // e.g. "🇮🇳"
  minLength: number;
  maxLength: number;
  placeholder: string;
}

export const COUNTRY_CODES: CountryCodeItem[] = [
  { code: '+91', dialCode: '91', country: 'India', flag: '🇮🇳', minLength: 10, maxLength: 10, placeholder: '98470 12345' },
  { code: '+971', dialCode: '971', country: 'UAE', flag: '🇦🇪', minLength: 8, maxLength: 9, placeholder: '50 123 4567' },
  { code: '+966', dialCode: '966', country: 'Saudi Arabia', flag: '🇸🇦', minLength: 9, maxLength: 9, placeholder: '50 123 4567' },
  { code: '+974', dialCode: '974', country: 'Qatar', flag: '🇶🇦', minLength: 8, maxLength: 8, placeholder: '3312 3456' },
  { code: '+968', dialCode: '968', country: 'Oman', flag: '🇴🇲', minLength: 8, maxLength: 8, placeholder: '9123 4567' },
  { code: '+965', dialCode: '965', country: 'Kuwait', flag: '🇰🇼', minLength: 8, maxLength: 8, placeholder: '9123 4567' },
  { code: '+973', dialCode: '973', country: 'Bahrain', flag: '🇧🇭', minLength: 8, maxLength: 8, placeholder: '3612 3456' },
  { code: '+44', dialCode: '44', country: 'UK', flag: '🇬🇧', minLength: 10, maxLength: 11, placeholder: '7123 456789' },
  { code: '+1', dialCode: '1', country: 'USA/Canada', flag: '🇺🇸', minLength: 10, maxLength: 10, placeholder: '202 555 0123' },
  { code: '+60', dialCode: '60', country: 'Malaysia', flag: '🇲🇾', minLength: 9, maxLength: 10, placeholder: '12 345 6789' },
  { code: '+65', dialCode: '65', country: 'Singapore', flag: '🇸🇬', minLength: 8, maxLength: 8, placeholder: '8123 4567' },
];

/**
 * Builds normalized phone number for storage in Firestore.
 * - India: 10 digits for backward compatibility with existing records
 * - International: +<dialCode><nationalDigits> (E.164 format)
 */
export function buildStoredPhoneNumber(rawPhone: string, countryCode: string = '+91'): string {
  const digits = rawPhone.replace(/\D/g, '');
  if (!digits) return '';
  if (countryCode === '+91') {
    return digits.slice(-10);
  }
  const dial = countryCode.replace(/\D/g, '');
  const cleanNational = digits.startsWith(dial) ? digits.slice(dial.length) : digits;
  return `+${dial}${cleanNational}`;
}

/**
 * Validates phone length according to country rules
 */
export function validatePhoneNumber(rawPhone: string, countryCode: string = '+91'): { isValid: boolean; error?: string } {
  const digits = rawPhone.replace(/\D/g, '');
  if (!digits) {
    return { isValid: false, error: 'ദയവായി മൊബൈൽ നമ്പർ നൽകുക (Please enter phone number)' };
  }

  const matched = COUNTRY_CODES.find((c) => c.code === countryCode) || COUNTRY_CODES[0];
  const dial = countryCode.replace(/\D/g, '');
  const cleanNational = digits.startsWith(dial) ? digits.slice(dial.length) : digits;

  if (countryCode === '+91') {
    if (cleanNational.length !== 10) {
      return { isValid: false, error: 'സാധുവായ 10 അക്ക മൊബൈൽ നമ്പർ നൽകുക (10 digits required)' };
    }
  } else {
    if (cleanNational.length < matched.minLength || cleanNational.length > matched.maxLength) {
      return {
        isValid: false,
        error: `${matched.country} നമ്പറുകൾക്ക് ${matched.minLength === matched.maxLength ? `${matched.minLength} അക്കങ്ങൾ` : `${matched.minLength}-${matched.maxLength} അക്കങ്ങൾ`} ആവശ്യമാണ്`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Formats a phone number nicely for UI display
 */
export function formatDisplayPhone(phone?: string): string {
  if (!phone || phone === '0000000000') return 'നമ്പർ ലഭ്യമല്ല (No Phone)';
  if (phone.startsWith('+')) {
    const matched = COUNTRY_CODES.find((c) => phone.startsWith(c.code));
    if (matched) {
      const national = phone.slice(matched.code.length);
      return `${matched.flag} ${matched.code} ${national}`;
    }
    return phone;
  }
  return `🇮🇳 +91 ${phone}`;
}

/**
 * Generates an official WhatsApp URL for any country
 */
export function buildWhatsAppLink(phone: string, text: string): string {
  const clean = phone.replace(/\D/g, '');
  if (!clean || clean === '0000000000') return '';
  const fullDial = phone.startsWith('+') ? clean : (clean.length === 10 ? `91${clean}` : clean);
  return `https://wa.me/${fullDial}?text=${encodeURIComponent(text)}`;
}
