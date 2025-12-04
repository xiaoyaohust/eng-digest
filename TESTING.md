# Testing Guide

Complete guide for testing the Eng Digest application.

## Setup Testing Environment

### Install Test Dependencies

```bash
# Install development dependencies (including pytest)
pip install -e ".[dev]"

# Or install test tools separately
pip install pytest pytest-cov
```

## Running Tests

### Run All Tests

```bash
# Basic run
pytest

# Verbose output
pytest -v

# Show test coverage
pytest --cov=eng_digest

# Detailed coverage report
pytest --cov=eng_digest --cov-report=html
```

### Run Specific Tests

```bash
# Run specific test file
pytest tests/test_models.py

# Run specific test class
pytest tests/test_models.py::TestArticle

# Run specific test method
pytest tests/test_models.py::TestArticle::test_article_creation

# Run tests matching pattern
pytest -k "article"
```

### Test Options

```bash
# Show verbose output
pytest -v

# Show print statements
pytest -s

# Stop on first failure
pytest -x

# Show local variables
pytest -l

# Re-run failed tests
pytest --lf
```

## Test Structure

### Test File Organization

```
tests/
├── __init__.py              # Test package initialization
├── conftest.py              # Pytest fixtures
├── test_models.py           # Data model tests
├── test_parser.py           # Parser tests
├── test_summarizer.py       # Summarizer tests
└── test_output.py           # Output renderer tests
```

### Test Coverage

Current test coverage: **48 test cases**

#### 1. Data Model Tests (test_models.py)
- ✅ Article model creation and validation
- ✅ Summary model creation and validation
- ✅ BlogSource model creation and validation
- ✅ Required field validation
- ✅ Optional field handling

#### 2. Parser Tests (test_parser.py)
- ✅ Filter articles by time
- ✅ Limit articles per blog source
- ✅ Limit total articles
- ✅ Handle empty lists
- ✅ Handle all articles too old
- ✅ Sort by date

#### 3. Summarizer Tests (test_summarizer.py)
- ✅ First paragraph extraction
- ✅ First N sentences extraction
- ✅ Length limitation
- ✅ Empty content handling
- ✅ Keyword extraction
- ✅ Batch summarization
- ✅ TF-IDF keyword extraction
- ✅ Stop words filtering

#### 4. Output Renderer Tests (test_output.py)
- ✅ Markdown format rendering
- ✅ Plain text format rendering
- ✅ Custom titles
- ✅ Empty summary handling
- ✅ Grouping by source
- ✅ Metadata inclusion
- ✅ Keyword display
- ✅ Publication date display
- ✅ Text wrapping

## Test Fixtures

Tests use pytest fixtures to provide test data:

```python
# Fixtures defined in conftest.py

sample_blog_source()    # Sample blog source
sample_article()        # Single sample article
sample_articles()       # Multiple sample articles
sample_summary()        # Single sample summary
sample_summaries()      # Multiple sample summaries
```

### Usage Example

```python
def test_my_function(sample_article):
    """Test using a fixture."""
    result = my_function(sample_article)
    assert result is not None
```

## Writing New Tests

### Test Naming Conventions

- Test files: `test_*.py`
- Test classes: `Test*`
- Test methods: `test_*`

### Example Test

```python
"""
Unit tests for my new feature.
"""

import pytest
from eng_digest.my_module import MyClass


class TestMyClass:
    """Test MyClass functionality."""

    def test_basic_functionality(self):
        """Test basic feature works."""
        obj = MyClass()
        result = obj.do_something()

        assert result is not None
        assert len(result) > 0

    def test_error_handling(self):
        """Test error handling."""
        obj = MyClass()

        with pytest.raises(ValueError):
            obj.invalid_operation()

    def test_with_fixture(self, sample_article):
        """Test using a fixture."""
        obj = MyClass()
        result = obj.process(sample_article)

        assert result.title == sample_article.title
```

## Continuous Integration

### GitHub Actions

Configure automated testing in `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.9'

      - name: Install dependencies
        run: |
          pip install -e ".[dev]"

      - name: Run tests
        run: |
          pytest --cov=eng_digest --cov-report=xml

      - name: Upload coverage
        uses: codecov/codecov-action@v2
```

## Testing Best Practices

### 1. Test Isolation
Each test should be independent and not rely on other tests.

```python
# ✅ Good practice
def test_feature_a():
    data = create_test_data()
    result = feature_a(data)
    assert result == expected

# ❌ Bad practice
shared_data = None

def test_feature_a():
    global shared_data
    shared_data = feature_a()

def test_feature_b():
    # Depends on test_feature_a result
    result = feature_b(shared_data)
```

### 2. Use Fixtures
Use fixtures to create reusable test data.

```python
@pytest.fixture
def database_connection():
    """Create a test database connection."""
    conn = create_connection()
    yield conn
    conn.close()
```

### 3. Test Edge Cases
Ensure you test boundary conditions and exceptions.

```python
def test_empty_input():
    """Test with empty input."""
    result = process([])
    assert result == []

def test_invalid_input():
    """Test with invalid input."""
    with pytest.raises(ValueError):
        process(None)
```

### 4. Clear Assertions
Use clear assertion messages.

```python
# ✅ Good practice
assert len(result) == 3, f"Expected 3 items, got {len(result)}"

# ❌ Less clear
assert len(result) == 3
```

## Code Coverage

### View Coverage

```bash
# Generate HTML coverage report
pytest --cov=eng_digest --cov-report=html

# Open in browser
open htmlcov/index.html
```

### Current Coverage

- **models.py**: 100%
- **parser/**: 100%
- **output/**: 97-100%
- **summarizer/**: 83-98%

Uncovered code is mainly in CLI and config loading modules, which require integration tests.

## Debugging Tests

### Using pytest Debugger

```bash
# Enter debugger on failure
pytest --pdb

# Enter debugger at start
pytest --trace
```

### Print Debug Information

```bash
# Show print statements
pytest -s

# Show more verbose output
pytest -vv
```

## Performance Testing

### Benchmarking

Use pytest-benchmark for performance testing:

```bash
pip install pytest-benchmark
```

```python
def test_performance(benchmark):
    """Benchmark summarization performance."""
    result = benchmark(summarizer.summarize, large_article)
    assert result is not None
```

## Common Issues

### Q: Tests running slowly?
A: Use pytest-xdist for parallel execution:
```bash
pip install pytest-xdist
pytest -n auto
```

### Q: How to skip certain tests?
A: Use skip decorator:
```python
@pytest.mark.skip(reason="Not implemented yet")
def test_future_feature():
    pass
```

### Q: How to test code requiring network?
A: Use mocking or mark as network-dependent:
```python
@pytest.mark.network
def test_fetch_feed():
    # Test requiring network connection
    pass

# Skip network tests
pytest -m "not network"
```

## Summary

- ✅ **48 unit tests** all passing
- ✅ Core module coverage **80%+**
- ✅ Using pytest fixtures for test data
- ✅ Coverage reporting support
- ✅ Following best practices

Run tests regularly to ensure code quality!
