"""Per-application lazy runtime dependencies, with serialized first loading."""
from importlib import import_module
from threading import Lock
from typing import Any


class Runtime:
    def __init__(self) -> None:
        self.instances: dict[str, Any] = {}
        self._lock = Lock()

    def get(self, name: str) -> Any:
        factories = {
            'classifier': ('infrastructure.ml.classifier', 'ClassifierService'),
            'demand': ('infrastructure.ml.demand', 'DemandService'),
            'skill_matcher': ('infrastructure.ml.skill_matcher', 'SkillMatcherService'),
            'course_finder': ('infrastructure.ml.course_finder', 'CourseFinderService'),
            'llm': ('infrastructure.llm', 'LLMService'),
        }
        with self._lock:
            if name not in self.instances:
                module, class_name = factories[name]
                self.instances[name] = getattr(import_module(module), class_name)()
            return self.instances[name]
