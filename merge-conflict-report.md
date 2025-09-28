# Merge conflict summary

The pull request you are trying to merge rebases `0c91b9e` (current `main`) with `25f145a` (feature branch "redesign-guest-adder-interface-for-smoothness"). Git stops the merge because both branches edit the same blocks of code and it cannot pick the right version automatically.

## Files with overlapping edits

| File | Area | `main` (0c91b9e) | PR branch (25f145a) |
| --- | --- | --- | --- |
| `script.js` | `LoopWheel` class (calendar/dinner time picker) | Keeps the original 5× repetition array and basic snap logic. | Rebuilds the component with dynamic loop sizing, keyboard/pointer accessibility hooks, and new state (`currentIndex`, `currentBaseIndex`, `_snapTimer`, etc.). |
| `style.css` | `.picker-col` / `.picker-item` styles | Uses mandatory snap points with a single highlight mask. | Adds focus styling, proximity snapping, transition effects, and reduced-motion guard. |

Because these edits touch the very same lines (`LoopWheel` constructor and helpers in `script.js`, picker styles in `style.css`), Git marks them as conflicts.

## How to resolve

1. Check out your feature branch locally.
2. Run `git merge main` (or re-run the merge) so Git writes the conflict markers into `script.js` and `style.css`.
3. In **`script.js`** keep the richer logic from the feature branch, but make sure any behaviours that still exist only on `main` (for example, the original snap timing constants) are re-applied if they are still required.
4. In **`style.css`** combine the new accessibility/focus rules from the feature branch with any base styling you still need from `main` (mask opacity, scroll padding, etc.).
5. Delete the conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`), save both files, and then `git add script.js style.css`.
6. Finish the merge with `git commit`.

Once both files are merged manually you will be able to push and let the PR update.
