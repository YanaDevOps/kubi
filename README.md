# KUBI (MVP)

KUBI is a read-only Kubernetes cluster visualizer focused on topology, ports, traffic intent, RBAC, inventory, storage, validations, and metrics. It runs locally and uses your kubeconfig or in-cluster credentials.

## Quick start

Backend:

```sh
GOTOOLCHAIN=local /usr/local/go/bin/go run ./cmd/kubi
```

Frontend:

```sh
cd frontend
npm install
npm run dev
```

## Build single binary

```sh
./scripts/build.sh
GOTOOLCHAIN=local /usr/local/go/bin/go build -o bin/kubi ./cmd/kubi
```

## Configuration

- Default config path: `~/.config/kubi/config.yaml`
- Optional override: `kubi --config ./kubi.yaml`

See `docs/configuration.md` and `docs/development.md` for details.

## Key endpoints (MVP)

- `/api/overview`, `/api/health`, `/api/version`
- `/api/topology`, `/api/ports`, `/api/traffic`
- `/api/rbac/*`, `/api/storage`, `/api/inventory`, `/api/crds/objects`
- `/api/validation`, `/api/metrics`

## Security notes

- Read-only: backend rejects mutating requests.
- Secrets are metadata-only by default.
- Runs on `127.0.0.1` unless configured otherwise.

## Make targets

- `make dev-backend`
- `make dev-frontend`
- `make build-frontend`
- `make build-backend`
- `make build`
