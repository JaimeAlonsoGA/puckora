"""Stub test for Amazon scraper."""
import pytest


def test_parse_price_basic():
    from app.utils.parsers import parse_price
    assert parse_price("$29.99") == 29.99
    assert parse_price("29.99") == 29.99
    assert parse_price(None) is None
    assert parse_price("") is None


def test_parse_int_basic():
    from app.utils.parsers import parse_int
    assert parse_int("1,234 ratings") == 1234
    assert parse_int(None) is None
