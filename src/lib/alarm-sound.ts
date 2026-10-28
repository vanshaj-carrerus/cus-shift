import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

/** Nothing to prepare on a phone app; the web version unlocks audio on the first tap. */
export function prepareAlarmSound() {}

/** Plays the alarm in a loop, even in silent mode. Returns a function that stops it. */
export function startAlarmSound(): () => void {
  const player = createAudioPlayer(require('@/assets/sounds/alarm.wav'));
  player.loop = true;
  setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  player.play();
  return () => {
    player.pause();
    player.remove();
  };
}
