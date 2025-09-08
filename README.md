## Development

### Install and sync

This project uses `uv` for dependency management. To install dev tools:

```bash
uv sync --all-extras --dev
```

### Linting and formatting

- Ruff format (apply formatting):

```bash
uv run ruff format .
```

- Ruff lint (autofix simple issues):

```bash
uv run ruff check --fix .
```

### Type checking

Run Pyright:

```bash
uv run pyright
```

### Pre-commit hooks

Install hooks so checks run on each commit:

```bash
uv run pre-commit install
```

You can run all hooks against the repo with:

```bash
uv run pre-commit run --all-files
```

### CI

GitHub Actions runs Ruff and Pyright on pushes and pull requests to `main`.
