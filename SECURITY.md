# Security

Please report a vulnerability privately: open the repo's **Security** tab and choose **Report a vulnerability**. Don't open a public issue for it.

You'll get a reply within a week. This is a small portfolio project, so there is no bug bounty, but credit is given in the fix if you'd like it.

How the app protects people: every photo is processed in the visitor's browser and never uploaded, there is no analytics or telemetry, and the production build ships a Content Security Policy that only allows requests to the app's own origin. If you find a way around any of that, it's a vulnerability, so please report it.
