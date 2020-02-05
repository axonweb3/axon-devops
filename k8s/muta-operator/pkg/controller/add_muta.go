package controller

import (
	"github.com/huwenchao/muta-devops/k8s/muta-operator/pkg/controller/muta"
)

func init() {
	// AddToManagerFuncs is a list of functions to create controllers and add them to a manager.
	AddToManagerFuncs = append(AddToManagerFuncs, muta.Add)
}
