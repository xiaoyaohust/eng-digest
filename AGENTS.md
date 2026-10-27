# Project workflow

- After completing user-requested changes and appropriate validation, commit the
  task-owned changes automatically. Do not ask for routine commit confirmation.
- For website publishing requests, push the completed commits with a normal,
  non-force push and verify the GitHub Actions deployment and public page.
- Keep unrelated pre-existing edits out of commits. Never discard user changes,
  force-push, or include credentials or generated build output.
- If the remote branch advances, inspect its changes and integrate them safely
  before pushing. Report a real conflict or missing permission instead of
  overwriting remote work.
