# ATCO Finance Live — 12 Questions + Final Case Study

This package contains the corrected live quiz frontend:

- **12 MCQ questions** from the supplied Q & A document.
- Dynamic progress and score out of **12**.
- **Case Study shown after all 12 MCQs** on the participant page.
- Case Study also available from the Admin dashboard.
- Admin page shows **Correct / Wrong** for each participant answer immediately.
- Correct answer, correct count, wrong count, accuracy, and total score are visible to Admin.
- Participant page does **not** reveal the correct answer.

## Important backend note
The included `supabase-function/index.ts` is the matching backend version for 12 logical questions. It is designed to work with the existing Finance poll tables even if the database currently contains only 10 legacy question rows.

Vercel static deployment: deploy this folder as **Other / no build command**.
