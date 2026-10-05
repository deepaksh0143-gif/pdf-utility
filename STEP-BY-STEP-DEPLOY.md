# Deploy your website — step-by-step for beginners

**What we're doing in plain words:**
GitHub.com is a free website that stores your project's code online.
Render.com is a free website host — it takes the code from GitHub and runs
your website on the internet with a public link.

You only need a web browser for everything below. No coding, no credit card.

---

## Part 1 — Create a GitHub account (skip if you already have one)

1. Open **https://github.com/signup** in your browser.
2. Type your **email address** → click **Continue**.
3. Create a **password** → **Continue**.
4. Choose a **username** (this becomes your public name on GitHub, e.g.
   `john-smith`). Remember it — you'll need it in Part 3.
5. Solve the little puzzle, then check your email inbox for a **verification
   code** and type it in.
6. Skip the personalization questions ("How many team members?" etc.) by
   clicking **Skip** / **Continue**.

✅ You now have a GitHub account. Free, no credit card.

---

## Part 2 — Create an empty "repository" (a folder for your code online)

1. Go to **https://github.com/new** (make sure you're logged in).
2. **Repository name:** type `pdf-utility`
3. Leave everything else exactly as it is:
   - Public or Private — either is fine (Private works with Render too)
   - ❗ Do **NOT** tick "Add a README file" — the repo must be empty
4. Click the green **Create repository** button.
5. GitHub shows a page full of commands. **Ignore that page completely** —
   you don't need to type anything.

✅ Your empty code folder exists at `https://github.com/YOUR_USERNAME/pdf-utility`.

---

## Part 3 — Upload the project code (I do this for you)

**Tell me your GitHub username** (the one you chose in Part 1), and I will
run the upload from your computer. You will see **one popup window**:

1. A GitHub sign-in window appears → click **"Sign in with your browser"**.
2. Your browser opens → click the green **"Authorize"** button.
3. Done — that popup was GitHub saying "yes, this computer may upload".

That's the only thing you do in this part.

*(If you ever want to do it yourself: open "Git Bash", paste these two lines
with your username, press Enter each time:*
```bash
cd "/f/PDF SAAS"
git remote add origin https://github.com/YOUR_USERNAME/pdf-utility.git
git push -u origin main
```
*)*

---

## Part 4 — Put the website online with Render (free)

1. Go to **https://dashboard.render.com/register**.
2. Click **"GitHub"** — signing up with your new GitHub account is the
   fastest way (no new password to remember).
3. Once logged in, click **"New +"** (top-right) → choose **"Blueprint"**.
4. If GitHub asks "Where do you want to install Render?":
   - click **"Configure"**, pick **"All repositories"** (simplest) → **Install**.
5. Click the **`pdf-utility`** repo in the list → **"Connect"**.
6. Render reads the included `render.yaml` file and fills in all settings by
   itself. Just click **"Apply"** (bottom right). Don't change anything.
7. Wait **2–3 minutes** — you'll see live build messages scrolling. When the
   status dot turns green and says **"Live"**, your website is online! 🎉
8. Your public link is shown at the top of the page, something like:
   `https://pdf-utility-xxxx.onrender.com`

---

## Part 5 — Check it works

**Paste your onrender.com link back to me** and I'll test the whole website
live (health check + real PDF merge + download).

---

## Good to know (free plan facts)

- **Sleeps when idle:** after ~15 minutes with no visitors, the site sleeps.
  The next visitor waits ~30–50 seconds on the first load. This is normal on
  the free plan.
- **Automatic updates:** whenever the code is updated and pushed to GitHub,
  Render rebuilds and updates your site automatically.
- **Your link is public:** anyone with the link can use the tools. Uploaded
  files are never stored — everything is deleted within one hour.

---

## Troubleshooting

| Problem | What to do |
|---|---|
| Push says "repository not found" | The name in Part 2 isn't exactly `pdf-utility`, or the username is misspelled — tell me the exact link shown in your browser address bar on github.com |
| GitHub popup never appears | Tell me — I'll check the setup on this computer |
| Render build fails | Click the failed build, copy the last red lines, paste them to me |
| "Blueprint" page shows errors | Don't change settings — screenshot/paste the message to me |
