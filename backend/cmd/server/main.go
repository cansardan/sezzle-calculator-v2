// Command server runs the calculator HTTP service.
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/cansardan/sezzle-calculator-v2/backend/internal/api"
)

const (
	defaultPort     = "8080"
	shutdownTimeout = 10 * time.Second
)

type config struct {
	port      string
	staticDir string
}

func loadConfig(getenv func(string) string) config {
	cfg := config{port: defaultPort, staticDir: getenv("STATIC_DIR")}
	if p := getenv("PORT"); p != "" {
		cfg.port = p
	}
	return cfg
}

func main() {
	logger := slog.New(slog.NewTextHandler(os.Stderr, nil))
	cfg := loadConfig(os.Getenv)

	ln, err := net.Listen("tcp", ":"+cfg.port)
	if err != nil {
		logger.Error("listen failed", "error", err)
		os.Exit(1)
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	if err := run(ctx, cfg, ln, logger); err != nil {
		logger.Error("server failed", "error", err)
		os.Exit(1)
	}
}

// run serves on ln until ctx is cancelled, then shuts down gracefully.
func run(ctx context.Context, cfg config, ln net.Listener, logger *slog.Logger) error {
	srv := &http.Server{
		Handler:           api.NewHandler(cfg.staticDir, logger),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	serveErr := make(chan error, 1)
	go func() {
		logger.Info("listening", "addr", ln.Addr().String(), "static_dir", cfg.staticDir)
		serveErr <- srv.Serve(ln)
	}()

	select {
	case err := <-serveErr:
		return err
	case <-ctx.Done():
	}

	logger.Info("shutting down")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("shutdown: %w", err)
	}
	if err := <-serveErr; !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}
