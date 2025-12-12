Github Link: https://github.com/ar162387/bms.git



BMS — Building Management System (Plain‑English Guide)

This project is a Building Management System (BMS) designed to help real estate owners, building managers, committees/boards, and residents run a building smoothly. It brings day‑to‑day tasks into one place: bookings, inspections, announcements, documents, and instant alerts.

Use this README if you want a non‑technical, big‑picture overview. Links to deeper, technical documents are provided at the end.

Who this is for

Building managers and strata/property managers
Committee/board members and office administrators
Residents/tenants who need to book facilities
Contractors and service providers who need organized communication
IT teams supporting a buildings portfolio (see “For IT teams” below)
What you can do with BMS

Keep everyone informed in real time: alerts appear instantly in the app when things change.
Run facility bookings without phone calls: residents scan a QR code and book on their own.
Manage inspections with structured checklists, photos, and statuses.
Store and organize important building documents in a simple library.
Send building‑wide announcements by email with status tracking and retries.
Stay compliant with reminders for contractor document and insurance expiries.
Manage multiple buildings with one account (each user sees only the buildings they should).
Everyday examples

A resident wants the gym at 6pm: they scan a QR code in the lobby, pick a time, and get a confirmation. The manager sees bookings instantly.
A contractor’s insurance expires tomorrow: the system shows a warning until it’s updated, so compliance doesn’t slip.
A pipe leak needs urgent access: send an announcement to affected residents with photos/attachments; see who was sent successfully.
Annual safety inspection: use a checklist with pass/fail, comments, and photo uploads; keep everything together for easy review later.
Key features in plain English

Real‑time alerts (no refresh required)

When something important changes (new booking, document expiring, resident awaiting approval), everyone who needs to know sees an alert right away in the app’s top bar. No page refreshes. No delays.

Amenity bookings with QR codes

Turn any facility (gym, BBQ area, meeting room) into self‑service booking. Print or share a QR code. Residents don’t need an account to request a slot. Managers approve or manage bookings from the admin view.

Inspections that feel organized

Create inspections with sections and items (like “Electrical” or “Fire Safety”), mark pass/fail, add comments, and upload photos. Keep a clean record of what was checked and when.

A simple document library

Folders for your building documents (policies, certificates, manuals). Upload files, replace old versions safely, and download when needed. Clean structure, no lost attachments.

Targeted email announcements

Compose and send rich emails (with attachments) to residents. The system tracks send status and handles retries for failed deliveries. Pick exactly who should receive each announcement.

Compliance reminders

Contractor documents and insurances trigger reminders before they expire (and show as expired if overdue), so you act on time.

How it works (simple view)

Sign in and pick your building (if you manage more than one).
Use the left‑hand menu to open areas like Amenities, Bookings, Inspections, Library, or Announcements.
Watch the top‑bar bell for real‑time alerts and counts.
Make a change (approve a resident, update a document, confirm a booking) and the system updates for everyone else immediately.
Benefits at a glance

Faster response times (real‑time alerts)
Fewer calls and emails (self‑service bookings, clear status)
Better records (structured inspections and documents)
Clear communication (targeted announcements)
Lower risk (expiry reminders and visibility)
Scales to many buildings with consistent processes
Privacy and security basics

Each user only sees the buildings they’re allowed to manage.
Attachments are stored securely and linked to the right records.
Email sending uses building‑specific settings so messages come from the right address.
Activity creates a clear audit trail in the database (what changed and when).
Getting started (non‑technical)

Decide who will use the system (managers, committee, contractors, residents).
Gather core details for each building (contacts, amenities, documents).
Ask your IT team or vendor to set it up using the technical guides below.
Share the QR code for public bookings and send your first announcement.
Keep an eye on the top‑bar alerts for anything needing attention.
Where to learn more (plain‑English documents)

Real‑time notifications and WebSockets: IMPLEMENTATION_SUMMARY.md, README_WEBSOCKET.md, WEBSOCKET_QUICK_START.md
Notification overview: NOTIFICATION_SYSTEM_SUMMARY.md
Amenity bookings (QR code flow): AMENITY_BOOKING_SYSTEM.md
Amenity management: AMENITY_SYSTEM_IMPLEMENTATION.md
Inspections: INSPECTION_SYSTEM_IMPLEMENTATION.md
Document library: LIBRARY_SYSTEM_IMPLEMENTATION.md
Email announcements: ANNOUNCEMENTS_MODULE_IMPLEMENTATION.md
If you’re just evaluating, skim these first: IMPLEMENTATION_SUMMARY.md → AMENITY_BOOKING_SYSTEM.md → INSPECTION_SYSTEM_IMPLEMENTATION.md.

For IT teams (technical pointers)

Backend framework: Laravel (PHP). See backend/README.md and env/broadcasting setup in the notification docs above.
Frontend: React + TypeScript + Vite. See frontend/README.md.
Real‑time updates use WebSockets; implementation and quick starts are linked above.
Environment variables and credentials should be configured per environment (never hard‑code secrets in source control).
FAQ (short answers)

Do residents need an account to book? Not for the QR‑code public form. Admins still review/manage bookings.
Can it handle many buildings? Yes. Data is scoped by the selected building.
Can I limit who can do what? Yes. Roles and permissions are supported at the application level.
Will people know instantly when things change? Yes. Alerts update in real time.
Can I export data? List pages support export tools where relevant.
What do I need to use it? A modern web browser and an internet connection.
Glossary

Amenity: A shared facility (gym, pool, BBQ area, meeting room) residents can book.
Booking: A time‑bound reservation for an amenity.
Inspection: A structured checklist with sections, items, and evidence (photos/comments).
Announcement: A broadcast email to selected residents with optional attachments.
Library: Folder‑based storage for building documents.
Real‑time alert: An in‑app notification that appears immediately without refreshing.