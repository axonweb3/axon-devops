package v1alpha1

import (
	"log"
	"testing"

	"github.com/pelletier/go-toml"
)

func TestConfig(t *testing.T) {
	var c Config
	if err := toml.Unmarshal([]byte(ChainConfigTemplate), &c); err != nil {
		t.Fatalf("error: %v", err)
	}

	b, err := toml.Marshal(c)
	if err != nil {
		log.Fatal(err)
	}

	t.Logf("--- t:\n%v\n\n", string(b))
}
