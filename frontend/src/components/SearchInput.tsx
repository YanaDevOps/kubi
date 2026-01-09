type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export default function SearchInput({ value, onChange, placeholder }: SearchInputProps) {
  return (
    <input
      className="w-60 rounded-lg border border-slatey-800 bg-slatey-900 px-3 py-2 text-sm text-slate-200 placeholder:text-slatey-600 focus:outline-none focus:ring-2 focus:ring-accent-info/60"
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
