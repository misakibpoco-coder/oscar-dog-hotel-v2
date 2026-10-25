# Oscar Dog Hotel V2 — সেটআপ গাইড

এই ফোল্ডারটি পুরোনো অ্যাপ (`C:\dog app`, package `com.oscardoghotel.app`) থেকে কপি করা **সম্পূর্ণ আলাদা** একটি প্রজেক্ট।
পুরোনো Supabase, পুরোনো GitHub, পুরোনো signing key বা পুরোনো কোনো secret এখানে **নেই**।
তাই এখানে যা-ই করুন, বর্তমান ইউজারদের অ্যাপের ওপর কোনো প্রভাব পড়বে না।

## পুরোনো অ্যাপ থেকে কী কী আলাদা

| বিষয় | পুরোনো (V1) | নতুন (V2) |
|---|---|---|
| Android package | `com.oscardoghotel.app` | `com.oscardoghotel.v2` (একই ফোনে দুটো অ্যাপ পাশাপাশি থাকতে পারবে) |
| Supabase | কোডে hardcoded | শুধু `.env` থেকে আসে। ফাঁকা থাকলে অ্যাপ চালুই হবে না। |
| GitHub | `telnew248-ops/oscar-dog-hotel` | কোনো remote নেই। আপনার নতুন repo যুক্ত করবেন। |
| Signing | প্রতিটি build-এ হারিয়ে যাওয়া debug key | স্থায়ী release keystore (`android/keystore.properties`) |
| Render | পাসওয়ার্ড সহ `render.yaml` | secret ছাড়া `render.yaml`, auto-deploy বন্ধ |
| Isolation guard | নেই | প্রতিটি build-এ পুরোনো project-এর চিহ্ন খোঁজে। পাওয়া গেলে build fail করে। |

কপিতে যা ইচ্ছাকৃতভাবে বাদ দেওয়া হয়েছে:
- `.git` (পুরোনো token সহ)
- `backend/.env`
- `render.yaml`-এর secret
- `backend/backups`
- `apk-output`, `dist`, `node_modules`, `android/app/build`
- `android/.../assets/public`, যা পুরোনো build ছিল এবং পুরোনো Supabase key ধারণ করত

## ধাপ ১ — নতুন Supabase
1. https://supabase.com → **New project** খুলুন (পুরোনো project নয়)।
2. SQL Editor-এ `supabase/migrations/20261025000000_v2_initial_schema.sql` ফাইলের পুরো লেখা চালান।
3. স্টাফ লগইন তৈরি করুন:
   ```sql
   SELECT public.app_admin_create_staff('1001', 'একটি-শক্ত-পাসওয়ার্ড', 'Front Desk');
   ```
4. Project Settings → API থেকে **Project URL** এবং **publishable / anon key** নিন।

## ধাপ ২ — `.env`
```bash
copy .env.example .env
```
তারপর `.env` ফাইলে মান দুটি বসান:
```
VITE_SUPABASE_URL=https://<নতুন-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<নতুন publishable key>
```

## ধাপ ৩ — চালানো ও build
```bash
npm install
npm run dev              # ব্রাউজারে http://localhost:3000
npm run build            # build + isolation check
npm run android:sync     # Android প্রজেক্টে নতুন build কপি করে
```

## ধাপ ৪ — নতুন GitHub
```bash
git init
git add .
git commit -m "Oscar Dog Hotel V2 initial import"
git branch -M main
git remote add origin https://github.com/<আপনার-নাম>/<নতুন-repo>.git
git push -u origin main
```
⚠️ remote URL-এ কখনো token বসাবেন না। Login-এর জন্য Git Credential Manager বা `gh auth login` ব্যবহার করুন।

GitHub repo → Settings → Secrets → Actions-এ যোগ করুন:
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (বাধ্যতামূলক)
- `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` (release build-এর জন্য)

## ধাপ ৫ — Release keystore (একবারই তৈরি করবেন)
```bash
keytool -genkeypair -v -keystore oscar-v2-release.jks -alias oscar-v2 -keyalg RSA -keysize 2048 -validity 10000
```
- `android/keystore.properties.example` ফাইলটি `android/keystore.properties` নামে কপি করে পূরণ করুন।
- `.jks` ফাইল এবং পাসওয়ার্ড দুটি আলাদা জায়গায় backup রাখুন। এগুলো হারালে আর কখনো আপডেট দিতে পারবেন না।
- GitHub-এর জন্য base64 করতে: `certutil -encode oscar-v2-release.jks ks.txt` (Windows)
- লোকাল release build: `cd android && gradlew bundleRelease`

## ধাপ ৬ — Backend (ঐচ্ছিক)
মোবাইল অ্যাপ এই backend ব্যবহার করে না। লাগলে `backend/.env.example` ফাইলটি `backend/.env` নামে কপি করে পূরণ করুন।
`DATABASE_URL`-এ পুরোনো project দিলে backend, migrate এবং seed তিনটিই চালু হতে অস্বীকার করবে।

## নিরাপত্তা চেকলিস্ট (release-এর আগে)
- [ ] `npm run build` সফল হয়েছে এবং `[verify-isolation] OK` দেখাচ্ছে
- [ ] Supabase dashboard-এর logs-এ শুধু **নতুন** project-এ request যাচ্ছে
- [ ] একই ফোনে পুরোনো আর নতুন অ্যাপ দুটোই চলছে এবং কেউ কারও ডেটা দেখছে না

## Security roadmap (V2 উন্নয়নের প্রথম কাজ)
V1-এর মতোই অ্যাপ সরাসরি টেবিলে লেখে, আর `organization_id` দিয়ে ডেটা আলাদা করা হয় শুধু অ্যাপের ভেতরে (client-side)।
ফলে anon key জানা যে কেউ সব organization-এর ডেটা পড়তে পারে।
Production-এ বড় পরিসরে ছাড়ার আগে tenant isolation server-side করতে হবে: Supabase Auth-এ যাওয়া, অথবা সব read/write RPC-র মাধ্যমে করে token যাচাই করা।
