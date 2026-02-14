# HTMLPG — HTML Pollinator Garden

> The modern-day Johnny Appleseed, except other people place the seeds. I provide the soil.

> Project notebook — ideas, tasks, decisions, and open threads. Not everything here is committed to. This is the brain dump, organized.

---

## What Is This?

Physical file-sharing boxes ("free little libraries" for digital files) installed in public/semi-public spaces. Each unit has a display (some are e-ink). Users scan a QR code at the physical location to access a web portal where they can upload or download files from 4 shared boxes. Files auto-delete after download.

**All units share the same 4 boxes.** Every physical unit is a portal into the same garden.

---

## Architecture (Current Thinking)

```
                    htmlpg.andrew-boylan.com (Vercel)
                    ┌────────────────────────────┐
  QR scan ──────►   │  Next.js App               │
                    │  - /access/<token>  verify  │
                    │  - /                portal   │
                    │  - /admin           status   │
                    │  - /api/*           backend  │
                    └─────────┬──────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Cloudflare R2     │
                    │  (S3-compatible)   │
                    │  Shared 4 boxes    │
                    └────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Pusher            │
                    │  Real-time sync    │
                    │  Channel: garden   │
                    └────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
         pvfll_001       pvfll_002       htmlpg_003 ...
         (RPi + eink)    (RPi + eink)    (ESP32? TBD)
         via Tailscale   via Tailscale   via Tailscale
```

No dedicated server. Vercel serverless functions handle everything.

---

## Units

| Unit        | Hardware        | Display          | Status     |
|-------------|-----------------|------------------|------------|
| pvfll_001   | Raspberry Pi    | Waveshare 7.5"   | Deployed   |
| pvfll_002   | TBD             | TBD              | In progress|
| htmlpg_003+ | RPi / ESP32     | Various          | Future     |

---

## Tasks

Things we're actually doing or need to do soon.

### Centralized Frontend
New Next.js app at `htmlpg.andrew-boylan.com` — replaces per-unit Vercel deploys.

- [ ] Scaffold Next.js app in `htmlpg/`
- [ ] Port components from pvfll_001 (Garden, Box, Upload, Download)
- [ ] Update styling/branding
- [ ] Deploy to Vercel, point DNS

### S3 to R2 Migration
Drop AWS, use Cloudflare R2. S3-compatible, so it's mostly swapping credentials.

- [ ] Create R2 bucket on Cloudflare
- [ ] Swap S3 endpoint/credentials in API routes
  - Same `@aws-sdk/client-s3` — change endpoint to `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
  - Add `requestChecksumCalculation: 'WHEN_REQUIRED'` to S3Client config
- [ ] Presigned URLs: same API, must use S3 API domain (not custom domain)
- [ ] Test upload/download/delete
- [ ] Remove AWS credentials

R2 Free Tier: 10GB storage, 1M writes/mo, 10M reads/mo, zero egress.

---

## Ideas

Things we want to do but haven't fully figured out yet.

### Rotating QR Code
Physical location verification. QR rotates every 30-60 min so only people physically present can access.

Possible approach:
1. Each unit has a shared secret (on device + in server env)
2. Device generates HMAC token: `HMAC-SHA256(secret, floor(time / interval))`
3. QR encodes: `htmlpg.andrew-boylan.com/access/<unit_id>/<token>`
4. Server validates token — no database needed, purely computational (TOTP-style)
5. Valid scan → session cookie (1-2 hr TTL) → redirect to portal
6. Invalid → "Visit a physical HTMLPG to get access"

Open questions: rotation interval? should the portal know which unit you came from?

### Device Management (Tailscale + Batch Deploy)
SSH into all units from anywhere. Push code updates to all at once.

Tailscale: zero-config mesh VPN. Each device gets a stable IP. Works across any network, no port forwarding. Non-technical hosts don't touch anything after initial setup.

- Install Tailscale on each unit
- Batch deploy script: loop through units, ssh + git pull + restart service

Note: ESP32 doesn't run Tailscale natively. Those units might need to just phone home over HTTPS instead.

### Content Tools / Onboarding
Help non-technical people add content to the library.

Ideas:
- Guides for: Soulseek, yt-dlp (YouTube download), LibGen, making zip files
- In-app tools? Paste a YouTube URL, server downloads it into a box?
- Better delete-after-download UX (is there a cleaner mechanism?)

---

## Decisions Made

| Decision | Choice | Why |
|----------|--------|-----|
| Storage | Cloudflare R2 | Free, not Amazon, S3-compatible |
| Frontend hosting | Vercel | Already using, serverless, free tier |
| Real-time | Pusher | Already working, keep it |
| Boxes | 4 shared across all units | Same garden, multiple portals |

---

## Open Questions

- What display will pvfll_002 / htmlpg_003 use?
- ESP32 units: Tailscale alternative?
- QR rotation interval?
- Portal: should it show which unit you scanned from, or purely a gate?
- Domain: `htmlpg.andrew-boylan.com` confirmed?
- Device VPN: Tailscale confirmed?
- QR auth approach: HMAC tokens confirmed?

---

## File Structure (Target)

```
pvfll/
├── htmlpg/                    # Central Next.js app
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx       # Portal (Garden)
│   │   │   ├── access/        # QR token verification
│   │   │   ├── admin/         # Device status
│   │   │   └── api/           # Backend routes
│   │   ├── components/        # Box, Upload, etc.
│   │   └── lib/               # Pusher, R2, token utils
│   ├── package.json
│   └── ...
├── device/                    # Shared device code (Python)
│   ├── display/               # E-ink rendering (per-display drivers)
│   ├── pusher_events.py
│   ├── api.py
│   ├── qr.py                  # QR code generation
│   └── main.py
├── scripts/
│   └── deploy.sh              # Batch deploy to all units
├── pvfll_001/                 # Legacy / reference
└── pvfll_002/                 # Hardware files
```
