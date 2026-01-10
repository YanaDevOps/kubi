export type Overview = {
  app: string;
  version: string;
  timestamp: string;
  goVersion: string;
  readonly: boolean;
  namespace: string;
  context: string;
  clusterUrl: string;
};

export type Health = {
  ok: boolean;
  timestamp: string;
  version: string;
  uptimeSeconds: number;
  context: string;
  namespace: string;
};

export type NamespaceItem = {
  name: string;
  status: string;
  createdAt: string;
  labels: Record<string, string>;
};

export type NamespaceList = {
  items: NamespaceItem[];
  continue: string;
};

export type NodeItem = {
  name: string;
  ready: boolean;
  roles: string[];
  kubeletVersion: string;
  createdAt: string;
};

export type NodeList = {
  items: NodeItem[];
  continue: string;
};

export type WorkloadItem = {
  name: string;
  namespace: string;
  desiredReplicas: number;
  readyReplicas: number;
  updatedReplicas: number;
  availableReplicas: number;
  createdAt: string;
};

export type WorkloadsResponse = {
  deployments: WorkloadItem[];
  statefulSets: WorkloadItem[];
  daemonSets: WorkloadItem[];
};

export type PodItem = {
  name: string;
  namespace: string;
  phase: string;
  ready: boolean;
  restarts: number;
  node: string;
  podIp: string;
  images: string[];
  createdAt: string;
};

export type PodList = {
  items: PodItem[];
  continue: string;
};

export type ServicePort = {
  name: string;
  port: number;
  targetPort: string;
  protocol: string;
};

export type ServiceItem = {
  name: string;
  namespace: string;
  type: string;
  clusterIp: string;
  externalIps: string[];
  ports: ServicePort[];
  createdAt: string;
};

export type ServiceList = {
  items: ServiceItem[];
  continue: string;
};

export type EndpointSliceItem = {
  name: string;
  namespace: string;
  addresses: number;
  readyCount: number;
  ports: string[];
  createdAt: string;
};

export type EndpointSliceList = {
  items: EndpointSliceItem[];
  continue: string;
};

export type TopologyNode = {
  id: string;
  kind: string;
  name: string;
  namespace?: string;
  status?: string;
  labels?: Record<string, string>;
};

export type TopologyEdge = {
  id: string;
  from: string;
  to: string;
  kind: string;
};

export type TopologyResponse = {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
};

export type ServicePortMapping = {
  namespace: string;
  service: string;
  type: string;
  port: number;
  targetPort: string;
  protocol: string;
  nodePort: number;
  externalIps: string[];
  podEndpoints: string[];
};

export type ContainerPortMapping = {
  namespace: string;
  pod: string;
  container: string;
  port: number;
  protocol: string;
  hostPort: number;
};

export type IngressPortMapping = {
  namespace: string;
  ingress: string;
  host: string;
  path: string;
  service: string;
  port: string;
};

export type PortsResponse = {
  services: ServicePortMapping[];
  containers: ContainerPortMapping[];
  ingresses: IngressPortMapping[];
};

export type RuleSummary = {
  verbs: string[];
  resources: string[];
  apiGroups: string[];
  resourceNames: string[];
  nonResourceUrls: string[];
};

export type RoleItem = {
  name: string;
  namespace: string;
  rules: RuleSummary[];
};

export type RoleList = {
  items: RoleItem[];
  continue: string;
};

export type BindingSubject = {
  kind: string;
  name: string;
  namespace: string;
};

export type RoleBindingItem = {
  name: string;
  namespace: string;
  roleRef: string;
  roleKind: string;
  subjects: BindingSubject[];
};

export type RoleBindingList = {
  items: RoleBindingItem[];
  continue: string;
};

export type ServiceAccountItem = {
  name: string;
  namespace: string;
};

export type ServiceAccountList = {
  items: ServiceAccountItem[];
  continue: string;
};

export type EffectivePermissions = {
  namespace: string;
  serviceAccount: string;
  rules: RuleSummary[];
};

export type StorageClassItem = {
  name: string;
  provisioner: string;
  reclaimPolicy: string;
  parameters: Record<string, string>;
  allowVolumeExpand: boolean;
  createdAt: string;
};

export type PersistentVolumeItem = {
  name: string;
  status: string;
  capacity: string;
  accessModes: string[];
  storageClass: string;
  claim: string;
  createdAt: string;
};

export type PersistentVolumeClaimItem = {
  name: string;
  namespace: string;
  status: string;
  capacity: string;
  accessModes: string[];
  storageClass: string;
  volume: string;
  createdAt: string;
};

export type CSIDriverItem = {
  name: string;
  createdAt: string;
};

export type StorageOverview = {
  storageClasses: StorageClassItem[];
  volumes: PersistentVolumeItem[];
  claims: PersistentVolumeClaimItem[];
  csiDrivers: CSIDriverItem[];
};

export type ValidationItem = {
  id: string;
  severity: string;
  title: string;
  details: string;
  objects: string[];
};

export type ValidationResponse = {
  items: ValidationItem[];
};

export type ServiceIntent = {
  namespace: string;
  service: string;
  selector: string;
  pods: string[];
};

export type IngressIntent = {
  namespace: string;
  ingress: string;
  host: string;
  path: string;
  service: string;
  port: string;
};

export type NetworkPolicySummary = {
  namespace: string;
  name: string;
  types: string[];
  podSelector: string;
  ingressRules: number;
  egressRules: number;
};

export type TrafficResponse = {
  serviceIntents: ServiceIntent[];
  ingressIntents: IngressIntent[];
  networkPolicies: NetworkPolicySummary[];
};

export type MetricsSample = {
  name: string;
  namespace: string;
  cpu: string;
  memory: string;
};

export type MetricsResponse = {
  available: boolean;
  message: string;
  nodes: MetricsSample[];
  pods: MetricsSample[];
};

export type CRDItem = {
  name: string;
  resource: string;
  group: string;
  version: string;
  kind: string;
  scope: string;
};

export type ComponentDetection = {
  name: string;
  status: string;
  evidence: string[];
};

export type InventoryResponse = {
  crds: CRDItem[];
  components: ComponentDetection[];
};

export type CRDObjectItem = {
  name: string;
  namespace: string;
};

export type CRDObjectsResponse = {
  crd: CRDItem;
  objects: CRDObjectItem[];
};

type ListQuery = {
  namespace?: string;
  limit?: number;
  cont?: string;
  labelSelector?: string;
};

function listQueryString(query?: ListQuery) {
  const params = new URLSearchParams();
  if (query?.namespace && query.namespace !== "all") {
    params.set("ns", query.namespace);
  }
  if (query?.limit) {
    params.set("limit", String(query.limit));
  }
  if (query?.cont) {
    params.set("continue", query.cont);
  }
  if (query?.labelSelector) {
    params.set("labelSelector", query.labelSelector);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

async function request<T>(path: string): Promise<T> {
  const res = await fetch(path, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

async function requestJson<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const payload = (await res.json()) as { error?: string };
      if (payload?.error) {
        message = payload.error;
      }
    } catch {}
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

export function fetchOverview() {
  return request<Overview>("/api/overview");
}

export type KubeconfigContexts = {
  contexts: string[];
  currentContext: string;
};

export type KubeconfigTestResult = {
  ok: boolean;
  context: string;
  clusterUrl?: string;
  serverVersion?: string;
  error?: string;
};

export function fetchKubeconfigContexts() {
  return request<KubeconfigContexts>("/api/kubeconfig/contexts");
}

export function saveKubeconfig(payload: { kubeconfig: string; context?: string }) {
  return requestJson<KubeconfigContexts>("/api/kubeconfig", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function testKubeconfig(payload: { context?: string }) {
  return requestJson<KubeconfigTestResult>("/api/kubeconfig/test", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchHealth() {
  return request<Health>("/api/health");
}

export function fetchNamespaces(query?: ListQuery) {
  return request<NamespaceList>(`/api/namespaces${listQueryString(query)}`);
}

export function fetchNodes(query?: ListQuery) {
  return request<NodeList>(`/api/nodes${listQueryString(query)}`);
}

export function fetchWorkloads(query?: ListQuery) {
  return request<WorkloadsResponse>(`/api/workloads${listQueryString(query)}`);
}

type PodQuery = ListQuery;

export function fetchPods(query?: PodQuery) {
  return request<PodList>(`/api/pods${listQueryString(query)}`);
}

export function fetchServices(query?: ListQuery) {
  return request<ServiceList>(`/api/services${listQueryString(query)}`);
}

export function fetchEndpointSlices(query?: ListQuery) {
  return request<EndpointSliceList>(`/api/endpointslices${listQueryString(query)}`);
}

export function fetchTopology(query?: ListQuery) {
  return request<TopologyResponse>(`/api/topology${listQueryString(query)}`);
}

export function fetchPorts(query?: ListQuery) {
  return request<PortsResponse>(`/api/ports${listQueryString(query)}`);
}

export function fetchRbacRoles(query?: ListQuery) {
  return request<RoleList>(`/api/rbac/roles${listQueryString(query)}`);
}

export function fetchRbacClusterRoles(query?: ListQuery) {
  return request<RoleList>(`/api/rbac/clusterroles${listQueryString(query)}`);
}

export function fetchRbacRoleBindings(query?: ListQuery) {
  return request<RoleBindingList>(`/api/rbac/rolebindings${listQueryString(query)}`);
}

export function fetchRbacClusterRoleBindings(query?: ListQuery) {
  return request<RoleBindingList>(`/api/rbac/clusterrolebindings${listQueryString(query)}`);
}

export function fetchServiceAccounts(query?: ListQuery) {
  return request<ServiceAccountList>(`/api/rbac/serviceaccounts${listQueryString(query)}`);
}

export function fetchEffectivePermissions(namespace: string, serviceAccount: string) {
  const qs = new URLSearchParams({ ns: namespace, sa: serviceAccount }).toString();
  return request<EffectivePermissions>(`/api/rbac/effective?${qs}`);
}

export function fetchStorage(query?: ListQuery) {
  return request<StorageOverview>(`/api/storage${listQueryString(query)}`);
}

export function fetchValidation(query?: ListQuery) {
  return request<ValidationResponse>(`/api/validation${listQueryString(query)}`);
}

export function fetchTraffic(query?: ListQuery) {
  return request<TrafficResponse>(`/api/traffic${listQueryString(query)}`);
}

export function fetchMetrics(query?: ListQuery) {
  return request<MetricsResponse>(`/api/metrics${listQueryString(query)}`);
}

export function fetchInventory(query?: ListQuery) {
  return request<InventoryResponse>(`/api/inventory${listQueryString(query)}`);
}

export function fetchCRDObjects(crd: CRDItem, namespace: string) {
  const params = new URLSearchParams({
    group: crd.group,
    version: crd.version,
    resource: crd.resource,
    kind: crd.kind,
  });
  if (namespace && namespace !== "all") {
    params.set("ns", namespace);
  }
  return request<CRDObjectsResponse>(`/api/crds/objects?${params.toString()}`);
}
