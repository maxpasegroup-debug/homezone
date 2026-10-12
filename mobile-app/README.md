# HOMEZONE Mobile — Phase 2B

UI-only Flutter authentication experience within the existing HOMEZONE repository.
Developed with Flutter 3.44.0 / Dart 3.12.0. No new dependencies.

## Development
From mobile-app:
- flutter pub get
- dart format lib test
- flutter analyze
- flutter test
- flutter run

## Screens and navigation
Splash -> Find Your Perfect Home -> Smarter Property Decisions -> Choose Your Role
-> Create Account -> local success preview.
Welcome Back -> Reset Password -> Check Your Email -> explicitly labeled Set New
Password preview -> local success preview.
Continue to Home still returns to onboarding. The separate buyer demo is accessible through Explore buyer preview on the sign-in screen.

Role selection lives in widget state and is passed only to the account screen.
Form controllers are disposed. Consent is local only and not persisted.
Sign-in, social buttons, email actions and password changes are disconnected.
Loading is a 600ms local UI demonstration. Every outcome states that no real
authentication, account creation, email or password change happened.
The legal-consent dialog is placeholder information, not approved legal terms.

## Architecture
lib/app: named route configuration
lib/theme: forest/ivory/gold tokens, typography, system light/dark themes
lib/shared/ui: reusable layouts, fields, buttons and notices
lib/features/auth: onboarding, role selection, forms and recovery/success screens
test/widget_test.dart: 16 navigation, role selection, validation, loading,
visibility, social-preview, small-screen and dark-mode widget tests

## Reference and differences
Primary specification: assets/reference/homezone-auth-reference.png, inspected
before implementation. Matches the forest-green/ivory/gold direction, role
choices, centered form headings, rounded controls and recovery/success flow.
Original photography, standalone logo and font files were not supplied.
HOMEZONE uses a restrained text wordmark; no replacement logo is claimed.
Material icons substitute for the reference's bespoke illustrations.
Bundled residential photos are alternatives, not the reference's original homes.
Google is a labeled button rather than a recreated multicolor trademark.
Accessibility targets and explicit preview notices add content beyond the image.
No pixel-perfect or emulator/device validation is claimed.

Android/iOS launcher assets and release identifiers remain Flutter template
defaults. Review approved brand assets and legal copy before release.
iOS native builds require macOS and Xcode.

## Phase 3A - Buyer preview

Open the sign-in screen and select Explore buyer preview, or use the /buyer
named route during development. This is a demo entry, not authentication.
Home, Search, Saved and Profile share shell-owned in-memory favorites and filters.
Search matches demo titles, locations, property types and categories. Location
and category filters apply across Home and Search; Saved shows all local favorites.
Dubai intentionally has no inventory to demonstrate an empty state. No GPS,
production APIs or network images are used. Representative residential photos
are reused for fictional listings, including the office demo.

lib/features/buyer/data contains the dedicated model and four mock listings;
screens and widgets contain reusable tab layouts, cards and empty states.
test/buyer_widget_test.dart adds ten tests for navigation, search, favorites,
location selection, preview sign-out and narrow layouts with enlarged text.
No dependencies were added. Recently viewed is an empty state; property details
are outside this phase. Favorites reset on leaving the buyer area or restarting.
Sign out of preview returns to sign-in and does not end a real session.
The new buyer UI has not been verified on an emulator/device in this phase.