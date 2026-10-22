import { Redirect } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type TextInputInstance } from 'react-native';

import { AppText } from '@/components/app-text';
import { BackLink } from '@/components/back-link';
import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { ErrorNotice } from '@/components/notice';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAdminSession } from '@/lib/admin-session';

export default function AdminLoginScreen() {
  const { status, signIn } = useAdminSession();
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const passwordRef = useRef<TextInputInstance>(null);

  if (status === 'signedIn') return <Redirect href="/admin" />;

  async function handleSubmit() {
    setError(null);

    if (!id.trim() || !password) {
      setError('Enter both your admin ID and password.');
      return;
    }

    setSubmitting(true);
    try {
      await signIn(id.trim(), password);
      // On success the session flips to signed-in and <Redirect> above takes over.
    } catch (e) {
      setError((e as Error).message);
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen scroll center>
      <BackLink />
      <View style={styles.card}>
        <View style={styles.iconBox}>
          <Icon name="shield-check" size={26} color="accentText" />
        </View>
        <AppText variant="title" style={styles.heading}>
          Admin sign-in
        </AppText>
        <AppText variant="body" color="muted">
          Enter your admin ID and password to open the dashboard.
        </AppText>

        <View style={styles.form}>
          <TextField
            label="Admin ID"
            icon="user"
            value={id}
            onChangeText={setId}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            textContentType="username"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <TextField
            ref={passwordRef}
            label="Password"
            icon="key-round"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
            right={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                hitSlop={8}
                onPress={() => setShowPassword((v) => !v)}
                style={styles.eye}>
                <Icon name={showPassword ? 'eye-off' : 'eye'} size={16} color="muted" />
              </Pressable>
            }
          />
        </View>

        {error ? <ErrorNotice message={error} /> : null}

        <Button
          label={submitting ? 'Signing in…' : 'Sign in'}
          iconRight={submitting ? undefined : 'arrow-right'}
          loading={submitting}
          onPress={handleSubmit}
          style={styles.submit}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: Spacing.three,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    padding: Spacing.four,
    gap: Spacing.two + 2,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.3)',
    backgroundColor: 'rgba(59,130,246,0.1)',
    marginBottom: Spacing.two,
  },
  heading: { fontSize: 24, lineHeight: 30 },
  form: { gap: Spacing.three, marginTop: Spacing.three },
  eye: { padding: 8 },
  submit: { marginTop: Spacing.two },
});
