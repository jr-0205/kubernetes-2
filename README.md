# Tienda de microservicios en Kubernetes

Proyecto académico de una tienda sencilla con tres microservicios REST en Python/Flask, Docker y Kubernetes (Minikube).

## 1. Arquitectura

| Servicio | Endpoints | Réplicas |
|---|---|---:|
| clientes | `GET /clientes`, `GET /clientes/{id}`, `GET /health` | 2 |
| productos | `GET /productos`, `GET /productos/{id}`, `GET /health` | 2 |
| pedidos | `GET /pedidos`, `POST /pedidos`, `GET /health` | 2 |

Los servicios `clientes` y `productos` son internos (ClusterIP). El servicio `pedidos` consulta ambos servicios mediante DNS interno de Kubernetes al recibir un pedido. Los pedidos se guardan en memoria: son datos de demostración y se pierden al reiniciar el contenedor; para persistencia real se necesitaría una base de datos.

## 2. Requisitos

- Windows 10/11 con virtualización habilitada.
- Docker Desktop instalado y ejecutándose con backend WSL 2.
- Minikube y kubectl instalados.
- PowerShell.

Con 8 GB de RAM se recomienda comenzar con 2 CPU y 3072 MB para Minikube, cerrando aplicaciones pesadas mientras se ejecuta el clúster.

## 3. Iniciar Minikube

En PowerShell:

```powershell
minikube start --driver=docker --cpus=2 --memory=3072
kubectl get nodes
```

Si Minikube ya existe con otra configuración, puedes detenerlo y recrearlo:

```powershell
minikube stop
minikube delete
minikube start --driver=docker --cpus=2 --memory=3072
```

## 4. Construir las imágenes dentro de Minikube

En PowerShell, configura la consola Docker para que los comandos `docker build` creen imágenes dentro del entorno de Minikube:

```powershell
minikube docker-env --shell powershell | Invoke-Expression

docker build -t tienda-clientes:1.0 ./clientes
docker build -t tienda-productos:1.0 ./productos
docker build -t tienda-pedidos:1.0 ./pedidos

docker images
```

No cierres esa ventana de PowerShell antes de terminar de desplegar. Los manifiestos usan `imagePullPolicy: Never`, por lo que Kubernetes utilizará las imágenes locales de Minikube y no intentará descargarlas de un registro.

## 5. Desplegar en Kubernetes

Desde la carpeta raíz del repositorio:

```powershell
kubectl apply -f k8s/
kubectl get all -n tienda
kubectl get pods -n tienda -o wide
kubectl get services -n tienda
```

Espera a que los seis pods estén listos:

```powershell
kubectl rollout status deployment/clientes -n tienda
kubectl rollout status deployment/productos -n tienda
kubectl rollout status deployment/pedidos -n tienda
```

## 6. Probar los endpoints

Abre otra ventana de PowerShell y crea un túnel al servicio de pedidos:

```powershell
kubectl port-forward service/pedidos 8080:5000 -n tienda
```

Mientras el comando siga ejecutándose, abre otra consola:

```powershell
Invoke-RestMethod http://localhost:8080/health
Invoke-RestMethod http://localhost:8080/pedidos
```

Crear un pedido (el cliente 1 y el producto 2 existen en los datos de ejemplo):

```powershell
$body = @{
  cliente_id = 1
  producto_id = 2
  cantidad = 2
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:8080/pedidos -Method Post -ContentType "application/json" -Body $body
```

También puedes probar los servicios internos desde un pod temporal:

```powershell
kubectl run curl-test -n tienda --image=curlimages/curl:8.10.1 --restart=Never --command -- sleep 3600
kubectl exec -n tienda curl-test -- curl -s http://clientes:5000/clientes
kubectl exec -n tienda curl-test -- curl -s http://productos:5000/productos
kubectl delete pod curl-test -n tienda
```

## 7. Demostrar self-healing

Lista los pods y guarda el nombre de uno de clientes:

```powershell
kubectl get pods -n tienda -l app=clientes
```

Elimina uno (sustituye el nombre por uno de los que aparecieron):

```powershell
kubectl delete pod NOMBRE_DEL_POD -n tienda
kubectl get pods -n tienda -l app=clientes -w
```

Deployment detectará que falta una réplica y creará otro pod automáticamente. Pulsa Ctrl+C para salir del seguimiento.

## 8. Escalar productos

```powershell
kubectl scale deployment/productos --replicas=3 -n tienda
kubectl get pods -n tienda -l app=productos
```

Para regresar a dos réplicas:

```powershell
kubectl scale deployment/productos --replicas=2 -n tienda
```

## 9. Acceso opcional con NodePort

El despliegue principal mantiene pedidos como ClusterIP y usa port-forward. Si deseas probar NodePort, aplica el manifiesto opcional:

```powershell
kubectl apply -f k8s/40-pedidos-nodeport.yaml
minikube ip
```

Accede desde el equipo usando `http://IP_DE_MINIKUBE:30080` si la configuración de red de Minikube permite alcanzar ese puerto. Para retirarlo:

```powershell
kubectl delete -f k8s/40-pedidos-nodeport.yaml
```

## 10. Diagnóstico y limpieza

```powershell
kubectl describe pods -n tienda
kubectl logs deployment/pedidos -n tienda
kubectl get events -n tienda --sort-by=.metadata.creationTimestamp
```

Eliminar la aplicación:

```powershell
kubectl delete -f k8s/
```

Eliminar también el clúster:

```powershell
minikube delete
```

## Estructura

```text
kubernetes-2/
├── clientes/
│   ├── app.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .dockerignore
├── productos/
│   ├── app.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .dockerignore
├── pedidos/
│   ├── app.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .dockerignore
├── k8s/
│   ├── 00-namespace.yaml
│   ├── 10-clientes.yaml
│   ├── 20-productos.yaml
│   ├── 30-pedidos.yaml
│   └── 40-pedidos-nodeport.yaml
├── .gitignore
└── README.md
```
