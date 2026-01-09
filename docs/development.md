# Development

## Go toolchain

KUBI targets Go 1.22.5.

- `.go-version` pins the toolchain for `asdf`, `mise`, and `direnv` users.
- `go.mod` includes `toolchain go1.22.5` to ensure consistent builds.

If your system `go` is newer, use the pinned binary:

```sh
export PATH=/usr/local/go/bin:$PATH
export GOTOOLCHAIN=local
```

## Backend

```sh
go run ./cmd/kubi
```

## Frontend

```sh
cd frontend
npm install
npm run dev
```
