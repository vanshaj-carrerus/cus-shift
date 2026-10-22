import { Stack } from 'expo-router';

import { LoadingScreen } from '@/components/loading-screen';
import { useAdminSession } from '@/lib/admin-session';

// Protected screens are only evaluated on the client. The real access control
// is the server, which rejects every admin API call without a valid session.
export default function AdminLayout() {
  const { status } = useAdminSession();

  if (status === 'checking') return <LoadingScreen />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Protected guard={status === 'signedIn'} redirectTo="/admin/login">
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
    </Stack>
  );
}
