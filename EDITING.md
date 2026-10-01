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
| `social` | Four social labels and destination links |
| `navigation` | Four navigation labels and destination paths |
| `colors` | Shared background, text, white, border, muted, and accent colors, in hex |
| `baseUrl` | Your final HTTPS domain, once chosen; enables canonical URLs and a sitemap |

The current header/footer layouts expect four navigation entries and four social entries. Reordering or editing them is supported; changing their number requires a template edit. `title` and `contactName` are reserved informational fields; browser titles use each page's title and `brandName`, and the contact introduction is edited in `content/pages/contact.json`.

Place a logo in `public/assets/images/your-logo.svg`, then set `logo` to `/assets/images/your-logo.svg`. The footer keeps a large text wordmark that fits your brand name.

Typography is in `src/styles/theme.css`: `--font-body` and `--font-display` control the main Inter and Outfit styles. Add local font files and a matching `@font-face` if using a new font. Some decorative/monospace styles retain their own font choices.

Brand mentions embedded in editorial copy, article text, legal text, and image artwork require separate edits. Changing `brandName` does not rewrite those passages.

## 2. Project content

Each file in `content/projects/` describes one case study. You can edit existing files or create a new one:

```sh
npm run new:project -- my-project "My project"
```

This copies the existing content structure and example images. Replace those images and the copy before publishing.

| Field | Purpose |
| --- | --- |
| `slug` | Page address, such as `/projects/my-project` |
| `title`, `subtitle`, `description` | Project name, summary, and main text |
| `cover`, `coverAlt` | Listing/hero image and accessible description |
| `tags` | Exactly three service labels in the current layout |
| `industry`, `duration`, `timeline` | Project information |
| `liveUrl`, `liveLabel` | External project link; an empty `liveUrl` hides the row |
| `gallery` | Any number of images, with `src`, `alt`, `width`, and `height` |

Put new images in `public/assets/images/`, and reference them as `/assets/images/filename.webp`. Gallery images use a 4:3 crop; change `.project-gallery-item` in `src/styles/theme.css` if your work needs another ratio.

A new project automatically receives a page and appears in the project listing. `projectOrder` in `site.json` controls listing order; unlisted new projects appear afterward.

`featuredProjects` selects the six project slots in the existing homepage design. The first slot is used by its featured visual; the remaining slots populate the displayed cards. `featuredArticles` selects the three homepage article slots. Change these slug lists to feature your own work without changing HTML. Keep their current lengths. Before deleting a featured item or changing its slug, update these selections too.

## 3. Other page text and imagery

`content/pages/` contains home, about, contact, projects, blog, legal, and fallback page content. Text fields use keys derived from their original text. Change the values, keeping the keys intact. `_images` stores editable image paths and alt text.

`content/shared.json` contains shared footer and call-to-action copy. `content/pages.json` defines static page routes and browser titles.

## 4. Articles

Each article has a `.json` metadata file in `content/articles/` and an editable `.html` body referenced by `bodyFile`. Copy both files to create an article, then update its slug, title, image, author details, and body path. Use ordinary HTML paragraphs, headings, lists, and links in the body.

The Blog page and related article cards update automatically. `articleOrder` selects order, with the first article featured on the Blog page. Homepage selections are controlled separately by `featuredArticles`.

## 5. Layout and motion

- `src/templates/layout.html`: document shell.
- `src/templates/partials/`: shared header, footer, cards, and call-to-action sections.
- `src/templates/pages/`: page layouts, including one project and one article template.
- `src/styles/theme.css`: shared typography and custom component styling.
- `src/styles/pages/`: migrated detailed page styles.
- `src/styles/interactions.css` and `src/scripts/site.js`: accessible menu/FAQ state and form behavior.
- `src/motion/appear.json` and `src/motion/effects.json`: recovered animation settings.
- `src/scripts/motion.js` and `src/styles/motion.css`: animation playback and page transitions.
- `MOTION.md`: provenance, timing details, and motion verification.

Template fields use `{{field.name}}` for escaped text and `{{{field.name}}}` for intentionally inserted HTML. Missing fields produce a build error identifying the key.

## 6. Forms, hosting, and domain later

`forms.contactEndpoint` and `forms.newsletterEndpoint` are blank. Preview submissions display a notice and send no data. These fields expect a form service that accepts POSTed form data and supports browser requests; test the chosen service when configuring it. Do not put private API keys in this file.

For deployment, run `npm run build` and publish the contents of `dist/` on a static host that supports directory index pages. Configure the host to use `404/index.html` for missing routes. Set `baseUrl` to the final domain and rebuild. Hosting and DNS changes are a later step and have not been performed.

## Check a change

1. Run the preview and open the changed page on desktop and mobile.
2. Check its listing card and any homepage appearances.
3. Run `npm run check` to verify routes, local HTML references, and shared-content propagation.
4. If changing motion, run `npm run check:motion` and compare the affected interaction in the preview.
5. Run `npm run build` before publishing.

If the preview displays a build error, correct the named JSON/template field and refresh. If a new image does not appear, restart the preview to rebuild the copied public assets.

## Current navigation and showreel

The live site uses Home, Projects, Services and About. Journal drafts are retained in source but are no longer generated or linked. Services copy is in content/pages/services.json. Home showreel source and scroll label are in content/pages/home.json (showreel_src and showreel_scroll). Replace public/assets/video/nmesis-showreel.mp4 to swap the reel. Playback is controlled in src/scripts/site.js and hero styling in src/styles/theme.css.
