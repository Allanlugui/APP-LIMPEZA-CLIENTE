/**
 * Utilitários de Criptografia e Segurança do Cliente
 * Implementação segura para hash de senhas e geração de códigos de recuperação
 */

/**
 * Gera um hash SHA-256 seguro para senhas com salt no navegador (Web Crypto API)
 */
export async function hashPassword(password: string, salt: string = 'limpa_organiza_sec_2026'): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}:${password.trim()}:${salt}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Gera um código único de recuperação de 6 dígitos criptograficamente seguro
 */
export function generate6DigitRecoveryCode(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const code = (array[0] % 900000) + 100000;
  return code.toString();
}

/**
 * Normaliza um identificador (CPF ou E-mail) para busca no banco de dados
 */
export function normalizeIdentifier(input: string): { type: 'cpf' | 'email' | 'rg'; value: string } {
  const trimmed = input.trim();
  if (trimmed.includes('@')) {
    return { type: 'email', value: trimmed.toLowerCase() };
  }
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.length === 11) {
    return { type: 'cpf', value: digitsOnly };
  }
  return { type: 'rg', value: trimmed.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() };
}
