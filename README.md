# Wiltshire Tutoring

Website for [wiltshiretutors.com](https://wiltshiretutors.com), part of North Wales Tutoring Group.

## Site structure

Static HTML pages and dedicated `/css` and `/js` assets. Shared source components are in `/components`, site data in `/data`, and blog content is managed through `/data/blog-posts.json`. `build.py` rebuilds generated HTML pages.

## Deployment

The site is ready for static hosting. Configure your host's web root to serve `index.html`, preserve `.htaccess` where supported, and ensure HTTPS and the domain DNS are configured. The included sitemap and robots.txt reference the production domain.

## Enquiry forms

The forms use Web3Forms with AJAX and a SweetAlert success message. Test a real submission after publishing, and confirm delivery to the inbox configured in Web3Forms.
