import { unmaskDigits } from './masks';

export interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge?: string;
  gia?: string;
  ddd?: string;
  siafi?: string;
  erro?: boolean;
}

export async function fetchAddressByCep(cep: string): Promise<{
  success: boolean;
  data?: {
    logradouro: string;
    bairro: string;
    cidade: string;
    uf: string;
  };
  error?: string;
}> {
  const clean = unmaskDigits(cep);
  if (clean.length !== 8) {
    return { success: false, error: 'CEP deve conter 8 dígitos' };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(`https://viacep.com.br/ws/${clean}/json/`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return { success: false, error: 'Não foi possível consultar o CEP no momento' };
    }

    const data: ViaCepResponse = await response.json();

    if (data.erro) {
      return { success: false, error: 'CEP não encontrado na base dos Correios' };
    }

    return {
      success: true,
      data: {
        logradouro: data.logradouro || '',
        bairro: data.bairro || '',
        cidade: data.localidade || '',
        uf: data.uf || '',
      },
    };
  } catch (err: unknown) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    return {
      success: false,
      error: isAbort ? 'Tempo limite esgotado ao buscar CEP' : 'Erro de conexão ao buscar CEP',
    };
  }
}
