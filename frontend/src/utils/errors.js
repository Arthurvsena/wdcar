// Extrai mensagem legível de erros da API.
// Erros de validação Pydantic vêm como lista em detail — nunca renderizar cru.
export const getErrorMessage = (err, fallback = 'Ocorreu um erro') => {
  const detail = err?.response?.data?.detail;
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map((e) => e.msg).filter(Boolean).join(', ') || fallback;
  }
  if (typeof detail === 'object' && detail.msg) return detail.msg;
  return fallback;
};
