# Contributing to KasGate

Contributions are welcome. Here is how to get involved.

## Setup

```bash
git clone https://github.com/dmustapha/kasgate.git
cd kasgate
bun install
cp .env.example .env
bun run dev
```

Tests:

```bash
bun test
```

## What is useful

Bug fixes, chain adapters, API improvements, and documentation are all good contributions. If you want to add support for a new blockchain, the relevant files are in `src/kaspa/` — you would need to implement address derivation, transaction monitoring, and confirmation tracking for the new chain.

If it is a significant change, open an issue first to discuss the approach before writing code.

## Pull requests

1. Fork the repo and branch off `main`
2. Keep commits focused. One thing per commit.
3. Make sure tests pass: `bun test`
4. Run the typecheck: `bun run typecheck`
5. Open the PR with a clear description of what changed and the reason for it

## Code standards

TypeScript strict mode throughout. No `any`. Functions should stay short and do one thing. Names should be descriptive enough that a comment is not needed.

## Contact

damilolamustaphaa@gmail.com
