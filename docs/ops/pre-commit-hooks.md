# Pre-commit Hooks

This repository uses [Husky 9](https://typicode.github.io/husky/) to run two hooks automatically before every `git commit`.

**`pre-commit`** runs `gitleaks protect --staged` to scan staged files for secrets (API keys, tokens, credentials), then runs `lint-staged` to apply `eslint --fix` to any staged TypeScript/JavaScript files. This ensures that no secret ever reaches the repository history and that every committed file passes the project's linting rules. Gitleaks must be installed locally on your machine; see [gitleaks installation](https://github.com/gitleaks/gitleaks#installing) for instructions.

**`commit-msg`** validates that your commit message follows [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) format: `<type>[optional scope]: <description>`. Accepted types are `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, and `revert`. This keeps the git log machine-readable for automated changelogs and release tooling.

## Installing the hooks

Hooks are installed automatically when you run `bun install` at the repository root (the `"prepare": "husky"` script handles this). If you clone the repo and find the hooks are not active, run `bun install` once.

## Diagnosing a failed hook

If a commit is rejected, read the error output carefully — it will name the rule (e.g., the gitleaks rule ID and the file/line with the match, or the eslint rule and file path). Fix the flagged issue in your editor, `git add` the corrected file(s), and then retry `git commit`. For a commit-message rejection, simply rewrite your message to match the Conventional Commits pattern shown in the error.

## Note on Prettier

Automated formatting with Prettier is deferred to a future slice to avoid style-churn during early development. When Prettier is adopted, a `prettier --write` step will be added to the `lint-staged` configuration in `package.json`.
