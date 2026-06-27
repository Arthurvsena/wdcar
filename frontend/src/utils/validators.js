export function unmask(value) {
  return value.replace(/\D/g, '');
}

export function unmaskAll(value) {
  return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

export function formatPhone(value) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export function formatPlate(value) {
  const raw = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 7);
  const letters = raw.replace(/[^A-Z]/g, '');
  const numbers = raw.replace(/[^0-9]/g, '');
  const part1 = letters.slice(0, 3);
  const part2 = numbers.slice(0, 4);
  if (!part1 && !part2) return '';
  if (!part1) return part2;
  if (!part2) return part1;
  return `${part1}-${part2}`;
}

export function formatCPF(value) {
  const digits = unmask(value).slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function formatCNPJ(value) {
  const digits = unmask(value).slice(0, 14);
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

export function formatCPFCNPJ(value) {
  const digits = unmask(value);
  if (digits.length <= 11) return formatCPF(value);
  return formatCNPJ(value);
}

function calcCPFChecksum(digits, factor) {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    sum += parseInt(digits[i]) * factor--;
  }
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

export function isValidCPF(cpf) {
  const digits = unmask(cpf);
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  const dig1 = calcCPFChecksum(digits.slice(0, 9), 10);
  if (dig1 !== parseInt(digits[9])) return false;

  const dig2 = calcCPFChecksum(digits.slice(0, 10), 11);
  if (dig2 !== parseInt(digits[10])) return false;

  return true;
}

function calcCNPJChecksum(digits, multipliers) {
  let sum = 0;
  for (let i = 0; i < multipliers.length; i++) {
    sum += parseInt(digits[i]) * multipliers[i];
  }
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

export function isValidCNPJ(cnpj) {
  const digits = unmask(cnpj);
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;

  const mult1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const dig1 = calcCNPJChecksum(digits.slice(0, 12), mult1);
  if (dig1 !== parseInt(digits[12])) return false;

  const mult2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const dig2 = calcCNPJChecksum(digits.slice(0, 13), mult2);
  if (dig2 !== parseInt(digits[13])) return false;

  return true;
}

export function isValidCPFCNPJ(value) {
  const digits = unmask(value);
  if (digits.length === 11) return isValidCPF(digits);
  if (digits.length === 14) return isValidCNPJ(digits);
  return false;
}

export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const basic = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!basic.test(email)) return false;
  const [local, domain] = email.split('@');
  return local.length <= 64 && domain.length <= 255;
}
