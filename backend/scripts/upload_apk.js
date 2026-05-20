import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabaseAdmin } from '../src/config/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function uploadApk() {
  const localApkPath = path.join(__dirname, '../../mobile/build/app/outputs/flutter-apk/app-release.apk');
  
  if (!fs.existsSync(localApkPath)) {
    console.error(`❌ Local APK file not found at: ${localApkPath}`);
    console.log('Please build the APK first using: cd mobile && flutter build apk --release');
    process.exit(1);
  }

  console.log('🔗 Checking Supabase Storage bucket...');
  const bucketName = 'apks';

  try {
    // 1. Ensure the bucket exists
    const { data: buckets, error: getBucketsError } = await supabaseAdmin.storage.listBuckets();
    if (getBucketsError) {
      console.error('❌ Failed to retrieve storage buckets:', getBucketsError.message);
      process.exit(1);
    }

    const apksBucketExists = buckets.some(b => b.name === bucketName);

    if (!apksBucketExists) {
      console.log(`📦 Bucket "${bucketName}" not found. Creating a new public bucket...`);
      const { error: createBucketError } = await supabaseAdmin.storage.createBucket(bucketName, {
        public: true
      });

      if (createBucketError) {
        console.error('❌ Failed to create public bucket:', createBucketError.message);
        process.exit(1);
      }
      console.log(`✅ Public bucket "${bucketName}" created successfully.`);
    } else {
      console.log(`✅ Storage bucket "${bucketName}" already exists.`);
    }

    // 2. Read APK file
    console.log('📂 Reading local APK file...');
    const fileBuffer = fs.readFileSync(localApkPath);

    // 3. Upload to Supabase Storage
    console.log('🚀 Uploading APK to Supabase Storage (this may take a few seconds)...');
    const { data, error: uploadError } = await supabaseAdmin.storage.from(bucketName).upload(
      'twingenie-latest.apk',
      fileBuffer,
      {
        contentType: 'application/vnd.android.package-archive',
        upsert: true
      }
    );

    if (uploadError) {
      console.error('❌ Failed to upload APK:', uploadError.message);
      process.exit(1);
    }

    console.log('✨ APK uploaded successfully!');
    const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/${bucketName}/twingenie-latest.apk`;
    console.log(`\n📥 Public Download Link: ${publicUrl}\n`);
  } catch (err) {
    console.error('❌ Unexpected error during APK upload:', err.message);
    process.exit(1);
  }
}

uploadApk();
