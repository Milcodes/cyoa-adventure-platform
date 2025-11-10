#!/bin/bash

# CYOA Platform - Kubernetes Deployment Script
# This script automates the deployment of the CYOA Platform to Kubernetes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="cyoa-platform"
KUBECTL="kubectl"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl not found. Please install kubectl first."
        exit 1
    fi

    # Check cluster access
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster. Check your kubeconfig."
        exit 1
    fi

    log_info "Prerequisites check passed!"
}

create_namespace() {
    log_info "Creating namespace: $NAMESPACE"

    if kubectl get namespace $NAMESPACE &> /dev/null; then
        log_warn "Namespace $NAMESPACE already exists"
    else
        kubectl apply -f namespace.yaml
    fi
}

setup_secrets() {
    log_info "Setting up secrets..."

    if kubectl get secret cyoa-secrets -n $NAMESPACE &> /dev/null; then
        log_warn "Secret 'cyoa-secrets' already exists. Skipping..."
        log_warn "To update secrets, delete the existing secret first:"
        log_warn "  kubectl delete secret cyoa-secrets -n $NAMESPACE"
    else
        log_error "Secret 'cyoa-secrets' does not exist!"
        log_error "Please create secrets first using:"
        log_error "  kubectl create secret generic cyoa-secrets \\"
        log_error "    --from-literal=POSTGRES_PASSWORD='xxx' \\"
        log_error "    --from-literal=DATABASE_URL='postgresql://...' \\"
        log_error "    ... (see README.md for full list)"
        log_error "    --namespace=$NAMESPACE"
        exit 1
    fi
}

deploy_config() {
    log_info "Deploying ConfigMap..."
    kubectl apply -f configmap.yaml
}

deploy_databases() {
    log_info "Deploying database layer..."

    # Deploy PostgreSQL
    log_info "Deploying PostgreSQL..."
    kubectl apply -f postgres-statefulset.yaml

    # Deploy Redis
    log_info "Deploying Redis..."
    kubectl apply -f redis-deployment.yaml

    # Deploy MinIO
    log_info "Deploying MinIO..."
    kubectl apply -f minio-deployment.yaml

    # Wait for databases to be ready
    log_info "Waiting for databases to be ready (this may take a few minutes)..."
    kubectl wait --for=condition=ready pod -l app=postgresql -n $NAMESPACE --timeout=300s || true
    kubectl wait --for=condition=ready pod -l app=redis -n $NAMESPACE --timeout=300s || true
    kubectl wait --for=condition=ready pod -l app=minio -n $NAMESPACE --timeout=300s || true

    log_info "Database layer deployed!"
}

deploy_backend() {
    log_info "Deploying backend..."
    kubectl apply -f backend-deployment.yaml

    log_info "Waiting for backend to be ready..."
    kubectl wait --for=condition=ready pod -l app=backend -n $NAMESPACE --timeout=300s || true

    log_info "Backend deployed!"
}

deploy_frontend() {
    log_info "Deploying frontend..."
    kubectl apply -f frontend-deployment.yaml

    log_info "Waiting for frontend to be ready..."
    kubectl wait --for=condition=ready pod -l app=frontend -n $NAMESPACE --timeout=300s || true

    log_info "Frontend deployed!"
}

deploy_networking() {
    log_info "Deploying networking..."

    # Check if NGINX Ingress Controller exists
    if ! kubectl get namespace ingress-nginx &> /dev/null; then
        log_warn "NGINX Ingress Controller not found!"
        log_warn "Install with:"
        log_warn "  kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.0/deploy/static/provider/cloud/deploy.yaml"
        log_warn "Skipping ingress deployment..."
    else
        log_info "Deploying Ingress..."
        kubectl apply -f ingress.yaml
    fi

    log_info "Deploying Network Policies..."
    kubectl apply -f network-policy.yaml

    log_info "Networking deployed!"
}

show_status() {
    log_info "Deployment Status:"
    echo ""

    echo "=== Pods ==="
    kubectl get pods -n $NAMESPACE
    echo ""

    echo "=== Services ==="
    kubectl get svc -n $NAMESPACE
    echo ""

    echo "=== Ingress ==="
    kubectl get ingress -n $NAMESPACE
    echo ""

    echo "=== HPA ==="
    kubectl get hpa -n $NAMESPACE
    echo ""
}

show_access_info() {
    log_info "Access Information:"
    echo ""

    # Get ingress IP/hostname
    INGRESS_IP=$(kubectl get ingress cyoa-ingress -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending")
    INGRESS_HOST=$(kubectl get ingress cyoa-ingress -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "")

    if [ "$INGRESS_IP" != "pending" ] && [ -n "$INGRESS_IP" ]; then
        log_info "External IP: $INGRESS_IP"
    elif [ -n "$INGRESS_HOST" ]; then
        log_info "External Hostname: $INGRESS_HOST"
    else
        log_warn "Ingress external IP is pending. Check status with:"
        log_warn "  kubectl get ingress -n $NAMESPACE"
    fi

    echo ""
    log_info "Frontend URL: https://cyoa.yourdomain.com"
    log_info "Backend API: https://api.cyoa.yourdomain.com"
    echo ""
    log_info "To access services locally:"
    log_info "  kubectl port-forward svc/frontend-service 3001:3001 -n $NAMESPACE"
    log_info "  kubectl port-forward svc/backend-service 4000:4000 -n $NAMESPACE"
}

show_logs() {
    log_info "Showing recent logs..."
    echo ""

    echo "=== Backend Logs ==="
    kubectl logs -l app=backend -n $NAMESPACE --tail=20 || true
    echo ""

    echo "=== Frontend Logs ==="
    kubectl logs -l app=frontend -n $NAMESPACE --tail=20 || true
}

# Main deployment flow
main() {
    echo "========================================"
    echo "  CYOA Platform - Kubernetes Deployment"
    echo "========================================"
    echo ""

    check_prerequisites
    create_namespace
    setup_secrets
    deploy_config
    deploy_databases
    deploy_backend
    deploy_frontend
    deploy_networking

    echo ""
    log_info "Deployment complete!"
    echo ""

    show_status
    show_access_info

    echo ""
    log_info "For logs, run: $0 logs"
    log_info "For detailed status: kubectl get all -n $NAMESPACE"
}

# Handle command line arguments
case "${1:-deploy}" in
    deploy)
        main
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    access)
        show_access_info
        ;;
    delete)
        log_warn "This will delete the entire namespace and all resources!"
        read -p "Are you sure? (yes/no): " -r
        if [[ $REPLY == "yes" ]]; then
            log_info "Deleting namespace $NAMESPACE..."
            kubectl delete namespace $NAMESPACE
            log_info "Deleted!"
        else
            log_info "Cancelled."
        fi
        ;;
    *)
        echo "Usage: $0 {deploy|status|logs|access|delete}"
        echo ""
        echo "Commands:"
        echo "  deploy  - Deploy the entire platform (default)"
        echo "  status  - Show deployment status"
        echo "  logs    - Show recent logs"
        echo "  access  - Show access information"
        echo "  delete  - Delete the entire deployment"
        exit 1
        ;;
esac
