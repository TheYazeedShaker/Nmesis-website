# GitHub → Vercel deployment

## Project

- Repository: https://github.com/TheYazeedShaker/Nmesis-website
- Vercel: https://vercel.com/yazeed-4833s-projects/nmesis-website
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

## First activation and verification

The files in this repository prepare the pipeline. Confirm the following after the first authenticated push:

1. The repository has its source and workflow on `main`.
2. Vercel Settings → Git shows this exact repository; Environments → Production tracks `main`.
3. The root directory is the repository root, and no ignored-build setting is skipping `main`.
4. The GitHub workflow succeeds and Vercel shows a Ready production deployment for the same commit.
5. Open the production domain shown in Vercel. Check `/`, `/about`, `/services`, `/projects/soueast-egypt`, a film and an unknown URL (which must return HTTP 404).
6. Push a follow-up commit to `main` and confirm another automatic deployment reaches Ready and the production domain serves it.

Remote activation is only verified once these checks have been completed; a successful local build alone does not confirm deployment.

## Routine updates

```sh
npm run verify
git add content src public scripts templates tools package.json vercel.json .github
git diff --cached --stat
git commit -m "Describe the website update"
git push origin main
```

For preview work, create a feature branch and open a pull request into `main`. Vercel’s Git integration can provide a preview URL. Merging the pull request then triggers production.

## Canonical domain

Once the production hostname is confirmed, set `SITE_URL` in Vercel to its HTTPS origin, for example `https://your-confirmed-domain.example`, and redeploy. This enables canonical URLs and the sitemap. Leave it unset until the domain is known. Do not use a changing preview deployment hostname as the production canonical.

## Media and local authoring

All website media is included in the repository; no Git LFS setup is required for the current files. The deployment check rejects assets at or above 100 MiB and LFS pointer files. Large future media should be optimized or moved to suitable media storage before committing.

The local `/project-builder` writes source files on your computer. It is not a production editor; create projects locally and commit their generated content and media. Contact currently uses email links rather than a server email endpoint.

`dist/`, local archives, reference material, exports, working notes, credentials and asset provenance manifests stay outside Git. The build also removes provenance manifests and OS metadata from public output. Source originals are preserved locally.

## Failed builds and rollback

A failing verification or build leaves the previously successful production deployment in place. Inspect the failed Vercel build log and GitHub Actions run, fix the issue and push again.

To undo a published code change, use `git revert <commit>` and push the revert to `main`. For an immediate recovery, select a previously Ready production deployment in Vercel and use its rollback action; then revert the source commit as well so the next push does not restore the problem.

## Provider documentation

- [Vercel Git deployments and production branches](https://vercel.com/docs/git)
- [Vercel build configuration](https://vercel.com/docs/project-configuration/vercel-json)
- [GitHub Actions workflows](https://docs.github.com/en/actions/tutorials/create-an-example-workflow)
