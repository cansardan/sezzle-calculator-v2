package main

import (
	"context"
	"io"
	"log/slog"
	"net"
	"net/http"
	"strings"
	"testing"
	"time"
)

func discardLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

func TestLoadConfig(t *testing.T) {
	tests := []struct {
		name string
		env  map[string]string
		want config
	}{
		{"defaults", map[string]string{}, config{port: "8080"}},
		{"custom", map[string]string{"PORT": "9090", "STATIC_DIR": "/srv/ui"}, config{port: "9090", staticDir: "/srv/ui"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := loadConfig(func(k string) string { return tt.env[k] })
			if got != tt.want {
				t.Errorf("loadConfig() = %+v, want %+v", got, tt.want)
			}
		})
	}
}

func TestRunServesAndShutsDownGracefully(t *testing.T) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() { done <- run(ctx, config{port: "0"}, ln, discardLogger()) }()

	resp, err := http.Post("http://"+ln.Addr().String()+"/api/v1/calculate", "application/json",
		strings.NewReader(`{"operation":"add","a":1,"b":2}`))
	if err != nil {
		t.Fatal(err)
	}
	body, _ := io.ReadAll(resp.Body)
	resp.Body.Close()
	if resp.StatusCode != http.StatusOK || strings.TrimSpace(string(body)) != `{"result":3}` {
		t.Fatalf("got %d %q", resp.StatusCode, body)
	}

	cancel()
	select {
	case err := <-done:
		if err != nil {
			t.Fatalf("run returned %v, want nil", err)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("server did not shut down")
	}
}

func TestRunReturnsServeError(t *testing.T) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	ln.Close() // Serve fails immediately on a closed listener.
	if err := run(context.Background(), config{}, ln, discardLogger()); err == nil {
		t.Fatal("expected an error from a closed listener")
	}
}
