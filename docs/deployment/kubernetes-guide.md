# Kubernetes Deployment Guide - CYOA Platform

Complete guide for deploying the CYOA Platform to Kubernetes for production-ready, scalable infrastructure.

---

## 📚 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Quick Start](#quick-start)
5. [Detailed Setup](#detailed-setup)
6. [Configuration](#configuration)
7. [Scaling Strategy](#scaling-strategy)
8. [Security](#security)
9. [Monitoring & Logging](#monitoring--logging)
10. [Backup & Recovery](#backup--recovery)
11. [Troubleshooting](#troubleshooting)
12. [Production Best Practices](#production-best-practices)

---

## Overview

### What's Included

The Kubernetes configuration includes:

- **Application Layer**
  - Backend API (NestJS) - 3-10 replicas with HPA
  - Frontend (Next.js) - 2-5 replicas with HPA

- **Data Layer**
  - PostgreSQL - StatefulSet with persistent storage
  - Redis - Deployment with persistent storage
  - MinIO - S3-compatible object storage

- **Networking**
  - NGINX Ingress Controller
  - SSL/TLS with cert-manager (Let's Encrypt)
  - Network Policies for security

- **Auto-scaling**
  - Horizontal Pod Autoscaler (HPA) for backend & frontend
  - Based on CPU and memory metrics

- **Observability**
  - Health check endpoints
  - Liveness and readiness probes
  - Resource monitoring

---

## Architecture

### High-Level Architecture

```
Internet
   │
   ▼
┌──────────────────────────────────────────┐
│        Load Balancer (Cloud LB)          │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│      NGINX Ingress Controller            │
│  - SSL/TLS Termination                   │
│  - Rate Limiting                         │
│  - CORS Handling                         │
└──────────┬───────────────┬───────────────┘
           │               │
           ▼               ▼
    ┌──────────┐    ┌──────────────┐
    │ Frontend │    │   Backend    │
    │ Service  │    │   Service    │
    │ (ClusterIP)   │ (ClusterIP)  │
    └────┬─────┘    └──────┬───────┘
         │                 │
         ▼                 ▼
   ┌──────────┐      ┌──────────┐
   │Frontend  │      │ Backend  │
   │  Pods    │      │  Pods    │
   │ (2-5x)   │      │ (3-10x)  │
   └──────────┘      └────┬─────┘
                          │
        ┌─────────────────┼──────────────────┐
        │                 │                  │
        ▼                 ▼                  ▼
  ┌──────────┐      ┌─────────┐       ┌─────────┐
  │PostgreSQL│      │  Redis  │       │  MinIO  │
  │StatefulSet      │Deployment│       │Deployment
  │  (1x)    │      │  (1x)   │       │  (1x)   │
  └────┬─────┘      └────┬────┘       └────┬────┘
       │                 │                  │
       ▼                 ▼                  ▼
   ┌──────┐         ┌───────┐         ┌────────┐
   │ PVC  │         │  PVC  │         │  PVC   │
   │ 20Gi │         │  5Gi  │         │  50Gi  │
   └──────┘         └───────┘         └────────┘
```

### Network Architecture

```
┌─────────────────────────────────────────────────┐
│              Ingress Namespace                  │
│  ┌───────────────────────────────────────────┐  │
│  │      NGINX Ingress Controller             │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                      │
┌─────────────────────┼───────────────────────────┐
│         cyoa-platform Namespace                 │
│                     │                           │
│  ┌──────────────────┼────────────────────────┐  │
│  │      Network Policies (Firewall Rules)    │  │
│  │  - Frontend → Backend (allowed)           │  │
│  │  - Backend → PostgreSQL (allowed)         │  │
│  │  - Backend → Redis (allowed)              │  │
│  │  - Backend → MinIO (allowed)              │  │
│  │  - Internet → Frontend (via Ingress)      │  │
│  │  - Internet → Backend (via Ingress)       │  │
│  │  - All other traffic (denied)             │  │
│  └────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

---

## Prerequisites

### 1. Kubernetes Cluster

**Minimum Requirements:**
- Kubernetes version: 1.28+
- Nodes: 3+ (for HA)
- vCPUs: 4+ per node
- Memory: 8GB+ per node
- Storage: 100GB+ total

**Supported Platforms:**
- Google Kubernetes Engine (GKE)
- Amazon Elastic Kubernetes Service (EKS)
- Azure Kubernetes Service (AKS)
- DigitalOcean Kubernetes (DOKS)
- Self-hosted (kubeadm, k3s, RKE)
- Local development (Minikube, Kind)

### 2. Required Tools

```bash
# kubectl - Kubernetes CLI
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/

# Helm (optional but recommended)
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# kustomize (for advanced config management)
curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
```

### 3. Cluster Addons

**NGINX Ingress Controller:**
```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.0/deploy/static/provider/cloud/deploy.yaml

# Verify
kubectl get pods -n ingress-nginx
```

**cert-manager (for SSL/TLS):**
```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml

# Verify
kubectl get pods -n cert-manager
```

**Metrics Server (for HPA):**
```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Verify
kubectl top nodes
```

---

## Quick Start

### Option 1: Automated Deployment Script

```bash
cd kubernetes
chmod +x deploy.sh

# Deploy everything
./deploy.sh deploy

# Check status
./deploy.sh status

# View logs
./deploy.sh logs

# Show access info
./deploy.sh access
```

### Option 2: Manual Deployment with Kustomize

```bash
cd kubernetes

# 1. Create secrets first
kubectl create secret generic cyoa-secrets \
  --from-literal=POSTGRES_PASSWORD='your-password' \
  --from-literal=DATABASE_URL='postgresql://...' \
  --from-literal=JWT_SECRET='your-jwt-secret' \
  --from-literal=JWT_REFRESH_SECRET='your-refresh-secret' \
  --from-literal=REDIS_PASSWORD='your-redis-password' \
  --from-literal=MINIO_ACCESS_KEY='your-access-key' \
  --from-literal=MINIO_SECRET_KEY='your-secret-key' \
  --namespace=cyoa-platform --dry-run=client -o yaml | kubectl apply -f -

# 2. Update configuration
# Edit configmap.yaml and ingress.yaml with your domains

# 3. Deploy with kustomize
kubectl apply -k .

# 4. Verify
kubectl get all -n cyoa-platform
```

### Option 3: Manual Deployment Step-by-Step

```bash
cd kubernetes

# 1. Namespace
kubectl apply -f namespace.yaml

# 2. Configuration
kubectl apply -f configmap.yaml
# Create secrets (see above)

# 3. Database layer
kubectl apply -f postgres-statefulset.yaml
kubectl apply -f redis-deployment.yaml
kubectl apply -f minio-deployment.yaml

# Wait for databases
kubectl wait --for=condition=ready pod -l app=postgresql -n cyoa-platform --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n cyoa-platform --timeout=300s
kubectl wait --for=condition=ready pod -l app=minio -n cyoa-platform --timeout=300s

# 4. Application layer
kubectl apply -f backend-deployment.yaml
kubectl wait --for=condition=ready pod -l app=backend -n cyoa-platform --timeout=300s

kubectl apply -f frontend-deployment.yaml

# 5. Networking
kubectl apply -f ingress.yaml
kubectl apply -f network-policy.yaml

# 6. Verify
kubectl get all -n cyoa-platform
```

---

## Detailed Setup

### Step 1: Prepare Configuration

**1.1 Update ConfigMap** (`configmap.yaml`)

```yaml
data:
  FRONTEND_URL: "https://cyoa.yourdomain.com"      # ← Change this
  BACKEND_URL: "https://api.cyoa.yourdomain.com"   # ← Change this
```

**1.2 Update Ingress** (`ingress.yaml`)

```yaml
spec:
  tls:
    - hosts:
        - cyoa.yourdomain.com          # ← Change this
        - api.cyoa.yourdomain.com      # ← Change this
  rules:
    - host: cyoa.yourdomain.com        # ← Change this
    - host: api.cyoa.yourdomain.com    # ← Change this
```

Update ClusterIssuer email:
```yaml
spec:
  acme:
    email: admin@yourdomain.com        # ← Change this
```

**1.3 Update Image Registry** (`backend-deployment.yaml`, `frontend-deployment.yaml`)

```yaml
containers:
  - name: backend
    image: ghcr.io/yourusername/cyoa-backend:latest  # ← Change this
```

```yaml
containers:
  - name: frontend
    image: ghcr.io/yourusername/cyoa-frontend:latest # ← Change this
```

### Step 2: Create Secrets

**Production Secrets:**

```bash
# Generate strong passwords
POSTGRES_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)
MINIO_ACCESS_KEY=$(openssl rand -hex 16)
MINIO_SECRET_KEY=$(openssl rand -base64 32)

# Create secret
kubectl create secret generic cyoa-secrets \
  --from-literal=POSTGRES_USER='cyoa_user' \
  --from-literal=POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
  --from-literal=DATABASE_URL="postgresql://cyoa_user:$POSTGRES_PASSWORD@postgresql-service:5432/cyoa_platform" \
  --from-literal=JWT_SECRET="$JWT_SECRET" \
  --from-literal=JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET" \
  --from-literal=REDIS_PASSWORD="$REDIS_PASSWORD" \
  --from-literal=MINIO_ROOT_USER='minioadmin' \
  --from-literal=MINIO_ROOT_PASSWORD="$REDIS_PASSWORD" \
  --from-literal=MINIO_ACCESS_KEY="$MINIO_ACCESS_KEY" \
  --from-literal=MINIO_SECRET_KEY="$MINIO_SECRET_KEY" \
  --namespace=cyoa-platform

# Save secrets securely (e.g., in a password manager or vault)
echo "POSTGRES_PASSWORD: $POSTGRES_PASSWORD" >> secrets.txt
# ... etc
```

### Step 3: Deploy Infrastructure

Deploy in this order to respect dependencies:

```bash
# 1. Namespace and config
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml

# 2. Databases first (backend depends on these)
kubectl apply -f postgres-statefulset.yaml
kubectl apply -f redis-deployment.yaml
kubectl apply -f minio-deployment.yaml

# Wait for databases to initialize
kubectl wait --for=condition=ready pod -l app=postgresql -n cyoa-platform --timeout=300s

# 3. Backend (runs migrations on startup)
kubectl apply -f backend-deployment.yaml
kubectl wait --for=condition=ready pod -l app=backend -n cyoa-platform --timeout=300s

# 4. Frontend
kubectl apply -f frontend-deployment.yaml

# 5. Networking
kubectl apply -f ingress.yaml
kubectl apply -f network-policy.yaml
```

### Step 4: Verify Deployment

```bash
# Check all resources
kubectl get all -n cyoa-platform

# Check pods are running
kubectl get pods -n cyoa-platform

# Check services
kubectl get svc -n cyoa-platform

# Check ingress
kubectl get ingress -n cyoa-platform

# Check certificates (may take 1-2 minutes)
kubectl get certificate -n cyoa-platform

# Check HPA
kubectl get hpa -n cyoa-platform
```

### Step 5: DNS Configuration

Point your DNS records to the ingress load balancer:

```bash
# Get external IP/hostname
kubectl get ingress cyoa-ingress -n cyoa-platform

# Example output:
# NAME           CLASS  HOSTS                    ADDRESS          PORTS
# cyoa-ingress   nginx  cyoa.yourdomain.com,...  35.123.45.67     80, 443
```

Create DNS A records:
```
cyoa.yourdomain.com      → 35.123.45.67
api.cyoa.yourdomain.com  → 35.123.45.67
```

---

## Configuration

### Environment Variables

**ConfigMap Variables** (non-sensitive):
- `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`
- `REDIS_HOST`, `REDIS_PORT`
- `MINIO_ENDPOINT`, `MINIO_PORT`
- `FRONTEND_URL`, `BACKEND_URL`
- `NODE_ENV`, `ENABLE_SWAGGER`, `ENABLE_CORS`

**Secret Variables** (sensitive):
- `POSTGRES_PASSWORD`, `DATABASE_URL`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `REDIS_PASSWORD`
- `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`

### Updating Configuration

```bash
# Edit ConfigMap
kubectl edit configmap cyoa-config -n cyoa-platform

# Edit Secrets (base64 encoded)
kubectl edit secret cyoa-secrets -n cyoa-platform

# Or patch with new value
kubectl patch secret cyoa-secrets -n cyoa-platform \
  -p='{"data":{"JWT_SECRET":"'$(echo -n "new-secret" | base64)'"}}'

# Restart pods to apply changes
kubectl rollout restart deployment/backend -n cyoa-platform
kubectl rollout restart deployment/frontend -n cyoa-platform
```

---

## Scaling Strategy

### Horizontal Pod Autoscaler (HPA)

**Backend HPA:**
- Min replicas: 3
- Max replicas: 10
- CPU target: 70%
- Memory target: 80%

**Frontend HPA:**
- Min replicas: 2
- Max replicas: 5
- CPU target: 70%

**How it works:**
- Monitors CPU/memory usage every 15 seconds
- Scales up when usage exceeds target for 3 minutes
- Scales down when usage below target for 5 minutes

### Manual Scaling

```bash
# Scale backend
kubectl scale deployment/backend --replicas=5 -n cyoa-platform

# Scale frontend
kubectl scale deployment/frontend --replicas=3 -n cyoa-platform
```

### Database Scaling

**PostgreSQL:**
- Currently: Single StatefulSet
- For HA: Use PostgreSQL Operator or managed service (RDS, Cloud SQL)
- Read replicas: Configure in Prisma connection string

**Redis:**
- Currently: Single deployment
- For HA: Use Redis Sentinel or Redis Cluster
- Consider Redis Operator for production

**MinIO:**
- Currently: Single deployment
- For distributed: Deploy 4+ nodes in distributed mode
- Use MinIO Operator for production

### Cluster Autoscaling

Enable cluster autoscaler to add/remove nodes:

**GKE:**
```bash
gcloud container clusters update my-cluster \
  --enable-autoscaling \
  --min-nodes=3 \
  --max-nodes=10
```

**EKS:**
```bash
eksctl scale nodegroup --cluster=my-cluster \
  --name=my-nodegroup \
  --nodes-min=3 \
  --nodes-max=10
```

---

## Security

### Network Policies

Network policies restrict traffic between pods:

- Frontend ↔ Backend: Allowed
- Backend ↔ PostgreSQL: Allowed
- Backend ↔ Redis: Allowed
- Backend ↔ MinIO: Allowed
- All other internal traffic: Denied

### RBAC

Create service account for deployments:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cyoa-sa
  namespace: cyoa-platform
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: cyoa-role
  namespace: cyoa-platform
rules:
  - apiGroups: [""]
    resources: ["pods", "services"]
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: cyoa-rolebinding
  namespace: cyoa-platform
subjects:
  - kind: ServiceAccount
    name: cyoa-sa
roleRef:
  kind: Role
  name: cyoa-role
  apiGroup: rbac.authorization.k8s.io
```

### Pod Security

Enable Pod Security Standards:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: cyoa-platform
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

### Secrets Management

**For production, use external secret manager:**

**AWS Secrets Manager:**
```bash
helm repo add secrets-store-csi-driver https://kubernetes-sigs.github.io/secrets-store-csi-driver/charts
helm install csi-secrets-store secrets-store-csi-driver/secrets-store-csi-driver --namespace kube-system
```

**HashiCorp Vault:**
```bash
helm repo add hashicorp https://helm.releases.hashicorp.com
helm install vault hashicorp/vault --namespace vault
```

---

## Monitoring & Logging

### Prometheus & Grafana

```bash
# Install kube-prometheus-stack
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace

# Access Grafana
kubectl port-forward svc/prometheus-grafana 3000:80 -n monitoring
# Username: admin
# Password: prom-operator
```

**Import Dashboards:**
- Node Exporter: 1860
- Kubernetes Cluster: 7249
- NGINX Ingress: 9614

### Logging with Loki

```bash
# Install Loki stack
helm repo add grafana https://grafana.github.io/helm-charts
helm install loki grafana/loki-stack \
  --namespace logging \
  --create-namespace \
  --set grafana.enabled=true
```

### Application Performance Monitoring

**Datadog:**
```bash
helm repo add datadog https://helm.datadoghq.com
helm install datadog datadog/datadog \
  --set datadog.apiKey=<YOUR_API_KEY>
```

**New Relic:**
```bash
helm repo add newrelic https://helm-charts.newrelic.com
helm install newrelic-bundle newrelic/nri-bundle \
  --set global.licenseKey=<YOUR_LICENSE_KEY>
```

---

## Backup & Recovery

### PostgreSQL Backup

**Automated Backup CronJob:**

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: cyoa-platform
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: postgres:16-alpine
              command:
                - /bin/sh
                - -c
                - |
                  pg_dump -h postgresql-service -U $POSTGRES_USER -d $POSTGRES_DB | \
                  gzip > /backup/backup-$(date +\%Y\%m\%d-\%H\%M\%S).sql.gz
              envFrom:
                - secretRef:
                    name: cyoa-secrets
              volumeMounts:
                - name: backup-storage
                  mountPath: /backup
          restartPolicy: OnFailure
          volumes:
            - name: backup-storage
              persistentVolumeClaim:
                claimName: backup-pvc
```

**Manual Backup:**

```bash
# Create backup
kubectl exec -it postgresql-0 -n cyoa-platform -- \
  pg_dump -U cyoa_user -d cyoa_platform -f /tmp/backup.sql

# Copy backup locally
kubectl cp cyoa-platform/postgresql-0:/tmp/backup.sql ./backup-$(date +%Y%m%d).sql
```

**Restore:**

```bash
# Copy backup to pod
kubectl cp ./backup.sql cyoa-platform/postgresql-0:/tmp/restore.sql

# Restore
kubectl exec -it postgresql-0 -n cyoa-platform -- \
  psql -U cyoa_user -d cyoa_platform -f /tmp/restore.sql
```

### Disaster Recovery Plan

1. **Regular Backups**: Daily automated backups to cloud storage
2. **Test Restores**: Monthly restore tests
3. **Multi-Region**: Deploy to multiple regions for HA
4. **Documentation**: Keep runbooks updated
5. **RTO/RPO**: Define Recovery Time/Point Objectives

---

## Troubleshooting

See the main [kubernetes/README.md](../../kubernetes/README.md) for detailed troubleshooting steps.

---

## Production Best Practices

✅ **Security:**
- [ ] Use external secret manager (Vault, AWS Secrets Manager)
- [ ] Enable Network Policies
- [ ] Use RBAC with least privilege
- [ ] Enable Pod Security Standards
- [ ] Regular security scans (Trivy, Snyk)

✅ **High Availability:**
- [ ] Multiple replicas for all services
- [ ] HPA configured
- [ ] Multi-zone deployment
- [ ] Health checks on all pods
- [ ] PodDisruptionBudgets set

✅ **Monitoring:**
- [ ] Prometheus + Grafana installed
- [ ] Alerting configured (Alertmanager, PagerDuty)
- [ ] Log aggregation (Loki, ELK)
- [ ] APM integrated (Datadog, New Relic)

✅ **Backup:**
- [ ] Automated daily backups
- [ ] Backup retention policy (30 days)
- [ ] Tested restore procedure
- [ ] Off-site backup storage

✅ **Performance:**
- [ ] Resource limits set
- [ ] HPA tuned
- [ ] Database connection pooling
- [ ] CDN for static assets
- [ ] Caching strategy (Redis)

✅ **Deployment:**
- [ ] Blue/green or canary deployments
- [ ] Automated CI/CD
- [ ] Rollback plan
- [ ] Zero-downtime deployments

---

## Summary

You now have a production-ready Kubernetes deployment for the CYOA Platform with:

- ✅ Scalable architecture (HPA)
- ✅ High availability (multiple replicas)
- ✅ Security (Network Policies, RBAC)
- ✅ SSL/TLS (cert-manager)
- ✅ Monitoring ready (Prometheus integration points)
- ✅ Backup strategy
- ✅ Documentation

Next steps:
1. Deploy to staging environment
2. Run load tests
3. Configure monitoring and alerting
4. Set up automated backups
5. Deploy to production

For support, create an issue on GitHub or contact the team.
