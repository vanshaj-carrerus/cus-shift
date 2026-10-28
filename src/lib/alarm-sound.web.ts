// Web version of alarm-sound.ts. iPhones only let a page play sound after the person has
// tapped something, so one audio element is "unlocked" by the first tap anywhere in the
// app (sign-in, check-in...) and reused when the alarm needs to ring.

const SOUND_URL = '/sounds/alarm.wav';

let audio: HTMLAudioElement | null = null;

function element(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio(SOUND_URL);
    audio.loop = true;
    audio.preload = 'auto';
  }
  return audio;
}

/** Call once at startup: unlocks the alarm sound on the first tap. */
export function prepareAlarmSound() {
  if (typeof document === 'undefined') return;
  const unlock = () => {
    document.removeEventListener('pointerdown', unlock, true);
    document.removeEventListener('touchend', unlock, true);
    const el = element();
    el.muted = true;
    el.play()
      .then(() => {
        el.pause();
        el.currentTime = 0;
        el.muted = false;
      })
      .catch(() => {
        el.muted = false;
      });
  };
  document.addEventListener('pointerdown', unlock, true);
  document.addEventListener('touchend', unlock, true);
}

/** Plays the alarm in a loop. Returns a function that stops it. */
export function startAlarmSound(): () => void {
  const el = element();
  el.muted = false;
  el.loop = true;
  el.play().catch(() => {
    // Never unlocked by a tap: the notification and screen still alert the person.
  });
  return () => {
    el.pause();
    el.currentTime = 0;
  };
}
