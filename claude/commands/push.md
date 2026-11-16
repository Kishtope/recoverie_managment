---
description: Stage all changes, commit and push to main (no new branch)
argument-hint: [optional commit message]
allowed-tools: Bash(git status:*), Bash(git branch:*), Bash(git add:*), Bash(git commit:*), Bash(git push:*), Bash(git diff:*), Bash(git log:*)
---

Push the latest code to `main`. Never create or switch branches.

1. Run `git branch --show-current`. If it is not `main`, stop and tell me the current branch. Do not switch or create anything.
2. Run `git status --short`. If there is nothing to commit, say so and stop.
3. Run `git add -A`, then `git diff --cached --stat` to see what is staged.
4. Commit with the message `$ARGUMENTS`. If it is empty, write a short imperative message from the staged diff. End the message with the attribution line from the system reminder.
5. Run `git push origin main`. Do not use `--force`. If the push is rejected, report why and stop.
6. Reply with the commit hash and the push result, in one or two lines.
