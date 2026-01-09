Project: **KUBI (MVP)**
----------------------------

**A read-only Kubernetes cluster visualizer**: topology, ports, traffic paths, health/quorum, RBAC & objects inventory --- in a clean dark UI.

### Goal

Build a **simple, fast, secure** desktop-like experience (served locally) that lets an operator **understand what's running and how it's connected**:

-   What runs where (nodes → pods → containers)

-   Which ports are exposed (container ports, services, ingresses, endpoints/endpointSlices)

-   Where traffic *should* go vs where it *doesn't* go (connectivity inference + optional probes)

-   Cluster health: nodes, control-plane signals, quorum-ish checks

-   RBAC visibility: who can do what (basic exploration)

-   Inventory of components: ingress controllers, CNI, kube-proxy, etc.

-   Storage overview: StorageClasses, PV/PVC, CSI drivers

-   Basic load graphs: CPU/mem usage per node/pod (if Metrics API available)

**Strictly read-only** for MVP (no apply/edit/delete).

* * * * *

Product principles
------------------

1.  **Read-only by design**: backend enforces GET/LIST/WATCH only.

2.  **Works with existing access**: uses user's kubeconfig or in-cluster ServiceAccount.

3.  **Local-first**: runs as a single binary; UI served locally.

4.  **Minimal UI, maximum clarity**: no heavy animations, no clutter.

5.  **Secure defaults**: bind to localhost, no credential persistence, least privileges.

* * * * *

Recommended architecture (professional + "binary-friendly")
-----------------------------------------------------------

Even if the UI is Node/React, the most robust way to ship a **single cross-platform binary** that talks to Kubernetes securely is:

### ✅ Backend: **Go** (recommended)

-   Uses **client-go** for Kubernetes API (best-in-class support for auth, exec plugins, TLS, watch streams).

-   Produces a single static binary per platform easily.

-   Can embed the frontend build into the binary (`//go:embed`).

### ✅ Frontend: **React + TypeScript** (Node.js toolchain)

-   Built with **Vite**.

-   Dark UI theme, minimal animations.

-   Data via REST + optional WebSocket/SSE for watch events.

This hybrid approach gives you:

-   "Web project" dev experience (Node toolchain)

-   "Single binary" distribution (Go backend)

-   Strong security posture

> If you insist on pure Node backend: you can package with `pkg`/`nexe`, but kube auth plugins (OIDC/cloud exec) + TLS edge-cases are usually more painful than in Go. MVP will go faster and more stable with Go.

* * * * *

MVP feature set (must-have)
---------------------------

### 1) Cluster overview dashboard

-   Cluster identity: context name, server URL (masked), namespace scope.

-   API health summary (reachable, version).

-   Node summary: Ready/NotReady, roles, taints, pressure conditions.

-   Workloads summary: Deployments/StatefulSets/DaemonSets, Pods by phase.

### 2) Topology explorer (core UX)

**Graph view** + **Table view** toggle.

Graph shows:

-   Nodes

    -   Names, readiness, resource capacity (optional)

-   Pods grouped by namespace/workload

    -   Labels, owner refs (Deployment/RS/StatefulSet)

-   Services

    -   Type (ClusterIP/NodePort/LB/ExternalName), ports

-   Ingress/HTTP routes (Ingress / Gateway API if present)

-   Endpoints / EndpointSlices

-   PersistentVolumes/PVC (optional nodes)

-   Edges:

    -   Service → EndpointSlice → Pod

    -   Ingress/Gateway → Service

    -   PVC → Pod

**Filters**:

-   Namespace

-   Kind

-   Label selector

-   Search by name

### 3) Ports & exposure "truth table"

A dedicated page that answers:

-   "What ports are open and where do they map?"

-   For each pod/container: containerPort(s)

-   For each service: servicePort → targetPort → pod IP:port

-   NodePorts and LoadBalancers with external IPs (if present)

-   Ingress/Gateway routes and hosts → service backend mapping

Output formats:

-   Interactive table

-   Export JSON/CSV

### 4) Traffic direction (MVP level)

Without deep packet inspection (yet), do "best-effort inference":

**Level 1 (always available):**

-   Traffic intent from configuration:

    -   Service selectors → endpoints

    -   Ingress backends

    -   NetworkPolicies: who is allowed/denied (basic evaluator)

    -   Cilium policies (if CRDs present) as "exists" + basic parse later

**Level 2 (optional, user-enabled):**

-   Connectivity checks by launching ephemeral pods or using `pods/exec` is **NOT** read-only.

-   For MVP keep it read-only:

    -   Only "inferred connectivity"

    -   Show "Unknown" when verification would require active probing.

> Keep a placeholder for future: "Active probes mode" requiring elevated permissions.

### 5) RBAC viewer (read-only)

-   Browse:

    -   Roles / ClusterRoles

    -   RoleBindings / ClusterRoleBindings

    -   ServiceAccounts

-   Provide "effective permissions explorer":

    -   For a selected ServiceAccount:

        -   list bound roles

        -   show rules (verbs/resources/apiGroups)

    -   Light "can-i" evaluator: static evaluation from bindings (not server-side authz).

### 6) Secrets & CRDs / components inventory

-   Secrets:

    -   **Never show secret values by default**

    -   Show metadata only (name, type, labels, age)

    -   Optional "reveal" with explicit user action + local-only warning (still risky)

-   CRDs:

    -   List CRDs installed

    -   For selected CRD:

        -   list some objects (paged)

        -   show schema snippet if available

-   Components:

    -   Detect common components by namespace + labels:

        -   ingress controllers (Traefik, NGINX)

        -   CNI (Cilium, Calico)

        -   kube-proxy presence (daemonset)

        -   metrics-server

        -   cert-manager

        -   external-dns

    -   Display as "Detected" with evidence (resource references)

### 7) Storage overview

-   StorageClasses list (provisioner, reclaim policy, parameters)

-   PV/PVC:

    -   binding status

    -   capacity

    -   access modes

    -   storage class

-   CSI drivers (CSIDriver objects) if present

### 8) Basic metrics (best-effort)

-   If Metrics API (`metrics.k8s.io`) available:

    -   node CPU/mem

    -   pod CPU/mem

-   If not available:

    -   show "Metrics not available" + hints

-   Keep graphs simple (line charts, last N minutes)

* * * * *

Security & access model (MVP)
-----------------------------

### Default mode: local app, local access

-   The binary runs a local server:

    -   **bind 127.0.0.1** by default

    -   configurable port

-   Access to cluster uses:

    1.  `--kubeconfig` path (default: standard kubeconfig)

    2.  `--context` selection

    3.  In-cluster mode (if running inside Kubernetes)

### Credential handling rules

-   **Never store kubeconfig contents** in app state.

-   Read kubeconfig from disk each start.

-   Support exec plugins (OIDC, cloud auth) via client-go.

-   Support multiple contexts; allow switching.

### Authorization constraints

-   Backend enforces:

    -   only GET/LIST/WATCH endpoints

    -   no PATCH/POST/PUT/DELETE

-   Secrets:

    -   metadata only by default

    -   values never fetched unless explicit "reveal" mode

-   Rate limiting and pagination on list endpoints.

### Remote access (future, not MVP)

-   Later: add an optional "gateway mode":

    -   server binds on LAN + auth token + TLS

    -   or reverse-proxy tunnel (Tailscale/SSH)

-   Mobile app can connect to this gateway.

* * * * *

UX/UI guidelines (dark, not black)
----------------------------------

### Visual design

-   Theme: **deep slate / graphite**, not pure black.

-   Suggested palette:

    -   Background: #111827 (slate-900-ish) or slightly lighter

    -   Panels: #0F172A / #111827 range

    -   Borders: subtle #1F2937

    -   Text: #E5E7EB (primary), #9CA3AF (secondary)

    -   Accents:

        -   Info: muted cyan/blue

        -   Warning: amber

        -   Error: red

        -   Success: green

-   Avoid neon; keep "calm operator console".

### Typography

-   Use **Inter** (fallback: system-ui).

-   Size:

    -   Base 14--15px

    -   Headers 18--24px

-   Mono for code/ports: **JetBrains Mono** or ui-monospace.

### Layout

-   Left sidebar navigation:

    -   Overview

    -   Topology

    -   Ports

    -   Traffic (Inferred)

    -   Workloads

    -   Nodes

    -   Networking (Services/Ingress/Endpoints)

    -   RBAC

    -   Secrets

    -   CRDs & Components

    -   Storage

    -   Metrics

    -   Validation

    -   Settings

-   Main area:

    -   top toolbar: cluster/context selector, namespace filter, search.

-   Minimal animations; quick transitions only.

* * * * *

Validation module (MVP "sanity checks")
---------------------------------------

Create a "Validation" page with warnings like:

-   Services with no endpoints

-   Pods not Ready behind a Service

-   Ingress pointing to missing Service

-   EndpointSlice without matching Service

-   Node pressure conditions

-   PV/PVC stuck Pending

-   RBAC risky patterns:

    -   cluster-admin bindings

    -   wildcard verbs/resources

Each validation item should include:

-   severity

-   affected objects

-   suggested action (text only)

* * * * *

Data model & API contracts
--------------------------

### Backend API (internal)

Expose endpoints like:

-   `/api/overview`

-   `/api/nodes`

-   `/api/workloads?ns=`

-   `/api/services?ns=`

-   `/api/ingress?ns=`

-   `/api/endpointslices?ns=`

-   `/api/rbac/...`

-   `/api/storage/...`

-   `/api/crds`

-   `/api/metrics/...`

All list endpoints:

-   pagination (`limit`, `continue`)

-   label selector filter where reasonable

-   sort on server or client (prefer client for MVP)

### Watch/streaming (optional)

-   Use WebSocket/SSE for:

    -   pod updates

    -   node status changes

    -   events feed

-   If streaming is too much for MVP, poll every 5--10s with backoff.

* * * * *

Tech stack (repo)
-----------------

### Frontend

-   React + TypeScript

-   Vite

-   TailwindCSS (fast theming)

-   Graph visualization:

    -   Keep simple first: `reactflow` or `cytoscape` (choose one)

-   Charts:

    -   `recharts` (simple)

-   State:

    -   TanStack Query for caching/pagination

-   Routing:

    -   React Router

### Backend

-   Go

-   client-go

-   Built-in HTTP server

-   Structured logging (zerolog or slog)

### Packaging

-   Build frontend → embed into Go binary.

-   Provide releases per OS:

    -   linux-amd64, linux-arm64

    -   darwin-amd64, darwin-arm64

    -   windows-amd64

* * * * *

Repo structure (suggested)
--------------------------

-   `/frontend`

    -   React app

-   `/backend`

    -   Go server

    -   k8s client layer

    -   DTOs / API handlers

-   `/cmd/kubescope`

    -   main entry

-   `/docs`

    -   screenshots, architecture notes

-   `/scripts`

    -   build/release scripts

* * * * *

CLI UX (MVP)
------------

Binary: `kubi`

Examples:

-   `kubi` (uses default kubeconfig, binds localhost)

-   `kubi --kubeconfig ~/.kube/config --context prod --port 17890`

-   `kubi --readonly-strict` (enforce no secret values ever)

Flags:

-   `--kubeconfig`

-   `--context`

-   `--namespace` (default: all)

-   `--listen` (default: 127.0.0.1)

-   `--port`

-   `--log-level`

-   `--no-metrics`

-   `--secrets-metadata-only` (default true)

-   `--allow-secret-values` (default false; warning)

* * * * *

Milestones
----------

### Milestone 0: Skeleton

-   Backend serves `/healthz`

-   Frontend boots, dark theme, navigation scaffold

### Milestone 1: Inventory

-   Nodes, Namespaces, Workloads, Pods

-   Services + Endpoints/EndpointSlices

-   Basic detail pages

### Milestone 2: Topology + Ports

-   Graph view with Nodes/Pods/Services/Ingress

-   Ports table + export

### Milestone 3: RBAC + Storage + Components

-   RBAC browser + effective view

-   Storage overview

-   Component detection

### Milestone 4: Validation + Metrics (best-effort)

-   Validations with links

-   Metrics graphs if available

* * * * *

Definition of done (MVP)
------------------------

-   Runs as a single binary on at least Linux and macOS.

-   Works with kubeconfig contexts and standard auth.

-   Read-only enforced.

-   UI:

    -   stable navigation

    -   topology + ports mapping

    -   RBAC + inventory pages

    -   validation page with useful warnings

-   No secret leakage by default.

* * * * *

Notes for Codex / Agents
------------------------

When implementing:

-   Prioritize correctness and safety over fancy visuals.

-   Add clear loading/error states.

-   Cache aggressively; avoid flooding the API server.

-   Handle large clusters with pagination and virtualized tables.

-   Never log secret values or full kubeconfig content.

* * * * *

Future roadmap (non-MVP ideas)
------------------------------

-   Active probes mode (requires exec/ephemeral pods)

-   NetworkPolicy/Cilium policy reachability solver

-   Event timeline + "what changed" diff

-   Remote gateway mode for mobile clients

-   Multi-cluster view

-   Plugin system for CRDs (e.g., Cilium, ArgoCD, Istio)
