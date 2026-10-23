import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type TextInputInstance } from 'react-native';

import { AppText } from '@/components/app-text';
import { Brand } from '@/components/brand';
import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { ErrorNotice } from '@/components/notice';
import { PasswordField } from '@/components/password-field';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { ApiError, requestVerificationCode } from '@/lib/api';
import { useEmployeeSession } from '@/lib/employee-session';

// Matches the server's rule (PASSWORD_MIN_LENGTH); the server enforces it too.
const PASSWORD_MIN_LENGTH = 8;

// signin → email (ask for a code) → verify (enter the emailed code + a new password).
// The email → verify path serves both first-time setup and a forgotten password.
type Mode = 'signin' | 'email' | 'verify';

const COPY: Record<Mode, { title: string; subtitle: string; submit: string; submitting: string }> = {
  signin: {
    title: 'Employee sign-in',
    subtitle: 'Sign in with your work email and your password.',
    submit: 'Sign in',
    submitting: 'Signing in…',
  },
  email: {
    title: 'Set or reset your password',
    subtitle: "Enter your work email and we'll send you a 6-digit code to verify it's you.",
    submit: 'Send code',
    submitting: 'Sending…',
  },
  verify: {
    title: 'Check your email',
    subtitle: 'Enter the 6-digit code we sent, then choose a new password.',
    submit: 'Set password & sign in',
    submitting: 'Setting up…',
  },
};

export default function EmployeeLoginScreen() {
  const { signIn, activate } = useEmployeeSession();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const passwordRef = useRef<TextInputInstance>(null);
  const codeRef = useRef<TextInputInstance>(null);
  const newPasswordRef = useRef<TextInputInstance>(null);
  const confirmRef = useRef<TextInputInstance>(null);

  const copy = COPY[mode];

  function switchMode(next: Mode, message: string | null = null) {
    setMode(next);
    setError(message);
    setInfo(null);
    setCode('');
    setPassword('');
    setConfirm('');
  }

  /** Emails a code. Returns true if it was sent. */
  async function sendCode(): Promise<boolean> {
    setSubmitting(true);
    setError(null);
    try {
      await requestVerificationCode(email.trim());
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit() {
    setError(null);
    setInfo(null);

    if (!email.trim()) {
      setError('Enter your email.');
      return;
    }

    if (mode === 'email') {
      if (await sendCode()) {
        setMode('verify');
        setInfo(`If ${email.trim()} is registered, we've sent a code to it. It expires in 10 minutes.`);
      }
      return;
    }

    if (mode === 'signin') {
      if (!password) {
        setError('Enter your email and password.');
        return;
      }
    } else {
      if (!code.trim()) {
        setError('Enter the 6-digit code from the email.');
        return;
      }
      if (password.length < PASSWORD_MIN_LENGTH) {
        setError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
        return;
      }
      if (password !== confirm) {
        setError("The two passwords don't match.");
        return;
      }
    }

    setSubmitting(true);
    try {
      if (mode === 'signin') await signIn(email.trim(), password);
      else await activate(email.trim(), code.trim(), password);
      // On success the session flips to signed-in and the root layout swaps this
      // screen for the home screen.
    } catch (e) {
      const message = (e as Error).message;
      // Registered by the admin but no password yet — go get one.
      if (mode === 'signin' && e instanceof ApiError && e.code === 'PASSWORD_NOT_SET') {
        switchMode('email', message);
      } else {
        setError(message);
        setPassword('');
        setConfirm('');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function resend() {
    setInfo(null);
    if (await sendCode()) setInfo("We've sent a new code. Use the newest one — earlier codes no longer work.");
  }

  return (
    <Screen scroll center>
      <Brand />
      <View style={styles.card}>
        <View style={styles.iconBox}>
          <Icon
            name={mode === 'signin' ? 'fingerprint' : mode === 'email' ? 'mail' : 'key-round'}
            size={26}
            color="accentText"
          />
        </View>
        <AppText variant="title" style={styles.heading}>
          {copy.title}
        </AppText>
        <AppText variant="body" color="muted">
          {copy.subtitle}
        </AppText>

        <View style={styles.form}>
          <TextField
            label="Email"
            icon="mail"
            value={email}
            onChangeText={setEmail}
            editable={mode !== 'verify'}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType={mode === 'email' ? 'go' : 'next'}
            onSubmitEditing={mode === 'email' ? handleSubmit : () => passwordRef.current?.focus()}
          />

          {mode === 'signin' ? (
            <PasswordField
              ref={passwordRef}
              label="Password"
              value={password}
              onChangeText={setPassword}
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
            />
          ) : null}

          {mode === 'verify' ? (
            <>
              <TextField
                ref={codeRef}
                label="Verification code"
                icon="key-round"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                autoCorrect={false}
                maxLength={7}
                returnKeyType="next"
                onSubmitEditing={() => newPasswordRef.current?.focus()}
              />
              <PasswordField
                ref={newPasswordRef}
                label="New password"
                value={password}
                onChangeText={setPassword}
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
              />
              <PasswordField
                ref={confirmRef}
                label="Confirm password"
                value={confirm}
                onChangeText={setConfirm}
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
              />
            </>
          ) : null}
        </View>

        {info ? (
          <AppText variant="small" color="success">
            {info}
          </AppText>
        ) : null}
        {error ? <ErrorNotice message={error} /> : null}

        <Button
          label={submitting ? copy.submitting : copy.submit}
          iconRight={submitting ? undefined : 'arrow-right'}
          loading={submitting}
          onPress={handleSubmit}
          style={styles.submit}
        />

        {mode === 'verify' ? (
          <Pressable accessibilityRole="button" onPress={resend} disabled={submitting} hitSlop={8} style={styles.switch}>
            <AppText variant="small" color="accentText">
              Didn&apos;t get it? Send a new code
            </AppText>
          </Pressable>
        ) : null}

        {mode === 'signin' ? (
          <>
            <Pressable accessibilityRole="button" onPress={() => switchMode('email')} hitSlop={8} style={styles.switch}>
              <AppText variant="small" color="accentText">
                First time? Set your password
              </AppText>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => switchMode('email')} hitSlop={8} style={styles.switch}>
              <AppText variant="small" color="accentText">
                Forgot your password?
              </AppText>
            </Pressable>
          </>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => switchMode('signin')} hitSlop={8} style={styles.switch}>
            <AppText variant="small" color="accentText">
              Back to sign in
            </AppText>
          </Pressable>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: Spacing.four,
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
  submit: { marginTop: Spacing.two },
  switch: { alignSelf: 'center', paddingVertical: Spacing.two },
});
