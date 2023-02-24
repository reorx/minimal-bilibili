import dayjs from 'dayjs';


export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const formattedMinutes = String(minutes).padStart(2, "0");
  const formattedSeconds = String(remainingSeconds).padStart(2, "0");
  return `${formattedMinutes}:${formattedSeconds}`;
}

export function formatDateIntl(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const options: Intl.DateTimeFormatOptions = { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" };
  return new Intl.DateTimeFormat("zh-CN", options).format(date);
}

export function formatDatetime(timestamp: number): string {
  return dayjs(timestamp * 1000).format("YYYY-MM-DD HH:mm:ss")
}

export function formatDate(timestamp: number): string {
  return dayjs(timestamp * 1000).format("YYYY-MM-DD")
}

export function hoursOrMinutesFrom(timestamp: number): string {
  const d = dayjs(timestamp * 1000)
  const days = d.diff(dayjs(), 'day')
  if (days) {
    return dayjs(timestamp * 1000).format("YYYY-MM-DD HH:mm:ss")
  }

  const minutes = d.diff(dayjs(), 'minute')
  const hours = Math.floor(minutes / 60)
  const intlRelative = new Intl.RelativeTimeFormat()
  if (hours) {
    return intlRelative.format(hours, 'hour')
  } else {
    return intlRelative.format(minutes, 'minute')
  }
}
