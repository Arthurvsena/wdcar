import re


def _calc_dig(cpf: str, factor: int) -> int:
    if not cpf or len(cpf) < factor - 1:
        return 0
    total = sum(int(cpf[i]) * (factor - i) for i in range(len(cpf)))
    resto = total % 11
    return 0 if resto < 2 else 11 - resto


def is_valid_cpf(value: str) -> bool:
    digits = re.sub(r"\D", "", value)
    if len(digits) != 11 or digits == digits[0] * 11:
        return False
    d1 = _calc_dig(digits[:9], 10)
    if d1 != int(digits[9]):
        return False
    d2 = _calc_dig(digits[:10], 11)
    return d2 == int(digits[10])


def _calc_cnpj_dig(digits: str, mult: list[int]) -> int:
    if not digits or len(digits) < len(mult):
        return 0
    total = sum(int(digits[i]) * mult[i] for i in range(len(mult)))
    resto = total % 11
    return 0 if resto < 2 else 11 - resto


def is_valid_cnpj(value: str) -> bool:
    digits = re.sub(r"\D", "", value)
    if len(digits) != 14 or digits == digits[0] * 14:
        return False
    mult1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    d1 = _calc_cnpj_dig(digits[:12], mult1)
    if d1 != int(digits[12]):
        return False
    mult2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    d2 = _calc_cnpj_dig(digits[:13], mult2)
    return d2 == int(digits[13])


def is_valid_cpf_cnpj(value: str) -> bool:
    digits = re.sub(r"\D", "", value)
    if len(digits) == 11:
        return is_valid_cpf(digits)
    if len(digits) == 14:
        return is_valid_cnpj(digits)
    return False


def is_valid_email(value: str) -> bool:
    return bool(re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", value))
