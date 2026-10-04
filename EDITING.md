# Editing your website

Keep a copy of this folder before making large changes. Files under `dist/` are generated: change the files described here, then refresh the running preview or run `npm run build`.

## 1. Branding and contact details

Open `content/site.json` in a text editor. Preserve JSON double quotes, commas, and brackets.

| Setting | What it controls |
| --- | --- |
| `brandName` | Shared text logos and browser page-title suffix |
| `description` | Default description metadata |
| `logo` | Optional image path for navigation; leave empty for the text logo |
| `email`, `contactEmail`, `supportEmail` | Shared email links |
| `phone`, `phoneHref`, `location` | Displayed contact details and phone link |
| `timezone` | Live clock; for example `Africa/Cairo` |
| `copyright`, `updated` | Footer text |
| `social` | Social links; each needs a `label`, `url` and a supported `icon` (`instagram` or `linkedin`) |
| `navigation` | Four navigation labels and destination paths |
| `colors` | Shared background, text, white, border, muted, and accent colors, in hex |
| `baseUrl` | Your final HTTPS domain, once chosen; enables canonical URLs and a sitemap |

The current header/footer layouts expect four navigation entries. Social links can be added or removed freely; a new icon needs an entry in `scripts/social-links.mjs`. `title` and `contactName` are reserved informational fields; browser titles use each page's title and `brandName`, and the contact introduction is edited in `content/pages/contact.json`.

Place a logo in `public/assets/images/your-logo.svg`, then set `logo` to `/assets/images/your-logo.svg`. The footer keeps a large text wordmark that fits your brand name.

Typography is in `src/styles/theme.css`: `--font-body` and `--font-display` control the main Inter and Outfit styles. Add local font files and a matching `@font-face` if using a new font. Some decorative/monospace styles retain their own font choices.

Brand mentions embedded in editorial copy, article text, legal text, and image artwork require separate edits. Changing `brandName` does not rewrite those passages.

## 2. Project content

Each file in `content/projects/` describes one case study. You can edit existing files or create a new one:

```sh
npm run new:project -- my-project "My project"
```

This creates a clean project from `templates/project.json` with empty image and video folders. Add your artwork and copy before publishing.

| Field | Purpose |
| --- | --- |
| `slug` | Page address, such as `/projects/my-project` |
| `title`, `subtitle`, `description` | Project name, summary, and main text |
| `cover`, `coverAlt` | Listing/hero image and accessible description |
| `tags` | Exactly three service labels in the current layout |
| `client`, `scope`, `market` | The project details row |
| `heroCover`, `heroCoverAlt` | Optional larger image for the top of the project page |
| `films`, `galleries`, `experiences` | Repeatable media sections; see PROJECT-TEMPLATE.md |
| `ctaBackground` | Optional image behind the closing call to action |

Put project media in `public/assets/projects/<slug>/`, and reference it as `/assets/projects/<slug>/filename.webp`. The `mediaLayout: "collection"` option used by most current projects adds film pickers, carousels, brochures and configurator tabs; PROJECT-TEMPLATE.md describes the fields.

A new project automatically receives a page and appears in the project listing. `projectOrder` in `site.json` controls listing order; unlisted new projects appear afterward.

`featuredProjects` selects the six project slots in the existing homepage design. The first slot is used by its featured visual; the remaining slots populate the displayed cards. `featuredArticles` must list three article slugs for the build, although the journal is not currently published. Change these slug lists to feature your own work without changing HTML. Keep their current lengths. Before deleting a featured item or changing its slug, update these selections too.

## 3. Other page text and imagery

`content/pages/` contains home, about, contact, projects, legal, and fallback page content. Each file is grouped by page section (for example `home.json` has `stats`, `clients`, `featured`, `services`, `process`, `testimonials`, `pricing` and `faq`). Change the values, keeping the keys intact; repeated items such as testimonials and FAQ entries are arrays in page order. `_images` stores editable image paths and alt text.

The Privacy policy and Terms pages share one layout (`scripts/legal-page.mjs`). Their wording is in `content/pages/privacy-policy.json` and `content/pages/terms.json`: `headline`, `intro`, `updated`, the three `summary` cards, and `sections`, where each section has an `id` (its link anchor), a `title`, and optional `paragraphs`, `items` (plain strings, or `{"term", "text"}` pairs) and `after` paragraphs. The contents list is generated from the sections. Update `updated` whenever the wording changes, and have the final text reviewed by your legal adviser, in particular the company details and governing law, which project agreements currently define.

`content/shared.json` contains shared footer and call-to-action copy. `content/pages.json` defines static page routes and browser titles.

## 4. Articles

Each article has a `.json` metadata file in `content/articles/` and an editable `.html` body referenced by `bodyFile`. Copy both files to create an article, then update its slug, title, image, author details, and body path. Use ordinary HTML paragraphs, headings, lists, and links in the body.

Articles are not currently published: `/blog` and article routes are not in `content/pages.json`. When the journal returns, the Blog page and related article cards update automatically. `articleOrder` selects order, with the first article featured on the Blog page. Homepage selections are controlled separately by `featuredArticles`.

## 5. Layout and motion

- `src/templates/layout.html`: document shell.
- `src/templates/partials/`: shared header, footer, cards, and call-to-action sections.
- `src/templates/pages/`: page layouts, including one project and one article template.
- `src/styles/theme.css`: shared typography and custom component styling.
- `src/styles/pages/`: migrated detailed page styles.
- `src/styles/interactions.css` and `src/scripts/site.js`: accessible menu/FAQ state and form behavior.
- `src/motion/appear.json` and `src/motion/effects.json`: recovered animation settings.
- `src/scripts/motion.js` and `src/styles/motion.css`: animation playback and page transitions.
- `MOTION.md` (kept locally, not in Git): provenance, timing details, and motion verification.

Template fields use `{{field.name}}` for escaped text and `{{{field.name}}}` for intentionally inserted HTML. Missing fields produce a build error identifying the key.

## 6. Client logos

Client and brand marks (home client grid, project cards, About) are drawn with CSS masks from `public/assets/clients/client-logos-mask.png` and `client-logos-full-mask.png`. Each `.client-logo--<name>` rule in `src/styles/theme.css` sets the crop with `mask-size`/`mask-position` and their `-webkit-` twins.

The masks must be white-on-transparent: iPhone browsers ignore `mask-mode: luminance`, so an opaque sheet renders every logo as a solid box. The supplied light-on-dark sheets are kept in `src/logos/`. After updating a sheet, regenerate its mask and keep both prefixed and unprefixed declarations:

```sh
node scripts/logo-mask.mjs src/logos/supplied-client-sheet.png public/assets/clients/client-logos-mask.png
```

`npm run check` rejects luminance masks, opaque mask images and missing `-webkit-mask-image` declarations.

## 7. Forms, hosting, and domain

`forms.contactEndpoint` and `forms.newsletterEndpoint` are blank, so the contact form opens the visitor's email app with the enquiry filled in. These fields expect a form service that accepts POSTed form data and supports browser requests; test the chosen service when configuring it. Do not put private API keys in this file.

Hosting, the domain and deployment are described in DEPLOYMENT.md.

## Check a change

1. Run the preview and open the changed page on desktop and mobile.
2. Check its listing card and any homepage appearances.
3. Run `npm run check` to verify routes, local HTML references, and shared-content propagation.
4. If changing motion, run `npm run check:motion` and compare the affected interaction in the preview.
5. Run `npm run build` before publishing.

If the preview displays a build error, correct the named JSON/template field and refresh. Changes to files in `scripts/` need a restart of `npm run dev`. The preview builds pages into `.preview/` and serves `public/` directly, so new media appears without a restart.

## Current navigation and showreel

The live site uses Home, Projects, Services and About. Journal drafts are retained in source but are no longer generated or linked. Services copy is in content/pages/services.json. Home showreel source and scroll label are in content/pages/home.json (`showreel.src` and `showreel.scrollLabel`). Replace public/assets/video/nmesis-showreel.mp4 to swap the reel. Playback is controlled in src/scripts/site.js and hero styling in src/styles/theme.css.
