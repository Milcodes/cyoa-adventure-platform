# Kubernetes Deployment Guide

This directory contains Kubernetes manifests for deploying the CYOA Platform in a production-ready, scalable manner.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Configuration](#configuration)
- [Deployment Steps](#deployment-steps)
- [Scaling](#scaling)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)
- [Maintenance](#maintenance)

---

## Prerequisites

### Required Tools

```bash
# kubectl (Kubernetes CLI)
kubectl version --client

# Helm (optional, for package management)
helm version

# kustomize (for deployment management)
kustomize version
```

### Kubernetes Cluster

You need a Kubernetes cluster (v1.28+):

- **Cloud**: GKE, EKS, AKS, DigitalOcean Kubernetes
- **Local**: Minikube, Kind, k3s
- **Managed**: Any managed Kubernetes service

**Minimum Cluster Requirements:**
- 4 vCPUs
- 8GB RAM
- 100GB Storage
- LoadBalancer support (or NodePort for local)

### Install NGINX Ingress Controller

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.0/deploy/static/provider/cloud/deploy.yaml
```

### Install cert-manager (for SSL/TLS)

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml
```

---

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/cyoa-adventure-platform.git
cd cyoa-adventure-platform/kubernetes
```

### 2. Create Secrets

```bash
# Create actual secrets (DO NOT use the template values!)
kubectl create secret generic cyoa-secrets \
  --from-literal=POSTGRES_PASSWORD='your-strong-password' \
  --from-literal=POSTGRES_USER='cyoa_user' \
  --from-literal=DATABASE_URL='postgresql://cyoa_user:your-strong-password@postgresql-service:5432/cyoa_platform' \
  --from-literal=JWT_SECRET='your-jwt-secret-minimum-32-chars-long' \
  --from-literal=JWT_REFRESH_SECRET='your-refresh-secret-minimum-32-chars-long' \
  --from-literal=REDIS_PASSWORD='your-redis-password' \
  --from-literal=MINIO_ROOT_USER='minioadmin' \
  --from-literal=MINIO_ROOT_PASSWORD='your-minio-password' \
  --from-literal=MINIO_ACCESS_KEY='your-access-key' \
  --from-literal=MINIO_SECRET_KEY='your-secret-key' \
  --namespace=cyoa-platform
```

### 3. Update ConfigMap

Edit `configmap.yaml` and update:
- `FRONTEND_URL` → Your domain (e.g., `https://cyoa.yourdomain.com`)
- `BACKEND_URL` → Your API domain (e.g., `https://api.cyoa.yourdomain.com`)

### 4. Update Ingress

Edit `ingress.yaml` and update:
- Replace `cyoa.yourdomain.com` with your actual domain
- Replace `api.cyoa.yourdomain.com` with your API domain
- Update email in ClusterIssuer

### 5. Update Image Registry

Edit `backend-deployment.yaml` and `frontend-deployment.yaml`:
- Replace `ghcr.io/yourusername/cyoa-backend:latest` with your actual image
- Replace `ghcr.io/yourusername/cyoa-frontend:latest` with your actual image

### 6. Deploy Everything

```bash
# Using kustomize (recommended)
kubectl apply -k .

# Or apply individually
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secrets.yaml
kubectl apply -f postgres-statefulset.yaml
kubectl apply -f redis-deployment.yaml
kubectl apply -f minio-deployment.yaml
kubectl apply -f backend-deployment.yaml
kubectl apply -f frontend-deployment.yaml
kubectl apply -f ingress.yaml
kubectl apply -f network-policy.yaml
```

### 7. Verify Deployment

```bash
# Check all pods are running
kubectl get pods -n cyoa-platform

# Check services
kubectl get svc -n cyoa-platform

# Check ingress
kubectl get ingress -n cyoa-platform

# Check certificates (after cert-manager creates them)
kubectl get certificate -n cyoa-platform
```

---

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────┐
│                    NGINX Ingress                        │
│     (SSL/TLS Termination, Load Balancing, CORS)         │
└──────────────────┬────────────────┬─────────────────────┘
                   │                │
         ┌─────────▼───────┐  ┌────▼──────────┐
         │   Frontend      │  │   Backend     │
         │  (Next.js)      │  │   (NestJS)    │
         │  Replicas: 2-5  │  │  Replicas: 3-10│
         └─────────────────┘  └────┬───────────┘
                                   │
           ┌───────────────────────┼───────────────────┐
           │                       │                   │
      ┌────▼──────┐        ┌──────▼─────┐      ┌─────▼─────┐
      │PostgreSQL │        │   Redis    │      │   MinIO   │
      │StatefulSet│        │Deployment  │      │Deployment │
      │(Database) │        │  (Cache)   │      │ (Storage) │
      └───────────┘        └────────────┘      └───────────┘
```

### Resource Distribution

| Component    | CPU Request | CPU Limit | Memory Request | Memory Limit | Replicas |
|--------------|-------------|-----------|----------------|--------------|----------|
| Frontend     | 200m        | 1000m     | 256Mi          | 1Gi          | 2-5      |
| Backend      | 200m        | 1000m     | 256Mi          | 1Gi          | 3-10     |
| PostgreSQL   | 250m        | 1000m     | 512Mi          | 2Gi          | 1        |
| Redis        | 100m        | 500m      | 256Mi          | 1Gi          | 1        |
| MinIO        | 250m        | 1000m     | 512Mi          | 2Gi          | 1        |

### Storage Requirements

- PostgreSQL: 20Gi (PVC)
- Redis: 5Gi (PVC)
- MinIO: 50Gi (PVC)

---

## Configuration

### Environment Variables

All environment variables are stored in:
- **ConfigMap** (`configmap.yaml`) - Non-sensitive config
- **Secret** (`secrets.yaml`) - Sensitive data

### ConfigMap Variables

```yaml
POSTGRES_HOST: postgresql-service
POSTGRES_PORT: 5432
REDIS_HOST: redis-service
MINIO_ENDPOINT: minio-service
FRONTEND_URL: https://cyoa.yourdomain.com
BACKEND_URL: https://api.cyoa.yourdomain.com
```

### Secret Variables

```yaml
POSTGRES_PASSWORD: xxx
DATABASE_URL: postgresql://...
JWT_SECRET: xxx
REDIS_PASSWORD: xxx
MINIO_ACCESS_KEY: xxx
```

### Updating Configuration

```bash
# Edit ConfigMap
kubectl edit configmap cyoa-config -n cyoa-platform

# Edit Secrets
kubectl edit secret cyoa-secrets -n cyoa-platform

# Restart pods to apply changes
kubectl rollout restart deployment/backend -n cyoa-platform
kubectl rollout restart deployment/frontend -n cyoa-platform
```

---

## Deployment Steps

### Initial Deployment

1. **Create Namespace**
   ```bash
   kubectl apply -f namespace.yaml
   ```

2. **Setup Configuration**
   ```bash
   kubectl apply -f configmap.yaml
   kubectl apply -f secrets.yaml
   ```

3. **Deploy Database Layer**
   ```bash
   kubectl apply -f postgres-statefulset.yaml
   kubectl apply -f redis-deployment.yaml
   kubectl apply -f minio-deployment.yaml

   # Wait for databases to be ready
   kubectl wait --for=condition=ready pod -l app=postgresql -n cyoa-platform --timeout=300s
   kubectl wait --for=condition=ready pod -l app=redis -n cyoa-platform --timeout=300s
   kubectl wait --for=condition=ready pod -l app=minio -n cyoa-platform --timeout=300s
   ```

4. **Deploy Application Layer**
   ```bash
   kubectl apply -f backend-deployment.yaml

   # Wait for backend to be ready (runs migrations)
   kubectl wait --for=condition=ready pod -l app=backend -n cyoa-platform --timeout=300s

   kubectl apply -f frontend-deployment.yaml
   ```

5. **Setup Networking**
   ```bash
   kubectl apply -f ingress.yaml
   kubectl apply -f network-policy.yaml
   ```

6. **Verify**
   ```bash
   kubectl get all -n cyoa-platform
   ```

### Rolling Updates

```bash
# Update backend image
kubectl set image deployment/backend backend=ghcr.io/yourusername/cyoa-backend:v2.0.0 -n cyoa-platform

# Update frontend image
kubectl set image deployment/frontend frontend=ghcr.io/yourusername/cyoa-frontend:v2.0.0 -n cyoa-platform

# Check rollout status
kubectl rollout status deployment/backend -n cyoa-platform
kubectl rollout status deployment/frontend -n cyoa-platform

# Rollback if needed
kubectl rollout undo deployment/backend -n cyoa-platform
```

### Database Migrations

Migrations run automatically via **initContainer** in `backend-deployment.yaml`:

```yaml
initContainers:
  - name: migrate-database
    image: ghcr.io/yourusername/cyoa-backend:latest
    command: ['npx', 'prisma', 'migrate', 'deploy']
```

**Manual migration** (if needed):

```bash
# Run migration job
kubectl run prisma-migrate \
  --image=ghcr.io/yourusername/cyoa-backend:latest \
  --restart=Never \
  --env-from=secret/cyoa-secrets \
  --command -- npx prisma migrate deploy \
  -n cyoa-platform

# Check logs
kubectl logs prisma-migrate -n cyoa-platform

# Cleanup
kubectl delete pod prisma-migrate -n cyoa-platform
```

---

## Scaling

### Horizontal Pod Autoscaler (HPA)

HPA automatically scales pods based on CPU/memory usage.

**Backend HPA:**
- Min: 3 replicas
- Max: 10 replicas
- Target CPU: 70%
- Target Memory: 80%

**Frontend HPA:**
- Min: 2 replicas
- Max: 5 replicas
- Target CPU: 70%

### Manual Scaling

```bash
# Scale backend manually
kubectl scale deployment/backend --replicas=5 -n cyoa-platform

# Scale frontend manually
kubectl scale deployment/frontend --replicas=3 -n cyoa-platform

# Check current replicas
kubectl get hpa -n cyoa-platform
```

### Database Scaling

**PostgreSQL:**
- Currently uses StatefulSet with 1 replica
- For HA, consider:
  - PostgreSQL Operator (Zalando, Crunchy Data)
  - Cloud-managed DB (RDS, Cloud SQL)
  - Read replicas

**Redis:**
- For HA, use Redis Sentinel or Redis Cluster
- Consider Redis Operator

**MinIO:**
- Deploy in distributed mode (4+ nodes)
- Use MinIO Operator

---

## Monitoring

### Health Checks

All services have health check endpoints:

```bash
# Backend health
kubectl exec -it deployment/backend -n cyoa-platform -- curl localhost:4000/v1/health

# Check liveness
kubectl exec -it deployment/backend -n cyoa-platform -- curl localhost:4000/v1/health/live

# Check readiness
kubectl exec -it deployment/backend -n cyoa-platform -- curl localhost:4000/v1/health/ready
```

### Pod Status

```bash
# Get all pods
kubectl get pods -n cyoa-platform

# Describe pod
kubectl describe pod <pod-name> -n cyoa-platform

# Get pod logs
kubectl logs <pod-name> -n cyoa-platform

# Follow logs
kubectl logs -f deployment/backend -n cyoa-platform

# Logs from all replicas
kubectl logs -l app=backend -n cyoa-platform --tail=100
```

### Resource Usage

```bash
# Check resource usage
kubectl top pods -n cyoa-platform
kubectl top nodes

# Check HPA status
kubectl get hpa -n cyoa-platform
```

### Events

```bash
# Get recent events
kubectl get events -n cyoa-platform --sort-by='.lastTimestamp'
```

### Metrics (with Prometheus)

```bash
# Install Prometheus + Grafana
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack -n monitoring --create-namespace

# Access Grafana
kubectl port-forward svc/prometheus-grafana 3000:80 -n monitoring
# Username: admin, Password: prom-operator
```

---

## Troubleshooting

### Common Issues

#### 1. Pods Not Starting

```bash
# Check pod status
kubectl get pods -n cyoa-platform

# Describe pod for events
kubectl describe pod <pod-name> -n cyoa-platform

# Check logs
kubectl logs <pod-name> -n cyoa-platform
```

**Common causes:**
- Image pull errors → Check image name/credentials
- Resource limits → Check node capacity
- Config errors → Check ConfigMap/Secrets

#### 2. Database Connection Errors

```bash
# Check if PostgreSQL is running
kubectl get pod -l app=postgresql -n cyoa-platform

# Check PostgreSQL logs
kubectl logs -l app=postgresql -n cyoa-platform

# Test connection from backend
kubectl exec -it deployment/backend -n cyoa-platform -- sh
# Inside pod:
apt-get update && apt-get install -y postgresql-client
psql $DATABASE_URL
```

#### 3. Ingress Not Working

```bash
# Check ingress status
kubectl get ingress -n cyoa-platform
kubectl describe ingress cyoa-ingress -n cyoa-platform

# Check certificate
kubectl get certificate -n cyoa-platform
kubectl describe certificate cyoa-tls-cert -n cyoa-platform

# Check NGINX controller logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller
```

#### 4. HPA Not Scaling

```bash
# Check metrics-server is running
kubectl get deployment metrics-server -n kube-system

# Check HPA status
kubectl describe hpa backend-hpa -n cyoa-platform

# Install metrics-server if missing
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

### Debug Commands

```bash
# Execute shell in pod
kubectl exec -it <pod-name> -n cyoa-platform -- sh

# Port-forward to access service locally
kubectl port-forward svc/backend-service 4000:4000 -n cyoa-platform
kubectl port-forward svc/postgresql-service 5432:5432 -n cyoa-platform

# Check service endpoints
kubectl get endpoints -n cyoa-platform

# Check DNS resolution
kubectl run -it --rm debug --image=busybox --restart=Never -n cyoa-platform -- nslookup backend-service
```

---

## Maintenance

### Backup PostgreSQL

```bash
# Create backup job
kubectl run postgres-backup \
  --image=postgres:16-alpine \
  --restart=Never \
  --env-from=secret/cyoa-secrets \
  --command -n cyoa-platform \
  -- pg_dump -h postgresql-service -U $POSTGRES_USER -d $POSTGRES_DB -f /backup/backup-$(date +%Y%m%d).sql

# Copy backup locally
kubectl cp cyoa-platform/postgres-backup:/backup/backup-20250110.sql ./backup.sql

# Cleanup
kubectl delete pod postgres-backup -n cyoa-platform
```

### Restore PostgreSQL

```bash
# Copy backup to pod
kubectl cp ./backup.sql cyoa-platform/postgresql-0:/tmp/backup.sql

# Restore
kubectl exec -it postgresql-0 -n cyoa-platform -- psql -U $POSTGRES_USER -d $POSTGRES_DB -f /tmp/backup.sql
```

### Update Secrets

```bash
# Update a specific secret
kubectl patch secret cyoa-secrets -n cyoa-platform \
  -p='{"data":{"JWT_SECRET":"'$(echo -n "new-secret" | base64)'"}}'

# Restart pods to apply
kubectl rollout restart deployment/backend -n cyoa-platform
```

### Clean Up

```bash
# Delete everything
kubectl delete namespace cyoa-platform

# Delete specific resources
kubectl delete deployment backend -n cyoa-platform
kubectl delete statefulset postgresql -n cyoa-platform
```

### Upgrade Cluster

1. Backup all data
2. Update manifests for new K8s API versions
3. Test in staging environment
4. Upgrade control plane
5. Upgrade worker nodes (rolling)
6. Verify all pods are running

---

## Production Checklist

- [ ] Secrets are stored securely (not in git)
- [ ] SSL/TLS certificates are configured
- [ ] Resource limits are set
- [ ] HPA is configured
- [ ] Network policies are enabled
- [ ] Persistent volumes are backed up
- [ ] Monitoring is set up (Prometheus/Grafana)
- [ ] Logging is configured (ELK/Loki)
- [ ] Alerts are configured
- [ ] DNS is configured correctly
- [ ] Load balancer is tested
- [ ] Database backups are automated
- [ ] Disaster recovery plan exists
- [ ] Security scanning is enabled (Trivy, Snyk)
- [ ] RBAC policies are configured

---

## Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [cert-manager](https://cert-manager.io/docs/)
- [Kustomize](https://kustomize.io/)
- [Helm Charts](https://helm.sh/)

---

## Support

For issues or questions:
- Create an issue on GitHub
- Check logs: `kubectl logs -l app=backend -n cyoa-platform`
- Contact: admin@cyoa.yourdomain.com
