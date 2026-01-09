import Placeholder from "./Placeholder";

export default function Settings() {
  return (
    <Placeholder
      title="Settings"
      description="Configure kubeconfig source, context selection, and security flags."
      items={["Kubeconfig path", "Context selection", "Read-only strict mode"]}
    />
  );
}
