package muta

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"time"

	nervosv1alpha1 "github.com/huwenchao/muta-devops/k8s/muta-operator/pkg/apis/nervos/v1alpha1"
	"github.com/pelletier/go-toml"
	appsv1 "k8s.io/api/apps/v1"
	batchv1 "k8s.io/api/batch/v1"
	batchv1beta1 "k8s.io/api/batch/v1beta1"
	corev1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/handler"
	logf "sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/manager"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
	"sigs.k8s.io/controller-runtime/pkg/source"
)

var log = logf.Log.WithName("controller_muta")

var keypairName = types.NamespacedName{Name: "muta-keypairs-config", Namespace: "mutadev"}

var storageClassName = "muta"

/**
* USER ACTION REQUIRED: This is a scaffold file intended for the user to modify with their own Controller
* business logic.  Delete these comments after modifying this file.*
 */

// Add creates a new Muta Controller and adds it to the Manager. The Manager will set fields on the Controller
// and Start it when the Manager is Started.
func Add(mgr manager.Manager) error {
	return add(mgr, newReconciler(mgr))
}

// newReconciler returns a new reconcile.Reconciler
func newReconciler(mgr manager.Manager) reconcile.Reconciler {
	return &ReconcileMuta{client: mgr.GetClient(), scheme: mgr.GetScheme()}
}

// add adds a new Controller to mgr with r as the reconcile.Reconciler
func add(mgr manager.Manager, r reconcile.Reconciler) error {
	// Create a new controller
	c, err := controller.New("muta-controller", mgr, controller.Options{Reconciler: r})
	if err != nil {
		return err
	}

	// Watch for changes to primary resource Muta
	err = c.Watch(&source.Kind{Type: &nervosv1alpha1.Muta{}}, &handler.EnqueueRequestForObject{})
	if err != nil {
		return err
	}

	// // TODO(user): Modify this to be the types you create that are owned by the primary resource
	// // Watch for changes to secondary resource Pods and requeue the owner Muta
	// err = c.Watch(&source.Kind{Type: &corev1.Pod{}}, &handler.EnqueueRequestForOwner{
	// 	IsController: true,
	// 	OwnerType:    &nervosv1alpha1.Muta{},
	// })
	// if err != nil {
	// 	return err
	// }

	return nil
}

// blank assignment to verify that ReconcileMuta implements reconcile.Reconciler
var _ reconcile.Reconciler = &ReconcileMuta{}

// ReconcileMuta reconciles a Muta object
type ReconcileMuta struct {
	// This client, initialized using mgr.Client() above, is a split client
	// that reads objects from the cache and writes to the apiserver
	client client.Client
	scheme *runtime.Scheme
}

// Reconcile reads that state of the cluster for a Muta object and makes changes based on the state read
// and what is in the Muta.Spec
// TODO(user): Modify this Reconcile function to implement your Controller logic.  This example creates
// a Pod as an example
// Note:
// The Controller will requeue the Request to be processed again if the returned error is non-nil or
// Result.Requeue is true, otherwise upon completion it will remove the work from the queue.
func (r *ReconcileMuta) Reconcile(request reconcile.Request) (reconcile.Result, error) {
	reqLogger := log.WithValues("Request.Namespace", request.Namespace, "Request.Name", request.Name)
	reqLogger.Info("Reconciling Muta")

	// Fetch the Muta instance
	instance := &nervosv1alpha1.Muta{}
	err := r.client.Get(context.TODO(), request.NamespacedName, instance)
	if err != nil {
		if k8serrors.IsNotFound(err) {
			// Request object not found, could have been deleted after reconcile request.
			// Owned objects are automatically garbage collected. For additional cleanup logic use finalizers.
			// Return and don't requeue
			return reconcile.Result{}, nil
		}
		// Error reading the object - requeue the request.
		return reconcile.Result{}, err
	}

	if err = r.createMutaChain(instance); err != nil {
		log.Error(err, "create muta chain")
		return reconcile.Result{}, nil
	}
	return reconcile.Result{}, nil
	// log.Info("Reconcile %s status %s message %s", instance.GetName(), instance.Status.Status, instance.Status.Message)
	// if instance.Status.Status == nervosv1alpha1.StatusCreated {
	// 	// User mofidy crd
	// 	if err := r.client.Delete(context.TODO(), instance); err != nil {
	// 		instance.Status.Message = err.Error()
	// 		instance.Status.Status = nervosv1alpha1.StatusFailure
	// 	} else {
	// 		if err := r.client.Create(context.TODO(), instance); err != nil {
	// 			instance.Status.Message = err.Error()
	// 			instance.Status.Status = nervosv1alpha1.StatusFailure
	// 		} else {
	// 			instance.Status.Message = "ok"
	// 			instance.Status.Status = nervosv1alpha1.StatusCreated
	// 		}
	// 	}
	// } else if instance.Status.Status == nervosv1alpha1.StatusFailure {
	// 	return reconcile.Result{}, nil
	// } else {
	// 	err = r.createMutaChain(instance)
	// 	if err != nil {
	// 		instance.Status.Message = err.Error()
	// 		instance.Status.Status = nervosv1alpha1.StatusFailure
	// 	} else {
	// 		instance.Status.Message = "ok"
	// 		instance.Status.Status = nervosv1alpha1.StatusCreated
	// 	}
	// }

	// if err := r.client.Update(context.TODO(), instance); err != nil {
	// 	return reconcile.Result{}, err
	// }

	// log.Info("Reconcile done %s status %s message %s", instance.GetName(), instance.Status.Status, instance.Status.Message)

	// return reconcile.Result{}, nil
}

func (r *ReconcileMuta) createMutaChain(instance *nervosv1alpha1.Muta) error {
	keypairsConfig := &corev1.ConfigMap{}
	if err := r.client.Get(context.TODO(), keypairName, keypairsConfig); err != nil {
		return err
	}
	nodeCrypto, err := unmarshalNodeCrypto(keypairsConfig)
	if err != nil {
		return err
	}

	if instance.Spec.Size == 0 {
		return errors.New("node size cannot be empty")
	}

	keypairs := nodeCrypto.Keypairs[:instance.Spec.Size]
	chainName := instance.GetName()
	addressList := getAddressListAndBlsPubkeyList(keypairs)

	timestamp := uint64(time.Now().Unix())
	for i, keypair := range keypairs {
		config, err := copyConfig(&instance.Spec.Config)
		if err != nil {
			return err
		}
		config.Privkey = keypair.Privkey

		// set bootstrap
		bootKeypair := keypairs[0]
		pTCPAddr, err := net.ResolveTCPAddr("tcp", config.Network.ListeningAddress)
		if err != nil {
			return err
		}
		networkBoot := nervosv1alpha1.ConfigNetworkBootstrap{
			Pubkey:  bootKeypair.Pubkey,
			Address: fmt.Sprintf("%s-0:%d", chainName, pTCPAddr.Port),
		}
		config.Network.Bootstraps = []nervosv1alpha1.ConfigNetworkBootstrap{networkBoot}

		genesis, err := copyGenesis(&instance.Spec.Genesis)
		if err != nil {
			return err
		}
		genesis.Timestamp = timestamp
		genesis.Metadata.CommonRef = nodeCrypto.CommonRef
		genesis.Metadata.VerifierList = addressList
		metadata, err := json.Marshal(genesis.Metadata)
		if err != nil {
			return err
		}

		if genesis.Services == nil {
			genesis.Services = []nervosv1alpha1.ConfigService{}
		}
		genesis.Services = append(genesis.Services, nervosv1alpha1.ConfigService{
			Name:    "metadata",
			Payload: string(metadata),
		})

		nodeName := fmt.Sprintf("%s-%d", chainName, i)
		if err := r.createConfigMap(instance, nodeName, &config, &genesis); err != nil {
			return err
		}

		if err := r.createNodeService(instance, nodeName); err != nil {
			return err
		}

		if instance.Spec.Persistent {
			if err := r.createPersistent(instance, nodeName); err != nil {
				return err
			}
		}
		if err := r.createNode(instance, nodeName); err != nil {
			return err
		}
	}

	if instance.Spec.Benchmark != nil {
		firstNode := fmt.Sprintf("%s-%d", chainName, 0)
		if err := r.createBenchmark(instance, firstNode); err != nil {
			return err
		}
	}
	return nil
}

func (r *ReconcileMuta) createNode(instance *nervosv1alpha1.Muta, name string) error {
	apiTCPAddr, err := net.ResolveTCPAddr("tcp", instance.Spec.Config.GraphQL.ListeningAddress)
	if err != nil {
		return err
	}
	p2pTCPAddr, err := net.ResolveTCPAddr("tcp", instance.Spec.Config.Network.ListeningAddress)
	if err != nil {
		return err
	}

	podSpec := corev1.PodSpec{
		Containers: []corev1.Container{
			{
				Name:  "muta",
				Image: instance.Spec.Image,
				Ports: []corev1.ContainerPort{
					{
						Name:          "api",
						ContainerPort: int32(apiTCPAddr.Port),
					},
					{
						Name:          "p2p",
						ContainerPort: int32(p2pTCPAddr.Port),
					},
				},
				VolumeMounts: []corev1.VolumeMount{
					{
						Name:      "config",
						MountPath: "/app/devtools/chain",
					},
				},
				Resources: instance.Spec.Resources,
			},
		},
		Volumes: []corev1.Volume{
			{
				Name: "config",
				VolumeSource: corev1.VolumeSource{
					ConfigMap: &corev1.ConfigMapVolumeSource{
						LocalObjectReference: corev1.LocalObjectReference{
							Name: name,
						},
					},
				},
			},
		},
	}

	if instance.Spec.Persistent {
		pvcVolume := corev1.Volume{
			Name: "muta-storage",
			VolumeSource: corev1.VolumeSource{
				PersistentVolumeClaim: &corev1.PersistentVolumeClaimVolumeSource{
					ClaimName: name,
				},
			},
		}

		podSpec.Volumes = append(podSpec.Volumes, pvcVolume)

		podSpec.Containers[0].VolumeMounts = append(podSpec.Containers[0].VolumeMounts, corev1.VolumeMount{
			Name:      "muta-storage",
			MountPath: "/app/data",
		})
	}

	labels := make(map[string]string)
	labels["app"] = name
	labels["muta.nervos.org"] = instance.Name

	var chaosList []nervosv1alpha1.ChaosType
	if len(instance.Spec.Chaos) == 1 && instance.Spec.Chaos[0] == nervosv1alpha1.ChaosAll {
		chaosList = nervosv1alpha1.GetAllChaosType()
	} else {
		chaosList = instance.Spec.Chaos
	}

	for _, chaos := range chaosList {
		labels[string(chaos)] = "true"
	}

	ss := &appsv1.StatefulSet{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: instance.Namespace,
			Labels:    labels,
		},
		Spec: appsv1.StatefulSetSpec{
			Selector: &metav1.LabelSelector{
				MatchLabels: labels,
			},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{
					Name:   name,
					Labels: labels,
				},
				Spec: podSpec,
			},
		},
	}

	if err := controllerutil.SetControllerReference(instance, ss, r.scheme); err != nil {
		return err
	}

	return r.client.Create(context.TODO(), ss)
}

func (r *ReconcileMuta) createNodeService(instance *nervosv1alpha1.Muta, name string) error {
	apiTCPAddr, err := net.ResolveTCPAddr("tcp", instance.Spec.Config.GraphQL.ListeningAddress)
	if err != nil {
		return err
	}
	p2pTCPAddr, err := net.ResolveTCPAddr("tcp", instance.Spec.Config.Network.ListeningAddress)
	if err != nil {
		return err
	}

	labels := make(map[string]string)
	labels["app"] = name
	labels["muta.nervos.org"] = instance.Name

	service := &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: instance.Namespace,
			Labels:    labels,
		},
		Spec: corev1.ServiceSpec{
			Type:     corev1.ServiceTypeNodePort,
			Selector: labels,
			Ports: []corev1.ServicePort{
				{
					Name:     "api",
					Protocol: corev1.ProtocolTCP,
					Port:     int32(apiTCPAddr.Port),
				},
				{
					Name:     "p2p",
					Protocol: corev1.ProtocolTCP,
					Port:     int32(p2pTCPAddr.Port),
				},
			},
		},
	}

	if err := controllerutil.SetControllerReference(instance, service, r.scheme); err != nil {
		return err
	}

	return r.client.Create(context.TODO(), service)
}

func (r *ReconcileMuta) createConfigMap(instance *nervosv1alpha1.Muta, name string, config *nervosv1alpha1.Config, genesis *nervosv1alpha1.ConfigGenesis) error {
	configB, err := toml.Marshal(config)
	if err != nil {
		return err
	}

	genesisB, err := toml.Marshal(genesis)
	if err != nil {
		return err
	}

	labels := make(map[string]string)
	labels["muta.nervos.org"] = instance.Name

	data := map[string]string{
		"config.toml":  string(configB),
		"genesis.toml": string(genesisB),
	}
	configMap := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: instance.Namespace,
			Labels:    labels,
		},
		Data: data,
	}

	if err := controllerutil.SetControllerReference(instance, configMap, r.scheme); err != nil {
		return err
	}

	return r.client.Create(context.TODO(), configMap)
}

func (r *ReconcileMuta) createBenchmark(instance *nervosv1alpha1.Muta, name string) error {
	labels := make(map[string]string)
	labels["app"] = name
	labels["muta.nervos.org"] = instance.Name

	apiTCPAddr, err := net.ResolveTCPAddr("tcp", instance.Spec.Config.GraphQL.ListeningAddress)
	if err != nil {
		return err
	}

	url := fmt.Sprintf("http://%s:%d%s", name, apiTCPAddr.Port, instance.Spec.Config.GraphQL.GraphqlURI)

	benchmark := &batchv1beta1.CronJob{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: instance.Namespace,
			Labels:    labels,
		},
		Spec: batchv1beta1.CronJobSpec{
			Schedule: instance.Spec.Benchmark.Schedule,
			JobTemplate: batchv1beta1.JobTemplateSpec{
				Spec: batchv1.JobSpec{
					Template: corev1.PodTemplateSpec{
						Spec: corev1.PodSpec{
							Containers: []corev1.Container{
								{
									Name:  fmt.Sprintf("%s-benchmark", name),
									Image: "mutadev/muta-benchmark:019853b",
									Args:  []string{"-d", instance.Spec.Benchmark.Duration, "-c", "10", "--endpoint", url},
								},
							},
							RestartPolicy: corev1.RestartPolicyNever,
						},
					},
				},
			},
		},
	}

	if err := controllerutil.SetControllerReference(instance, benchmark, r.scheme); err != nil {
		return err
	}

	return r.client.Create(context.TODO(), benchmark)
}

func (r *ReconcileMuta) createPersistent(instance *nervosv1alpha1.Muta, name string) error {
	labels := make(map[string]string)
	labels["app"] = name
	labels["muta.nervos.org"] = instance.Name

	requestStorage := make(map[corev1.ResourceName]resource.Quantity)
	requestStorage[corev1.ResourceStorage] = *instance.Spec.Resources.Requests.StorageEphemeral()

	limitStorage := make(map[corev1.ResourceName]resource.Quantity)
	limitStorage[corev1.ResourceStorage] = *instance.Spec.Resources.Limits.StorageEphemeral()

	pv := &corev1.PersistentVolume{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: instance.Namespace,
			Labels:    labels,
		},
		Spec: corev1.PersistentVolumeSpec{
			Capacity:         limitStorage,
			StorageClassName: storageClassName,
			AccessModes: []corev1.PersistentVolumeAccessMode{
				corev1.ReadWriteOnce,
			},
			PersistentVolumeSource: corev1.PersistentVolumeSource{
				HostPath: &corev1.HostPathVolumeSource{
					Path: fmt.Sprintf("/muta/docker/pv/%s", name),
				},
			},
		},
	}

	if err := controllerutil.SetControllerReference(instance, pv, r.scheme); err != nil {
		return err
	}

	if err := r.client.Create(context.TODO(), pv); err != nil {
		return err
	}

	pvc := &corev1.PersistentVolumeClaim{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: instance.Namespace,
			Labels:    labels,
		},
		Spec: corev1.PersistentVolumeClaimSpec{
			StorageClassName: &storageClassName,
			AccessModes: []corev1.PersistentVolumeAccessMode{
				corev1.ReadWriteOnce,
			},
			Resources: corev1.ResourceRequirements{
				Requests: requestStorage,
				Limits:   limitStorage,
			},
		},
	}

	if err := controllerutil.SetControllerReference(instance, pvc, r.scheme); err != nil {
		return err
	}

	return r.client.Create(context.TODO(), pvc)
}

func unmarshalNodeCrypto(cm *corev1.ConfigMap) (*nervosv1alpha1.NodeCrypto, error) {
	nodeCryptoStr := cm.Data["nodeCrypto"]

	nodeCrypto := &nervosv1alpha1.NodeCrypto{}
	if err := json.Unmarshal([]byte(nodeCryptoStr), nodeCrypto); err != nil {
		return nil, err
	}

	return nodeCrypto, nil
}

func getAddressListAndBlsPubkeyList(keypairs []nervosv1alpha1.KeyPair) []nervosv1alpha1.ConfigVerifier {
	addressList := []nervosv1alpha1.ConfigVerifier{}

	for _, keypair := range keypairs {
		addressList = append(addressList, nervosv1alpha1.ConfigVerifier{
			Address:       keypair.Address,
			BLSPubKey:     keypair.BlsPubkey,
			ProposeWeight: 1,
			VoteWeight:    1,
		})
	}

	return addressList
}

func copyConfig(config *nervosv1alpha1.Config) (nervosv1alpha1.Config, error) {
	configB, err := json.Marshal(config)
	if err != nil {
		return nervosv1alpha1.Config{}, err
	}

	copyConfig := nervosv1alpha1.Config{}
	err = json.Unmarshal(configB, &copyConfig)
	return copyConfig, err
}

func copyGenesis(genesis *nervosv1alpha1.ConfigGenesis) (nervosv1alpha1.ConfigGenesis, error) {
	genesisB, err := json.Marshal(genesis)
	if err != nil {
		return nervosv1alpha1.ConfigGenesis{}, err
	}

	copyGenesis := nervosv1alpha1.ConfigGenesis{}
	err = json.Unmarshal(genesisB, &copyGenesis)
	return copyGenesis, err
}
