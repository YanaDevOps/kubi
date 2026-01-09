type PlaceholderProps = {
  title: string;
  description: string;
  items?: string[];
};

export default function Placeholder({ title, description, items }: PlaceholderProps) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-slatey-400">{description}</p>
      </div>
      {items && items.length > 0 ? (
        <ul className="space-y-2 text-sm text-slatey-300">
          {items.map((item) => (
            <li key={item} className="rounded-lg border border-slatey-800/80 bg-slatey-900/70 px-4 py-2">
              {item}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
