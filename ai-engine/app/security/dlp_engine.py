"""
CortexOps Data Loss Prevention (DLP) Engine

Detects and masks sensitive data.

PII Types Detected:
- Email addresses
- Phone numbers
- SSN
- Credit card numbers
- API keys
- IP addresses
- JWT tokens
"""

import re
from dataclasses import dataclass
from enum import Enum
from typing import Any


class DataClassification(str, Enum):
    """Data classification levels."""
    PUBLIC = "public"
    INTERNAL = "internal"
    CONFIDENTIAL = "confidential"
    RESTRICTED = "restricted"


@dataclass
class DLPScanResult:
    """Result of DLP scanning."""
    detected_types: list[str]
    matches: dict[str, list[str]]
    total_findings: int
    classification: DataClassification


class DLPEngine:
    """
    Data Loss Prevention engine for detecting and masking sensitive data.
    
    Features:
    - Pattern-based detection
    - Automatic masking
    - Data classification
    - Policy enforcement
    """
    
    # ═══════════════════════════════════════════════════════════
    # PII Patterns - Regex patterns for sensitive data
    # ═══════════════════════════════════════════════════════════
    PII_PATTERNS = {
        'email': r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',
        'phone': r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}',
        'ssn': r'\b\d{3}-\d{2}-\d{4}\b',
        'credit_card': r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b',
        'ip_address': r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b',
        'api_key': r'(?i)(api[_-]?key|secret|token|password)\s*[=:]\s*["\']?[\w\-]{16,}["\']?',
        'aws_key': r'AKIA[0-9A-Z]{16}',
        'jwt': r'eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*',
        'credit_card_amex': r'\b\d{4}[-\s]?\d{6}[-\s]?\d{5}\b',
        'iban': r'[A-Z]{2}\d{2}[A-Z0-9]{11,30}',
        'passport': r'[A-Z]{1,2}\d{6,9}',
        'drivers_license': r'[A-Z]{1,2}\d{6,12}',
    }
    
    def scan(self, text: str) -> DLPScanResult:
        """
        Scan text for sensitive data patterns.
        
        Args:
            text: Text to scan
            
        Returns:
            DLPScanResult with detected types and matches
        """
        matches: dict[str, list[str]] = {}
        detected_types: list[str] = []
        
        for pii_type, pattern in self.PII_PATTERNS.items():
            found = re.findall(pattern, text)
            if found:
                matches[pii_type] = found
                detected_types.append(pii_type)
        
        classification = self.classify(text)
        
        return DLPScanResult(
            detected_types=detected_types,
            matches=matches,
            total_findings=sum(len(m) for m in matches.values()),
            classification=classification,
        )
    
    def mask(self, text: str, mask_char: str = '*') -> str:
        """
        Mask sensitive data in text.
        
        Args:
            text: Text to mask
            mask_char: Character to use for masking
            
        Returns:
            Text with sensitive data masked
        """
        masked = text
        
        # Mask emails: user@email.com → u***@e***.com
        masked = re.sub(
            self.PII_PATTERNS['email'],
            lambda m: f"{m.group(0)[0]}{mask_char*3}@{mask_char*3}.{m.group(0).split('.')[-1]}",
            masked
        )
        
        # Mask phone numbers: keep last 4 digits
        masked = re.sub(
            self.PII_PATTERNS['phone'],
            lambda m: re.sub(r'\d', mask_char, m.group(0)[:-4]) + m.group(0)[-4:],
            masked
        )
        
        # Mask SSN: XXX-XX-1234
        masked = re.sub(
            self.PII_PATTERNS['ssn'],
            f'{mask_char*3}-{mask_char*2}-{mask_char*4}',
            masked
        )
        
        # Mask credit cards: ****-****-****-1234
        masked = re.sub(
            self.PII_PATTERNS['credit_card'],
            lambda m: f"{mask_char*4}-{mask_char*4}-{mask_char*4}-{m.group(0).replace('-','').replace(' ','')[-4:]}",
            masked
        )
        
        # Mask API keys: keep first 4 and last 4 chars
        masked = re.sub(
            self.PII_PATTERNS['api_key'],
            lambda m: f"{m.group(0)[:4]}{mask_char*8}{m.group(0)[-4:]}",
            masked
        )
        
        # Mask IP addresses
        masked = re.sub(
            self.PII_PATTERNS['ip_address'],
            f'{mask_char*3}.{mask_char*3}.{mask_char*3}.{mask_char*3}',
            masked
        )
        
        # Mask JWT tokens
        masked = re.sub(
            self.PII_PATTERNS['jwt'],
            f'{mask_char*20}...{mask_char*20}',
            masked
        )
        
        return masked
    
    def classify(self, text: str) -> DataClassification:
        """
        Classify data sensitivity level.
        
        Args:
            text: Text to classify
            
        Returns:
            DataClassification enum value
        """
        result = self.scan(text)
        
        # Restricted: SSN, credit cards, passwords
        restricted_types = {'ssn', 'credit_card', 'credit_card_amex', 'aws_key'}
        if any(t in result.detected_types for t in restricted_types):
            return DataClassification.RESTRICTED
        
        # Confidential: emails, phones, API keys
        confidential_types = {'email', 'phone', 'api_key', 'jwt', 'iban'}
        if any(t in result.detected_types for t in confidential_types):
            return DataClassification.CONFIDENTIAL
        
        # Internal: IP addresses, passport
        internal_types = {'ip_address', 'passport', 'drivers_license'}
        if any(t in result.detected_types for t in internal_types):
            return DataClassification.INTERNAL
        
        return DataClassification.PUBLIC
    
    def enforce_policy(
        self,
        data: dict[str, Any],
        destination: str,
        policies: dict[str, Any] | None = None,
    ) -> bool:
        """
        Check if data can be transmitted to destination based on DLP policies.
        
        Args:
            data: Data to check (with 'data' and 'classification' keys)
            destination: Destination type ('external', 'internal', 'database', 'log')
            policies: Custom policies (optional)
            
        Returns:
            True if transmission is allowed, False otherwise
        """
        classification = data.get('classification', DataClassification.PUBLIC)
        
        # Default policies
        default_policies = {
            'external': [DataClassification.PUBLIC],
            'internal': [DataClassification.PUBLIC, DataClassification.INTERNAL],
            'database': [DataClassification.PUBLIC, DataClassification.INTERNAL, DataClassification.CONFIDENTIAL],
            'log': [DataClassification.PUBLIC, DataClassification.INTERNAL],
        }
        
        policies = policies or default_policies
        allowed = policies.get(destination, [DataClassification.PUBLIC])
        
        if isinstance(classification, str):
            classification = DataClassification(classification)
        
        return classification in allowed
    
    def get_masking_rules(self) -> dict[str, str]:
        """Get all masking rules for documentation."""
        return {
            'email': 'u***@e***.com - first char and domain visible',
            'phone': '***-***-1234 - last 4 digits visible',
            'ssn': '***-**-**** - fully masked',
            'credit_card': '****-****-****-1234 - last 4 digits visible',
            'api_key': 'sk-************xxxx - first 4 and last 4 visible',
            'ip_address': '***.***.***.*** - fully masked',
            'jwt': '****...**** - fully masked',
        }
