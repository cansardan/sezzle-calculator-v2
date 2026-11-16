// Package api exposes the calculator over HTTP: request parsing, validation
// and mapping of calc errors to JSON error responses.
package api

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"math"
	"net/http"
	"os"
	"strconv"

	"github.com/cansardan/sezzle-calculator-v2/backend/internal/calc"
)

// MaxBodyBytes is the largest accepted request body.
const MaxBodyBytes = 4 << 10

type calculateResponse struct {
	Result float64 `json:"result"`
}

type errorBody struct {
	Error errorDetail `json:"error"`
}

type errorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// NewHandler returns the HTTP handler for the whole service. If staticDir
// names an existing directory, it is served at "/".
func NewHandler(staticDir string, logger *slog.Logger) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/calculate", calculate)
	mux.HandleFunc("/healthz", health)
	mux.HandleFunc("/api/", func(w http.ResponseWriter, _ *http.Request) {
		writeError(w, &apiError{http.StatusNotFound, "not_found", "Not found."})
	})

	if info, err := os.Stat(staticDir); staticDir != "" && err == nil && info.IsDir() {
		mux.Handle("/", http.FileServer(http.Dir(staticDir)))
	} else {
		mux.HandleFunc("/", func(w http.ResponseWriter, _ *http.Request) {
			writeError(w, &apiError{http.StatusNotFound, "not_found", "Not found."})
		})
	}

	return logRequests(logger, mux)
}

func health(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		methodNotAllowed(w, "GET, HEAD")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func calculate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w, http.MethodPost)
		return
	}

	req, err := parseRequest(w, r)
	if err != nil {
		writeError(w, err)
		return
	}

	result, calcErr := calc.Apply(req.op, req.a, req.b)
	if calcErr != nil {
		writeError(w, calcError(calcErr))
		return
	}
	writeJSON(w, http.StatusOK, calculateResponse{Result: result})
}

type request struct {
	op   calc.Operation
	a, b float64
}

// parseRequest reads and validates the request body.
func parseRequest(w http.ResponseWriter, r *http.Request) (request, *apiError) {
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, MaxBodyBytes))
	if err != nil {
		var tooLarge *http.MaxBytesError
		if errors.As(err, &tooLarge) {
			return request{}, &apiError{http.StatusRequestEntityTooLarge, "request_too_large", "Request body is too large."}
		}
		return request{}, badRequest("invalid_json", "Request body could not be read.")
	}

	// json.Valid rejects empty input, malformed JSON and trailing data.
	if !json.Valid(body) {
		return request{}, badRequest("invalid_json", "Request body must be a single valid JSON object.")
	}
	if trimmed := bytes.TrimSpace(body); trimmed[0] != '{' {
		return request{}, badRequest("invalid_request", "Request body must be a JSON object.")
	}

	var fields map[string]json.RawMessage
	if err := json.Unmarshal(body, &fields); err != nil {
		return request{}, badRequest("invalid_request", "Request body must be a JSON object.")
	}
	for name := range fields {
		if name != "operation" && name != "a" && name != "b" {
			return request{}, badRequest("invalid_request", "Unknown field "+strconv.Quote(name)+".")
		}
	}

	op, apiErr := parseOperation(fields["operation"])
	if apiErr != nil {
		return request{}, apiErr
	}

	a, apiErr := parseOperand("a", fields["a"])
	if apiErr != nil {
		return request{}, apiErr
	}

	rawB, hasB := fields["b"]
	if calc.IsUnary(op) {
		if hasB {
			return request{}, badRequest("unexpected_operand", "Operand \"b\" is not allowed for "+string(op)+".")
		}
		return request{op: op, a: a}, nil
	}

	b, apiErr := parseOperand("b", rawB)
	if apiErr != nil {
		return request{}, apiErr
	}
	return request{op: op, a: a, b: b}, nil
}

func parseOperation(raw json.RawMessage) (calc.Operation, *apiError) {
	if raw == nil {
		return "", badRequest("unknown_operation", "Field \"operation\" is required.")
	}
	var name string
	if raw[0] != '"' || json.Unmarshal(raw, &name) != nil {
		return "", badRequest("invalid_request", "Field \"operation\" must be a string.")
	}
	op := calc.Operation(name)
	if !calc.Known(op) {
		return "", badRequest("unknown_operation", "Unknown operation "+strconv.Quote(name)+".")
	}
	return op, nil
}

// parseOperand distinguishes an absent operand from null, strings and numbers.
func parseOperand(name string, raw json.RawMessage) (float64, *apiError) {
	if raw == nil {
		return 0, badRequest("missing_operand", "Operand \""+name+"\" is required.")
	}
	invalid := badRequest("invalid_operand", "Operand \""+name+"\" must be a finite number.")
	if raw[0] != '-' && (raw[0] < '0' || raw[0] > '9') {
		return 0, invalid
	}
	value, err := strconv.ParseFloat(string(raw), 64)
	if err != nil || math.IsInf(value, 0) || math.IsNaN(value) {
		return 0, invalid
	}
	return value, nil
}

func methodNotAllowed(w http.ResponseWriter, allow string) {
	w.Header().Set("Allow", allow)
	writeError(w, &apiError{http.StatusMethodNotAllowed, "method_not_allowed", "Method not allowed."})
}

func writeError(w http.ResponseWriter, e *apiError) {
	writeJSON(w, e.Status, errorBody{Error: errorDetail{Code: e.Code, Message: e.Message}})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
