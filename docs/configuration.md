# Configuration

KUBI supports a simple YAML configuration file plus CLI overrides.

## Example

```yaml
kubeconfig: /home/user/.kube/config
context: prod
namespace: kube-system
listen: 127.0.0.1
port: 17890
logLevel: info
noMetrics: false
secretsMetadataOnly: true
allowSecretValues: false
readonlyStrict: true
```

## Usage

- Default path: `~/.config/kubi/config.yaml` (loaded if present).
- Use `--config` to load a file: `kubi --config ./kubi.yaml`.
- Any CLI flag overrides the config file value.
- `allowSecretValues` must remain `false` unless `secretsMetadataOnly` is `false`.

## Development notes

- See `docs/development.md` for Go toolchain and local run commands.
