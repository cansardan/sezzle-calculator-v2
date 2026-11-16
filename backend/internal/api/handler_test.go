package api

import (
	"bytes"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func newTestHandler(t *testing.T, staticDir string) http.Handler {
	t.Helper()
	return NewHandler(staticDir, slog.New(slog.NewTextHandler(io.Discard, nil)))
}

func do(t *testing.T, h http.Handler, method, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func errCode(t *testing.T, rec *httptest.ResponseRecorder) string {
	t.Helper()
	var body errorBody
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("response is not an error body: %q (%v)", rec.Body.String(), err)
	}
	return body.Error.Code
}

func TestCalculateSuccess(t *testing.T) {
	tests := []struct {
		name string
		body string
		want string
	}{
		{"add", `{"operation":"add","a":12,"b":7}`, `{"result":19}`},
		{"subtract", `{"operation":"subtract","a":10,"b":4}`, `{"result":6}`},
		{"multiply", `{"operation":"multiply","a":6,"b":7}`, `{"result":42}`},
		{"divide", `{"operation":"divide","a":10,"b":4}`, `{"result":2.5}`},
		{"power", `{"operation":"power","a":2,"b":10}`, `{"result":1024}`},
		{"percent", `{"operation":"percent","a":15,"b":200}`, `{"result":30}`},
		{"unary sqrt", `{"operation":"sqrt","a":81}`, `{"result":9}`},
		{"zero operand is not missing", `{"operation":"add","a":0,"b":0}`, `{"result":0}`},
		{"full precision is returned", `{"operation":"add","a":0.1,"b":0.2}`, `{"result":0.30000000000000004}`},
		{"exponent notation", `{"operation":"add","a":1e2,"b":-2.5E1}`, `{"result":75}`},
		{"surrounding whitespace", " \n{\"operation\":\"add\",\"a\":1,\"b\":2}\n ", `{"result":3}`},
		{"tiny operand underflows to zero", `{"operation":"add","a":1e-999,"b":1}`, `{"result":1}`},
		{"percent with overflowing product", `{"operation":"percent","a":50,"b":1.7e308}`, `{"result":8.5e+307}`},
	}
	h := newTestHandler(t, "")
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := do(t, h, http.MethodPost, "/api/v1/calculate", tt.body)
			if rec.Code != http.StatusOK {
				t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
			}
			if got := strings.TrimSpace(rec.Body.String()); got != tt.want {
				t.Errorf("body = %s, want %s", got, tt.want)
			}
			if ct := rec.Header().Get("Content-Type"); ct != "application/json; charset=utf-8" {
				t.Errorf("Content-Type = %q", ct)
			}
			if cc := rec.Header().Get("Cache-Control"); cc != "no-store" {
				t.Errorf("Cache-Control = %q", cc)
			}
		})
	}
}

func TestCalculateErrors(t *testing.T) {
	tests := []struct {
		name       string
		body       string
		wantStatus int
		wantCode   string
	}{
		{"empty body", ``, 400, "invalid_json"},
		{"whitespace only", "  \n", 400, "invalid_json"},
		{"malformed json", `{"operation":`, 400, "invalid_json"},
		{"trailing data", `{"operation":"add","a":1,"b":2} {}`, 400, "invalid_json"},
		{"trailing garbage", `{"operation":"add","a":1,"b":2}x`, 400, "invalid_json"},

		{"array body", `[1,2]`, 400, "invalid_request"},
		{"string body", `"add"`, 400, "invalid_request"},
		{"number body", `42`, 400, "invalid_request"},
		{"null body", `null`, 400, "invalid_request"},
		{"unknown field", `{"operation":"add","a":1,"b":2,"c":3}`, 400, "invalid_request"},
		{"operation is a number", `{"operation":1,"a":1,"b":2}`, 400, "invalid_request"},
		{"operation is null", `{"operation":null,"a":1,"b":2}`, 400, "invalid_request"},
		{"operation is an object", `{"operation":{},"a":1,"b":2}`, 400, "invalid_request"},

		{"operation missing", `{"a":1,"b":2}`, 400, "unknown_operation"},
		{"unknown operation", `{"operation":"modulo","a":1,"b":2}`, 400, "unknown_operation"},
		{"operation is case sensitive", `{"operation":"ADD","a":1,"b":2}`, 400, "unknown_operation"},
		{"empty operation", `{"operation":"","a":1,"b":2}`, 400, "unknown_operation"},

		{"a missing", `{"operation":"add","b":2}`, 400, "missing_operand"},
		{"b missing", `{"operation":"add","a":1}`, 400, "missing_operand"},
		{"sqrt without a", `{"operation":"sqrt"}`, 400, "missing_operand"},

		{"a null", `{"operation":"add","a":null,"b":2}`, 400, "invalid_operand"},
		{"b null", `{"operation":"add","a":1,"b":null}`, 400, "invalid_operand"},
		{"a string", `{"operation":"add","a":"1","b":2}`, 400, "invalid_operand"},
		{"b boolean", `{"operation":"add","a":1,"b":true}`, 400, "invalid_operand"},
		{"a array", `{"operation":"add","a":[1],"b":2}`, 400, "invalid_operand"},
		{"b object", `{"operation":"add","a":1,"b":{}}`, 400, "invalid_operand"},
		{"a out of float64 range", `{"operation":"add","a":1e999,"b":2}`, 400, "invalid_operand"},
		{"b negative out of range", `{"operation":"add","a":1,"b":-1e999}`, 400, "invalid_operand"},
		{"sqrt a string", `{"operation":"sqrt","a":"9"}`, 400, "invalid_operand"},

		{"sqrt with b", `{"operation":"sqrt","a":9,"b":1}`, 400, "unexpected_operand"},
		{"sqrt with null b", `{"operation":"sqrt","a":9,"b":null}`, 400, "unexpected_operand"},

		{"division by zero", `{"operation":"divide","a":5,"b":0}`, 422, "division_by_zero"},
		{"negative square root", `{"operation":"sqrt","a":-1}`, 422, "negative_square_root"},
		{"zero to negative power", `{"operation":"power","a":0,"b":-1}`, 422, "undefined_result"},
		{"negative base fractional exponent", `{"operation":"power","a":-8,"b":0.3333333333333333}`, 422, "undefined_result"},
		{"overflow", `{"operation":"multiply","a":1e200,"b":1e200}`, 422, "result_out_of_range"},
		{"power overflow", `{"operation":"power","a":10,"b":400}`, 422, "result_out_of_range"},
		{"percent overflow", `{"operation":"percent","a":1e10,"b":1.7e308}`, 422, "result_out_of_range"},
	}
	h := newTestHandler(t, "")
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := do(t, h, http.MethodPost, "/api/v1/calculate", tt.body)
			if rec.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d (body %s)", rec.Code, tt.wantStatus, rec.Body.String())
			}
			if got := errCode(t, rec); got != tt.wantCode {
				t.Errorf("code = %q, want %q", got, tt.wantCode)
			}
			if ct := rec.Header().Get("Content-Type"); ct != "application/json; charset=utf-8" {
				t.Errorf("Content-Type = %q", ct)
			}
			if cc := rec.Header().Get("Cache-Control"); cc != "no-store" {
				t.Errorf("Cache-Control = %q", cc)
			}
		})
	}
}

func TestDivisionByZeroBodyExactly(t *testing.T) {
	rec := do(t, newTestHandler(t, ""), http.MethodPost, "/api/v1/calculate", `{"operation":"divide","a":5,"b":0}`)
	want := `{"error":{"code":"division_by_zero","message":"Cannot divide by zero."}}`
	if got := strings.TrimSpace(rec.Body.String()); got != want {
		t.Errorf("body = %s, want %s", got, want)
	}
}

func TestRequestTooLarge(t *testing.T) {
	big := `{"operation":"add","a":1,"b":2,"pad":"` + strings.Repeat("x", MaxBodyBytes) + `"}`
	rec := do(t, newTestHandler(t, ""), http.MethodPost, "/api/v1/calculate", big)
	if rec.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("status = %d, want 413", rec.Code)
	}
	if got := errCode(t, rec); got != "request_too_large" {
		t.Errorf("code = %q", got)
	}
}

type failingReader struct{}

func (failingReader) Read([]byte) (int, error) { return 0, io.ErrUnexpectedEOF }

func TestUnreadableBody(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/calculate", failingReader{})
	rec := httptest.NewRecorder()
	newTestHandler(t, "").ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest || errCode(t, rec) != "invalid_json" {
		t.Errorf("got %d %s", rec.Code, rec.Body.String())
	}
}

func TestMethodNotAllowed(t *testing.T) {
	h := newTestHandler(t, "")
	for _, method := range []string{http.MethodGet, http.MethodPut, http.MethodDelete, http.MethodPatch, http.MethodHead} {
		t.Run(method, func(t *testing.T) {
			rec := do(t, h, method, "/api/v1/calculate", "")
			if rec.Code != http.StatusMethodNotAllowed {
				t.Fatalf("status = %d, want 405", rec.Code)
			}
			if allow := rec.Header().Get("Allow"); allow != "POST" {
				t.Errorf("Allow = %q, want POST", allow)
			}
			if method != http.MethodHead && errCode(t, rec) != "method_not_allowed" {
				t.Errorf("unexpected body %s", rec.Body.String())
			}
		})
	}
}

func TestHealthz(t *testing.T) {
	h := newTestHandler(t, "")
	rec := do(t, h, http.MethodGet, "/healthz", "")
	if rec.Code != http.StatusOK || strings.TrimSpace(rec.Body.String()) != `{"status":"ok"}` {
		t.Errorf("got %d %s", rec.Code, rec.Body.String())
	}

	rec = do(t, h, http.MethodPost, "/healthz", "")
	if rec.Code != http.StatusMethodNotAllowed || rec.Header().Get("Allow") != "GET, HEAD" {
		t.Errorf("POST /healthz: got %d Allow=%q", rec.Code, rec.Header().Get("Allow"))
	}
}

func TestUnknownAPIPathIsJSON404(t *testing.T) {
	for _, staticDir := range []string{"", t.TempDir()} {
		rec := do(t, newTestHandler(t, staticDir), http.MethodGet, "/api/v1/nope", "")
		if rec.Code != http.StatusNotFound {
			t.Fatalf("status = %d, want 404", rec.Code)
		}
		if errCode(t, rec) != "not_found" {
			t.Errorf("unexpected body %s", rec.Body.String())
		}
	}
}

func TestRootWithoutStaticDirIsJSON404(t *testing.T) {
	for _, staticDir := range []string{"", filepath.Join(t.TempDir(), "missing")} {
		rec := do(t, newTestHandler(t, staticDir), http.MethodGet, "/", "")
		if rec.Code != http.StatusNotFound || errCode(t, rec) != "not_found" {
			t.Errorf("staticDir %q: got %d %s", staticDir, rec.Code, rec.Body.String())
		}
	}
}

func TestStaticFilesAreServed(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "index.html"), []byte("<h1>calc</h1>"), 0o600); err != nil {
		t.Fatal(err)
	}
	h := newTestHandler(t, dir)

	rec := do(t, h, http.MethodGet, "/", "")
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), "<h1>calc</h1>") {
		t.Errorf("GET /: got %d %s", rec.Code, rec.Body.String())
	}

	// API routes still win over static files.
	rec = do(t, h, http.MethodPost, "/api/v1/calculate", `{"operation":"add","a":1,"b":1}`)
	if rec.Code != http.StatusOK {
		t.Errorf("API with static dir: status %d", rec.Code)
	}
}

func TestRequestLogDoesNotIncludeBody(t *testing.T) {
	var buf bytes.Buffer
	h := NewHandler("", slog.New(slog.NewTextHandler(&buf, nil)))
	do(t, h, http.MethodPost, "/api/v1/calculate", `{"operation":"add","a":123456789,"b":2}`)
	out := buf.String()
	if !strings.Contains(out, "status=200") || !strings.Contains(out, "path=/api/v1/calculate") {
		t.Errorf("log line missing fields: %s", out)
	}
	if strings.Contains(out, "123456789") {
		t.Errorf("log leaked request body: %s", out)
	}
}

func TestCalcErrorMapping(t *testing.T) {
	if got := calcError(io.EOF); got.Status != http.StatusInternalServerError || got.Code != "internal_error" {
		t.Errorf("unexpected fallback mapping: %+v", got)
	}
	if got := (&apiError{Code: "x", Message: "y"}).Error(); got != "x: y" {
		t.Errorf("Error() = %q", got)
	}
}
