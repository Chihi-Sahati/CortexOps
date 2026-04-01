"""
CortexOps Prompt Guard

Detects and mitigates prompt injection attacks.

Threat Model:
- Direct injection: User input contains malicious instructions
- Indirect injection: Malicious content from external sources
- Jailbreak attempts: Attempts to bypass safety guardrails
"""

import re
from dataclasses import dataclass
from typing import Any


@dataclass
class InjectionResult:
    """Result of injection detection."""
    detected: bool
    patterns: list[str]
    confidence: float
    location: str | None = None


class PromptGuard:
    """
    Protects against prompt injection attacks.
    
    Strategies:
    1. Pattern detection - Known attack patterns
    2. Instruction boundary - Clear separation of instructions
    3. Output validation - Ensure no instruction leakage
    """
    
    # ═══════════════════════════════════════════════════════════
    # Injection Patterns - Known attack patterns
    # ═══════════════════════════════════════════════════════════
    INJECTION_PATTERNS = [
        # Direct instruction override
        (r'ignore\s+(previous|above|all|prior)\s+(instructions?|rules?|prompts?)', 'instruction_override'),
        (r'forget\s+(everything|all|your|previous)', 'forget_instruction'),
        (r'disregard\s+(all|previous|your|the)', 'disregard_instruction'),
        (r'override\s+(all|previous|your|the)', 'override_instruction'),
        
        # Role manipulation
        (r'you\s+are\s+now\s+', 'role_change'),
        (r'act\s+as\s+(if|a|an|though)\s+', 'act_as'),
        (r'pretend\s+(you|to\s+be)\s+', 'pretend'),
        (r'role[\s-]?play\s+as', 'roleplay'),
        
        # System prompt injection
        (r'system\s*:\s*', 'system_injection'),
        (r'<<<\s*system\s*>>>', 'system_marker'),
        (r'\[system\]', 'system_bracket'),
        (r'###\s*system', 'system_hash'),
        
        # Jailbreak attempts
        (r'jailbreak', 'jailbreak'),
        (r'DAN(\s+mode)?', 'dan_mode'),
        (r'developer\s+mode', 'dev_mode'),
        (r'god\s+mode', 'god_mode'),
        (r'unlock\s+(your|the)\s+', 'unlock'),
        
        # Instruction leakage
        (r'show\s+me\s+your\s+(instructions?|prompt)', 'instruction_leak'),
        (r'repeat\s+(your|the)\s+(words?|instructions?|prompt)', 'repeat_instruction'),
        (r'what\s+are\s+your\s+instructions?', 'instruction_query'),
        
        # Bypass attempts
        (r'bypass\s+(all|any|security|filters?)', 'bypass'),
        (r'no\s+(restrictions?|limits?|rules?)', 'no_restrictions'),
        (r'anything\s+goes', 'anything_goes'),
        
        # Hidden instruction patterns
        (r'\[\[.*\]\]', 'hidden_bracket'),
        (r'<<.*>>', 'hidden_angle'),
        (r'<!--.*-->', 'hidden_comment'),
    ]
    
    # Instruction boundaries
    BOUNDARY_START = "<<<USER_INPUT>>>"
    BOUNDARY_END = "<<<END_USER_INPUT>>>"
    SYSTEM_START = "<<<SYSTEM_INSTRUCTIONS>>>"
    SYSTEM_END = "<<<END_SYSTEM>>>"
    
    def check_injection(self, text: str) -> InjectionResult:
        """
        Check text for injection attempts.
        
        Args:
            text: Text to check
            
        Returns:
            InjectionResult with detection status and matched patterns
        """
        detected_patterns = []
        
        for pattern, pattern_type in self.INJECTION_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                detected_patterns.append(pattern_type)
        
        confidence = min(1.0, len(detected_patterns) * 0.3)
        
        return InjectionResult(
            detected=len(detected_patterns) > 0,
            patterns=detected_patterns,
            confidence=confidence,
            location=self._find_location(text, detected_patterns),
        )
    
    def sanitize(self, text: str) -> str:
        """
        Sanitize text by removing or neutralizing injection attempts.
        
        Args:
            text: Text to sanitize
            
        Returns:
            Sanitized text
        """
        sanitized = text
        
        # Replace detected patterns with [REDACTED]
        for pattern, _ in self.INJECTION_PATTERNS:
            sanitized = re.sub(pattern, '[REDACTED]', sanitized, flags=re.IGNORECASE)
        
        # Escape potential delimiters
        sanitized = sanitized.replace('<<<', '[').replace('>>>', ']')
        sanitized = sanitized.replace('[[', '[').replace(']]', ']')
        
        return sanitized
    
    def add_instruction_boundary(self, prompt: str, user_input: str) -> str:
        """
        Add clear boundaries between system instructions and user input.
        
        This helps prevent instruction leakage and makes it clear
        to the LLM where different types of content begin and end.
        
        Args:
            prompt: System prompt/instructions
            user_input: User-provided input
            
        Returns:
            Formatted prompt with boundaries
        """
        return f"""{self.SYSTEM_START}
{prompt}
{self.SYSTEM_END}

{self.BOUNDARY_START}
{user_input}
{self.BOUNDARY_END}"""
    
    def validate_output(self, output: str, system_prompt: str | None = None) -> dict[str, Any]:
        """
        Validate that output doesn't contain leaked instructions.
        
        Args:
            output: Model output to validate
            system_prompt: Original system prompt to check for leakage
            
        Returns:
            Dictionary with validation results
        """
        issues = []
        
        # Check for system prompt leakage
        if system_prompt:
            # Look for substantial portions of system prompt in output
            system_words = set(system_prompt.lower().split())
            output_words = set(output.lower().split())
            overlap = system_words & output_words
            
            if len(overlap) > len(system_words) * 0.5:
                issues.append("Potential system prompt leakage detected")
        
        # Check for boundary markers in output
        if self.BOUNDARY_START in output or self.BOUNDARY_END in output:
            issues.append("Boundary markers found in output")
        
        if self.SYSTEM_START in output or self.SYSTEM_END in output:
            issues.append("System markers found in output")
        
        return {
            "valid": len(issues) == 0,
            "issues": issues,
            "safe_output": self._clean_output(output),
        }
    
    def _find_location(self, text: str, patterns: list[str]) -> str | None:
        """Find the location of injection in text."""
        if not patterns:
            return None
        
        # Return first 50 chars around first match
        for pattern, _ in self.INJECTION_PATTERNS:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                start = max(0, match.start() - 20)
                end = min(len(text), match.end() + 30)
                return text[start:end]
        
        return None
    
    def _clean_output(self, output: str) -> str:
        """Remove boundary markers from output."""
        cleaned = output
        for marker in [self.BOUNDARY_START, self.BOUNDARY_END, 
                       self.SYSTEM_START, self.SYSTEM_END]:
            cleaned = cleaned.replace(marker, '')
        return cleaned.strip()
