package config

import (
	"flag"
	"fmt"
	"io"
	"os"

	"gopkg.in/yaml.v3"
)

type Config struct {
	ConfigFile          string `yaml:"-"`
	Kubeconfig          string `yaml:"kubeconfig"`
	Context             string `yaml:"context"`
	Namespace           string `yaml:"namespace"`
	Listen              string `yaml:"listen"`
	Port                int    `yaml:"port"`
	LogLevel            string `yaml:"logLevel"`
	NoMetrics           bool   `yaml:"noMetrics"`
	SecretsMetadataOnly bool   `yaml:"secretsMetadataOnly"`
	AllowSecretValues   bool   `yaml:"allowSecretValues"`
	ReadonlyStrict      bool   `yaml:"readonlyStrict"`
}

func Parse() (Config, error) {
	cfg := Config{
		Listen:              "127.0.0.1",
		Port:                17890,
		LogLevel:            "info",
		SecretsMetadataOnly: true,
	}

	defaultPath := defaultConfigPath()
	pre := flag.NewFlagSet(os.Args[0], flag.ContinueOnError)
	pre.SetOutput(io.Discard)
	configPath := pre.String("config", "", "path to config file")
	_ = pre.Parse(os.Args[1:])
	pathUsed := defaultPath
	if *configPath != "" {
		pathUsed = *configPath
	}

	if pathUsed != "" {
		if data, err := os.ReadFile(pathUsed); err == nil {
			if err := yaml.Unmarshal(data, &cfg); err != nil {
				return cfg, fmt.Errorf("parse config file: %w", err)
			}
			cfg.ConfigFile = pathUsed
		} else if *configPath != "" {
			return cfg, fmt.Errorf("read config file: %w", err)
		}
	}

	fs := flag.NewFlagSet(os.Args[0], flag.ExitOnError)
	fs.StringVar(&cfg.ConfigFile, "config", cfg.ConfigFile, "path to config file")
	fs.StringVar(&cfg.Kubeconfig, "kubeconfig", cfg.Kubeconfig, "path to kubeconfig file (default: standard kubeconfig resolution)")
	fs.StringVar(&cfg.Context, "context", cfg.Context, "kubeconfig context to use")
	fs.StringVar(&cfg.Namespace, "namespace", cfg.Namespace, "namespace scope (default: all)")
	fs.StringVar(&cfg.Listen, "listen", cfg.Listen, "listen address")
	fs.IntVar(&cfg.Port, "port", cfg.Port, "listen port")
	fs.StringVar(&cfg.LogLevel, "log-level", cfg.LogLevel, "log level: debug, info, warn, error")
	fs.BoolVar(&cfg.NoMetrics, "no-metrics", cfg.NoMetrics, "disable metrics collection")
	fs.BoolVar(&cfg.SecretsMetadataOnly, "secrets-metadata-only", cfg.SecretsMetadataOnly, "do not fetch secret values")
	fs.BoolVar(&cfg.AllowSecretValues, "allow-secret-values", cfg.AllowSecretValues, "allow fetching secret values (unsafe)")
	fs.BoolVar(&cfg.ReadonlyStrict, "readonly-strict", cfg.ReadonlyStrict, "reject any mutating requests even if handlers are added")
	fs.Parse(os.Args[1:])

	if cfg.AllowSecretValues && cfg.SecretsMetadataOnly {
		return cfg, fmt.Errorf("cannot enable --allow-secret-values while --secrets-metadata-only is true")
	}

	if cfg.Port <= 0 || cfg.Port > 65535 {
		return cfg, fmt.Errorf("invalid --port: %d", cfg.Port)
	}

	return cfg, nil
}

func (c Config) Address() string {
	return fmt.Sprintf("%s:%d", c.Listen, c.Port)
}

func defaultConfigPath() string {
	home, err := os.UserHomeDir()
	if err != nil || home == "" {
		return ""
	}
	return fmt.Sprintf("%s/.config/kubi/config.yaml", home)
}

func (c Config) Env() map[string]string {
	return map[string]string{
		"KUBECONFIG": c.Kubeconfig,
		"KUBECONTEXT": c.Context,
		"NAMESPACE": c.Namespace,
	}
}

func ExitWithError(err error) {
	fmt.Fprintf(os.Stderr, "kubescope: %v\n", err)
	os.Exit(1)
}
