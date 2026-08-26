export type ReminderRuleLike = {
  days_before_due: number;
  start_time: string;
  end_time: string | null;
  repeat_interval_minutes: number | null;
};

export function describeReminderRule(rule: ReminderRuleLike): string {
  const day =
    rule.days_before_due === 0
      ? "El día del pago"
      : `${rule.days_before_due} día${rule.days_before_due > 1 ? "s" : ""} antes`;
  const time = rule.end_time
    ? `${rule.start_time.slice(0, 5)}–${rule.end_time.slice(0, 5)}, cada ${rule.repeat_interval_minutes} min`
    : `a las ${rule.start_time.slice(0, 5)}`;
  return `${day} · ${time}`;
}
