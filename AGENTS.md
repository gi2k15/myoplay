# Project Rules

## General

- Follow the existing code style and patterns.
- Use pnpm for running project commands.
- Keep code in TypeScript unless migration is required.

## Stack

- Framework: Vue 3 + Vite
- UI Library: Vuetify
- Enabled Features: Base setup

## Planning Workflow

- **Completion Commit**: Upon finishing the execution of all tasks in a plan and before presenting the walkthrough, the agent MUST create an automatic commit with all consolidated changes (e.g., `git add .` followed by `git commit -m "feat/fix: <english summary of what was done>"`). The commit message/description must be written in English and clearly summarize what was implemented in the plan.
  - Also increment automatically the version in `package.json` in the format 0.X.Y where **X** is incremented when a 'feat' commit is done and **Y** is incremented when any other commit is done.
