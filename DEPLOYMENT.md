# GitHub → Vercel deployment

## Project

- Repository: https://github.com/TheYazeedShaker/Nmesis-website
- Vercel: https://vercel.com/yazeed-4833s-projects/nmesis-website
- Production URL: https://nmesis-website.vercel.app
- Production branch: `main`
- Node.js: `24.x`
- Framework preset: Other (`null` in `vercel.json`)
- Root directory: repository root
- Install command: skipped; this project has no npm dependencies
- Build command: `npm run verify`
- Output directory: `dist`

## How a change reaches production

1. Edit source content, layouts, styles or media locally.
2. Run `npm run verify`.
3. Commit the changes and push to `main`.
4. GitHub Actions reports the website checks. Independently, Vercel’s Git integration runs the same checks and creates the static build.
5. Only a successful Vercel build replaces the production deployment and updates its existing production domain.

The checks cover page links and assets, animation behavior, project creation, Linux-compatible file paths, custom 404 output and complete media files. GitHub Actions is not the deployment uploader; Vercel owns deployment through its Git connection. No Vercel deployment token needs to be stored in GitHub, and there is no second deployment workflow.

## Activation and verification

Initial production activation was verified on 1 October 2026 for commit `a58309b`. [GitHub Actions passed](https://github.com/TheYazeedShaker/Nmesis-website/actions/runs/36871673257) and [Vercel published a Ready production deployment](https://vercel.com/yazeed-4833s-projects/nmesis-website/BTF4oiqQuREtMgcDYU3tXivCdoKy). The public production domain passed checks for all 18 routes, the custom 404, JavaScript, CSS, a poster and video byte-range streaming.

Use this checklist when verifying the connection or moving to another hosting project:

1. The repository has its source and workflow on `main`.
2. Vercel Settings → Git shows this exact repository; Environments → Production tracks `main`.
3. The root directory is the repository root, and no ignored-build setting is skipping `main`.
4. The GitHub workflow succeeds and Vercel shows a Ready production deployment for the same commit.
5. Open the production domain shown in Vercel. Check `/`, `/about`, `/services`, `/projects/soueast-egypt`, a film and an unknown URL (which must return HTTP 404).
6. Push a follow-up commit to `main` and confirm another automatic deployment reaches Ready and the production domain serves it.

The follow-up domain-configuration commit is also used to verify the automatic update path. A successful local build alone does not confirm a remote deployment; check GitHub Actions and Vercel for the pushed commit.

## Routine updates

```sh
npm run verify
git add content src public scripts templates tools package.json vercel.json .github
git diff --cached --stat
git commit -m "Describe the website update"
git push origin main
```

For preview work, create a feature branch and open a pull request into `main`. Vercel’s Git integration can provide a preview URL. Merging the pull request then triggers production.

## Caching and headers

`vercel.json` adds `nosniff`, `strict-origin-when-cross-origin` referrers and same-origin framing protection to every response. Files under `/assets/` are cached by browsers for a day (and revalidated in the background for a week); `/vendor/` for a week, and the content-named `/scripts/motion/` files for a year (a change produces a new filename). Pages, `/styles/` and `/scripts/` are not fingerprinted, so they keep Vercel's default revalidation and edits appear immediately. When replacing media that must update for returning visitors at once, use a new filename.

## Image Optimization

`vercel.json` enables Vercel Image Optimization for `/assets/`: images are converted to AVIF or WebP at widths 320–2560 (quality 75) on first request and cached for 31 days. On the Hobby plan this is free within 5,000 transformations, 300,000 cache reads and 100,000 cache writes a month; beyond that, new images fail to optimize (no charge). On Pro, usage is billed per use (about $0.05–0.08 per 1,000 transformations). Note that Vercel's Hobby plan is for non-commercial use, so a business site should run on Pro. Check usage under Vercel → Usage → Image Optimization.

## Contact form email

`api/contact.js` emails each enquiry to info@nmesis.io through [Resend](https://resend.com), with Reply going straight to the visitor. Until it is configured it answers 503 and the form opens the visitor's email app instead, so it is safe to deploy first.

1. Create a Resend account (free: 3,000 emails a month, 100 a day).
2. In Resend → Domains, add `nmesis.io` and create the DNS records it lists at GoDaddy (a DKIM TXT record and the records for its sending subdomain). They do not replace the existing mail (MX) records for `nmesis.io`, so the current inbox keeps working.
3. In Resend → API Keys, create a key with sending access.
4. In Vercel → nmesis-website → Settings → Environment Variables, add for Production (and Preview if wanted):
   - `RESEND_API_KEY`: the key
   - `CONTACT_FROM`: `NMESIS Website <website@nmesis.io>` (any address on the verified domain)
   - `CONTACT_TO` (optional): defaults to `info@nmesis.io`
5. Redeploy (Deployments → … → Redeploy) so the function receives the variables, then send a test enquiry from /contact.

Before the domain is verified, leaving `CONTACT_FROM` unset uses Resend's test sender, which only delivers to the email address that owns the Resend account. `npm run check:contact` covers delivery, validation, bot filtering and the fallbacks. For extra protection against abuse, add a Vercel Firewall rate-limit rule for `/api/contact`.

## Search engines

After a production deployment, verify the domain in Google Search Console (DNS TXT record at GoDaddy) and Bing Webmaster Tools, and submit `https://www.nmesis.io/sitemap.xml` in both. Bing also feeds ChatGPT search and Microsoft Copilot. In Vercel → Firewall, make sure bot protection does not block the AI crawlers that `robots.txt` welcomes.

## Canonical domain

The confirmed production origin is configured as `baseUrl` in `content/site.json`. This enables canonical URLs and the sitemap. If you later connect a custom domain, update that value and push, or set `SITE_URL` in Vercel to the confirmed HTTPS origin and redeploy. `SITE_URL` overrides the source setting. Do not use a changing preview deployment hostname as the production canonical.

## Media and local authoring

All website media is included in the repository; no Git LFS setup is required for the current files. The deployment check rejects assets at or above 100 MiB and LFS pointer files. Large future media should be optimized or moved to suitable media storage before committing.

The local `/project-builder` writes source files on your computer. It is not a production editor; create projects locally and commit their generated content and media. The contact form is the only server-side code: the `api/contact.js` Vercel Function.

`dist/`, local archives, reference material, exports, working notes, credentials and asset provenance manifests stay outside Git. The build also removes provenance manifests and OS metadata from public output. Source originals are preserved locally.

## Failed builds and rollback

A failing verification or build leaves the previously successful production deployment in place. Inspect the failed Vercel build log and GitHub Actions run, fix the issue and push again.

To undo a published code change, use `git revert <commit>` and push the revert to `main`. For an immediate recovery, select a previously Ready production deployment in Vercel and use its rollback action; then revert the source commit as well so the next push does not restore the problem.

## Provider documentation

- [Vercel Git deployments and production branches](https://vercel.com/docs/git)
- [Vercel build configuration](https://vercel.com/docs/project-configuration/vercel-json)
- [GitHub Actions workflows](https://docs.github.com/en/actions/tutorials/create-an-example-workflow)
