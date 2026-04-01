import json
from typing import Any, Dict, Optional


class MemoryAgent:
    def __init__(self, storage_path: Optional[str] = None):
        self.storage_path = storage_path
        self._memory: Dict[str, Any] = {}
        if storage_path:
            try:
                with open(storage_path, "r") as f:
                    self._memory = json.load(f)
            except Exception:
                self._memory = {}

    def remember(self, key: str, value: Any) -> None:
        self._memory[key] = value
        self._persist()

    def recall(self, key: str, default: Any = None) -> Any:
        return self._memory.get(key, default)

    def _persist(self) -> None:
        if not self.storage_path:
            return
        with open(self.storage_path, "w") as f:
            json.dump(self._memory, f, indent=2)
