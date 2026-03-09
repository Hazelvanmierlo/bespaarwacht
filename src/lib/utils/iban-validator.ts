const NL_BANKS: Record<string, string> = {
  ABNA: 'ABN AMRO', INGB: 'ING', RABO: 'Rabobank', SNSB: 'SNS',
  ASNB: 'ASN', KNAB: 'Knab', TRIO: 'Triodos', BUNQ: 'bunq',
  REVO: 'Revolut', DEUT: 'Deutsche Bank', FVLB: 'Van Lanschot',
};

export interface IBANResult {
  valid: boolean;
  iban: string;
  formatted: string;
  bankCode: string;
  bankName: string;
  error?: string;
}

export function validateIBAN(raw: string): IBANResult {
  const iban = raw.replace(/\s/g, '').toUpperCase();

  if (!/^NL\d{2}[A-Z]{4}\d{10}$/.test(iban)) {
    return { valid: false, iban, formatted: iban, bankCode: '', bankName: '', error: 'Ongeldig formaat. Nederlands IBAN = NL + 2 cijfers + 4 letters + 10 cijfers.' };
  }

  const bankCode = iban.slice(4, 8);
  const bankName = NL_BANKS[bankCode] || bankCode;

  // Modulo 97 check (ISO 13616)
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged.split('').map(c =>
    c >= 'A' && c <= 'Z' ? (c.charCodeAt(0) - 55).toString() : c,
  ).join('');

  let remainder = 0;
  for (let i = 0; i < numeric.length; i++) {
    remainder = (remainder * 10 + parseInt(numeric[i])) % 97;
  }

  if (remainder !== 1) {
    return { valid: false, iban, formatted: iban, bankCode, bankName, error: 'IBAN check digit klopt niet. Controleer de cijfers.' };
  }

  const formatted = iban.replace(/(.{4})/g, '$1 ').trim();
  return { valid: true, iban, formatted, bankCode, bankName };
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
