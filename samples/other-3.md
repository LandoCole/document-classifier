---
type: other
title: Release Notes, Beacon Ledger Desktop 7.4
---
# Beacon Ledger Desktop - Release Notes

## Version 7.4.0 (October 13, 2026)

This release adds multi-currency reconciliation, a rebuilt import wizard and several fixes. Upgrading from 7.3.x is recommended for all users. The update is delivered automatically; to install manually, choose **Help > Check for Updates**.

### New Features

- **Multi-currency reconciliation.** Match bank transactions in a foreign currency against ledger entries using the exchange rate on the transaction date. Rate sources can be configured under **Settings > Currencies**.
- **Import wizard 2.0.** Import CSV, OFX and QIF files with a live preview, column mapping and duplicate detection. Saved mappings can be re-used for recurring files.
- **Keyboard shortcuts.** Press `Ctrl+K` (or `Cmd+K` on macOS) to open the command palette.
- **Dark mode scheduling.** The app can now switch themes automatically at sunset.
- **Report export.** Reports can be exported to PDF with embedded fonts and bookmarks.

### Improvements

- Opening a ledger with more than 500,000 entries is now about 40% faster.
- Search results are highlighted and sorted by relevance.
- Improved accessibility: all dialogs now support screen readers, and focus order has been corrected on the Accounts screen.
- The sync indicator now shows the time of the last successful sync.
- Updated translations for German, Japanese and Brazilian Portuguese.

### Bug Fixes

- Fixed a crash when deleting a split transaction that referenced an archived account (BL-4821).
- Fixed incorrect balance display after undoing a transfer (BL-4790).
- Fixed an issue where scheduled transactions were created twice after daylight saving time changes (BL-4755).
- Fixed a rare data loss bug when the app was closed during a backup (BL-4802).
- Fixed misaligned columns when printing the account register on A4 paper (BL-4733).
- Resolved an error "Database is locked" on network drives (BL-4698).

### Known Issues

- The command palette may not open on some non-US keyboard layouts. Workaround: use the **View** menu.
- OFX files from certain banks with a malformed date header may fail to import. A fix is planned for 7.4.1.

### Deprecations

- Support for Windows 8.1 and macOS 11 ends with this release. Version 7.5 will require Windows 10 or macOS 12 or later.
- The legacy QuickReport format will be removed in version 8.0.

### System Requirements

| Platform | Minimum Version | Disk Space |
|---|---|---|
| Windows | 10 (64-bit) | 450 MB |
| macOS | 11 Big Sur | 380 MB |
| Linux | Ubuntu 20.04 or equivalent | 410 MB |

### Upgrade Notes

Before upgrading, back up your ledger files under **File > Backup**. The database schema is upgraded from version 31 to 32 on first launch and cannot be downgraded. Plugins compiled for 7.3 must be reinstalled.

## Version 7.3.2 (September 8, 2026)

- Fixed a security issue in the file preview component (CVE-2026-31872).
- Fixed incorrect rounding of tax amounts in invoices with discount lines.
- Minor performance improvements.

## Version 7.3.1 (August 11, 2026)

- Fixed login failures with single sign-on on some enterprise configurations.
- Fixed an issue with the Recent Files menu on Linux.

For support, visit support.beaconledger.example or email help@beaconledger.example.

(c) 2026 Beacon Ledger Software, Inc. All rights reserved.
