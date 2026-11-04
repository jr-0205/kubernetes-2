# Tienda de microservicios en Kubernetes

Aplicación académica de tienda con tres APIs REST (Flask), un frontend web (Nginx), Docker y Kubernetes/Minikube.

## Arquitectura

| Componente | Función | Réplicas |
|---|---|---:|
| frontend | Interfaz web y proxy HTTP hacia las APIs | 2 |
| clientes | Consulta de clientes | 2 |
| productos | Catálogo de productos | 2 |
| pedidos | Consulta y creación de pedidos; consume clientes y productos | 2 |

Todos los componentes se despliegan en el namespace `tienda`. Los servicios internos usan ClusterIP. El frontend es el único punto de entrada del navegador: Nginx sirve los archivos estáticos y reenvía las rutas `/api/clientes`, `/api/productos` y `/api/pedidos` a los microservicios mediante DNS interno de Kubernetes.

Los pedidos se guardan en memoria en el microservicio, por lo que desaparecen cuando el contenedor se reinicia. Es una aplicación demostrativa, no un sistema de producción.

## Requisitos

- Windows 10/11.
- Docker Desktop ejecutándose con backend WSL 2.
- Minikube y kubectl instalados.
- PowerShell.

En un equipo con 8 GB de RAM, utiliza 2 CPU y 3072 MB para Minikube y cierra programas pesados.

## 1. Descargar los últimos cambios

Si ya habías clonado el repositorio, no necesitas clonarlo otra vez:

```powershell
cd RUTA\A\kubernetes-2
git pull origin main
```

## 2. Encender Docker y Minikube

Abre Docker Desktop y espera a que indique que Docker está en ejecución. Luego, desde PowerShell:

```powershell
minikube start --driver=docker --cpus=2 --memory=3072
kubectl get nodes
```

Si ya tienes un clúster Minikube configurado y está iniciado, no necesitas recrearlo. Puedes comprobarlo con `minikube status`.

## 3. Construir las cinco imágenes? No: las cuatro imágenes de la aplicación

En la misma ventana de PowerShell, desde la carpeta raíz del repositorio, ejecuta:

```powershell
minikube docker-env --shell powershell | Invoke-Expression

docker build -t tienda-clientes:1.0 ./clientes
docker build -t tienda-productos:1.0 ./productos
docker build -t tienda-pedidos:1.0 ./pedidos
docker build -t tienda-frontend:1.0 ./frontend

docker images
```

Es importante construir las imágenes después de configurar `minikube docker-env`, porque los manifiestos utilizan `imagePullPolicy: Never` y esperan encontrar las imágenes dentro del entorno Docker de Minikube. Mantén abierta esa terminal durante el despliegue.

## 4. Desplegar toda la aplicación

```powershell
kubectl apply -f k8s/
kubectl get pods -n tienda
kubectl get services -n tienda
```

Espera a que los cuatro Deployments estén listos:

```powershell
kubectl rollout status deployment/frontend -n tienda
kubectl rollout status deployment/clientes -n tienda
kubectl rollout status deployment/productos -n tienda
kubectl rollout status deployment/pedidos -n tienda
```

Deberás tener ocho pods en total: dos por cada Deployment.

## 5. Abrir el frontend

Abre una segunda ventana de PowerShell (deja activa la primera) y ejecuta:

```powershell
kubectl port-forward service/frontend 8080:80 -n tienda
```

Abre en tu navegador:

```text
http://localhost:8080
```

No cierres la terminal donde se está ejecutando `port-forward`; ese proceso mantiene el acceso mientras utilizas la aplicación.

El frontend permite:
- Ver el catálogo de productos y sus precios y existencias.
- Consultar los clientes registrados.
- Crear pedidos seleccionando cliente, producto y cantidad.
- Consultar los pedidos realizados durante la ejecución actual del servicio.

## 6. Probar el flujo de pedidos

Desde el formulario del frontend, selecciona un cliente y un producto, indica una cantidad y pulsa **Crear pedido**. El frontend envía un POST al microservicio pedidos. Este consulta clientes y productos a través de los Services internos de Kubernetes y devuelve el pedido con su total.

También puedes probar el endpoint de salud del frontend en otra terminal:

```powershell
Invoke-RestMethod http://localhost:8080/health
```

## 7. Demostrar recuperación automática (self-healing)

Lista los pods de clientes:

```powershell
kubectl get pods -n tienda -l app=clientes
```

Elimina uno de los pods, sustituyendo el nombre por uno real de la lista:

```powershell
kubectl delete pod NOMBRE_DEL_POD -n tienda
kubectl get pods -n tienda -l app=clientes -w
```

Kubernetes crea un pod de reemplazo para mantener las dos réplicas deseadas. Pulsa Ctrl+C para salir del seguimiento.

## 8. Escalar productos

```powershell
kubectl scale deployment/productos --replicas=3 -n tienda
kubectl get pods -n tienda -l app=productos
```

Para regresar a dos:

```powershell
kubectl scale deployment/productos --replicas=2 -n tienda
```

## Diagnóstico

```powershell
kubectl get all -n tienda
kubectl describe pods -n tienda
kubectl logs deployment/pedidos -n tienda
kubectl logs deployment/frontend -n tienda
kubectl get events -n tienda --sort-by=.metadata.creationTimestamp
```

Si un pod queda en `ImagePullBackOff` o `ErrImageNeverPull`, comprueba que configuraste `minikube docker-env` y construiste la imagen con el nombre y etiqueta exactos indicados arriba.

## Apagar el proyecto

Para detener el acceso web, pulsa Ctrl+C en la terminal donde ejecutaste `kubectl port-forward`.

Para apagar el clúster sin eliminarlo:

```powershell
minikube stop
```

Para volver a encenderlo otro día:

```powershell
minikube start
kubectl get pods -n tienda
```

Si los pods siguen desplegados, vuelve a iniciar el port-forward para abrir el frontend. No es necesario reconstruir las imágenes mientras no cambies el código y el clúster Minikube conserve su entorno.

Para eliminar la aplicación del clúster:

```powershell
kubectl delete -f k8s/
```

Para eliminar también el clúster:

```powershell
minikube delete
```

## Estructura del repositorio

```text
kubernetes-2/
├── clientes/
│   ├── app.py
│   ├── requirements.txt
│   └── Dockerfile
├── productos/
│   ├── app.py
│   ├── requirements.txt
│   └── Dockerfile
├── pedidos/
│   ├── app.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   ├── nginx.conf
│   └── Dockerfile
├── k8s/
│   ├── 00-namespace.yaml
│   ├── 05-frontend.yaml
│   ├── 10-clientes.yaml
│   ├── 20-productos.yaml
│   ├── 30-pedidos.yaml
│   └── 40-pedidos-nodeport.yaml
└── README.md
```
