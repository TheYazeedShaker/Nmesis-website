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
- `src/styles/`: original component styling plus NMESIS adjustments in theme.css.
- `src/scripts/`: interactions and animation logic.
- `src/motion/`: recovered reference animation settings.
- `public/assets/`: all local images, client logos, fonts and videos in their corresponding folders.
- `public/vendor/`: local Motion and Lenis runtimes, with licenses.
- `scripts/`: standalone builder, preview server and checks.
- `dist/`: generated static website, ready for hosting after content approval. Do not edit it directly.
- `.github/workflows/ci.yml`: checks for pushes to main and pull requests.
- `vercel.json`: Vercel build command and static output configuration.

The source currently builds 18 routes, including Home, Projects, Services, About, Contact, nine project pages, the Automotive CGI service detail, legal pages and the 404 page.

The website does not require Framer, React, Codex, Claude or runtime API keys. Contact enquiries open the visitor’s email application addressed to info@nmesis.io. The local project-authoring screen is intentionally not published.

## Deployment

Repository: [TheYazeedShaker/Nmesis-website](https://github.com/TheYazeedShaker/Nmesis-website).

Vercel project: [nmesis-website](https://vercel.com/yazeed-4833s-projects/nmesis-website).

The deployment configuration uses Vercel’s existing Git integration. A push to `main` starts GitHub checks and a Vercel production build. Vercel also runs `npm run verify` before publishing `dist/`, so a failed check prevents that deployment from replacing production. Other branches can receive Vercel preview deployments.

See [DEPLOYMENT.md](DEPLOYMENT.md) for activation, verification, routine updates and rollback. Local archives, reference documents, screenshots, exports and credentials are excluded from this repository.

## Add a project

Open http://localhost:4175/project-builder. Add multiple films, photo galleries and configurator/brochure embeds, then create the page. Files are copied into the corresponding project asset folders.

For direct editing, use `templates/project.json` or `npm run new:project -- your-slug "Project title"`. See **PROJECT-TEMPLATE.md** for the full workflow and examples. The local builder is not included in the exported website.
