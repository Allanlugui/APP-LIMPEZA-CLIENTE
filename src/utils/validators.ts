import { unmaskDigits } from './masks';

/**
 * Validação do algoritmo oficial do CPF (Receita Federal)
 */
export function isValidCPF(cpf: string): boolean {
  const digits = unmaskDigits(cpf);
  if (digits.length !== 11) return false;

  // Rejeita sequências repetidas como 111.111.111-11
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  let remainder: number;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(digits.substring(i - 1, i), 10) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(digits.substring(9, 10), 10)) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(digits.substring(i - 1, i), 10) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(digits.substring(10, 11), 10)) return false;

  return true;
}

export function isValidRG(rg: string): boolean {
  const clean = rg.replace(/[^a-zA-Z0-9]/g, '');
  return clean.length >= 5 && clean.length <= 14;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidPhone(phone: string): boolean {
  const digits = unmaskDigits(phone);
  return digits.length === 10 || digits.length === 11;
}

export function isValidCEP(cep: string): boolean {
  const digits = unmaskDigits(cep);
  return digits.length === 8;
}
