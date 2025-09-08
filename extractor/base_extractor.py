from __future__ import annotations

from abc import ABC, abstractmethod
import logging
import time
from typing import Generic, TypeVar

T = TypeVar("T")
R = TypeVar("R")
logger = logging.getLogger(__name__)


class BaseExtractor(ABC, Generic[T, R]):
    @abstractmethod
    def _process(self, element: T) -> R: ...

    def process(
        self,
        element: T,
    ) -> R:
        start = time.perf_counter()
        try:
            result = self._process(element)
            logger.info(
                "processed_element",
                extra={"result": repr(result), "elapsed_s": time.perf_counter() - start},
            )
            return result
        except Exception:
            logger.exception("extractor_failed", extra={"element": repr(element)})
            # re-raise the exception to be handled by the caller
            raise

    # def process_many(
    #     self,
    #     elements: Iterable[T],
    #     *,
    #     stop_on_error: bool = False,
    #     retries: int = 0,
    #     timeout_s: float | None = None
    # ) -> Tuple[List[R], List[Tuple[T, Exception]]]:
    #     results: List[R] = []
    #     failures: List[Tuple[T, Exception]] = []
    #     for el in elements:
    #         try:
    #             results.append(self.process(el, retries=retries, timeout_s=timeout_s))
    #         except Exception as e:
    #             failures.append((el, e))
    #             if stop_on_error:
    #                 break
    #     return results, failures
