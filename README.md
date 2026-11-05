# Tienda de microservicios con Docker y Kubernetes

Proyecto académico que simula una pequeña tienda en línea. Está formado por tres microservicios (clientes, productos y pedidos) y una interfaz web (frontend). Docker construye las imágenes y Kubernetes ejecuta y administra los contenedores.

Esta guía explica cómo **encender el proyecto desde Windows usando Docker Desktop y PowerShell**, incluso si es la primera vez que utilizas Kubernetes.

## ¿Qué incluye?

| Componente | ¿Qué hace? |
|---|---|
| **Frontend** | Página web desde la que se utiliza la tienda. |
| **Clientes** | Muestra la información de los clientes. |
| **Productos** | Muestra el catálogo de productos. |
| **Pedidos** | Permite crear y consultar pedidos; se comunica con clientes y productos. |

Kubernetes ejecuta dos réplicas de cada componente dentro del espacio de trabajo llamado `tienda`.

> **Importante:** los pedidos se guardan temporalmente en memoria. Si el servicio se reinicia, los pedidos registrados se pierden. Es una aplicación demostrativa, no un sistema de producción.

---

## 1. Requisitos

Antes de comenzar, necesitas:

- Windows 10 u 11.
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y abierto.
- Kubernetes activado dentro de Docker Desktop.
- `kubectl` instalado.
- Git, si todavía no tienes descargado el repositorio.
- PowerShell.

### Activar Kubernetes en Docker Desktop

1. Abre Docker Desktop.
2. Entra en **Settings**.
3. Busca la sección **Kubernetes**.
4. Activa Kubernetes (si todavía no está activado) y espera a que termine de iniciar.
5. Comprueba que Docker Desktop esté funcionando.

En este proyecto se utiliza el contexto `docker-desktop`. Puedes comprobarlo con:

```powershell
kubectl config current-context
kubectl get nodes
```

El contexto debe ser `docker-desktop` y el nodo debe aparecer con estado `Ready`.

---

## 2. Descargar el proyecto

Si todavía no tienes el repositorio en tu computadora:

```powershell
git clone https://github.com/jr-0205/kubernetes-2.git
cd kubernetes-2
```

Si ya lo habías descargado anteriormente, entra a su carpeta y actualízalo:

```powershell
cd RUTA\A\kubernetes-2
git pull origin main
```

**Nota:** reemplaza `RUTA\A\kubernetes-2` por la ubicación real de la carpeta en tu computadora.

---

## 3. Construir las imágenes de Docker

Abre PowerShell dentro de la carpeta principal del proyecto (donde está este README) y ejecuta estos comandos:

```powershell
docker build -t tienda-clientes:1.0 ./clientes
docker build -t tienda-productos:1.0 ./productos
docker build -t tienda-pedidos:1.0 ./pedidos
docker build -t tienda-frontend:1.0 ./frontend
```

Cada comando construye una imagen para uno de los componentes. La primera construcción puede tardar porque Docker necesita descargar las imágenes base y las dependencias.

Para comprobar que las cuatro imágenes existen:

```powershell
docker images
```

Debes encontrar estas etiquetas:

- `tienda-clientes:1.0`
- `tienda-productos:1.0`
- `tienda-pedidos:1.0`
- `tienda-frontend:1.0`

> Si no modificaste el código y las cuatro imágenes ya están construidas, puedes saltarte este paso.

---

## 4. Encender la aplicación en Kubernetes

Asegúrate de estar en la carpeta principal del repositorio. Ejecuta:

```powershell
kubectl apply -f k8s/
```

Este comando crea el espacio de trabajo y los recursos necesarios para ejecutar la tienda.

Comprueba que los contenedores estén iniciando:

```powershell
kubectl get pods -n tienda
```

Espera hasta que los pods aparezcan como `Running` y estén listos. El proyecto configura ocho pods: dos para cada uno de los cuatro componentes.

Puedes comprobar también los servicios internos:

```powershell
kubectl get services -n tienda
```

Para esperar a que cada componente esté listo, ejecuta:

```powershell
kubectl rollout status deployment/frontend -n tienda
kubectl rollout status deployment/clientes -n tienda
kubectl rollout status deployment/productos -n tienda
kubectl rollout status deployment/pedidos -n tienda
```

---

## 5. Abrir la página web

Cuando los pods estén listos, ejecuta este comando:

```powershell
kubectl port-forward service/frontend 8080:80 -n tienda
```

Este comando conecta el puerto 8080 de tu computadora con el frontend que se ejecuta dentro de Kubernetes.

Abre tu navegador y visita:

**http://localhost:8080**

> Deja abierta la ventana de PowerShell donde ejecutaste `port-forward`. Si la cierras, se interrumpe el acceso desde el navegador. Para detenerlo manualmente, pulsa **Ctrl + C**.

Desde la página podrás consultar clientes y productos, crear pedidos y revisar los pedidos registrados durante la ejecución actual del servicio.

---

## 6. Apagar y volver a encender el proyecto

### Detener el acceso web

En la terminal donde se ejecuta `port-forward`, pulsa:

```text
Ctrl + C
```

Esto detiene el acceso desde el navegador, pero no elimina los recursos de Kubernetes.

### Apagar la aplicación

Para eliminar los recursos de la tienda del clúster:

```powershell
kubectl delete -f k8s/
```

### Volver a encenderla otro día

1. Abre Docker Desktop y espera a que Kubernetes esté listo.
2. Entra en la carpeta del repositorio.
3. Ejecuta:

```powershell
kubectl config use-context docker-desktop
kubectl get nodes
kubectl apply -f k8s/
kubectl get pods -n tienda
```

4. Cuando los pods estén listos, vuelve a ejecutar:

```powershell
kubectl port-forward service/frontend 8080:80 -n tienda
```

5. Abre **http://localhost:8080**.

No necesitas reconstruir las imágenes si no cambiaste el código y todavía están disponibles en Docker Desktop.

---

## 7. Solución de problemas

### Kubernetes no está disponible

Comprueba que Docker Desktop esté abierto y que Kubernetes esté iniciado:

```powershell
kubectl config current-context
kubectl get nodes
```

Si el contexto no es `docker-desktop`, selecciónalo:

```powershell
kubectl config use-context docker-desktop
```

### Un pod no inicia

Consulta su estado:

```powershell
kubectl get pods -n tienda
kubectl describe pods -n tienda
```

Para consultar los registros de un componente:

```powershell
kubectl logs deployment/clientes -n tienda
kubectl logs deployment/productos -n tienda
kubectl logs deployment/pedidos -n tienda
kubectl logs deployment/frontend -n tienda
```

Si aparece `ErrImageNeverPull`, revisa que hayas construido las cuatro imágenes con los nombres y etiquetas exactos del paso 3.

### Ver todos los recursos y eventos

```powershell
kubectl get all -n tienda
kubectl get events -n tienda --sort-by=.metadata.creationTimestamp
```

---

## 8. Estructura del repositorio

```text
kubernetes-2/
├── clientes/       # API de clientes
├── productos/      # API de productos
├── pedidos/        # API de pedidos
├── frontend/       # Página web y configuración de Nginx
├── k8s/            # Archivos YAML para Kubernetes
└── README.md       # Esta guía
```

## Resumen rápido: comandos para encender la tienda

Si ya tienes Docker Desktop abierto, Kubernetes activo, el repositorio descargado y las imágenes construidas, estos son los comandos principales:

```powershell
cd RUTA\A\kubernetes-2
kubectl config use-context docker-desktop
kubectl apply -f k8s/
kubectl get pods -n tienda
kubectl port-forward service/frontend 8080:80 -n tienda
```

Después abre **http://localhost:8080** en tu navegador.

---

**Repositorio:** https://github.com/jr-0205/kubernetes-2
