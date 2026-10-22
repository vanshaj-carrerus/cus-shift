import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';

/** Full-screen spinner, shown while a session is being checked. */
export function LoadingScreen() {
  return (
    <View style={styles.root}>
      <ActivityIndicator color={Colors.accentText} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
});
