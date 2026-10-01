# Create a project

## Use the local screen

Start the preview and go directly to http://localhost:4175/project-builder.

1. Add the title, introduction, story, client, scope, market, three capabilities and cover. The project details show Client, Scope and Market; capabilities remain on project cards.
2. Click **Add film** for each video. Choose an MP4/WebM or reuse an existing website asset. A poster image is optional.
3. Click **Add gallery** for each set of photos. Give each gallery a title, choose several images at once, and adjust captions and image descriptions.
4. Click **Add experience** for every car configurator, interactive brochure or showroom. Paste the HTTPS link and enter its original width and height (1920 × 1080 by default).
5. Use the up/down buttons to change the order within each media category. Remove any unused blocks.
6. Click **Create project**, then **Open project** to review it. The page also appears in the Projects listing.

Files you choose are copied to `public/assets/projects/<slug>/images/` or `videos/`. Originals are preserved. Existing asset selections reuse their original local website path. A previously used project address is rejected, so creation cannot overwrite an existing project.

This screen is available only in the local preview. It is not included in the built website. It creates new projects; to revise a saved project, edit its JSON file or ask your coding assistant. Form entries are not autosaved. Keep the screen open until creation succeeds.

## Use the editable template

Copy `templates/project.json` into `content/projects/<slug>.json` and change the `slug` to match the filename. Or run:

```sh
npm run new:project -- your-project "Your project title"
```

The command creates a clean project and empty image/video folders. It does not copy another client's media or claims. Change the placeholder cover when your artwork is ready.

The `films`, `galleries` and `experiences` arrays can contain multiple entries. Empty arrays omit those sections. The page uses the same SOUEAST layout: introduction, cover, project details, films, interactive experiences, galleries, related projects. Each gallery has its own lightbox. Each iframe loads only when activated.

### A film entry

Add this inside `films`. Replace paths with your assets. `poster` is optional.

```json
{
  "title": "The launch film.",
  "description": "Describe this film and the vehicle it introduces.",
  "src": "/assets/projects/your-project/videos/launch.mp4",
  "poster": "/assets/projects/your-project/images/film-poster.jpg"
}
```

### A gallery entry

Add this inside `galleries`. Add more image objects to `images`, and more gallery objects for other vehicles or campaigns.

```json
{
  "title": "Exterior details.",
  "description": "A closer look at the vehicle.",
  "images": [
    {
      "src": "/assets/projects/your-project/images/exterior.jpg",
      "alt": "Describe the vehicle and viewpoint",
      "caption": "Front three-quarter view",
      "width": 2400,
      "height": 1600
    }
  ]
}
```

### An interactive entry

Add this inside `experiences`. The S09 link below is a working example; replace it with the appropriate car's link. `type` can be “Vehicle configurator”, “Interactive brochure” or “Virtual showroom”.

```json
{
  "type": "Vehicle configurator",
  "title": "Explore the SOUEAST S09.",
  "description": "Discover the vehicle, inside and out.",
  "url": "https://nmesis.up.railway.app/Soueast/Soueasts09/",
  "width": 1920,
  "height": 1080
}
```

Use the page URL, not pasted iframe HTML. The external website must allow embedding. Fullscreen and “Open separately” are provided for every capsule.

Existing projects with a single `gallery` array still work. Use either `galleries` or the older `gallery` fields; `galleries` takes precedence when present. The older `video` field is for autoplay project-card previews and is independent of `films`.

After editing, refresh the local preview or run `npm run check`. Run `npm run check:projects` to verify the project builder and repeatable media behavior. Deploy the generated `dist/` folder when ready.
