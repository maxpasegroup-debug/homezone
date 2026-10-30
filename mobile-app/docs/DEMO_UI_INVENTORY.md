# Demo UI inventory

Source audit: 2026-10-30. No application execution. Baseline: current checkout;
all classifications concern inspected source unless explicitly historical.

## Counting and classification

40 screen/form/flow units below were inspected. A shared screen used in multiple
routes is counted once, except the four AuthForm modes and two service recovery
modes because they have different behavior. Tabs, dialogs, cards and generic
workspace module instances are action variants, not additional screens. Thin
SignIn/SignUp wrappers, AccountListingScreen, layout widgets, image widgets and
app/startup containers are inspected but excluded from the total. No claim is
made that all branches have been exercised.

A = DEMO ONLY; B = LOCAL IMPLEMENTATION; C = API CONNECTED BUT NOT VERIFIED;
D = PARTIALLY INTEGRATED; E = BACKEND INTEGRATED AND RUNTIME VERIFIED;
F = BLOCKED BY MISSING BACKEND CAPABILITY. C means source wiring, not successful
communication. Local-only controls are legitimate when explicitly described.

Counts: A 17; B 5; C 11; D 7; E 0; F 0 screen units. C+D = 18 units have API
connections/mixed integration. One historical public-catalogue workflow was
verified; that does not make an entire screen or current artifact E.

Source roots in the tables are relative to lib/features/. All named routes are
defined in lib/app/homezone_app.dart. Unnamed navigation uses MaterialPageRoute.

## Screen inventory

| # | Screen / route / source | Role | Actions and actual data source | State / response / failures | Class |
|---|---|---|---|---|---|
| 1 | SplashScreen; /; auth/splash_screen.dart | Public | Bundled image, timer to onboarding; no API | Timer disposed; not authentication | B |
| 2 | OnboardingScreen; /onboarding; auth/onboarding_screen.dart | Public | Local pages; sign-in/signup/public discovery/preview navigation | Local page state; no service-success claim | B |
| 3 | RoleScreen; /roles in preview; auth/role_screen.dart | Public preview | Select five display labels, pass label to signup | Widget state only; explicit not-stored notice | A |
| 4 | AuthForm signIn; /sign-in; auth/auth_form_screen.dart | Public | Real owned PasswordAuthProtocol only when controller supplied; social buttons are notices | Busy/cancel/error, independent session check; preview has no controller | D |
| 5 | AuthForm signUp; preview /sign-up | Public preview | Name/email/password validation, 600ms delay, /success; no account write | Local simulated completion, disclosed preview | A |
| 6 | AuthForm forgot; preview /forgot-password | Public preview | Email, delay, /check-email | No email sent; local feedback | A |
| 7 | AuthForm reset; preview /reset-password | Public preview | Password rules, delay, /success | No password changed | A |
| 8 | CheckEmailScreen; /check-email; auth/recovery_screens.dart | Public preview | Open-email/resend produce snackbar; reset/sign-in navigation | Explicit no delivery/app launch; no API | A |
| 9 | SuccessScreen; /success; auth/recovery_screens.dart | Public preview | Static success icon, onboarding/sign-in navigation | Says no account/password change; no session | A |
| 10 | BuyerShell; preview /buyer, /buyer-preview; buyer/buyer_shell.dart | Buyer preview | Four tabs, local filters/favorites/history, local location picker | Memory-only state; no repository | A |
| 11 | BuyerHomeScreen; shell Home; buyer/screens/buyer_home_screen.dart | Buyer preview | Fictional featured/category/locality cards; bundled photos; browse actions | DemoProperty/filterDemoProperties, local empty state | A |
| 12 | BuyerSearchScreen; shell Search; buyer/screens/buyer_search_screen.dart | Buyer preview | Search/filter/sort demo list; map informational dialog | Local query; no maps/location backend | A |
| 13 | BuyerSavedScreen; shell Saved; buyer/screens/buyer_saved_screen.dart | Buyer preview | Local favorites, shortlist/compare links | DemoProperty + shell Set; empty state | A |
| 14 | BuyerProfileScreen; shell Profile; buyer/screens/buyer_profile_screen.dart | Buyer preview | Explorer identity, collections/history/enquiries, help/settings dialogs, leave preview | No remote editable profile; local clearing is not remote logout | A |
| 15 | BuyerPropertyDetailScreen; pushed preview; buyer/screens/buyer_property_detail_screen.dart | Buyer preview | Static detail, favorite, gallery, contact/enquiry notices | DemoProperty; no enquiry sent | A |
| 16 | BuyerGalleryScreen; pushed preview; buyer/screens/buyer_gallery_screen.dart | Buyer preview | Asset photo; photo/video/floor-plan choice | Unsupported tabs show unavailable, no playback | A |
| 17 | BuyerShortlistsScreen; pushed preview; buyer/screens/buyer_shortlists_screen.dart | Buyer preview | Create/rename/delete/select lists and favorite memberships | BuyerCollections, in-memory validation/dialogs | A |
| 18 | BuyerCompareScreen; pushed preview; buyer/screens/buyer_compare_screen.dart | Buyer preview | Select up to two fictional properties, remove | BuyerCollections comparison; no API | A |
| 19 | BuyerEnquiriesScreen; pushed preview; buyer/screens/buyer_enquiries_screen.dart | Buyer preview | Toggle fictional enquiry examples; open demo detail | Explicit no owner contacted | A |
| 20 | BuyerFilterSheet; preview modal; buyer/screens/buyer_filter_sheet.dart | Buyer preview | Local location/budget/bedroom/furnishing/category apply/reset | Returns BuyerFilters; no repository | A |
| 21 | RegistrationScreen; service /roles,/sign-up; marketplace/registration_screen.dart | Public | Start/resend/verify email OTP, then real password sign-in | Preserves credentials only in memory, busy/cooldown/expiry/error, generation ownership | C |
| 22 | AccountAccessScreen forgot; service /forgot-password; marketplace/account_access_screen.dart | Public | Real forgot API, generic delivery acknowledgment | Busy/error; invalidated-session boundary gap | D |
| 23 | AccountAccessScreen reset; service /reset-password | Public | Manual token/new password to reset API | Busy/error; boundary gap and no automatic app-link handling | D |
| 24 | RegistrationUnavailableScreen; no current named-route binding; marketplace/account_access_screen.dart | Public | Static unavailable/return-to-sign-in fallback | No account/API; legacy fallback, not evidence backend signup absent | B |
| 25 | MarketplaceScreen; service /buyer(USER), /discovery; marketplace/marketplace_screen.dart | Public/USER | Catalogue/search, saves, shortlists, enquiries, profile, visits/history/workspace, local comparison/theme | Listing/ListingPage and account JSON; generation/revision guards, pagination/loading/errors; mixed local+remote | D |
| 26 | LivePropertyScreen via AccountListingScreen; /property or pushed | Public | GET real detail, related listings, gallery/media/maps; protected save/enquiry/view history | Listing; loading/404/error/retry, nullable fallbacks | C |
| 27 | LiveGalleryScreen; pushed; marketplace/marketplace_screen.dart | Public | Real listing image URLs, zoom/scroll | ListingMedia separate credential-free transport, fallback; empty allowlists block images | C |
| 28 | EnquiryForm; pushed; marketplace/marketplace_screen.dart | Authenticated | Name/phone/message to leads endpoint | Server acknowledgment required, busy/error; no verification of owner follow-up | C |
| 29 | ComparisonScreen; pushed; marketplace/marketplace_screen.dart | Authenticated | Compare up to four already loaded real Listing objects, remove | Local selection only; no durable comparison or AI recommendation | B |
| 30 | ProfileEditScreen; pushed; marketplace/marketplace_screen.dart | Authenticated | Validate city/phone, return tuple; parent sends PATCH | Parent repository persists; form itself is not acknowledgment, session checks | C |
| 31 | LiveFilterSheet; service modal; marketplace/marketplace_screen.dart | Public | Local filter form returns map; parent reloads catalogue | Local input validation; not a separate API | B |
| 32 | WorkspaceScreen; /workspace and service /buyer(business role); workspace/workspace_screen.dart | Server-confirmed role | Role-gated modules, summary, logout, deletion-review request | Server session; no fake dashboard stats; policies/handoffs incomplete | D |
| 33 | WorkspaceRecords; pushed module list; workspace/workspace_screen.dart | Scoped role | Cursor list/refresh/more; create listing/project/lead/service/Studio/visit, nested records | JsonObject items + nextCursor, busy/error/actor checks | C |
| 34 | WorkspaceDetail; pushed record; workspace/workspace_screen.dart | Scoped role | Module-specific update/status/assignment/quote/booking/media/documents/review actions | Existing APIs; payments/complex operations use website; no native payment/refund execution | D |
| 35 | WorkspaceForm; pushed create/edit; workspace/workspace_screen.dart | Scoped role | FieldSpec validation/conversion, date chooser, POST/PATCH; listing create revalidates session | Server response, busy/error; generic JSON is weaker than typed per-module result | C |
| 36 | WorkspaceSummary; pushed; workspace/workspace_screen.dart | Nonadmin authenticated | GET account/project metrics | Real database counts; loading/error; no runtime proof | C |
| 37 | WorkspaceRecordPicker; pushed; workspace/workspace_record_picker.dart | Scoped role | Cursor-select eligible property/team/project record | JSON rows; generation/revision/loading/error guards | C |
| 38 | ListingPhotographsScreen; pushed; workspace/listing_photographs_screen.dart | Owner/Broker scope | Load/add/remove/reorder/cover images, edit video/tour links, native picker/upload | updatedAt+mediaState stale-edit checks, busy/error, public references only | C |
| 39 | PrivateDocumentsScreen; pushed; documents/private_documents_screen.dart | Authorized property/lead/Studio participant | List/pick/upload/download via native bridge | Opt-in storage/scanning/platform prerequisites; explicit unavailable errors | D |
| 40 | ProfileDashboardGate; dashboard wrapper; auth/profile_dashboard_gate.dart | Authenticated | Fetch authoritative profile, compare role, retry/sign-in | Session actor/generation/role match; missing/suspended blocked, not continuous authorization | C |

## Demo and local-data findings

- buyer/data/demo_properties.dart contains four fictional records: garden-villa,
  palm-residence, lakeside-rental and studio-office; static prices, attributes,
  descriptions and bundled images. None is real database inventory.
- BuyerShell favorites/history, BuyerCollections shortlists/comparison and preview
  filters are volatile. Preview location options are static, not geolocation.
- AuthForm non-login modes delay and navigate without service writes. Social
  sign-in buttons are explicit UI notices; there is no real mobile social login
  action wired there. No real phone-signup or fake-success OTP screen was found;
  the service registration uses email challenges and server verification.
- Auth recovery/success screens are preview screens even when reachable by a
  named route. They must not be used as evidence of verification or delivery.
- The service repository returns parsed HTTP responses, not demoProperties. Real
  comparison is deliberately local presentation of fetched data. No service fake
  transaction history or fake numeric dashboard was found in inspected mobile
  code; payment history/summary use server queries. Static option labels and status
  enumerations are not fictitious transaction records.
- Backend also contains explicitly gated demo authentication/profile fixtures.
  They are not real mobile phone registration; owner must confirm demo flags off.

## Dialog/card/menu/action ledger

Reusable card/layout/image widgets are not separate business workflows. Every
business action found is assigned to the screen or generic module above:

| Surface | Action destination / data / missing integration |
|---|---|
| Onboarding pages, Skip/Get started, browse/preview links | Navigation only; service flag determines registration versus preview |
| Role cards, Continue | Local label, no persistence or elevated access |
| Auth social icons, terms/help notices | Informational preview, not provider authentication |
| Buyer property cards/hearts, location/category/filter/sort/menu | Demo list + local Set/BuyerFilters |
| Buyer shortlist naming/delete/membership dialogs | BuyerCollections only; no HTTP |
| Preview contact/enquiry/map/video/floor-plan actions | Honest unavailable/informational feedback, no mutation |
| Service listing card/open/heart/compare | Public detail, protected savedStatus/save, local compare respectively |
| Service shortlist naming/delete/member dialogs | shortlists endpoints; cancel does nothing; server errors retained |
| Service profile edit/theme/logout/account menu | Profile parent PATCH; theme local; Auth.js logout; role workspace navigation |
| Live media/maps confirmations | Credential-free public browser/map bridge; approved host/coordinate checks; external app availability not guaranteed |
| Workspace row/detail/create/status/assignment dialogs | Actual module APIs described in SCREEN_MAPPING, not fake success by button response |
| Date/time picker, record picker, FieldSpec fields | Local validated input; subsequent server write required |
| Photo cover/reorder/remove/link dialog | Media endpoint with optimistic stale-state metadata; remove reference does not delete provider object |
| Payment continuation/refund/deletion dialogs | Capability-gated website handoff or review record; never proof of payment/refund/deletion |
| Document picker/open | Private native bridge and scoped backend; no public-image substitution |
| Retry, Load more, Refresh, sign-in-again controls | Existing Future/cursor requests; not evidence they succeed |

## Scope and confidence

All 55 mobile Dart source files were included in source discovery; screen units
and supporting data/repository/transport were inspected. Generic forms cover many
module instances, so 40 is not a claim of 40 independently implemented products.
The backend inventory provides handler/model/schema evidence and the mapping file
provides exact service contracts. No exhaustive runtime, authorization proof or
secret scan was performed. Existing application code and demo assets were retained.

## Complete widget and interaction source index

Supporting widgets and all callback/dialog construction sites below are inspection anchors, not additional screen counts. Row descriptions above distinguish their data and effects. Line numbers are for this checkout.

| File | Widget class declarations (line) | Action/dialog/navigation sites (lines) |
|---|---|---|
| mobile-app/lib/app/homezone_app.dart | HomezoneApp:19 |  |
| mobile-app/lib/features/auth/auth_form_screen.dart | AuthFormScreen:10 | 90, 105, 107, 113, 257, 264, 266, 277, 278, 303, 305, 316, 336, 340, 350, 353, 354, 380, 384 |
| mobile-app/lib/features/auth/auth_screens.dart | SignInScreen:5, SignUpScreen:17, ForgotPasswordScreen:24, ResetPasswordScreen:31 |  |
| mobile-app/lib/features/auth/onboarding_screen.dart | OnboardingScreen:5 | 66, 75, 76, 191, 193, 211, 212, 220, 221 |
| mobile-app/lib/features/auth/profile_dashboard_gate.dart | ProfileDashboardGate:6 | 56, 59 |
| mobile-app/lib/features/auth/recovery_screens.dart | CheckEmailScreen:5, SuccessScreen:70 | 39, 44, 49, 53, 114, 123 |
| mobile-app/lib/features/auth/role_screen.dart | RoleScreen:5 | 80, 87, 89, 98 |
| mobile-app/lib/features/auth/splash_screen.dart | SplashScreen:5 | 18 |
| mobile-app/lib/features/buyer/buyer_shell.dart | BuyerShell:17 | 73, 88, 128, 154, 173, 204, 246, 255, 267, 276, 281, 303 |
| mobile-app/lib/features/buyer/screens/buyer_compare_screen.dart | BuyerCompareScreen:6 | 35, 105, 117 |
| mobile-app/lib/features/buyer/screens/buyer_enquiries_screen.dart | BuyerEnquiriesScreen:5 | 29, 47 |
| mobile-app/lib/features/buyer/screens/buyer_filter_sheet.dart | BuyerFilterSheet:5 | 57, 67, 70, 73, 76, 89, 108, 114, 117, 120, 123, 140, 154, 164 |
| mobile-app/lib/features/buyer/screens/buyer_gallery_screen.dart | BuyerGalleryScreen:8 | 43, 50 |
| mobile-app/lib/features/buyer/screens/buyer_home_screen.dart | BuyerHomeScreen:8 | 53, 67, 76, 97, 138 |
| mobile-app/lib/features/buyer/screens/buyer_profile_screen.dart | BuyerProfileScreen:7 | 18, 26, 92, 97, 99 |
| mobile-app/lib/features/buyer/screens/buyer_property_detail_screen.dart | BuyerPropertyDetailScreen:7 | 24, 29, 38, 71, 113, 120, 124, 128, 143, 162, 171 |
| mobile-app/lib/features/buyer/screens/buyer_saved_screen.dart | BuyerSavedScreen:6 | 42, 47, 62 |
| mobile-app/lib/features/buyer/screens/buyer_search_screen.dart | BuyerSearchScreen:7 | 55, 56, 64, 74, 78, 85, 89, 90, 92, 93, 101, 110 |
| mobile-app/lib/features/buyer/screens/buyer_shortlists_screen.dart | BuyerShortlistsScreen:6 | 32, 49, 53, 59, 91, 105, 112, 116, 120, 138 |
| mobile-app/lib/features/buyer/widgets/buyer_components.dart | BuyerPage:6, EmptySection:30, CategoryFilter:63, PropertyResults:107 | 76, 80, 83, 87 |
| mobile-app/lib/features/buyer/widgets/property_card.dart | PropertyCard:5, _Fact:149 | 22, 81 |
| mobile-app/lib/features/documents/private_documents_screen.dart | PrivateDocumentsScreen:6 | 131, 141, 145, 199, 236, 241 |
| mobile-app/lib/features/marketplace/account_access_screen.dart | AccountAccessScreen:5, RegistrationUnavailableScreen:149 | 116, 128, 130, 134, 136, 161 |
| mobile-app/lib/features/marketplace/account_listing_screen.dart | AccountListingScreen:6 | 70 |
| mobile-app/lib/features/marketplace/marketplace_screen.dart | MarketplaceScreen:11, ListingImage:1010, LivePropertyScreen:1084, LiveGalleryScreen:1375, EnquiryForm:1400, ComparisonScreen:1528, ProfileEditScreen:1609, LiveFilterSheet:1690, _ShortlistNameDialog:1896 | 245, 335, 362, 369, 400, 414, 421, 430, 462, 481, 521, 525, 535, 538, 555, 579, 599, 634, 651, 670, 673, 682, 683, 687, 711, 715, 738, 775, 800, 803, 824, 825, 843, 848, 853, 863, 870, 883, 891, 895, 897, 906, 934, 942, 959, 980, 989, 1164, 1179, 1221, 1241, 1245, 1272, 1273, 1283, 1287, 1314, 1316, 1361, 1517, 1591, 1676, 1678, 1735, 1768, 1792, 1836, 1851, 1855, 1872, 1884, 1923, 1927, 1929 |
| mobile-app/lib/features/marketplace/public_listing_media_button.dart | PublicListingMediaButton:5 | 38, 48, 52, 90 |
| mobile-app/lib/features/marketplace/registration_screen.dart | RegistrationScreen:11 | 216, 350, 370, 388, 406, 408 |
| mobile-app/lib/features/workspace/listing_photographs_screen.dart | ListingPhotographsScreen:6, _PublicMediaLinkDialog:318 | 101, 111, 115, 162, 188, 213, 222, 237, 265, 279, 286, 293, 310, 370, 374, 376 |
| mobile-app/lib/features/workspace/workspace_record_picker.dart | WorkspaceRecordPicker:5 | 110, 138, 144, 148 |
| mobile-app/lib/features/workspace/workspace_screen.dart | WorkspaceScreen:146, WorkspaceRecords:348, WorkspaceDetail:825, WorkspaceForm:1772, WorkspaceSummary:2033 | 159, 217, 222, 223, 237, 259, 268, 269, 279, 283, 329, 475, 643, 704, 712, 750, 752, 762, 786, 866, 880, 902, 911, 915, 931, 944, 946, 1126, 1138, 1282, 1317, 1571, 1675, 1685, 1689, 1727, 1763, 1868, 1936, 1957, 2019, 2066 |
| mobile-app/lib/main.dart | _ServiceStartup:72 |  |
| mobile-app/lib/shared/ui/auth_components.dart | AuthLayout:4, SectionHeader:27, AppCard:63, PrimaryButton:80, AppInput:107, PasswordInput:139, PreviewNotice:188 | 95, 177 |
