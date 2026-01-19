/**
 * Format a phone number for display
 * @param phone Raw phone number string
 * @returns Formatted phone string
 */
export function formatPhoneForDisplay(phone: string | null | undefined): string {
  if (!phone) return "";
  
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, "");
  
  // Brazilian format: +55 (11) 99999-9999
  if (cleaned.length === 13 && cleaned.startsWith("55")) {
    const ddd = cleaned.slice(2, 4);
    const part1 = cleaned.slice(4, 9);
    const part2 = cleaned.slice(9);
    return `+55 (${ddd}) ${part1}-${part2}`;
  }
  
  // Brazilian without country code: (11) 99999-9999
  if (cleaned.length === 11) {
    const ddd = cleaned.slice(0, 2);
    const part1 = cleaned.slice(2, 7);
    const part2 = cleaned.slice(7);
    return `(${ddd}) ${part1}-${part2}`;
  }
  
  // Brazilian landline: (11) 9999-9999
  if (cleaned.length === 10) {
    const ddd = cleaned.slice(0, 2);
    const part1 = cleaned.slice(2, 6);
    const part2 = cleaned.slice(6);
    return `(${ddd}) ${part1}-${part2}`;
  }
  
  // International format
  if (cleaned.length > 11) {
    return `+${cleaned}`;
  }
  
  return phone;
}

/**
 * Normalize phone number for storage/comparison
 * @param phone Raw phone number string
 * @returns Normalized phone string (digits only, with country code)
 */
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return "";
  
  const cleaned = phone.replace(/\D/g, "");
  
  // If starts with 55 and has 12-13 digits, it's already with country code
  if (cleaned.length >= 12 && cleaned.startsWith("55")) {
    return cleaned;
  }
  
  // Brazilian mobile (11 digits) or landline (10 digits) - add country code
  if (cleaned.length === 10 || cleaned.length === 11) {
    return `55${cleaned}`;
  }
  
  return cleaned;
}

/**
 * Format phone for WhatsApp API (no + sign, digits only)
 * @param phone Raw phone number string
 * @returns Phone formatted for WhatsApp
 */
export function formatPhoneForWhatsApp(phone: string | null | undefined): string {
  return normalizePhone(phone);
}
