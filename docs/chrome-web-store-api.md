# Chrome Web Store API

The Chrome Web Store API is Google's REST API for managing an existing Chrome Web Store item programmatically. For this project, the practical uses are:

- fetch the current CWS item status
- upload the generated extension ZIP
- submit the uploaded draft for review
- cancel an active submission
- adjust staged rollout percentage when eligible

The API does not replace the full Developer Dashboard workflow. Store listing, privacy, visibility, payment, and first-time setup still need manual review in the dashboard when Google requires it.

## Current API Version

Use the V2 API:

- base endpoint: `https://chromewebstore.googleapis.com`
- upload endpoint: `https://chromewebstore.googleapis.com/upload/v2/publishers/PUBLISHER_ID/items/EXTENSION_ID:upload`
- status endpoint: `https://chromewebstore.googleapis.com/v2/publishers/PUBLISHER_ID/items/EXTENSION_ID:fetchStatus`
- publish endpoint: `https://chromewebstore.googleapis.com/v2/publishers/PUBLISHER_ID/items/EXTENSION_ID:publish`

V1 is deprecated and should not be used for new automation.

## Prerequisites

- The extension item must already exist in the Chrome Web Store Developer Dashboard.
- The Google developer account must have 2-step verification enabled.
- The store listing and privacy tabs must be filled before publishing.
- A Google Cloud project must have the Chrome Web Store API enabled.
- OAuth credentials must be created for that project.
- The OAuth token must be created by a Google account that owns or can manage the CWS item.

## OAuth Setup

1. In Google Cloud Console, enable `Chrome Web Store API`.
2. Configure the OAuth consent screen.
3. Create an OAuth client ID.
4. Add this redirect URI to that OAuth client:

   `https://developers.google.com/oauthplayground`

5. In OAuth Playground, enable "Use your own OAuth credentials".
6. Enter the OAuth client ID and client secret.
7. Request this scope:

   `https://www.googleapis.com/auth/chromewebstore`

8. Authorize with the Google developer account that owns the CWS item.
9. Exchange the authorization code for tokens and save the refresh token outside the repository.

## Local Environment Variables

Do not commit these values.

```powershell
$env:CWS_PUBLISHER_ID = "publisher-id-from-dashboard"
$env:CWS_EXTENSION_ID = "chrome-web-store-item-id"
$env:CWS_CLIENT_ID = "oauth-client-id"
$env:CWS_CLIENT_SECRET = "oauth-client-secret"
$env:CWS_REFRESH_TOKEN = "oauth-refresh-token"
```

Alternatively, `CWS_ACCESS_TOKEN` can be set directly for short-lived manual testing.

Publishing has an extra local safety gate. After the package has been verified, the dashboard has been inspected, and a human has chosen to publish, set:

```powershell
$env:CWS_CONFIRM_PUBLISH = "publish:$env:CWS_EXTENSION_ID:v1.6.1"
```

The version suffix must match `manifest.json`. The script accepts this token only for the current item/version pair. Dry runs do not require the token.

## Commands

Check the item status:

```powershell
npm run cws:status
```

Upload the generated extension ZIP:

```powershell
npm run package
npm run verify:package
npm run verify:release
npm run cws:upload
```

Submit the uploaded draft for review:

```powershell
$env:CWS_CONFIRM_PUBLISH = "publish:$env:CWS_EXTENSION_ID:v1.6.1"
npm run cws:publish
```

Run a dry-run request shape without touching the API:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/chrome-web-store-api.ps1 -Action upload -DryRun
```

## Release Rule

Do not automate `publish` blindly. The intended flow is:

1. run tests
2. package
3. verify release
4. upload through CWS API
5. inspect CWS dashboard status and listing fields
6. set `CWS_CONFIRM_PUBLISH` for the exact item/version
7. publish through CWS API or dashboard

The API can make the release process faster, but it should not bypass final human review while the extension is still changing rapidly.
