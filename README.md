# Personal LMS Starter

A tiny self-directed LMS for:
- College Applications
- USACO
- Research Project

## What works now

- Dashboard with real course grades
- Clickable course pages with gradebooks
- Assignments with due dates, points possible, and scores earned
- Future/ungraded work does not count as a zero
- Overdue highlighting
- Mark assignments complete
- Course/module overview
- Calendar/deadline list
- Planning mode for intentional deadline changes
- Add, edit, and delete assignments
- Browser persistence using `localStorage`

No account or backend is required for the starter version.

## Run it

The simplest option is to open `index.html` in a browser.

For a more realistic local web server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Deploy free

### Vercel

1. Put these files in a GitHub repository.
2. Sign into Vercel.
3. Import the repository.
4. Because this is a static project, no build command is needed.
5. Deploy.

### GitHub Pages

This project is fully static, so GitHub Pages also works.

## Important: where your data is stored

The starter version stores assignments in your browser's `localStorage`.

That means:
- your changes persist when you close/reopen the page on the same browser/device;
- they will NOT automatically sync to another device;
- clearing browser site data will remove them.

This is intentional: it lets you start using the app immediately without configuring accounts or a database.

## Optional Supabase upgrade

If you later want cross-device sync and login:

1. Create a Supabase project.
2. Enable email authentication.
3. Run `supabase-schema.sql` in the SQL Editor.
4. Install/use `@supabase/supabase-js` v2.
5. Replace the localStorage `load()` and `save()` functions with Supabase queries scoped to the signed-in user.

Use only a Supabase publishable/anon key in browser code. Never expose a `service_role` key client-side.

## Suggested personal rules

- Only change deadlines in Planning mode.
- 5–10 pts = small checkpoint.
- 15–25 pts = meaningful assignment.
- 40–50 pts = major milestone.
- Mark work complete only when there is a tangible output.
- Don't erase overdue assignments just because they are uncomfortable.

## Next features worth adding

- weekly review screen
- streak / consistency score
- "submit" button with reflection note
- recurring USACO practice blocks
- college-specific supplemental essay modules
- research paper reading log
- CSV backup/export
- Supabase login + cross-device sync


## Gradebook behavior

- A course grade is calculated as total scored points / total possible points for graded assignments.
- Future assignments with no score do not count against the grade.
- Checking an assignment complete automatically gives full credit by default.
- To assign partial credit, open the assignment and edit **Score earned**.
- Clicking a course card opens its full gradebook.
