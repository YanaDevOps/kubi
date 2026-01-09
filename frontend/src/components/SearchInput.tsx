type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export default function SearchInput({ value, onChange, placeholder }: SearchInputProps) {
  return (
    <input
      className="kubi-input w-60 px-4 py-2 text-sm placeholder:text-slatey-600 focus:outline-none focus:ring-2 focus:ring-accent-info/60"
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
