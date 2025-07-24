```shell

curl -H "Host: httpbin.127.0.0.1.nip.io" http://localhost
curl -vk http://httpbin.127.0.0.1.nip.io
kubectl get svc -n default
pulumi destroy --yes && pulumi up --yes
kubectl -n kube-system rollout restart deployment cilium-operator
kubectl -n kube-system exec cilium-jhwld -- cilium-dbg status

kubectl -n kube-system logs --timestamps cilium-jhwld

dev-demoapps-whoami-c55bdc854-2px9k
kubectl exec -it dev-demoapps-whoami-c55bdc854-2px9k -n default -- curl http://httpbin.default.svc.cluster.local

kubectl run -it --rm temp-curl --image=radial/busyboxplus:curl --restart=Never -n default -- sh -c "apk add --no-cache curl && curl http://httpbin.default.svc.cluster.local"

kubectl run -it --rm netshoot \
  --image=nicolaka/netshoot \
  --restart=Never -n default \
  --command -- bash

kubectl run -it --rm netshoot --image=nicolaka/netshoot  --restart=Never -n default   --command -- bash


kubectl run -it --rm netshoot   --image=nicolaka/netshoot --restart=Never -n default  --command -- curl http://dev-demoapps-httpbin

curl http://dev-demoapps-httpbin

kubectl -n kube-system exec -it cilium-tvbc4 -- cilium-dbg status --verbose

~/opt/hubble/bin/hubble observe --from-pod dev-demoapps-httpbin-78dd547575-bjt2t --since 1m


kubectl get pods 

curl -H "Host: httpbin.127.0.0.1.nip.io" http://10.244.1.198:80


curl -H "Host: httpbin.127.0.0.1.nip.io" localhost/get

curl -H "Host: httpbin.127.0.0.1.nip.io" http://192.168.64.4/get
curl -H "Host: httpbin.127.0.0.1.nip.io" http://10.0.10.100/get
curl -H "Host: httpbin.daksha-rc.in" http://localhost/get

curl http://httpbin.daksha-rc.in/get 
curl http://10.89.0.200


```

```shell

export KIND_EXPERIMENTAL_PROVIDER=podman
helm search repo cilium --versions
kind create cluster --name cilium-lb-cluster --config test-kind-config.yaml
export K8S_API_IP=$(podman inspect cilium-lb-cluster-control-plane --format '{{.NetworkSettings.Networks.kind.IPAddress}}')

helm repo add cilium https://helm.cilium.io/
helm repo update

export CILIUM_VERSION="1.17.5"
helm install cilium cilium/cilium --version ${CILIUM_VERSION} \
  --namespace kube-system \
  -f cilium-values.yaml
  
K8S_API_IP="10.89.0.2" CILIUM_VERSION="1.17.5" helm install cilium cilium/cilium --version ${CILIUM_VERSION} \
  --namespace kube-system \
  --set kubeProxyReplacement=true \
  --set loadBalancer.mode=snat \
  --set gatewayAPI.enabled=true \
  --set ipam.mode=cluster-pool \
  --set ipam.operator.clusterPoolIPv4PodCIDRList={10.0.0.0/8} \
  --set k8sServiceHost="${K8S_API_IP}" \
  --set k8sServicePort=6443 \
  --set l7Proxy=true
  
  
  
~/opt/cillium/bin/cilium status  

podman  exec kind-control-plane ls -al /proc/self/ns/cgroup


helm repo add cilium https://helm.cilium.io/
helm repo update
helm install cilium cilium/cilium --version 1.17.5    --namespace kube-system    --set image.pullPolicy=IfNotPresent    --set ipam.mode=kubernetes
helm upgrade --install cilium cilium/cilium --version 1.17.5 \
  --namespace kube-system  \
  --set image.pullPolicy=IfNotPresent \
  --set ipam.mode=kubernetes \
  --set kubeProxyReplacement=true \
  --set gatewayAPI.enabled=true \
  --set nodePort.enabled=true \
  --set l7Proxy=true



kind delete cluster --name drc-cluster; podman machine stop; podman machine start; kind create cluster --name drc-cluster --config test-kind-config.yaml 

kind create cluster --name drc-cluster --config test-kind-config.yaml

kind load docker-image quay.io/cilium/cilium:v1.17.5 --name=drc-cluster

kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.3.0/standard-install.yaml

kubectl label node drc-cluster-control-plane "cilium.io/mesh-ready=true"

// working for colima 
~/opt/cillium/bin/cilium install \
  --version 1.17.5 \
  --set kubeProxyReplacement=true \
  --set gatewayAPI.enabled=true \
  --set serviceMesh.enabled=true \
  --set hubble.enabled=true \
  --set hubble.relay.enabled=true \
  --set hubble.ui.enabled=true \
  --set loadBalancer.enabled=false \
  --set gatewayAPI.gatewayController.enabled=true \
  --set gatewayAPI.hostNetwork.enabled=true \
  --set envoy.enabled=true \
  --set envoy.securityContext.capabilities.keepCapNetBindService=true \
  --set "envoy.securityContext.capabilities.add[0]=NET_BIND_SERVICE" \
  
  
~/opt/cillium/bin/cilium install \
  --version 1.17.5 \
  --set kubeProxyReplacement=true \
  --set gatewayAPI.enabled=true \
  --set serviceMesh.enabled=true \
  --set hubble.enabled=true \
  --set hubble.relay.enabled=true \
  --set hubble.ui.enabled=true \
  --set loadBalancer.enabled=false \
  --set gatewayAPI.gatewayController.enabled=true \
  --set gatewayAPI.hostNetwork.enabled=true \
  --set envoy.enabled=true \
  --set hostServices.enabled=true \
  --set envoy.securityContext.capabilities.keepCapNetBindService=true \
  --set "envoy.securityContext.capabilities.add[0]=NET_BIND_SERVICE" \
  --set "securityContext.capabilities.ciliumAgent[0]=NET_ADMIN" \
  --set "securityContext.capabilities.ciliumAgent[1]=SYS_ADMIN" \
  --set "securityContext.capabilities.ciliumAgent[2]=NET_RAW" \
  --set "securityContext.capabilities.ciliumAgent[3]=IPC_LOCK" \
  --set "securityContext.capabilities.ciliumAgent[4]=SYS_RESOURCE" \
  
    
```

```shell
podman port drc-cluster-control-plane | grep 80

```

```shell
KIND_NET_CIDR=$(docker network inspect kind -f '{{(index .IPAM.Config 0).Subnet}}')
METALLB_IP_START=$(echo ${KIND_NET_CIDR} | sed "s@0.0/16@255.200@")
METALLB_IP_END=$(echo ${KIND_NET_CIDR} | sed "s@0.0/16@255.250@")
METALLB_IP_RANGE="${METALLB_IP_START}-${METALLB_IP_END}"

192.168.1.186/24

cat << EOF > metallb_values.yaml
configInline:
  address-pools:
  - name: default
    protocol: layer2
    addresses:
    - ${METALLB_IP_RANGE}
EOF

helm install --namespace metallb-system --create-namespace 
  --repo https://metallb.github.io/metallb metallb metallb 
  --version 0.12.1 --values metallb_values.yaml
  


helm install metallb metallb/metallb --values metallb_values.yaml

```
```shell
KIND_NET_CIDR=$(podman network inspect kind | jq -r '.[0].subnets[] | select(.subnet | test("^10\\.")) | .subnet')
METALLB_IP_START=$(echo ${KIND_NET_CIDR} | sed "s@0/24@200@")
METALLB_IP_END=$(echo ${KIND_NET_CIDR} | sed "s@0/24@250@")
METALLB_IP_RANGE="${METALLB_IP_START}-${METALLB_IP_END}"
echo "MetalLB IP Range: ${METALLB_IP_RANGE}"


helm upgrade --install metallb metallb/metallb \
  --namespace metallb-system \
  --create-namespace 

```

```shell
printf "=== Starting Colima with Kubernetes but no CNI\n"

colima start --memory 8 --cpu 8  --kubernetes \
  --network-address \
  --k3s-arg "--disable=traefik@server:*" \
  --k3s-arg "--disable=servicelb@server:*" \
  --k3s-arg "--disable-network-policy" \
  --k3s-arg "--flannel-backend=none" \
  
  --k3s-arg "--disable-kube-proxy"
  
// Working  

colima start --memory 8 --cpu 8  --kubernetes \
  --network-address \
  --k3s-arg "--disable=traefik" \
  --k3s-arg "--disable=servicelb" \
  --k3s-arg "--disable-network-policy" \
  --k3s-arg "--flannel-backend=none" \
  --k3s-arg "--disable-kube-proxy" \

  
  
  
colima start --memory 8 --cpu 8 \
    --kubernetes --kubernetes-disable="" \
    --k3s-arg "--disable-network-policy" \
    "--disable=traefik@server:*" \
    --network-address \
    --k3s-arg "--flannel-backend=none"

printf "=== Creating BPF and cgroup mounts on the Colima VM\n"
colima ssh -- sudo mount -t bpf bpffs /sys/fs/bpf
colima ssh -- sudo mount --make-shared /sys/fs/bpf
colima ssh -- sudo mkdir -p /run/cilium/cgroupv2
colima ssh -- sudo mount -t cgroup2 none /run/cilium/cgroupv2
colima ssh -- sudo mount --make-shared /run/cilium/cgroupv2
colima ssh -- sudo mount --make-shared /
colima ssh -- sudo chown -R root:root /opt/cni/bin
colima ssh -- sudo chmod 755 /opt/cni/bin


printf "=== Installing Cilium\n"
cilium --context=colima install

helm upgrade --install metallb metallb/metallb \
  --namespace metallb-system \
  --create-namespace 
  

inet 192.168.5.1/24

~/opt/cillium/bin/cilium upgrade \
  --version 1.17.5 \
  --set gatewayAPI.gatewayController.enabled=true 
```
```shell

docker run -d   --name colima-k8s-proxy   --network host   -p 80:80   -p 443:443   -v "$(pwd)/nginx.conf:/etc/nginx/nginx.conf:ro"   nginx:alpine

```

## Containerd 
```shell
colima start --memory 8 --cpu 8  --kubernetes \
  --runtime containerd \
  --network-address \
  --k3s-arg "--disable=traefik" \
  --k3s-arg "--disable=servicelb" \
  --k3s-arg "--disable-network-policy" \
  --k3s-arg "--flannel-backend=none" \
    
  

kubectl get nodes -o jsonpath='{.items[*].spec.podCIDR}'
10.0.0.0/24

  
  
// not working connection issue  
  --k3s-arg "--disable-kube-proxy" \
  
printf "=== Creating BPF and cgroup mounts on the Colima VM\n"
colima ssh -- sudo chown -R root:root /opt/cni/bin
colima ssh -- sudo chmod 755 /opt/cni/bin
colima ssh -- sudo mount -t bpf bpffs /sys/fs/bpf
colima ssh -- sudo mount --make-shared /sys/fs/bpf
colima ssh -- sudo mkdir -p /run/cilium/cgroupv2
colima ssh -- sudo mount -t cgroup2 none /run/cilium/cgroupv2
colima ssh -- sudo mount --make-shared /run/cilium/cgroupv2
colima ssh -- sudo mount --make-shared /
colima ssh -- sudo chown -R root:root /opt/cni/bin
colima ssh -- sudo chmod 755 /opt/cni/bin


colima ssh -- sudo ls -lah  /opt/cni/bin
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.3.0/standard-install.yaml  
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.3.0/experimental-install.yaml

cilium install \
  --version 1.17.5 \
  --set kubeProxyReplacement=true \
  --set gatewayAPI.enabled=true \
  --set serviceMesh.enabled=true \
  --set hubble.enabled=true \
  --set hubble.relay.enabled=true \
  --set hubble.ui.enabled=true \
  --set gatewayAPI.gatewayController.enabled=true \
  --set envoy.enabled=true \
  --set 

  

kubectl -n kube-system patch configmap cilium-config \
  --type merge \
  -p '{"data":{"cluster-pool-ipv4-cidr":"10.0.0.0/24"}}'
  
  

colima ssh -- sudo ls /opt/cni/bin

```
with config
```shell
#colima start --config colima.yaml

colima start --edit --editor code

kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.3.0/standard-install.yaml  
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.3.0/experimental-install.yaml



cilium install \
  --version 1.17.5 \
  --set kubeProxyReplacement=true \
  --set gatewayAPI.enabled=true \
  --set serviceMesh.enabled=true \
  --set hubble.enabled=true \
  --set hubble.relay.enabled=true \
  --set hubble.ui.enabled=true \
  --set gatewayAPI.gatewayController.enabled=true \
  --set envoy.enabled=true \
  --set loadBalancer.enabled=true \

nerdctl --namespace k8s.io run -d \
  --name colima-k8s-proxy \
  --net host \
  -p 80:80 -p 443:443 \
  -v "$(pwd)/nginx.conf:/etc/nginx/nginx.conf:ro" \
  nginx:alpine
  

nerdctl --namespace k8s.io run -d \
  --name colima-k8s-proxy \
  --net host \
  -p 80:80 -p 443:443 \
  -v "$(pwd)/nginx.conf:/etc/nginx/nginx.conf:ro" \
  mwaeckerlin/reverse-proxy
  
    
```

## Containerd for dev
```shell

colima start --memory 8 --cpu 8  --kubernetes \
  --runtime containerd \
  --k3s-arg "--disable=traefik" \
  --k3s-arg "--disable=servicelb" \
  --vm-type=vz --vz-rosetta 
  
```

```shell
doctl compute load-balancer list --format ID,Name
pulumi import digitalocean:index/loadBalancer:LoadBalancer a724c522953744c6f86f970967794a08 ab6bb6a6-ec46-4a8b-b7c3-da21de06e711

doctl kubernetes cluster list --format ID,Name
pulumi import digitalocean:index/kubernetesCluster:KubernetesCluster sit-daksha 6e8321d7-c5e8-4ca0-959d-390ff46f48fd

pulumi import digitalocean:index/kubernetesCluster:KubernetesCluster sit-pool 675aa323-ad7b-4e68-bf50-969042480d8d


pulumi import digitalocean:index/kubernetesCluster:KubernetesCluster mycluster 1b8b2100-0e9f-4e8f-ad78-9eb578c2a0af

https://api.digitalocean.com/v2/kubernetes/clusters/6e8321d7-c5e8-4ca0-959d-390ff46f48fd

curl -X GET   -H "Content-Type: application/json"   -H "Authorization: Bearer $DIGITALOCEAN_TOKEN"   "https://api.digitalocean.com/v2/kubernetes/clusters/6e8321d7-c5e8-4ca0-959d-390ff46f48fd"

```

```shell
kubectl get secret dev-cnpg-trimmed-password-secret -n default -o json | jq -r '.data | map_values(@base64d)'
:Deplo
kubectl get secret dev-pg-app -n dev-cnpg-system -o json | jq -r '.data | map_values(@base64d)'
export const CNPG_SECRET = `${env}-cnpg-secret`;

kubectl get secret dev-cnpg-secret  -o json | jq -r '.data | map_values(@base64d)'
kubectl get secret dev-cnpg-secret-app  -o json -n dev-rc-app-ns | jq -r '.data | map_values(@base64d)'  
kubectl get secret dev-cnpg-secret-db  -o json -n dev-rc-pg-ns  | jq -r '.data | map_values(@base64d)'  

kubectl get secret dev-cnpg-secret-db  -o json -n dev-rc-pg-ns  | jq -r '.data | map_values(@random)'  
dev-rc-pg-ns.dev-rc-pg-ns-rw


kubectl annotate externalsecret dev-cnpg-secret-app force-sync=$(date +%s) --overwrite -n dev-rc-app-ns 
kubectl annotate externalsecret dev-cnpg-secret-db force-sync=$(date +%s) --overwrite -n dev-rc-pg-ns 

psql "postgres://dev-rc-database:rYHOn2w6ydZS57pNiz13yR8XSwOCNZX6v3bowTGRwsJGVzdaKornYa6pWqrOGuft@dev-rc-pg-ns-rw.dev-rc-pg-ns.svc.cluster.local:5432/dev-rc-database"
psql "postgres://postgres:postgres@dev-rc-pg-ns-rw.dev-rc-pg-ns.svc.cluster.local:5432/dev-rc-database"
psql "postgres://dev-rc-database:rYHOn2w6ydZS57pNiz13yR8XSwOCNZX6v3bowTGRwsJGVzdaKornYa6pWqrOGuft@dev-rc-pg-ns-rw.dev-rc-pg-ns.svc.cluster.local:5432/dev-rc-database"

kubectl get secret dev-cnpg-secret-db -n dev-rc-pg-ns -o jsonpath='{.data.password}' | base64 --decode 
 
kubectl exec -it -n dev-rc-pg-ns dev-rc-pg-ns-1 -- /bin/bash
kubectl cnpg reload cluster dev-rc-pg-ns -n dev-rc-pg-ns

```

```shell
doctl vpcs list
ID                                      URN                                            Name            Description    IP Range         Region    Created At                       Default
441b360e-8036-4bed-b4b5-1cb1df04609a    do:vpc:441b360e-8036-4bed-b4b5-1cb1df04609a    default-blr1                   10.122.0.0/20    blr1      2025-06-24 18:32:17 +0000 UTC    true

doctl kubernetes cluster list -o json | jq -r ".[] | [.id, .cluster_subnet, .service_subnet] | @tsv"
074852cc-989e-4ca3-bfe2-92643418c0b6	10.244.0.0/16	10.245.0.0/16
6e8321d7-c5e8-4ca0-959d-390ff46f48fd	10.108.0.0/16	10.109.0.0/19

doctl kubernetes cluster list
ID                                      Name                  Region    Version        Auto Upgrade    Status     Node Pools
074852cc-989e-4ca3-bfe2-92643418c0b6    sit-daksha-cluster    blr1      1.33.1-do.1    false           running    sit-daksha-pool
6e8321d7-c5e8-4ca0-959d-390ff46f48fd    sit-daksha            blr1      1.33.1-do.0    false           running    sit-pool






doctl kubernetes cluster get 074852cc-989e-4ca3-bfe2-92643418c0b6  --output json | jq '.cluster_subnet, .service_subnet'
doctl kubernetes cluster get 6e8321d7-c5e8-4ca0-959d-390ff46f48fd  --output json | jq '.cluster_subnet, .service_subnet'

doctl kubernetes cluster get 074852cc-989e-4ca3-bfe2-92643418c0b6 --output json | jq '.[0] | {name, version, cluster_subnet, service_subnet, vpc_uuid}'
doctl kubernetes cluster get 6e8321d7-c5e8-4ca0-959d-390ff46f48fd --output json | jq '.[0] | {name, version, cluster_subnet, service_subnet, vpc_uuid}'











```