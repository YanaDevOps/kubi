import Placeholder from "./Placeholder";

export default function Secrets() {
  return (
    <Placeholder
      title="Secrets"
      description="Metadata-only view with explicit reveal controls for values."
      items={["Name, type, labels, age", "Reveal toggle (off by default)", "Local-only warning"]}
    />
  );
}
