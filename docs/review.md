# Review Workflow

This document captures the default workflow for handling pull request review
comments in this repo.

The goal is to keep review follow-up simple, direct, and easy to repeat.

## Principles

- Treat review comments as inputs, not automatic requirements.
- Verify the current repo state before acting on any comment.
- Fix only issues that are real, actionable, and worth changing.
- Keep fixes small and tied directly to the review feedback.
- Re-check the diff before committing.

## Standard Flow

### 1. Fetch the current PR review comments

Use `gh` to read the current review threads and inline comments from GitHub.

Typical commands:

```bash
gh pr view <pr-number> --comments --json reviews,comments
```

For inline review threads with resolution state:

```bash
gh api graphql -f query='query{
  repository(owner:"<owner>",name:"<repo>"){
    pullRequest(number:<pr-number>){
      reviewThreads(first:100){
        nodes{
          id
          isResolved
          isOutdated
          comments(first:10){
            nodes{
              path
              body
            }
          }
        }
      }
    }
  }
}'
```

Use the GraphQL form when you need thread IDs for resolving comments later.

### 2. Validate whether each comment is a real issue

Do not assume a review comment is correct.

For each item:

- inspect the referenced file and current branch state
- check whether the issue is already fixed
- decide whether it is:
  - already resolved in code
  - a real issue that should be fixed
  - not worth changing

Use local inspection first:

```bash
git status --short
git diff --no-ext-diff
sed -n '1,220p' <file>
```

When useful, run the smallest relevant build or check to prove the issue.

### 3. Fix only the legitimate issues

If a comment is valid, make the smallest direct fix.

Guidelines:

- avoid adding new layers or frameworks
- prefer local, explicit fixes over reusable abstractions
- do not refactor unrelated code while addressing review feedback
- if multiple comments share one root cause, fix the root cause once

If a comment is already fixed, do not rework the code just to match the wording
of the review.

### 4. Verify the fix

Before committing:

- run the smallest relevant verification
- confirm the new behavior matches the intended fix
- inspect the diff

Examples:

```bash
bun run build
git diff --no-ext-diff -- <changed-files>
```

The verification should be proportional to the change. Do not run broad checks
when a narrow check is enough.

### 5. Commit and push the fix

Once the review fixes are ready:

- stage the intended changes
- commit with a focused message
- push the branch

Typical flow:

```bash
git add <changed-files>
git commit -m "<focused message>"
git push origin <branch>
```

If the user has also made formatting changes and wants them included, confirm
the full worktree and then commit all intended changes together.

### 6. Resolve the fixed review threads

After the fix is pushed, resolve only the threads that are now truly addressed.

First fetch the latest thread state:

```bash
gh api graphql -f query='query{
  repository(owner:"<owner>",name:"<repo>"){
    pullRequest(number:<pr-number>){
      reviewThreads(first:100){
        nodes{
          id
          isResolved
          comments(first:10){
            nodes{
              path
            }
          }
        }
      }
    }
  }
}'
```

Then resolve the specific thread IDs:

```bash
gh api graphql -f query='mutation{
  resolveReviewThread(input:{threadId:"<thread-id>"}){
    thread{
      id
      isResolved
    }
  }
}'
```

After resolving, verify the thread state again instead of assuming the action
worked:

```bash
gh api graphql -f query='query{
  repository(owner:"<owner>",name:"<repo>"){
    pullRequest(number:<pr-number>){
      reviewThreads(first:100){
        nodes{
          id
          isResolved
        }
      }
    }
  }
}'
```

Confirm the target thread now reports `isResolved: true`.

Only resolve threads after the branch contains the actual fix.

### 7. Trigger or wait for re-review

Once fixes are pushed and the addressed threads are resolved:

- ask for another review, or
- wait for CI / automated review to run again

At that point, repeat the same process for any new comments.

## Practical Rules

- Read the current code before accepting review guidance.
- Prefer one small follow-up commit per review pass unless the user asks to
  squash multiple changes together.
- If a comment is stale or already fixed, resolve the thread instead of making a
  redundant code change.
- If a review comment is larger than the repo’s current rigor level, note it and
  keep the implementation proportional.
- Keep the process human-readable: inspect, decide, fix, verify, commit, push,
  resolve, verify thread state.

## Default Review Loop

For future PR follow-up in this repo, the default loop is:

1. Fetch review comments with `gh`.
2. Check whether each issue is real, stale, or already fixed.
3. Implement only the legitimate fixes.
4. Run minimal verification.
5. Commit and push.
6. Resolve the fixed review threads with `gh`.
7. Verify the resolved thread state with `gh`.
8. Re-run review if needed.
