"""
Shared text parsing utilities.
"""
import re


def parse_price(text: str | None) -> float | None:
    if not text:
        return None
    digits = re.sub(r"[^\d.]", "", text)
    try:
        return float(digits)
    except ValueError:
        return None


def parse_float(text: str | None) -> float | None:
    if not text:
        return None
    try:
        return float(text.replace(",", "."))
    except ValueError:
        return None


def parse_int(text: str | None) -> int | None:
    if not text:
        return None
    digits = re.sub(r"[^\d]", "", text)
    return int(digits) if digits else None
