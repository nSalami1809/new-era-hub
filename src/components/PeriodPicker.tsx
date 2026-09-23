import { PERIODS, type PeriodKey } from "@/lib/period";

export function PeriodPicker({
  value,
  onChange,
  from,
  to,
  onFromChange,
  onToChange,
}: {
  value: PeriodKey;
  onChange: (key: PeriodKey) => void;
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}) {
  return (
    <>
      <select
        className="field !min-h-[38px] w-full sm:w-auto"
        value={value}
        onChange={(e) => onChange(e.target.value as PeriodKey)}
      >
        {PERIODS.map((p) => (
          <option key={p.key} value={p.key}>
            {p.label}
          </option>
        ))}
      </select>
      {value === "custom" && (
        <>
          <input
            type="date"
            className="field !min-h-[38px] w-full sm:w-auto"
            value={from}
            onChange={(e) => onFromChange(e.target.value)}
          />
          <span className="text-sm text-muted-foreground">au</span>
          <input
            type="date"
            className="field !min-h-[38px] w-full sm:w-auto"
            value={to}
            onChange={(e) => onToChange(e.target.value)}
          />
        </>
      )}
    </>
  );
}
