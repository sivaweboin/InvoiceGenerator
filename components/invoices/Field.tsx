export default function Field({
  label,
  value,
  onChange,
  multiline = false,
  ...props
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  type?: string;
  placeholder?: string;
  required?: boolean;
  min?: string;
  max?: string;
  step?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          {...props}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          {...props}
        />
      )}
    </label>
  );
}
