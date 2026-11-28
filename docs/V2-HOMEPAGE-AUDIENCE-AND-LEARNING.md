# Audience, learning and ecosystem homepage refinement

Owner direction: lead with practical contribution while showing wider support; create a new audience-relevant hero rather than copying the V1 support selector; make community/learning/presenter participation tangible; restore the full ecosystem; improve organisation language and FAQs. This supersedes the support-finder hero in the preceding homepage notes.

## Implemented

- Hero: practical experience first, with career resources, interviews and professional connections explained alongside it. A new interactive route guide responds to Starting out, Changing direction and Growing my career. These are editorial suggestions, not a stored personal assessment or a claim of AI matching. Project previews remain only in the following catalogue section.
- Community: dedicated participation panel with illustrative ways to contribute, a direct existing community link and guidelines. No invented chat messages, members, activity counts or actual channel-name claims.
- Career preparation: concrete application/interview resource descriptions and clear access expectations, without promising guaranteed mentoring or automatic private-space access.
- Learning: two actual Mettelo recordings, verified by reading the official channel's video list on 2 November 2026: Power Query workshop Part 2 (3aGN8qjMQm8) and GitHub Issues, Pull Requests & Code Review (O6eZUWORtn8). Their watch links remain available without JavaScript. Locally styled cover artwork represents topics, not captured video thumbnails.
- YouTube integration: no player/remote thumbnail is loaded initially. A labelled Load workshop button creates a youtube-nocookie.com player after an explicit choice; playback does not start automatically. A direct YouTube fallback remains. Privacy wording now describes this opt-in embed rather than saying the website never embeds third-party content. No assertion that privacy-enhanced mode prevents all data processing.
- Presenter invitation: explains the proposal, intended audience and learning outcome, and uses the existing workshop proposal route. No invented automated booking or presenter-selection process.
- Full ecosystem: Community, Labs, Proof, Talent, Research, AI and Summit, plus Connect / Build / Prove / Progress. Available routes and developing capabilities are distinguished; no dead links to unimplemented products.
- Organisations: specific collaboration invitation and Discuss a collaboration action to the existing project-enquiry section, replacing Talk to Mettelo.
- Nine FAQs cover audience, beginners, existing members, project selection, resources, presenting, availability, outcomes and support. Native disclosure retains keyboard behaviour.

## Evidence

Public build, existing page/content/asset checks, three catalogue tests, two packaging tests and static output audit passed. The public package has 90 files and excludes application source, private inputs and PHP. Homepage local initial assets remain below the existing 100KB build guard. New behaviour is in small plain-browser scripts; no dependency or backend was added.

Browser confirmed career-change selection updates the heading, all three steps and destination. It found zero iframes before choosing a video. Choosing Load Power Query workshop created the real YouTube player, displaying the correct workshop title, Mettelo channel and Play video control; playback was not started. Mobile viewport was actually 390px, with client and scroll widths both 375px, including the loaded player. The expanded beginner FAQ displayed its answer. These checks are not a claim of a full accessibility, physical-device, performance or usability-study pass.

The source recordings are public at https://www.youtube.com/@Officialmettelo/videos, https://www.youtube.com/watch?v=3aGN8qjMQm8 and https://www.youtube.com/watch?v=O6eZUWORtn8. Embedding availability can change; watch links are retained for recovery.

No database, account, application, production hosting, newsletter subscription or community message changed. No production deployment. Remaining V2 release gates continue to apply.
