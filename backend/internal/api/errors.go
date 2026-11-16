package api

import (
	"errors"
	"net/http"

	"github.com/cansardan/sezzle-calculator-v2/backend/internal/calc"
)

// apiError is an error with an HTTP status and a stable, machine-readable code.
type apiError struct {
	Status  int
	Code    string
	Message string
}

func (e *apiError) Error() string { return e.Code + ": " + e.Message }

func badRequest(code, message string) *apiError {
	return &apiError{Status: http.StatusBadRequest, Code: code, Message: message}
}

// calcError maps an error from the calc package to an API error.
func calcError(err error) *apiError {
	switch {
	case errors.Is(err, calc.ErrDivisionByZero):
		return &apiError{http.StatusUnprocessableEntity, "division_by_zero", "Cannot divide by zero."}
	case errors.Is(err, calc.ErrNegativeSquareRoot):
		return &apiError{http.StatusUnprocessableEntity, "negative_square_root", "Cannot take the square root of a negative number."}
	case errors.Is(err, calc.ErrResultOutOfRange):
		return &apiError{http.StatusUnprocessableEntity, "result_out_of_range", "The result is too large to represent."}
	case errors.Is(err, calc.ErrUndefinedResult):
		return &apiError{http.StatusUnprocessableEntity, "undefined_result", "The result is undefined."}
	case errors.Is(err, calc.ErrUnknownOperation):
		return badRequest("unknown_operation", "Unknown operation.")
	default:
		return &apiError{http.StatusInternalServerError, "internal_error", "Something went wrong."}
	}
}
