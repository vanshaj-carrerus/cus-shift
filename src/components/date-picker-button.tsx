import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import { dateKeyToLocalDate, formatIstDate, localDateToDateKey } from '@/lib/time';

import { AppText } from './app-text';
import { Icon } from './icon';

/** Date picker that works on a "YYYY-MM-DD" key (native compact picker on iOS, dialog on Android). */
export function DatePickerButton({
  value,
  onChange,
}: {
  value: string;
  onChange: (key: string) => void;
}) {
  const date = dateKeyToLocalDate(value);

  if (Platform.OS === 'ios') {
    return (
      <DateTimePicker
        value={date}
        mode="date"
        display="compact"
        themeVariant="dark"
        accentColor={Colors.accent}
        onChange={(_, picked) => picked && onChange(localDateToDateKey(picked))}
      />
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Date: ${formatIstDate(value)}. Change date`}
      onPress={() =>
        DateTimePickerAndroid.open({
          value: date,
          mode: 'date',
          onChange: (event, picked) => {
            if (event.type === 'set' && picked) onChange(localDateToDateKey(picked));
          },
        })
      }
      style={styles.button}>
      <Icon name="calendar-days" size={15} color="accentText" />
      <AppText variant="label">{value}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface2,
  },
});
