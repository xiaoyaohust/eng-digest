# Quick Testing Guide

## 🚀 Quick Start

### 1. Run All Tests
```bash
pytest
```

### 2. View Detailed Output
```bash
pytest -v
```

### 3. View Code Coverage
```bash
pytest --cov=eng_digest
```

## 📊 Test Results

Current Status: **✅ 48/48 Tests Passing**

```
tests/test_models.py ............ [13 tests]  ✅
tests/test_parser.py ........... [7 tests]   ✅
tests/test_summarizer.py ....... [12 tests]  ✅
tests/test_output.py ........... [16 tests]  ✅

Total: 48 tests, 100% passing
```

## 📈 Code Coverage

| Module | Coverage | Status |
|--------|----------|--------|
| models.py | 100% | ✅ Full coverage |
| parser/ | 100% | ✅ Full coverage |
| output/ | 97-100% | ✅ Nearly full coverage |
| summarizer/ | 83-98% | ✅ Good coverage |

## 🎯 Common Test Commands

### Run Specific Test File
```bash
pytest tests/test_models.py
```

### Run Specific Test Class
```bash
pytest tests/test_models.py::TestArticle
```

### Run Specific Test Method
```bash
pytest tests/test_models.py::TestArticle::test_article_creation
```

### Run Tests Matching Keyword
```bash
pytest -k "article"
```

### Show Print Output
```bash
pytest -s
```

### Stop on First Failure
```bash
pytest -x
```

## 🔍 Debugging Tests

### Enter Debugger (on failure)
```bash
pytest --pdb
```

### Show Detailed Error Info
```bash
pytest -vv
```

### Only Run Last Failed Tests
```bash
pytest --lf
```

## 📝 Test Coverage

### ✅ Data Models (13 tests)
- Article creation and validation
- Summary creation and validation
- BlogSource configuration validation
- Required field checking
- Error handling

### ✅ Article Parsing (7 tests)
- Time filtering
- Quantity limits (per blog and total)
- Date sorting
- Edge case handling

### ✅ Summarization (12 tests)
- First paragraph extraction
- Sentence extraction
- Length limitation
- Keyword extraction (TF-IDF)
- Stop word filtering
- Batch processing

### ✅ Output Rendering (16 tests)
- Markdown format
- Plain text format
- Custom titles
- Metadata display
- Text wrapping
- Empty content handling

## 💡 Testing Best Practices

### Write New Tests
```python
def test_my_feature():
    """Test description in English."""
    # Arrange - prepare test data
    data = create_test_data()

    # Act - execute operation
    result = my_function(data)

    # Assert - verify result
    assert result is not None
    assert len(result) > 0
```

### Use Test Fixtures
```python
def test_with_fixture(sample_article):
    """Use pytest fixture for test data."""
    result = process(sample_article)
    assert result.title == sample_article.title
```

### Test Exceptions
```python
def test_error_handling():
    """Test that errors are raised correctly."""
    with pytest.raises(ValueError):
        invalid_operation()
```

## 🎨 Generate HTML Reports

### Coverage Report
```bash
pytest --cov=eng_digest --cov-report=html
open htmlcov/index.html
```

## 🔧 CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run tests
  run: pytest --cov=eng_digest --cov-report=xml
```

## ❓ Common Questions

**Q: How to skip certain tests?**
```python
@pytest.mark.skip(reason="Not implemented yet")
def test_future_feature():
    pass
```

**Q: How to mark network-dependent tests?**
```python
@pytest.mark.network
def test_fetch_feed():
    pass

# Skip network tests
pytest -m "not network"
```

**Q: Tests running too slow?**
```bash
# Run in parallel
pip install pytest-xdist
pytest -n auto
```

## 📚 More Information

See [TESTING.md](TESTING.md) for complete testing documentation.

---

**Remember**: Run tests after every code change! 🧪
