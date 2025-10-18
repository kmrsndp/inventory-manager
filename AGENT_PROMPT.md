# AGENT TASK: Add Excel Parsing Logic (branch: feat/excel-parsing-logic)

## Goal
Create a new branch `feat/excel-parsing-logic` and add the Excel parsing implementation and rules to the repo. Integrate the parser into the codebase so it can be used by CI/agent to import register data and optionally push to Firestore and present in the app UI.

## Files to add
- `src/utils/excel-parser/parser.ts`  (the TypeScript parser)
- `docs/PARSING_RULES.md`             (the rules & logic; documentation)
- `scripts/run-parse.ts`              (optional script to call parser and upload)
- `examples/REGISTER_2_structured_v5.xlsx` (place structured sample in repo or link)
- Unit tests under `tests/excel-parser/*.test.ts`

## Acceptance Criteria
1. When run locally with `node -r ts-node/register src/utils/excel-parser/parser.ts <path>`, the parser produces:
   - `parsed_output/members.json`
   - `parsed_output/attendance.json`
   - `parsed_output/manual_review.json`
   - `parsed_output/diagnostics.json`
2. plan detection is robust and uses column F if present.
3. importMonth includes year and importMonthISO exists.
4. At least one end-to-end test that runs the parser against the included sample workbook and asserts:
   - members length > 0
   - manual_review length is small (<= 20)
   - diagnostics contains detected headers
5. Commit should be on `feat/excel-parsing-logic` branch and open a PR to `main` with a short description.

## Steps for the agent
1. Checkout a new branch: `git checkout -b feat/excel-parsing-logic`
2. Add the files above in their respective directories.
3. Run `npm i xlsx date-fns uuid ts-node typescript @types/node --save-dev` in the repo.
4. Run the parser on the sample workbook and confirm outputs in `parsed_output/`.
5. Add unit tests and run them: `npm test` (or `npm run test`).
6. Create a PR with title: `feat(excel): add robust excel parsing logic for gym register` and body summarizing approach and instructions to run.

## Follow-up: UI integration
- Create a backend endpoint `/api/import-register` that accepts uploaded Excel and triggers the parser.
- After parse, insert/update `members` collection in Firestore. Use mobileNormalized as document id.
- Build a simple admin page to preview `manual_review` items and re-run import after corrections.
- For the UI, ensure the members table uses the new `planType`, `planMonths`, `lastAttendance`, `nextPaymentDueByPlan`, and `attendedMonths` fields.

## Notes to dev
- The parser is conservative; manual review is expected for ambiguous rows.
- Ensure all PR changes are well-documented; include `docs/PARSING_RULES.md` in PR.

## Example agent commit message
```
feat(excel): add parser.ts and PARSING_RULES.md; add sample structured workbook and tests
```
