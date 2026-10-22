import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AdminPage } from '@/components/admin-page';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { ErrorNotice } from '@/components/notice';
import { Colors, Radius, Spacing, type ColorName } from '@/constants/theme';
import { useFetch } from '@/hooks/use-fetch';
import {
  addEmployee,
  deleteEmployee,
  fetchEmployees,
  updateEmployee,
  type Employee,
} from '@/lib/api';

const NAME_MAX_LENGTH = 80;
const EMAIL_MAX_LENGTH = 254;

const clean = (name: string) => name.trim().replace(/\s+/g, ' ');

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export default function AdminEmployeesScreen() {
  const { data: employees, error, refreshing, retry, refresh, reload } = useFetch(fetchEmployees);

  return (
    <AdminPage refreshing={refreshing} onRefresh={refresh}>
      <View>
        <AppText variant="title">Employees</AppText>
        <AppText variant="small" color="muted">
          Add each employee&apos;s name and email. They set their own password the first time they open the
          app, then sign in with that email to check in and out.
        </AppText>
      </View>

      <AddEmployeeForm onAdded={reload} />

      {error ? (
        <View style={styles.gap}>
          <ErrorNotice message={error} />
          <Button label="Try again" icon="rotate-ccw" variant="secondary" onPress={retry} />
        </View>
      ) : employees === null ? (
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.accentText} />
        </View>
      ) : employees.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="users" size={20} color="muted" />
          <AppText variant="body" color="muted">
            No employees yet. Add one above.
          </AppText>
        </View>
      ) : (
        <View style={styles.list}>
          {employees.map((employee) => (
            <EmployeeRow key={employee._id} employee={employee} onChanged={reload} />
          ))}
        </View>
      )}
    </AdminPage>
  );
}

function AddEmployeeForm({ onAdded }: { onAdded: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<Employee | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setAdded(null);
    const cleanedName = clean(name);
    const cleanedEmail = email.trim();
    if (!cleanedName) {
      setError("Please enter the employee's name.");
      return;
    }
    if (!cleanedEmail) {
      setError("Please enter the employee's email — it's what they sign in with.");
      return;
    }
    setSubmitting(true);
    try {
      setAdded(await addEmployee(cleanedName, cleanedEmail));
      setName('');
      setEmail('');
      onAdded();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  function edit(setter: (value: string) => void) {
    return (text: string) => {
      setter(text);
      if (error) setError(null);
    };
  }

  return (
    <View style={styles.form}>
      <AppText variant="small" color="muted">
        Employee name
      </AppText>
      <TextInput
        value={name}
        onChangeText={edit(setName)}
        maxLength={NAME_MAX_LENGTH}
        placeholder="e.g. Asha Rao"
        placeholderTextColor={Colors.muted}
        selectionColor={Colors.accent}
        returnKeyType="next"
        accessibilityLabel="Employee name"
        style={[styles.input, error ? styles.inputInvalid : null]}
      />
      <AppText variant="small" color="muted">
        Employee email
      </AppText>
      <TextInput
        value={email}
        onChangeText={edit(setEmail)}
        maxLength={EMAIL_MAX_LENGTH}
        placeholder="e.g. asha@company.com"
        placeholderTextColor={Colors.muted}
        selectionColor={Colors.accent}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
        accessibilityLabel="Employee email"
        style={[styles.input, error ? styles.inputInvalid : null]}
      />
      {error ? <ErrorNotice message={error} /> : null}
      {added ? (
        <AppText variant="small" color="success">
          Added {added.name}. They can open the app, choose &ldquo;First time? Set your password&rdquo;, and a
          verification code will be emailed to {added.email}.
        </AppText>
      ) : null}
      <Button
        label={submitting ? 'Adding…' : 'Add Employee'}
        icon="user-plus"
        loading={submitting}
        onPress={handleSubmit}
      />
    </View>
  );
}

/** Where an employee is in getting started: no email → invited → active. */
function accountState(employee: Employee): { label: string; color: ColorName } {
  if (!employee.email) return { label: 'No email', color: 'warning' };
  if (!employee.passwordSetAt) return { label: 'Invited', color: 'muted' };
  return { label: 'Active', color: 'success' };
}

function EmployeeRow({ employee, onChanged }: { employee: Employee; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [nameValue, setNameValue] = useState(employee.name);
  const [emailValue, setEmailValue] = useState(employee.email ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const state = accountState(employee);

  /** Runs a request; returns true on success, or false after showing the error. */
  async function run(action: () => Promise<unknown>): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      await action();
      onChanged();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    const name = clean(nameValue);
    const email = emailValue.trim();
    if (!name) {
      setError("Name can't be empty.");
      return;
    }
    if (!email) {
      setError("Email can't be empty.");
      return;
    }
    const changes: { name?: string; email?: string } = {};
    if (name !== employee.name) changes.name = name;
    if (email.toLowerCase() !== (employee.email ?? '')) changes.email = email;
    if (!changes.name && !changes.email) {
      setEditing(false);
      return;
    }
    if (await run(() => updateEmployee(employee._id, changes))) setEditing(false);
  }

  // Changing the email makes them verify the new address and choose a password again.
  const emailChanging =
    editing && Boolean(employee.email) && emailValue.trim().toLowerCase() !== employee.email;

  function cancelEdit() {
    setEditing(false);
    setNameValue(employee.name);
    setEmailValue(employee.email ?? '');
    setError(null);
  }

  return (
    <View style={styles.row}>
      <View style={styles.rowMain}>
        <View style={styles.avatar}>
          <AppText variant="small" color="accentText" style={styles.avatarText}>
            {initials(employee.name)}
          </AppText>
        </View>

        {editing ? (
          <View style={styles.rowText}>
            <TextInput
              autoFocus
              value={nameValue}
              maxLength={NAME_MAX_LENGTH}
              onChangeText={(text) => {
                setNameValue(text);
                setError(null);
              }}
              returnKeyType="next"
              selectionColor={Colors.accent}
              accessibilityLabel={`Rename ${employee.name}`}
              style={styles.input}
            />
            <TextInput
              value={emailValue}
              maxLength={EMAIL_MAX_LENGTH}
              onChangeText={(text) => {
                setEmailValue(text);
                setError(null);
              }}
              onSubmitEditing={save}
              placeholder="Email"
              placeholderTextColor={Colors.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              selectionColor={Colors.accent}
              accessibilityLabel={`Email for ${employee.name}`}
              style={styles.input}
            />
            {emailChanging ? (
              <AppText variant="small" color="warning">
                Changing the email signs {employee.name} out and clears their password. They set a new one with a
                code emailed to the new address.
              </AppText>
            ) : null}
          </View>
        ) : (
          <View style={styles.rowText}>
            <AppText variant="body" style={styles.rowName} numberOfLines={1}>
              {employee.name}
            </AppText>
            <AppText variant="small" color="muted" numberOfLines={1}>
              {employee.email ?? 'Add an email so they can sign in'}
            </AppText>
            <AppText variant="small" color={state.color} style={styles.state}>
              {state.label}
            </AppText>
          </View>
        )}

        <View style={styles.actions}>
          {editing ? (
            <>
              <IconButton label="Save" icon="check" color="success" disabled={busy} onPress={save} />
              <IconButton label="Cancel" icon="x" disabled={busy} onPress={cancelEdit} />
            </>
          ) : confirming ? (
            <IconButton
              label="Cancel delete"
              icon="x"
              disabled={busy}
              onPress={() => {
                setConfirming(false);
                setError(null);
              }}
            />
          ) : (
            <>
              <IconButton
                label={`Edit ${employee.name}`}
                icon="pencil"
                color="accentText"
                onPress={() => {
                  setNameValue(employee.name);
                  setEmailValue(employee.email ?? '');
                  setEditing(true);
                }}
              />
              <IconButton
                label={`Delete ${employee.name}`}
                icon="trash-2"
                color="danger"
                onPress={() => setConfirming(true)}
              />
            </>
          )}
        </View>
      </View>

      {confirming && (
        <View style={styles.confirm}>
          <AppText variant="small" color="danger">
            Delete {employee.name}? This also removes their account and all their attendance records.
          </AppText>
          <Button
            label={busy ? 'Deleting…' : 'Delete'}
            variant="danger"
            loading={busy}
            onPress={async () => {
              if (!(await run(() => deleteEmployee(employee._id)))) setConfirming(false);
            }}
          />
        </View>
      )}

      {error ? <ErrorNotice message={error} /> : null}
    </View>
  );
}

function IconButton({
  label,
  icon,
  color = 'muted',
  disabled,
  onPress,
}: {
  label: string;
  icon: 'check' | 'x' | 'pencil' | 'trash-2';
  color?: 'muted' | 'success' | 'accentText' | 'danger';
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed, disabled && styles.disabled]}>
      <Icon name={icon} size={16} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gap: { gap: Spacing.two + 4 },
  loading: { paddingVertical: Spacing.five, alignItems: 'center' },
  empty: {
    paddingVertical: Spacing.five,
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  form: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two + 2,
  },
  input: {
    minHeight: 44,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm + 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: Colors.foreground,
    fontSize: 15,
  },
  inputInvalid: { borderColor: Colors.danger },
  list: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  row: {
    padding: Spacing.three,
    gap: Spacing.two + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  rowMain: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59,130,246,0.1)',
  },
  avatarText: { fontWeight: '600' },
  rowText: { flex: 1, gap: 2 },
  rowName: { fontWeight: '500' },
  state: { fontWeight: '500' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  iconBtn: { width: 36, height: 36, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  iconBtnPressed: { backgroundColor: Colors.surface2 },
  disabled: { opacity: 0.5 },
  confirm: { gap: Spacing.two + 2 },
});
