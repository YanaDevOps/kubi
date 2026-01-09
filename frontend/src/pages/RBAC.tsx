import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  EffectivePermissions,
  fetchEffectivePermissions,
  fetchRbacClusterRoleBindings,
  fetchRbacClusterRoles,
  fetchRbacRoleBindings,
  fetchRbacRoles,
  fetchServiceAccounts,
  RoleBindingItem,
  RoleItem,
  RuleSummary,
  ServiceAccountItem,
} from "../api/client";
import { useNamespace } from "../state/namespace";
import { useSearch } from "../state/search";

function ruleToString(rule: RuleSummary) {
  const groups = rule.apiGroups.length > 0 ? rule.apiGroups.join(",") : "core";
  const resources = rule.resources.length > 0 ? rule.resources.join(",") : "-";
  return `${rule.verbs.join(",")} ${groups}/${resources}`;
}

function subjectSummary(subjects: RoleBindingItem["subjects"]) {
  if (subjects.length === 0) return "-";
  return subjects
    .map((subject) => `${subject.kind}:${subject.name}${subject.namespace ? `@${subject.namespace}` : ""}`)
    .join(", ");
}

function filterByQuery<T extends { name: string; namespace?: string }>(items: T[], query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return items;
  return items.filter((item) => `${item.namespace ?? ""}/${item.name}`.toLowerCase().includes(needle));
}

export default function RBAC() {
  const { namespace } = useNamespace();
  const { query, labelSelector } = useSearch();
  const [selectedSA, setSelectedSA] = useState<string>("");

  const rolesQuery = useQuery({
    queryKey: ["rbac-roles", namespace, labelSelector],
    queryFn: () => fetchRbacRoles({ namespace, labelSelector }),
  });

  const roleBindingsQuery = useQuery({
    queryKey: ["rbac-rolebindings", namespace, labelSelector],
    queryFn: () => fetchRbacRoleBindings({ namespace, labelSelector }),
  });

  const clusterRolesQuery = useQuery({
    queryKey: ["rbac-clusterroles", labelSelector],
    queryFn: () => fetchRbacClusterRoles({ labelSelector }),
  });

  const clusterRoleBindingsQuery = useQuery({
    queryKey: ["rbac-clusterrolebindings", labelSelector],
    queryFn: () => fetchRbacClusterRoleBindings({ labelSelector }),
  });

  const serviceAccountsQuery = useQuery({
    queryKey: ["rbac-serviceaccounts", namespace, labelSelector],
    queryFn: () => fetchServiceAccounts({ namespace, labelSelector }),
  });

  const effectiveQuery = useQuery<EffectivePermissions>({
    queryKey: ["rbac-effective", namespace, selectedSA],
    queryFn: () => fetchEffectivePermissions(namespace, selectedSA),
    enabled: namespace !== "all" && selectedSA !== "",
  });

  const roles = useMemo(() => {
    if (!rolesQuery.data) return [] as RoleItem[];
    return filterByQuery(rolesQuery.data.items, query);
  }, [rolesQuery.data, query]);

  const clusterRoles = useMemo(() => {
    if (!clusterRolesQuery.data) return [] as RoleItem[];
    return filterByQuery(clusterRolesQuery.data.items, query);
  }, [clusterRolesQuery.data, query]);

  const roleBindings = useMemo(() => {
    if (!roleBindingsQuery.data) return [] as RoleBindingItem[];
    return filterByQuery(roleBindingsQuery.data.items, query);
  }, [roleBindingsQuery.data, query]);

  const clusterRoleBindings = useMemo(() => {
    if (!clusterRoleBindingsQuery.data) return [] as RoleBindingItem[];
    return filterByQuery(clusterRoleBindingsQuery.data.items, query);
  }, [clusterRoleBindingsQuery.data, query]);

  const serviceAccounts = useMemo(() => {
    if (!serviceAccountsQuery.data) return [] as ServiceAccountItem[];
    return filterByQuery(serviceAccountsQuery.data.items, query);
  }, [serviceAccountsQuery.data, query]);

  const loading =
    rolesQuery.isLoading ||
    roleBindingsQuery.isLoading ||
    clusterRolesQuery.isLoading ||
    clusterRoleBindingsQuery.isLoading ||
    serviceAccountsQuery.isLoading;

  if (loading) {
    return <div className="text-sm text-slatey-400">Loading RBAC data...</div>;
  }

  if (
    rolesQuery.error ||
    roleBindingsQuery.error ||
    clusterRolesQuery.error ||
    clusterRoleBindingsQuery.error ||
    serviceAccountsQuery.error
  ) {
    return (
      <div className="text-sm text-accent-error">
        Failed to load RBAC data. Ensure the backend can reach the cluster.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">RBAC</h1>
          <p className="mt-2 text-sm text-slatey-400">
            Roles, bindings, and effective permissions for service accounts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-slatey-800 px-3 py-1 text-xs text-slatey-300">
            Namespace: {namespace}
          </div>
        </div>
      </div>

      <section className="space-y-3 rounded-xl border border-slatey-800/80 bg-slatey-900/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-slatey-500">Effective permissions</div>
            <p className="mt-1 text-sm text-slatey-400">
              Select a ServiceAccount to see effective rules from bindings.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="rounded-lg border border-slatey-800 bg-slatey-900 px-3 py-2 text-sm text-slate-100"
              value={selectedSA}
              onChange={(event) => setSelectedSA(event.target.value)}
              disabled={namespace === "all"}
            >
              <option value="">Select ServiceAccount</option>
              {serviceAccounts.map((sa) => (
                <option key={`${sa.namespace}/${sa.name}`} value={sa.name}>
                  {sa.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {namespace === "all" ? (
          <div className="text-xs text-slatey-500">Pick a namespace to evaluate a ServiceAccount.</div>
        ) : null}
        {effectiveQuery.isLoading ? (
          <div className="text-sm text-slatey-400">Loading effective permissions...</div>
        ) : effectiveQuery.data ? (
          <div className="space-y-2 text-sm">
            {effectiveQuery.data.rules.length === 0 ? (
              <div className="text-slatey-500">No matching rules found.</div>
            ) : (
              effectiveQuery.data.rules.map((rule, index) => (
                <div key={`${rule.verbs.join("-")}-${index}`} className="rounded-lg border border-slatey-800/80 bg-slatey-900/70 px-3 py-2">
                  {ruleToString(rule)}
                </div>
              ))
            )}
          </div>
        ) : null}
      </section>

      <section className="space-y-2">
        <div className="text-xs uppercase tracking-widest text-slatey-500">Roles</div>
        <div className="overflow-hidden rounded-xl border border-slatey-800/80">
          <table className="w-full text-left text-sm">
            <thead className="bg-slatey-900/80 text-xs uppercase tracking-widest text-slatey-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Namespace</th>
                <th className="px-4 py-3">Rules</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slatey-800/80">
              {roles.length === 0 ? (
                <tr className="bg-slatey-900/60">
                  <td className="px-4 py-3 text-slatey-500" colSpan={3}>
                    No roles found.
                  </td>
                </tr>
              ) : (
                roles.map((role) => (
                  <tr key={`${role.namespace}/${role.name}`} className="bg-slatey-900/60">
                    <td className="px-4 py-3 text-slate-100">{role.name}</td>
                    <td className="px-4 py-3 text-slatey-300">{role.namespace}</td>
                    <td className="px-4 py-3 text-slatey-300">
                      {role.rules.length > 0 ? ruleToString(role.rules[0]) : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <div className="text-xs uppercase tracking-widest text-slatey-500">RoleBindings</div>
        <div className="overflow-hidden rounded-xl border border-slatey-800/80">
          <table className="w-full text-left text-sm">
            <thead className="bg-slatey-900/80 text-xs uppercase tracking-widest text-slatey-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">RoleRef</th>
                <th className="px-4 py-3">Subjects</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slatey-800/80">
              {roleBindings.length === 0 ? (
                <tr className="bg-slatey-900/60">
                  <td className="px-4 py-3 text-slatey-500" colSpan={3}>
                    No role bindings found.
                  </td>
                </tr>
              ) : (
                roleBindings.map((binding) => (
                  <tr key={`${binding.namespace}/${binding.name}`} className="bg-slatey-900/60">
                    <td className="px-4 py-3 text-slate-100">{binding.name}</td>
                    <td className="px-4 py-3 text-slatey-300">
                      {binding.roleKind}/{binding.roleRef}
                    </td>
                    <td className="px-4 py-3 text-slatey-300">{subjectSummary(binding.subjects)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <div className="text-xs uppercase tracking-widest text-slatey-500">ClusterRoles</div>
        <div className="overflow-hidden rounded-xl border border-slatey-800/80">
          <table className="w-full text-left text-sm">
            <thead className="bg-slatey-900/80 text-xs uppercase tracking-widest text-slatey-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Rules</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slatey-800/80">
              {clusterRoles.length === 0 ? (
                <tr className="bg-slatey-900/60">
                  <td className="px-4 py-3 text-slatey-500" colSpan={2}>
                    No cluster roles found.
                  </td>
                </tr>
              ) : (
                clusterRoles.map((role) => (
                  <tr key={role.name} className="bg-slatey-900/60">
                    <td className="px-4 py-3 text-slate-100">{role.name}</td>
                    <td className="px-4 py-3 text-slatey-300">
                      {role.rules.length > 0 ? ruleToString(role.rules[0]) : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <div className="text-xs uppercase tracking-widest text-slatey-500">ClusterRoleBindings</div>
        <div className="overflow-hidden rounded-xl border border-slatey-800/80">
          <table className="w-full text-left text-sm">
            <thead className="bg-slatey-900/80 text-xs uppercase tracking-widest text-slatey-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">RoleRef</th>
                <th className="px-4 py-3">Subjects</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slatey-800/80">
              {clusterRoleBindings.length === 0 ? (
                <tr className="bg-slatey-900/60">
                  <td className="px-4 py-3 text-slatey-500" colSpan={3}>
                    No cluster role bindings found.
                  </td>
                </tr>
              ) : (
                clusterRoleBindings.map((binding) => (
                  <tr key={binding.name} className="bg-slatey-900/60">
                    <td className="px-4 py-3 text-slate-100">{binding.name}</td>
                    <td className="px-4 py-3 text-slatey-300">
                      {binding.roleKind}/{binding.roleRef}
                    </td>
                    <td className="px-4 py-3 text-slatey-300">{subjectSummary(binding.subjects)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <div className="text-xs uppercase tracking-widest text-slatey-500">ServiceAccounts</div>
        <div className="overflow-hidden rounded-xl border border-slatey-800/80">
          <table className="w-full text-left text-sm">
            <thead className="bg-slatey-900/80 text-xs uppercase tracking-widest text-slatey-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Namespace</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slatey-800/80">
              {serviceAccounts.length === 0 ? (
                <tr className="bg-slatey-900/60">
                  <td className="px-4 py-3 text-slatey-500" colSpan={2}>
                    No service accounts found.
                  </td>
                </tr>
              ) : (
                serviceAccounts.map((sa) => (
                  <tr key={`${sa.namespace}/${sa.name}`} className="bg-slatey-900/60">
                    <td className="px-4 py-3 text-slate-100">{sa.name}</td>
                    <td className="px-4 py-3 text-slatey-300">{sa.namespace}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
