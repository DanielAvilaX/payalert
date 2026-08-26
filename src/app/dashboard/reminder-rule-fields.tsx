export const INTERVAL_OPTIONS = [
  { value: "30", label: "Cada 30 min" },
  { value: "60", label: "Cada hora" },
  { value: "120", label: "Cada 2 horas" },
  { value: "180", label: "Cada 3 horas" },
  { value: "240", label: "Cada 4 horas" },
  { value: "360", label: "Cada 6 horas" },
];

export const ruleInputClass = "glass-input w-full rounded-lg px-3 py-2 text-sm text-foreground";

export function ReminderRuleFields({
  defaultDays,
  defaultStart,
  repeats,
  setRepeats,
  defaultEnd,
  defaultInterval,
}: {
  defaultDays: number;
  defaultStart: string;
  repeats: boolean;
  setRepeats: (value: boolean) => void;
  defaultEnd?: string;
  defaultInterval?: string;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">Días antes</label>
          <input
            name="days_before_due"
            type="number"
            min={0}
            defaultValue={defaultDays}
            className={ruleInputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">Hora de inicio</label>
          <input
            name="start_time"
            type="time"
            defaultValue={defaultStart}
            required
            className={ruleInputClass}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="repeats"
          checked={repeats}
          onChange={(e) => setRepeats(e.target.checked)}
          className="accent-accent"
        />
        Repetir varias veces ese día
      </label>

      {repeats && (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted">Hasta</label>
            <input
              name="end_time"
              type="time"
              defaultValue={defaultEnd ?? "20:00"}
              className={ruleInputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted">Frecuencia</label>
            <select
              name="repeat_interval_minutes"
              defaultValue={defaultInterval ?? "120"}
              className={ruleInputClass}
            >
              {INTERVAL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </>
  );
}
