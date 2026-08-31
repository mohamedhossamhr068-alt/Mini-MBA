# mini-mba-mu — Final Vercel Package

Production URL target: https://mini-mba-mu.vercel.app/

This frontend is already configured to use the existing Supabase backend:
`https://mwlrmnhudzbivfjsfsms.supabase.co/functions/v1/atco-finance-api-v4`

Included:
- 12 MCQ questions.
- Dynamic participant progress out of 12.
- Final Case Study shown only after Question 12 is completed.
- Original Case Study pages included under `/assets/`.
- Admin dashboard route: `/admin`.
- Admin shows each selected answer as Correct / Wrong.
- Admin shows correct count, wrong count, accuracy, progress and score out of 12.
- Participant does not see the correct answer.

## Vercel
Deploy the contents of this folder to the GitHub/Vercel project behind `mini-mba-mu.vercel.app`.
Framework preset: Other.
No build command is required.

## Supabase
The frontend already points to the existing Supabase project `mwlrmnhudzbivfjsfsms`.
For the 12-question backend behavior, deploy the included file:
`supabase-function/index.ts`
to the existing Edge Function named:
`atco-finance-api-v4`
with JWT verification kept disabled, matching the current custom PIN-authenticated function.
