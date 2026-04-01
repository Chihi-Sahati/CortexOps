"""
CortexOps Validator Agent

Validates execution results against expected outcomes.
"""

import time
from typing import Any

from app.metrics.collector import agent_invocations, agent_latency


class ValidatorAgent:
    """
    Agent responsible for validating execution results.
    
    Checks:
    1. Does the result match expectations?
    2. Is the data format correct?
    3. Are there any security concerns?
    4. Is the data complete?
    """
    
    SYSTEM_PROMPT = """You are the Validator Agent for CortexOps.

Your role is to validate execution results against expected outcomes.

VALIDATION CHECKS:
1. Schema validation: Does output match expected structure?
2. Value validation: Are values within expected ranges?
3. Completeness: Is all required data present?
4. Security: Are there any security issues in the output?
5. Format: Is the data in the correct format?

OUTPUT FORMAT (JSON):
{
    "valid": true|false,
    "confidence": 0.0-1.0,
    "issues": ["list of issues found"],
    "suggestion": "How to fix if invalid"
}"""

    async def validate(
        self,
        expected: dict[str, Any],
        actual: dict[str, Any],
        step: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Validate an execution result.
        
        Args:
            expected: Expected outcome
            actual: Actual result
            step: The step being validated
            
        Returns:
            Dictionary with valid, confidence, issues, suggestion
        """
        start_time = time.time()
        
        issues = []
        confidence = 1.0
        
        # Check if actual result exists
        if not actual:
            issues.append("No result returned from execution")
            confidence = 0.0
        
        # Check for error in result
        if actual.get("error"):
            issues.append(f"Execution error: {actual.get('error')}")
            confidence *= 0.5
        
        # Check expected keys
        if expected:
            for key in expected.keys():
                if key not in actual:
                    issues.append(f"Missing expected key: {key}")
                    confidence *= 0.8
        
        # Check status code for API responses
        if "status_code" in actual:
            status = actual["status_code"]
            if status >= 400:
                issues.append(f"API returned error status: {status}")
                confidence *= 0.5
        
        # Check for security issues
        security_issues = self._check_security_issues(actual)
        if security_issues:
            issues.extend(security_issues)
            confidence *= 0.7
        
        # Determine validity
        valid = len(issues) == 0
        confidence = max(0.0, min(1.0, confidence))
        
        # Generate suggestion if invalid
        suggestion = None
        if not valid:
            suggestion = self._generate_suggestion(issues, step)
        
        # Record metrics
        latency = time.time() - start_time
        agent_invocations.labels(agent_type="validator", status="success" if valid else "failure").inc()
        agent_latency.labels(agent_type="validator").observe(latency)
        
        return {
            "valid": valid,
            "confidence": confidence,
            "issues": issues,
            "suggestion": suggestion,
        }
    
    def _check_security_issues(self, result: dict[str, Any]) -> list[str]:
        """Check for security issues in the result."""
        issues = []
        
        # Convert to string for pattern matching
        result_str = str(result).lower()
        
        # Check for sensitive data patterns
        sensitive_patterns = [
            ("password", "Potential password exposure"),
            ("secret", "Potential secret exposure"),
            ("api_key", "Potential API key exposure"),
            ("token", "Potential token exposure"),
        ]
        
        for pattern, message in sensitive_patterns:
            if pattern in result_str:
                # Only flag if it looks like a value, not a key name
                if f'"{pattern}"' not in result_str and f"'{pattern}'" not in result_str:
                    issues.append(message)
        
        return issues
    
    def _generate_suggestion(self, issues: list[str], step: dict[str, Any]) -> str:
        """Generate a suggestion for fixing the issues."""
        if not issues:
            return ""
        
        step_type = step.get("type", "unknown")
        
        if "Execution error" in issues[0]:
            return "Try an alternative strategy (self_heal or code_gen)"
        elif "Missing expected key" in issues[0]:
            return "Check the API response schema and update the expected keys"
        elif "API returned error status" in issues[0]:
            return "Check API credentials and endpoint URL, or try self_healing"
        elif "security" in issues[0].lower():
            return "Review and sanitize output before proceeding"
        else:
            return "Review the step configuration and retry with alternative approach"
