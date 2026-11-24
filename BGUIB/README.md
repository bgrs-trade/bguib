# Benishangul-Gumuz Regional State Urban and Infrastructure Bureau — Official Portal & Staff CMS

Full-stack web application built for **Cloudflare Pages + Cloudflare Functions + Cloudflare D1 (SQLite) + Cloudflare R2 (File Storage)**.

## Included Project Structure
```text
bgui-portal-cloudflare/
├── public/
│   └── index.html               # Complete Bilingual Public Portal + Staff & Admin Management Modal
├── functions/
│   ├── _utils.js                # Web Crypto PBKDF2 password hashing & HMAC-SHA256 JWT auth
│   └── api/
│       ├── auth.js              # Admin first-time registration, Staff registration, Admin approval & Sign In
│       ├── content.js           # CRUD API for Resources/Policies, News/Media, Tenders/Notices & Projects
│       ├── eservices.js         # Citizen E-Service applications, Status Tracking & Staff Official Responses
│       └── files.js             # Cloudflare R2 file upload & download endpoint (PDF, DOCX, XLSX, Images)
├── schema.sql                   # Cloudflare D1 database tables
├── wrangler.toml                # Cloudflare Pages, D1 & R2 bindings configuration
└── package.json                 # Local dev & deployment scripts
```

## How to Deploy on Cloudflare (`https://dash.cloudflare.com/`)

### Step 1: Create D1 Database & R2 Storage Bucket
1. Log in to **https://dash.cloudflare.com/**.
2. Go to **Storage & Databases → D1 SQL Database → Create**:
   - Name it `bgui_db` and copy its **Database ID**.
   - Open the **Console** tab inside `bgui_db`, paste the contents of `schema.sql`, and click **Execute**.
3. Go to **Storage & Databases → R2 Object Storage → Create bucket**:
   - Name it `bgui-files`.

### Step 2: Deploy to Cloudflare Pages
1. Go to **Workers & Pages → Create → Pages**:
   - Connect your GitHub/GitLab repository containing these files (or upload directly via Wrangler CLI: `npx wrangler pages deploy ./public`).
   - Set **Build output directory** to `public` (leave build command empty).
2. Inside your new Pages project, go to **Settings → Bindings** (or **Functions**):
   - **D1 database binding**: Variable name = `DB`, D1 database = `bgui_db`.
   - **R2 bucket binding**: Variable name = `BUCKET`, R2 bucket = `bgui-files`.
   - **Environment Variable**: Variable name = `JWT_SECRET`, Value = any strong random secret string.
3. Click **Retry deployment** (or push a commit) so the bindings take effect.

### Step 3: First-Time Admin & Staff Workflow
1. Open your deployed Cloudflare Pages URL and click **Staff Portal** in the top bar (or footer).
2. Click **Register Account** → Select **System Administrator (First-Time Admin Setup)** → Register and immediately **Sign In**.
3. Staff members click **Register Account** → Select **Bureau Staff Member** → Their status is set to **Pending** until the Admin signs in, opens **Admin: Staff Approvals**, and clicks **Confirm / Approve**.
4. Once approved, Staff can sign in to upload files to **Resources & Policies**, publish **News & Media**, attach & edit **Tenders**, update **Projects**, and respond to **Citizen E-Services**.
