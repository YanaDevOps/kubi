SHELL := /bin/bash

.PHONY: dev-backend dev-frontend build-frontend build-backend build

dev-backend:
	go run ./cmd/kubi

dev-frontend:
	cd frontend && npm install && npm run dev

build-frontend:
	./scripts/build.sh

build-backend:
	mkdir -p bin
	go build -o bin/kubi ./cmd/kubi

build: build-frontend build-backend
