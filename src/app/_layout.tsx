import { DarkTheme, Stack, ThemeProvider, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { AdminSessionProvider } from '@/lib/admin-session';
import { EmployeeSessionProvider, useEmployeeSession } from '@/lib/employee-session';

SplashScreen.preventAutoHideAsync();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.background,
    card: Colors.background,
    text: Colors.foreground,
    border: Colors.border,
    primary: Colors.accent,
  },
};

export default function RootLayout() {
  return (
    <ThemeProvider value={navTheme}>
      <AdminSessionProvider>
        <EmployeeSessionProvider>
          <StatusBar style="light" />
          <Navigator />
        </EmployeeSessionProvider>
      </AdminSessionProvider>
    </ThemeProvider>
  );
}

// The app opens straight into the employee flow: sign-in when nobody is signed
// in, otherwise the home screen with check-in / check-out. The admin area is
// separate and reachable from the sign-in screen.
//
// These guards only decide what the UI shows; the real access control is the
// server, which rejects check-in/out without a valid employee session.
function Navigator() {
  const { status } = useEmployeeSession();

  // Keep the splash screen up while the saved session is checked, so a signed-in
  // employee never sees the sign-in screen flash by.
  useEffect(() => {
    if (status !== 'checking') SplashScreen.hideAsync();
  }, [status]);

  if (status === 'checking') return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
      <Stack.Protected guard={status === 'signedIn'} redirectTo="/login">
        <Stack.Screen name="index" />
        <Stack.Screen name="checkin/[action]" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'signedOut'} redirectTo="/">
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Screen name="admin" />
    </Stack>
  );
}

// Ported from the web app's error.tsx.
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <Screen center>
      <View accessibilityRole="alert" style={styles.card}>
        <View style={styles.iconWrap}>
          <Icon name="triangle-alert" size={26} color="danger" />
        </View>
        <AppText variant="heading">Something went wrong</AppText>
        <AppText variant="body" color="muted" style={styles.center}>
          We couldn&apos;t load this screen. This is usually a temporary problem reaching the server.
          Please try again.
        </AppText>
        <Button label="Try again" icon="rotate-ccw" onPress={retry} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    padding: Spacing.four,
    gap: Spacing.three,
    alignItems: 'center',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { textAlign: 'center' },
});
