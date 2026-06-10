# Billing and Entitlements

DaD has a dormant billing foundation, not an active paywall.

The extension must not embed Stripe, Paddle, Lemon Squeezy, or any other payment provider script. Payment must happen outside the extension on a hosted checkout page. The extension should only represent entitlement state returned by a backend service.

## Current Extension Layer

The current first layer is provider-neutral:

- `src/js/shared/billing.js` defines normalized billing config and entitlement records.
- `src/js/options/billing.js` can render a supporter panel only when `billingIntegration.enabled` is explicitly set to `true`.
- No payment UI is shown by default.
- No feature gating is active.
- No payment provider keys are stored in the extension.
- No remote code is loaded.
- No entitlement network request is made by this layer.

## Sync Storage Keys

`billingIntegration`

```json
{
  "enabled": false,
  "provider": "none",
  "checkoutUrls": {
    "supporterMonthly": "",
    "lifetime": ""
  },
  "portalUrl": "",
  "entitlementApiBaseUrl": "",
  "supportEmail": ""
}
```

`billingEntitlement`

```json
{
  "plan": "free",
  "status": "inactive",
  "source": "local",
  "expiresAt": null,
  "checkedAt": null
}
```

`billingIdentity`

```json
{
  "token": "",
  "email": "",
  "licenseKey": "",
  "createdAt": null
}
```

This record is intentionally empty by default. It exists so a later backend integration can attach a browser token, account email, or license key without redesigning extension storage.

Allowed plans:

- `free`
- `supporter_monthly`
- `lifetime`

Allowed statuses:

- `inactive`
- `active`
- `past_due`
- `canceled`

Allowed sources:

- `local`
- `stripe`
- `paddle`
- `lemonsqueezy`
- `manual`

## Backend Contract Direction

When billing is activated, the backend should own payment provider details and webhooks.

Expected backend endpoints:

```text
GET /entitlement?token=<browser-or-account-token>
POST /checkout/monthly
POST /checkout/lifetime
POST /billing-portal
POST /webhooks/<provider>
```

Expected entitlement response:

```json
{
  "plan": "supporter_monthly",
  "status": "active",
  "source": "stripe",
  "expiresAt": "2026-07-05T00:00:00.000Z",
  "checkedAt": "2026-06-05T00:00:00.000Z"
}
```

The backend should validate provider webhooks and persist entitlement by account, email, or license identity. The extension should never decide payment truth from a checkout redirect alone.

## Stripe Activation Path

If Stripe is chosen:

- Use Stripe Checkout for purchases.
- Use `mode: subscription` for the monthly supporter plan.
- Use `mode: payment` for the lifetime plan.
- Use Stripe Customer Portal for cancellation, invoices, and payment method updates.
- Use webhooks to update entitlement state.

Minimum webhook events:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

## Policy Constraints

The extension package must remain self-contained and inspectable:

- Do not load hosted payment JavaScript inside extension pages.
- Do not put secret keys in the extension.
- Do not add host permissions only for a dormant billing layer.
- Do not gate existing protection behavior until the paid feature model is explicitly designed.

For current Chrome Web Store privacy wording, the dormant layer does not require selecting payment data because the extension does not collect or process payment information.
