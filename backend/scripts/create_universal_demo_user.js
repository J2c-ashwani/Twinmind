import { supabaseAdmin } from '../src/config/supabase.js';

async function createUniversalDemoUser() {
  const email = 'demo@twingenie.com';
  const password = 'TwinGenieDemo2026!';
  const fullName = 'Investor Demo Account';

  console.log(`\n🔧 Creating universal demo user: ${email}\n`);

  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    });

    if (authError) {
      if (authError.message.includes('already') || authError.message.includes('exists') || authError.message.includes('duplicate')) {
        console.log('⚠️  User already exists. Updating password & confirming email...');
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
        const existing = users.find(u => u.email === email);
        if (existing) {
          await supabaseAdmin.auth.admin.updateUserById(existing.id, {
            password: password,
            email_confirm: true
          });
          await ensureUserProfile(existing.id, fullName, email);
          return;
        }
      }
      console.error('❌ Auth error:', authError.message);
      process.exit(1);
    }

    await ensureUserProfile(authData.user.id, fullName, email);
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    process.exit(1);
  }
}

async function ensureUserProfile(userId, fullName, email) {
  await supabaseAdmin.from('users').upsert({
    id: userId,
    full_name: fullName,
    email: email,
    country: 'US'
  }, { onConflict: 'id' });

  await supabaseAdmin.from('subscriptions').upsert({
    user_id: userId,
    plan_type: 'free',
    status: 'active'
  }, { onConflict: 'user_id' });

  console.log('========================================');
  console.log('🎉 UNIVERSAL DEMO ACCOUNT READY!');
  console.log('========================================');
  console.log(`📧 Email:    demo@twingenie.com`);
  console.log(`🔑 Password: TwinGenieDemo2026!`);
  console.log('========================================\n');
}

createUniversalDemoUser();
