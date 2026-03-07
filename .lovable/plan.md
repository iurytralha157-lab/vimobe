
## Plan: Add "About" section block on Home page with toggle in Site Settings

### What we're building
A new section on the public Home page that mirrors the About page content (image + text), placed **above** the category accordion (Casas, Apartamentos, etc.). It includes a "Saiba Mais" button linking to the About page. This section is controlled by a toggle in Site Settings.

### Steps

1. **Database migration** -- Add `show_about_on_home` boolean column (default `false`) to `organization_sites` table.

2. **Update TypeScript types** -- Add `show_about_on_home` to `organization_sites` Row/Insert/Update in `src/integrations/supabase/types.ts`.

3. **Add toggle in Site Settings** -- In `src/pages/SiteSettings.tsx`, inside the "Pagina Sobre" card, add a Switch labeled "Exibir seção Sobre na Home" that controls a new `show_about_on_home` field in formData. Wire it to save.

4. **Add About block on PublicHome** -- In `src/pages/public/PublicHome.tsx`, above the Category Accordion section, render a new section (only when `siteConfig.show_about_on_home` is true) that reuses the same layout as PublicAbout's content section: image on left, text on right, with a "Saiba Mais" button linking to the About page.

5. **Update public site hook types** -- Ensure `use-public-site.ts` `PublicSiteConfig` interface includes `show_about_on_home`.
