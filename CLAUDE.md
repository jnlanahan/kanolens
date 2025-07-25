# REFACTORING RULES - ZERO TOLERANCE POLICY

## CRITICAL REQUIREMENTS
- **NEVER CREATE STUBS OR PLACEHOLDERS** - This is a TOTAL FAILURE
- **PRESERVE ALL FUNCTIONALITY** - Any missing functionality = complete failure
- **NO IMPROVEMENTS OR ENHANCEMENTS** - Only restructure, don't add features
- **MOVE CODE, DON'T REWRITE** - Transfer existing logic intact

## TESTING REQUIREMENTS
- Run tests after EVERY change
- If tests fail, immediately fix before proceeding
- Create tests if none exist before refactoring

## VALIDATION PROCESS
- Before declaring success, verify all original functionality works
- Check that all edge cases are preserved
- Confirm no performance regressions

## LINTING AND TYPE CHECKING
When completing a task, MUST run these commands if available:
- `npm run lint` - Check for linting errors
- `npm run typecheck` - Check for type errors
- Fix any issues before considering the task complete