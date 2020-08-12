package v1alpha1

import (
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// EDIT THIS FILE!  THIS IS SCAFFOLDING FOR YOU TO OWN!
// NOTE: json tags are required.  Any new fields you add must have json tags for the fields to be serialized.

// ChaosType is a chaos attack type.
type ChaosType string

const (
	// ChaosAll triggers all chaos attacks
	ChaosAll ChaosType = "all"

	// ChaosNetworkCorrupt is Network Corrupt
	ChaosNetworkCorrupt ChaosType = "stable-network-corrupt"
	// ChaosNetworkDelay is Network Delay
	ChaosNetworkDelay ChaosType = "stable-network-delay"
	// ChaosNetworkDuplicate is Network Duplicate
	ChaosNetworkDuplicate ChaosType = "stable-network-duplicate"
	// ChaosNetworkLoss is Network Loss
	ChaosNetworkLoss ChaosType = "stable-network-loss"
	// ChaosNetworkPartition is Network Partition
	ChaosNetworkPartition ChaosType = "stable-network-partition"

	// ChaosNodeFailure is Node Failure
	ChaosNodeFailure ChaosType = "stable-node-failure"
	// ChaosNodeKill is Node Kill
	ChaosNodeKill ChaosType = "stable-node-kill"
)

func GetAllChaosType() []ChaosType {
	return []ChaosType{
		ChaosNetworkCorrupt,
		ChaosNetworkDelay,
		ChaosNetworkDuplicate,
		ChaosNetworkLoss,
		ChaosNetworkPartition,
		ChaosNodeFailure,
		ChaosNodeKill,
	}
}

type Status string

const (
	StatusPending Status = "pending"
	StatusCreated Status = "created"
	StatusFailure Status = "failure"
)

// MutaSpec defines the desired state of Muta
type MutaSpec struct {
	// INSERT ADDITIONAL SPEC FIELDS - desired state of cluster
	// Important: Run "operator-sdk generate k8s" to regenerate code after modifying this file
	// Add custom validation using kubebuilder tags: https://book-v1.book.kubebuilder.io/beyond_basics/generating_crd.html
	Resources  corev1.ResourceRequirements `json:"resources"`
	Chaos      []ChaosType                 `json:"chaos"`
	Image      string                      `json:"image"`
	Size       uint64                      `json:"size"`
	Persistent bool                        `json:"persistent"`
	Config     Config                      `json:"config"`
	Genesis    ConfigGenesis               `json:"genesis" toml:"genesis"`
}

type NodeCrypto struct {
	CommonRef string    `json:"common_ref"`
	Keypairs  []KeyPair `json:"keypairs"`
}

type KeyPair struct {
	Privkey   string `json:"private_key"`
	PeerID    string `json:"peer_id"`
	Pubkey    string `json:"public_key"`
	BlsPubkey string `json:"bls_public_key"`
	Address   string `json:"address"`
}

type Config struct {
	Privkey  string         `json:"privkey" toml:"privkey"`
	DataPath string         `json:"data_path" toml:"data_path"`
	GraphQL  ConfigGraphQL  `json:"graphql" toml:"graphql"`
	Network  ConfigNetwork  `json:"network" toml:"network"`
	Mempool  ConfigMempool  `json:"mempool" toml:"mempool"`
	Executor ConfigExecutor `json:"executor" toml:"executor"`
	Logger   ConfigLogger   `json:"logger" toml:"logger"`
	RocksDB  ConfigRocksDB  `json:"rocksdb" toml:"rocksdb"`
}

type ConfigGenesis struct {
	Timestamp uint64          `json:"timestamp" toml:"timestamp"`
	Prevhash  string          `json:"prevhash" toml:"prevhash"`
	Metadata  ConfigMetadata  `json:"metadata" toml:"-"`
	Services  []ConfigService `json:"services" toml:"services"`
}

type ConfigService struct {
	Name    string `json:"name" toml:"name"`
	Payload string `json:"payload" toml:"payload"`
}

type ConfigMetadata struct {
	ChainID          string           `json:"chain_id"`
	Bech32AddressHrp string           `json:"bech32_address_hrp"`
	CommonRef        string           `json:"common_ref"`
	TimeoutGap       uint64           `json:"timeout_gap"`
	CyclesLimit      uint64           `json:"cycles_limit"`
	CyclesPrice      uint64           `json:"cycles_price"`
	Interval         uint64           `json:"interval"`
	VerifierList     []ConfigVerifier `json:"verifier_list"`
	ProposeRatio     uint64           `json:"propose_ratio"`
	PrevoteRatio     uint64           `json:"prevote_ratio"`
	PrecommitRatio   uint64           `json:"precommit_ratio"`
	BrakeRatio       uint64           `json:"brake_ratio"`
	TxNumLimit       uint64           `json:"tx_num_limit"`
	MaxTxSize        uint64           `json:"max_tx_size"`
}

type ConfigVerifier struct {
	Address       string `json:"address"`
	ProposeWeight uint64 `json:"propose_weight"`
	VoteWeight    uint64 `json:"vote_weight"`
	Pubkey        string `json:"pub_key"`
	BLSPubKey     string `json:"bls_pub_key"`
}

type ConfigGraphQL struct {
	ListeningAddress string `json:"listening_address" toml:"listening_address"`
	GraphiqlURI      string `json:"graphiql_uri" toml:"graphiql_uri"`
	GraphqlURI       string `json:"graphql_uri" toml:"graphql_uri"`
	Workers          uint64 `json:"workers" toml:"workers"`
	Maxconn          uint64 `json:"maxconn" toml:"maxconn"`
}

type ConfigNetwork struct {
	ListeningAddress string                   `json:"listening_address" toml:"listening_address"`
	RPCTimeout       uint64                   `json:"rpc_timeout" toml:"rpc_timeout"`
	Bootstraps       []ConfigNetworkBootstrap `json:"bootstraps" toml:"bootstraps"`
}

type ConfigNetworkBootstrap struct {
	PeerID  string `json:"peer_id" toml:"peer_id"`
	Address string `json:"address" toml:"address"`
}

type ConfigMempool struct {
	PoolSize             uint64 `json:"pool_size" toml:"pool_size"`
	BroadcastTxsSize     uint64 `json:"broadcast_txs_size" toml:"broadcast_txs_size"`
	BroadcastTxsInterval uint64 `json:"broadcast_txs_interval" toml:"broadcast_txs_interval"`
}

type ConfigExecutor struct {
	Light           bool   `json:"light" toml:"light"`
	TriedbCacheSize uint64 `json:"triedb_cache_size" toml:"triedb_cache_size"`
}

type ConfigLogger struct {
	Filter                 string            `json:"filter" toml:"filter"`
	LogToConsole           bool              `json:"log_to_console" toml:"log_to_console"`
	ConsoleShowFileAndLine bool              `json:"console_show_file_and_line" toml:"console_show_file_and_line"`
	LogPath                string            `json:"log_path" toml:"log_path"`
	LogToFile              bool              `json:"log_to_file" toml:"log_to_file"`
	Metrics                bool              `json:"metrics" toml:"metrics"`
	ModulesLevel           map[string]string `json:"modules_level,omitempty" toml:"modules_level,omitempty"`
}

type ConfigRocksDB struct {
	MaxOpenFiles uint64 `json:"max_open_files" toml:"max_open_files"`
}

// MutaStatus defines the observed state of Muta
type MutaStatus struct {
	// INSERT ADDITIONAL STATUS FIELD - define observed state of cluster
	// Important: Run "operator-sdk generate k8s" to regenerate code after modifying this file
	// Add custom validation using kubebuilder tags: https://book-v1.book.kubebuilder.io/beyond_basics/generating_crd.html
	Status  Status `json:"status"`
	Message string `json:"message"`
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object

// Muta is the Schema for the muta API
// +kubebuilder:subresource:status
// +kubebuilder:resource:path=muta,scope=Namespaced
type Muta struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   MutaSpec   `json:"spec,omitempty"`
	Status MutaStatus `json:"status,omitempty"`
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object

// MutaList contains a list of Muta
type MutaList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Muta `json:"items"`
}

func init() {
	SchemeBuilder.Register(&Muta{}, &MutaList{})
}
