"""Operational logging without profile data, credentials or provider exception text."""
import logging


def log_failure(operation: str, error: Exception) -> None:
    logging.getLogger('careerflow').warning('%s failed (%s)', operation, type(error).__name__)
