package api

import (
	"net/http"
	"time"

	corev1 "k8s.io/api/core/v1"
	storagev1 "k8s.io/api/storage/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

type StorageClassItem struct {
	Name              string            `json:"name"`
	Provisioner       string            `json:"provisioner"`
	ReclaimPolicy     string            `json:"reclaimPolicy"`
	Parameters        map[string]string `json:"parameters"`
	AllowVolumeExpand bool              `json:"allowVolumeExpand"`
	CreatedAt         time.Time         `json:"createdAt"`
}

type PersistentVolumeItem struct {
	Name         string    `json:"name"`
	Status       string    `json:"status"`
	Capacity     string    `json:"capacity"`
	AccessModes  []string  `json:"accessModes"`
	StorageClass string    `json:"storageClass"`
	Claim        string    `json:"claim"`
	CreatedAt    time.Time `json:"createdAt"`
}

type PersistentVolumeClaimItem struct {
	Name         string    `json:"name"`
	Namespace    string    `json:"namespace"`
	Status       string    `json:"status"`
	Capacity     string    `json:"capacity"`
	AccessModes  []string  `json:"accessModes"`
	StorageClass string    `json:"storageClass"`
	Volume       string    `json:"volume"`
	CreatedAt    time.Time `json:"createdAt"`
}

type CSIDriverItem struct {
	Name    string    `json:"name"`
	Created time.Time `json:"createdAt"`
}

type StorageOverview struct {
	StorageClasses []StorageClassItem          `json:"storageClasses"`
	Volumes        []PersistentVolumeItem      `json:"volumes"`
	Claims         []PersistentVolumeClaimItem `json:"claims"`
	CSIDrivers     []CSIDriverItem             `json:"csiDrivers"`
}

func StorageHandler(client kubernetes.Interface) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := contextWithTimeout(r)
		defer cancel()

		opts, err := parseListOptions(r)
		if err != nil {
			respondError(w, http.StatusBadRequest, err.Error())
			return
		}

		namespace := r.URL.Query().Get("ns")
		if namespace == "" {
			namespace = v1.NamespaceAll
		}

		scList, err := client.StorageV1().StorageClasses().List(ctx, opts)
		if err != nil {
			respondError(w, http.StatusBadGateway, err.Error())
			return
		}

		pvList, err := client.CoreV1().PersistentVolumes().List(ctx, opts)
		if err != nil {
			respondError(w, http.StatusBadGateway, err.Error())
			return
		}

		pvcList, err := client.CoreV1().PersistentVolumeClaims(namespace).List(ctx, opts)
		if err != nil {
			respondError(w, http.StatusBadGateway, err.Error())
			return
		}

		csiList, err := client.StorageV1().CSIDrivers().List(ctx, opts)
		if err != nil {
			respondError(w, http.StatusBadGateway, err.Error())
			return
		}

		response := StorageOverview{
			StorageClasses: mapStorageClasses(scList.Items),
			Volumes:        mapPVs(pvList.Items),
			Claims:         mapPVCs(pvcList.Items),
			CSIDrivers:     mapCSIDrivers(csiList.Items),
		}

		respondJSON(w, http.StatusOK, response)
	}
}

func mapStorageClasses(items []storagev1.StorageClass) []StorageClassItem {
	out := make([]StorageClassItem, 0, len(items))
	for _, sc := range items {
		reclaim := ""
		if sc.ReclaimPolicy != nil {
			reclaim = string(*sc.ReclaimPolicy)
		}
		allowExpand := false
		if sc.AllowVolumeExpansion != nil {
			allowExpand = *sc.AllowVolumeExpansion
		}
		out = append(out, StorageClassItem{
			Name:              sc.Name,
			Provisioner:       sc.Provisioner,
			ReclaimPolicy:     reclaim,
			Parameters:        sc.Parameters,
			AllowVolumeExpand: allowExpand,
			CreatedAt:         sc.CreationTimestamp.Time,
		})
	}
	return out
}

func mapPVs(items []corev1.PersistentVolume) []PersistentVolumeItem {
	out := make([]PersistentVolumeItem, 0, len(items))
	for _, pv := range items {
		capacity := ""
		if qty, ok := pv.Spec.Capacity[corev1.ResourceStorage]; ok {
			capacity = qty.String()
		}
		claim := ""
		if pv.Spec.ClaimRef != nil {
			claim = pv.Spec.ClaimRef.Namespace + "/" + pv.Spec.ClaimRef.Name
		}
		out = append(out, PersistentVolumeItem{
			Name:         pv.Name,
			Status:       string(pv.Status.Phase),
			Capacity:     capacity,
			AccessModes:  accessModesToStrings(pv.Spec.AccessModes),
			StorageClass: pv.Spec.StorageClassName,
			Claim:        claim,
			CreatedAt:    pv.CreationTimestamp.Time,
		})
	}
	return out
}

func mapPVCs(items []corev1.PersistentVolumeClaim) []PersistentVolumeClaimItem {
	out := make([]PersistentVolumeClaimItem, 0, len(items))
	for _, pvc := range items {
		capacity := ""
		if qty, ok := pvc.Status.Capacity[corev1.ResourceStorage]; ok {
			capacity = qty.String()
		}
		storageClass := ""
		if pvc.Spec.StorageClassName != nil {
			storageClass = *pvc.Spec.StorageClassName
		}
		out = append(out, PersistentVolumeClaimItem{
			Name:         pvc.Name,
			Namespace:    pvc.Namespace,
			Status:       string(pvc.Status.Phase),
			Capacity:     capacity,
			AccessModes:  accessModesToStrings(pvc.Spec.AccessModes),
			StorageClass: storageClass,
			Volume:       pvc.Spec.VolumeName,
			CreatedAt:    pvc.CreationTimestamp.Time,
		})
	}
	return out
}

func mapCSIDrivers(items []storagev1.CSIDriver) []CSIDriverItem {
	out := make([]CSIDriverItem, 0, len(items))
	for _, driver := range items {
		out = append(out, CSIDriverItem{
			Name:    driver.Name,
			Created: driver.CreationTimestamp.Time,
		})
	}
	return out
}

func accessModesToStrings(modes []corev1.PersistentVolumeAccessMode) []string {
	out := make([]string, 0, len(modes))
	for _, mode := range modes {
		out = append(out, string(mode))
	}
	return out
}
