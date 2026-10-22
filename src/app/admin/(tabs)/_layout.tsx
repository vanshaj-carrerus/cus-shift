import { Lucide } from '@react-native-vector-icons/lucide';
import { Tabs } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/app-text';
import { Brand } from '@/components/brand';
import { Icon } from '@/components/icon';
import { Colors } from '@/constants/theme';
import { useAdminSession } from '@/lib/admin-session';

export default function AdminTabsLayout() {
  const { signOut } = useAdminSession();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerShadowVisible: false,
        headerTitle: () => <Brand height={26} />,
        headerTitleAlign: 'left',
        headerRight: () => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            onPress={signOut}
            style={styles.signOut}>
            <Icon name="log-out" size={14} color="muted" />
            <AppText variant="small" color="muted">
              Sign out
            </AppText>
          </Pressable>
        ),
        tabBarStyle: { backgroundColor: Colors.surface, borderTopColor: Colors.border },
        tabBarActiveTintColor: Colors.accentText,
        tabBarInactiveTintColor: Colors.muted,
        sceneStyle: { backgroundColor: Colors.background },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Lucide name="layout-dashboard" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="employees"
        options={{
          title: 'Employees',
          tabBarIcon: ({ color, size }) => <Lucide name="users" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
