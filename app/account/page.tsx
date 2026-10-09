import AppShell from '@/components/AppShell';
import AccountForm from '@/components/AccountForm';
import { createClient } from '@/lib/supabase/server';

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('business_name')
    .eq('id', user.id)
    .maybeSingle();

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl pb-20 lg:pb-0">
        <div className="mb-6">
          <h1 className="text-3xl font-black">החשבון שלי</h1>
          <p className="mt-1 text-slate-500">פרטים בסיסיים של סביבת העבודה שלך.</p>
        </div>
        <AccountForm
          email={user.email ?? ''}
          businessName={profile?.business_name ?? ''}
        />
      </div>
    </AppShell>
  );
}
