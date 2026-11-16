// Package calc implements the calculator's arithmetic. It has no HTTP or JSON
// dependencies so it can be tested and reused on its own.
package calc

import (
	"errors"
	"math"
)

// Operation identifies an arithmetic operation by its API id.
type Operation string

// Supported operations.
const (
	Add      Operation = "add"
	Subtract Operation = "subtract"
	Multiply Operation = "multiply"
	Divide   Operation = "divide"
	Power    Operation = "power"
	Sqrt     Operation = "sqrt"
	Percent  Operation = "percent"
)

// Errors returned by Apply. Callers can match them with errors.Is.
var (
	ErrUnknownOperation   = errors.New("unknown operation")
	ErrDivisionByZero     = errors.New("division by zero")
	ErrNegativeSquareRoot = errors.New("square root of a negative number")
	ErrUndefinedResult    = errors.New("undefined result")
	ErrResultOutOfRange   = errors.New("result out of range")
)

// Known reports whether op is one of the supported operations.
func Known(op Operation) bool {
	switch op {
	case Add, Subtract, Multiply, Divide, Power, Sqrt, Percent:
		return true
	}
	return false
}

// IsUnary reports whether op takes a single operand (a).
func IsUnary(op Operation) bool {
	return op == Sqrt
}

// Apply computes op on a and b. For unary operations b is ignored.
// The returned value is always finite when err is nil.
func Apply(op Operation, a, b float64) (float64, error) {
	var result float64

	switch op {
	case Add:
		result = a + b
	case Subtract:
		result = a - b
	case Multiply:
		result = a * b
	case Divide:
		if b == 0 {
			return 0, ErrDivisionByZero
		}
		result = a / b
	case Power:
		if a == 0 && b < 0 {
			return 0, ErrUndefinedResult
		}
		if a < 0 && b != math.Trunc(b) {
			return 0, ErrUndefinedResult
		}
		result = math.Pow(a, b)
	case Sqrt:
		if a < 0 {
			return 0, ErrNegativeSquareRoot
		}
		result = math.Sqrt(a)
	case Percent:
		result = percent(a, b)
	default:
		return 0, ErrUnknownOperation
	}

	return finite(result)
}

// percent returns a percent of b. If a*b overflows it falls back to
// a/100*b, which may still be representable.
func percent(a, b float64) float64 {
	product := a * b
	if math.IsInf(product, 0) {
		return a / 100 * b
	}
	return product / 100
}

func finite(v float64) (float64, error) {
	switch {
	case math.IsNaN(v):
		return 0, ErrUndefinedResult
	case math.IsInf(v, 0):
		return 0, ErrResultOutOfRange
	}
	if v == 0 {
		return 0, nil // normalise -0
	}
	return v, nil
}
