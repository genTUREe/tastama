# TASTAMA Website

Public landing page for TASTAMA. It is intentionally separated from the current learning platform so the public domain and the product can be deployed independently.

## Suggested domain structure

- `your-domain.com` → this public website
- `app.your-domain.com` → TASTAMA learning platform (current Qadam_Merged product after rebranding)
- `api.your-domain.com` → backend, if you later want a dedicated API hostname

The brand stays **TASTAMA** even if the final domain is different.

## Run locally

No build step is required.

### Windows PowerShell

```powershell
cd TASTAMA_Website
python -m http.server 5500
```

Then open `http://localhost:5500`.

## Connect the product URL and email

Edit `config.js`:

```js
window.TASTAMA_CONFIG = {
  appUrl: "https://app.your-domain.com",
  contactEmail: "hello@your-domain.com",
};
```

Until these values are set, the website works as a standalone product presentation and the product buttons scroll to the product section.

## Languages

The site includes:

- English — best default for international partners / startup programs
- Russian
- Kazakh

Language is selected automatically from the browser and can be switched in the header.

## Deployment options

The site is static, so it can be deployed easily to:

- Cloudflare Pages
- GitHub Pages
- Netlify
- Vercel
- any Nginx/Apache server

For Cloudflare Pages, upload the folder or connect its Git repository. There is no build command; the output directory is the project root.

## What to update before a public launch

1. Put the final `appUrl` and `contactEmail` in `config.js`.
2. Add the final domain in Cloudflare / hosting settings.
3. Add team names / LinkedIn links once the team page is ready.
4. Replace product mock data with real screenshots when the TASTAMA UI rebrand is done.
5. Add privacy policy / terms before collecting personal data through forms.

## Current positioning

TASTAMA is presented as both:

- a direct-to-student UNT preparation product;
- a platform for education centers with content, testing, assignments, groups, analytics and AI-assisted feedback.

The copy deliberately avoids fabricated traction numbers, fake testimonials, and claims that the product is powered by a specific AI provider before that integration exists.
