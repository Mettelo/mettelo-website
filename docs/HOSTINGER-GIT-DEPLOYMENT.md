# Hostinger Git deployment

Source branch: main. Deployment branch: hostinger-release.
The deployment branch contains only public website files, with index.html at its root.
No package.json, dependencies or build command is needed on Hostinger.

Use the existing PHP/HTML site's Dashboard > Advanced > Git.
Choose Mettelo/mettelo-website, branch hostinger-release, destination public_html.
Back up the current website before the first deployment. Keep existing custom hosting
rules if any: review .htaccess before replacement. Do not change DNS for this step.
Enable Hostinger auto-deployment after verifying the initial deployment.

GitHub Actions validates all nine suites, prepares the same public-file package and
updates hostinger-release after each source-branch push, or via Run workflow.
GitHub Actions must have permission to run and write repository contents; any branch
protection must allow the release workflow. Review the Actions run before expecting
Hostinger to deploy. Do not edit files directly on the generated release branch.

The static/Node importer shown in the screenshot is not the selected deployment route:
static-only hosting cannot execute the PHP waitlist handler. PHP 8.1+ is required.
The live waitlist uses the separate PHP service at https://forms.mettelo.com/index.php.
Authenticated notification delivery to hello@mettelo.com was verified on 21 October
2026. Mail credentials and abuse counters remain outside public_html. The source
PHP config stays disabled for local previews; do not deploy or commit real tokens.

Verify /, /start/, /our-story/, /terms/, /privacy/, /community-guidelines/ and /contact/;
check images, mobile menu, resource links and waitlist availability notice. Never
publish private backups or credentials inside public_html.

## App importer alternative (static only)
Select main, build command npm run build, output directory dist, Node 24.
The repository now includes package.json without any package dependencies.
This build validates the website and excludes all PHP files from public output.
The static form uses the same separately hosted PHP service; its GET availability
check keeps the form disabled if that service is unavailable.
Use PHP/HTML Git deployment with hostinger-release if the PHP waitlist is needed.
