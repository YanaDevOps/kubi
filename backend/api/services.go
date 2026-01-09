package api

import (
	"net/http"
	"time"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

type ServicePort struct {
	Name       string `json:"name"`
	Port       int32  `json:"port"`
	TargetPort string `json:"targetPort"`
	Protocol   string `json:"protocol"`
}

type ServiceItem struct {
	Name       string        `json:"name"`
	Namespace  string        `json:"namespace"`
	Type       string        `json:"type"`
	ClusterIP  string        `json:"clusterIp"`
	ExternalIP []string      `json:"externalIps"`
	Ports      []ServicePort `json:"ports"`
	CreatedAt  time.Time     `json:"createdAt"`
}

type ServiceList struct {
	Items    []ServiceItem `json:"items"`
	Continue string        `json:"continue"`
}

func ServicesHandler(client kubernetes.Interface) http.HandlerFunc {
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

		list, err := client.CoreV1().Services(namespace).List(ctx, opts)
		if err != nil {
			respondError(w, http.StatusBadGateway, err.Error())
			return
		}

		items := make([]ServiceItem, 0, len(list.Items))
		for _, svc := range list.Items {
			items = append(items, ServiceItem{
				Name:       svc.Name,
				Namespace:  svc.Namespace,
				Type:       string(svc.Spec.Type),
				ClusterIP:  svc.Spec.ClusterIP,
				ExternalIP: serviceExternalIPs(&svc),
				Ports:      mapServicePorts(svc.Spec.Ports),
				CreatedAt:  svc.CreationTimestamp.Time,
			})
		}

		respondJSON(w, http.StatusOK, ServiceList{Items: items, Continue: list.Continue})
	}
}

func mapServicePorts(ports []corev1.ServicePort) []ServicePort {
	result := make([]ServicePort, 0, len(ports))
	for _, port := range ports {
		target := ""
		if port.TargetPort.Type != 0 {
			target = port.TargetPort.String()
		}
		result = append(result, ServicePort{
			Name:       port.Name,
			Port:       port.Port,
			TargetPort: target,
			Protocol:   string(port.Protocol),
		})
	}
	return result
}

func serviceExternalIPs(svc *corev1.Service) []string {
	if len(svc.Spec.ExternalIPs) > 0 {
		return svc.Spec.ExternalIPs
	}
	if svc.Spec.Type == corev1.ServiceTypeLoadBalancer {
		ips := make([]string, 0, len(svc.Status.LoadBalancer.Ingress))
		for _, ingress := range svc.Status.LoadBalancer.Ingress {
			if ingress.IP != "" {
				ips = append(ips, ingress.IP)
			}
			if ingress.Hostname != "" {
				ips = append(ips, ingress.Hostname)
			}
		}
		return ips
	}
	return nil
}
