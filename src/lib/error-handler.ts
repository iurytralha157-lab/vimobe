/**
 * Utility to map technical Supabase error messages to user-friendly Portuguese messages.
 */
export function getFriendlyErrorMessage(error: any): string {
  if (!error) return 'Ocorreu um erro inesperado. Tente novamente.';

  const message = error.message || (typeof error === 'string' ? error : '');
  const lowerMessage = message.toLowerCase();

  // User creation / Auth errors
  if (lowerMessage.includes('user already exists') || lowerMessage.includes('already registered')) {
    return 'Este e-mail já está cadastrado. Tente fazer login ou use outro e-mail.';
  }
  
  if (lowerMessage.includes('invalid login credentials')) {
    return 'Credenciais inválidas. Verifique seus dados e tente novamente.';
  }

  if (lowerMessage.includes('email not confirmed')) {
    return 'Por favor, confirme seu e-mail antes de fazer login.';
  }

  // Foreign Key / Deletion errors
  if (lowerMessage.includes('violates foreign key constraint') || lowerMessage.includes('fk_')) {
    return 'Este registro não pode ser excluído pois está sendo utilizado em outras partes do sistema (vendas, contratos, tarefas, etc).';
  }

  // Database / Connection errors
  if (lowerMessage.includes('failed to fetch') || lowerMessage.includes('network error')) {
    return 'Erro de conexão. Verifique sua internet.';
  }

  // Permission errors
  if (lowerMessage.includes('insufficient_privilege') || lowerMessage.includes('permission denied')) {
    return 'Você não tem permissão para realizar esta ação.';
  }

  // Fallback to the original message if it's already in Portuguese, otherwise a generic one
  const isPortuguese = /[áéíóúãõç]/i.test(message) && !message.includes('error');
  
  return isPortuguese ? message : 'Ocorreu um erro ao processar sua solicitação. Tente novamente em alguns instantes.';
}
