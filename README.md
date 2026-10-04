# NMESIS website

The NMESIS Motion Lab website: editable HTML, CSS, JavaScript and JSON content, built into a static site with Node.js.

## Run locally

Use Node.js 24 (`nvm use`). No npm installation is required; runtime libraries and website assets are included locally.

```sh
npm run dev
```

Open http://localhost:4175. On macOS, you can also double-click `Start Preview.command`. If the preview is already running, use it rather than starting a second server on the same port. For a separate preview, run `PORT=4176 npm run dev`.

```sh
npm run build        # Regenerate dist/
npm run verify      # Run all checks and produce the deployment build
```

## Folder map

- `content/`: editable site settings, navigation, page copy and project details. Journal drafts are archived here but not published.
- `src/templates/`: page layouts and shared header/footer components.
- `src/logos/`: supplied client-logo sheets; `scripts/logo-mask.mjs` turns them into the published alpha masks.
- `src/styles/`: original component styling plus NMESIS adjustments in theme.css.
- `src/scripts/`: interactions and animation logic.
- `src/motion/`: recovered reference animation settings.
- `public/assets/`: all local images, client logos, fonts and videos in their corresponding folders.
- `public/vendor/`: local Motion and Lenis runtimes, with licenses.
- `scripts/`: standalone builder, preview server and checks.
- `dist/`: generated static website, published by Vercel after verification. Do not edit it directly.
- `.preview/`: pages built by `npm run dev`; the preview serves `public/` in place, so rebuilds are fast.
- `.github/workflows/ci.yml`: checks for pushes to main and pull requests.
- `vercel.json`: Vercel build command, static output, browser caching and security headers.
- `.gitattributes`: keeps LF line endings so Windows, macOS and Vercel build identical HTML.

The source currently builds 18 routes, including Home, Projects, Services, About, Contact, nine project pages, the Automotive CGI service detail, legal pages and the 404 page.

The website does not require Framer, React, Codex, Claude or runtime API keys. Contact enquiries open the visitor’s email application addressed to info@nmesis.io. The local project-authoring screen is intentionally not published.

## Deployment

Production: [www.nmesis.io](https://www.nmesis.io). The root domain `nmesis.io` redirects to `www`; the [Vercel deployment address](https://nmesis-website.vercel.app) remains available.

The domain is registered at GoDaddy and its DNS is managed there. Vercel project settings provide the exact root A record, `www` CNAME and any ownership-verification TXT records. Preserve mail and unrelated subdomain records when updating website DNS. `content/site.json` defines the public URL used for canonical links and the sitemap.

Repository: [TheYazeedShaker/Nmesis-website](https://github.com/TheYazeedShaker/Nmesis-website).

Vercel project: [nmesis-website](https://vercel.com/yazeed-4833s-projects/nmesis-website).

The deployment configuration uses Vercel’s existing Git integration. A push to `main` starts GitHub checks and a Vercel production build. Vercel also runs `npm run verify` before publishing `dist/`, so a failed check prevents that deployment from replacing production. Other branches can receive Vercel preview deployments.

See [DEPLOYMENT.md](DEPLOYMENT.md) for activation, verification, routine updates and rollback. Local archives, reference documents, screenshots, exports and credentials are excluded from this repository.

## Testimonial visibility

The existing [allow-testimonials flag](https://eu.posthog.com/project/290562/feature_flags/296612) in PostHog project `290562` controls every current client quote/card: the complete homepage testimonial section (four people), and the Ahmed Ali card in the featured SOUEAST project (both responsive versions). Project scope, client logos and project descriptions remain independent.

- Only an explicit enabled result reveals these areas. Initial HTML, a disabled/missing flag, an evaluation error, blocked requests, or a five-second timeout keep them hidden with no empty section.
- Each browser evaluates the flag on page load and checks again every minute while the page is visible, as well as on focus/return. Changes to the PostHog flag do not require a site deployment. Refreshing the page requests the latest evaluation immediately.
- PostHog rollout/targeting rules still apply per anonymous browser. The controller stores only an anonymous ID locally; it never stores a previously enabled flag value. It uses the public flags-only API and does not enable analytics or session replay.
- `content/site.json` contains the EU API host and public project token, which is designed for browser use. Never substitute a personal/secret API key.
- New testimonial placements must carry `data-feature-flag="allow-testimonials" hidden` on their full wrapper. The shared layout supplies hiding styles and the controller on every page; pages without these wrappers make no flag requests.
- `npm run check:flags` covers hidden-by-default rendering, all current placements, on/off behavior, request failures, timeout, refresh and responsive preservation. It is included in the production verification command.

This is a presentation flag, not access control for confidential content: the static HTML and media remain public.

## Add a project

Open http://localhost:4175/project-builder. Add multiple films, photo galleries and configurator/brochure embeds, then create the page. Files are copied into the corresponding project asset folders.

For direct editing, use `templates/project.json` or `npm run new:project -- your-slug "Project title"`. See **PROJECT-TEMPLATE.md** for the full workflow and examples. The local builder is not included in the exported website.
