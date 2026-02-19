#!/usr/bin/env python3
"""
Simple test to verify status normalization logic.
Tests the normalization function without requiring database setup.
"""

def normalize_status(status):
    """
    Normalize status field to ensure proper counting.
    MongoDB backups may have variations of "concluído":
    - "Concluído" (correct format)
    - "concluído" (lowercase)
    - "Concluido" (no accent)
    - "concluido" (lowercase, no accent)
    
    All should be normalized to "Concluído" (capital C, with accent).
    """
    if status and isinstance(status, str):
        status_lower = status.lower().strip()
        if status_lower in {'concluído', 'concluido'}:
            return 'Concluído'
    return status

def test_status_normalization():
    """Test that all variations of 'concluído' are normalized correctly"""
    print("=" * 60)
    print("Test: Status Normalization Logic")
    print("=" * 60)
    
    test_cases = [
        ('Concluído', 'Concluído', 'Already correct'),
        ('concluído', 'Concluído', 'Lowercase with accent'),
        ('Concluido', 'Concluído', 'Uppercase without accent'),
        ('concluido', 'Concluído', 'Lowercase without accent'),
        ('  concluído  ', 'Concluído', 'With whitespace'),
        ('Pendente', 'Pendente', 'Different status - should not change'),
        ('Em andamento', 'Em andamento', 'Different status - should not change'),
        ('Exigência', 'Exigência', 'Different status - should not change'),
        ('', '', 'Empty string'),
        (None, None, 'None value'),
    ]
    
    all_passed = True
    
    print("\nTesting normalization logic...")
    for input_val, expected, description in test_cases:
        result = normalize_status(input_val)
        passed = result == expected
        status_icon = "✅" if passed else "❌"
        
        print(f"{status_icon} {description}")
        print(f"   Input: '{input_val}' -> Output: '{result}' (Expected: '{expected}')")
        
        if not passed:
            all_passed = False
    
    print("\n" + "=" * 60)
    if all_passed:
        print("ALL TESTS PASSED! ✓")
        print("=" * 60)
        print("\nStatus normalization logic is correct!")
        print("All variations of 'concluído' are normalized to 'Concluído'")
        print("Other statuses are preserved unchanged.")
    else:
        print("TESTS FAILED! ✗")
        print("=" * 60)
    
    return all_passed

if __name__ == "__main__":
    import sys
    success = test_status_normalization()
    sys.exit(0 if success else 1)
