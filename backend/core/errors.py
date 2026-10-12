"""Transport-independent failures with existing public error envelopes."""


class ServiceError(Exception):
    def __init__(self, status_code: int, detail: str | dict[str, str]) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail
