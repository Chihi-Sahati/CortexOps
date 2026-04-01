from typing import Dict, Any
from .memory_agent import MemoryAgent
from .orchestrator_agent import OrchestratorAgent
from .learning_agent import LearningAgent
from .prompt_utils import plan_prompt


class SelfHealRunner:
    def __init__(
        self,
        memory: MemoryAgent | None = None,
        orchestrator: OrchestratorAgent | None = None,
        learner: LearningAgent | None = None,
    ):
        self.memory = memory or MemoryAgent()
        self.orchestrator = orchestrator or OrchestratorAgent(self.memory)
        self.learner = learner or LearningAgent()

    def run(self, error: Dict[str, Any], context: Dict[str, Any] | None = None) -> Dict[str, Any]:
        # Plan phase
        plan = self.orchestrator.plan(error, context)
        # Execute phase (simplified)
        executed = self.orchestrator.execute_plan(plan)
        # Validate phase (simplified)
        result = {"plan": plan, "executed": executed, "status": "completed"}
        # Memory update
        self.memory.remember(f"heal:{error.get('id', 'unknown')}:last_plan", plan)
        # Learning update (if available in plan)
        self.learner.learn_from(plan, {"result": "executed"})
        return result
