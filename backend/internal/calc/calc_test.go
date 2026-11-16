package calc

import (
	"errors"
	"math"
	"testing"
)

func TestApply(t *testing.T) {
	tests := []struct {
		name    string
		op      Operation
		a, b    float64
		want    float64
		wantErr error
	}{
		{"add positive", Add, 12, 7, 19, nil},
		{"add negative", Add, -5, -3, -8, nil},
		{"add zero", Add, 0, 0, 0, nil},
		{"add decimals keep full precision", Add, 0.1, 0.2, 0.30000000000000004, nil},
		{"add overflow", Add, math.MaxFloat64, math.MaxFloat64, 0, ErrResultOutOfRange},

		{"subtract", Subtract, 10, 4, 6, nil},
		{"subtract to negative", Subtract, 4, 10, -6, nil},
		{"subtract decimals", Subtract, 1.5, 0.25, 1.25, nil},
		{"subtract overflow", Subtract, -math.MaxFloat64, math.MaxFloat64, 0, ErrResultOutOfRange},

		{"multiply", Multiply, 6, 7, 42, nil},
		{"multiply by zero", Multiply, 12345, 0, 0, nil},
		{"multiply negative zero is normalised", Multiply, -1, 0, 0, nil},
		{"multiply negatives", Multiply, -3, -4, 12, nil},
		{"multiply decimals", Multiply, 2.5, 4, 10, nil},
		{"multiply overflow", Multiply, 1e200, 1e200, 0, ErrResultOutOfRange},
		{"multiply underflow is accepted", Multiply, 1e-200, 1e-200, 0, nil},

		{"divide", Divide, 10, 4, 2.5, nil},
		{"divide negative", Divide, -9, 3, -3, nil},
		{"divide zero numerator", Divide, 0, 5, 0, nil},
		{"divide by zero", Divide, 5, 0, 0, ErrDivisionByZero},
		{"divide zero by zero", Divide, 0, 0, 0, ErrDivisionByZero},
		{"divide overflow", Divide, math.MaxFloat64, 1e-10, 0, ErrResultOutOfRange},

		{"power", Power, 2, 10, 1024, nil},
		{"power zero exponent", Power, 7, 0, 1, nil},
		{"zero to the zero is one", Power, 0, 0, 1, nil},
		{"zero to positive power", Power, 0, 3, 0, nil},
		{"zero to negative power", Power, 0, -1, 0, ErrUndefinedResult},
		{"negative zero to negative power", Power, math.Copysign(0, -1), -2, 0, ErrUndefinedResult},
		{"negative base odd integer exponent", Power, -2, 3, -8, nil},
		{"negative base even integer exponent", Power, -2, 2, 4, nil},
		{"negative base fractional exponent", Power, -8, 1.0 / 3.0, 0, ErrUndefinedResult},
		{"fractional exponent", Power, 9, 0.5, 3, nil},
		{"negative exponent", Power, 2, -2, 0.25, nil},
		{"power overflow", Power, 10, 400, 0, ErrResultOutOfRange},
		{"power underflow is accepted", Power, 10, -400, 0, nil},

		{"sqrt", Sqrt, 81, 0, 9, nil},
		{"sqrt ignores b", Sqrt, 81, 123, 9, nil},
		{"sqrt zero", Sqrt, 0, 0, 0, nil},
		{"sqrt decimal", Sqrt, 2.25, 0, 1.5, nil},
		{"sqrt negative", Sqrt, -1, 0, 0, ErrNegativeSquareRoot},

		{"percent", Percent, 15, 200, 30, nil},
		{"percent of zero", Percent, 15, 0, 0, nil},
		{"zero percent", Percent, 0, 200, 0, nil},
		{"percent negative", Percent, -10, 50, -5, nil},
		{"percent over 100", Percent, 150, 10, 15, nil},
		{"percent product overflows but result is finite", Percent, 50, 1.7e308, 8.5e307, nil},
		{"percent truly overflows", Percent, 1e10, math.MaxFloat64, 0, ErrResultOutOfRange},

		{"unknown operation", Operation("modulo"), 1, 2, 0, ErrUnknownOperation},
		{"empty operation", Operation(""), 1, 2, 0, ErrUnknownOperation},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Apply(tt.op, tt.a, tt.b)
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("Apply(%q, %v, %v) error = %v, want %v", tt.op, tt.a, tt.b, err, tt.wantErr)
			}
			if err != nil {
				return
			}
			if got != tt.want {
				t.Errorf("Apply(%q, %v, %v) = %v, want %v", tt.op, tt.a, tt.b, got, tt.want)
			}
			if math.Signbit(got) && got == 0 {
				t.Errorf("Apply(%q, %v, %v) returned negative zero", tt.op, tt.a, tt.b)
			}
		})
	}
}

func TestApplyNaNIsUndefined(t *testing.T) {
	got, err := Apply(Add, math.Inf(1), math.Inf(-1))
	if !errors.Is(err, ErrUndefinedResult) {
		t.Fatalf("got (%v, %v), want ErrUndefinedResult", got, err)
	}
}

func TestKnown(t *testing.T) {
	for _, op := range []Operation{Add, Subtract, Multiply, Divide, Power, Sqrt, Percent} {
		if !Known(op) {
			t.Errorf("Known(%q) = false, want true", op)
		}
	}
	for _, op := range []Operation{"", "ADD", "mod", "sqrt "} {
		if Known(op) {
			t.Errorf("Known(%q) = true, want false", op)
		}
	}
}

func TestIsUnary(t *testing.T) {
	if !IsUnary(Sqrt) {
		t.Error("IsUnary(sqrt) = false, want true")
	}
	for _, op := range []Operation{Add, Subtract, Multiply, Divide, Power, Percent} {
		if IsUnary(op) {
			t.Errorf("IsUnary(%q) = true, want false", op)
		}
	}
}
