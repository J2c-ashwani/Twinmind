import { supabaseAdmin } from '../src/config/supabase.js';
import { logger } from '../src/config/logger.js';

async function createYCTestUser() {
  const email = 'yc-test@twingenie.com';
  const password = 'YCombinator2026';
  const fullName = 'YC Test Account';

  console.log(`\n🔧 Creating YC test user: ${email}\n`);

  try {
    // Step 1: Create the auth user via Supabase Admin API (auto-confirmed)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,  // Auto-confirm, no email verification needed
      user_metadata: {
        full_name: fullName
      }
    });

    if (authError) {
      console.error('❌ Auth user creation failed:', authError.message);
      // Check if user already exists
      if (authError.message.includes('already') || authError.message.includes('exists') || authError.message.includes('duplicate')) {
        console.log('\n⚠️  User may already exist. Attempting to find and update...');
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (!listError) {
          const existingUser = users.find(u => u.email === email);
          if (existingUser) {
            console.log(`✅ User already exists with ID: ${existingUser.id}`);
            // Update password to ensure it matches
            const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
              password: password,
              email_confirm: true
            });
            if (updateError) {
              console.error('❌ Failed to update password:', updateError.message);
            } else {
              console.log('✅ Password updated successfully');
            }
            // Ensure profile exists in users table
            await ensureUserProfile(existingUser.id, fullName, email);
            return;
          }
        }
      }
      process.exit(1);
    }

    const userId = authData.user.id;
    console.log(`✅ Auth user created successfully! ID: ${userId}`);

    // Step 2: Create user profile in users table
    await ensureUserProfile(userId, fullName, email);

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    process.exit(1);
  }
}

async function ensureUserProfile(userId, fullName, email) {
  // Create user profile in users table
  const { data: profileData, error: profileError } = await supabaseAdmin
    .from('users')
    .upsert({
      id: userId,
      full_name: fullName,
      email: email,
      country: 'US'
    }, { onConflict: 'id' })
    .select()
    .single();

  if (profileError) {
    console.error('⚠️  Profile creation warning:', profileError.message);
  } else {
    console.log('✅ User profile created in users table');
  }

  // Create default free subscription
  const { error: subError } = await supabaseAdmin
    .from('subscriptions')
    .upsert({
      user_id: userId,
      plan_type: 'free',
      status: 'active'
    }, { onConflict: 'user_id' });

  if (subError) {
    console.error('⚠️  Subscription creation warning:', subError.message);
  } else {
    console.log('✅ Free subscription activated');
  }

  console.log('\n========================================');
  console.log('🎉 YC TEST ACCOUNT READY!');
  console.log('========================================');
  console.log(`📧 Email:    yc-test@twingenie.com`);
  console.log(`🔑 Password: YCombinator2026`);
  console.log('========================================\n');
}

createYCTestUser();
