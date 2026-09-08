const durationFormat = new Intl.DurationFormat("en", { style: "short" });

export function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return durationFormat.format({ hours, minutes });
}
