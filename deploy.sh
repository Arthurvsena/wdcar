#!/bin/bash

set -e

echo "========================================"
echo " WDOcar - Deployment Script"
echo "========================================"
echo ""

DEPLOY_MODE=${1:-dev}

case $DEPLOY_MODE in
  dev)
    echo "[Dev Mode] Iniciando backend..."
    cd backend
    pip install -r requirements.txt
    uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
    BACKEND_PID=$!
    cd ..

    echo "[Dev Mode] Iniciando frontend..."
    cd frontend
    npm install
    npm start &
    FRONTEND_PID=$!
    cd ..

    echo ""
    echo "========================================"
    echo " Backend: http://localhost:8000"
    echo " Frontend: http://localhost:3000"
    echo "========================================"
    echo "Pressione Ctrl+C para encerrar"

    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
    wait
    ;;

  docker)
    echo "[Docker Mode] Construindo e iniciando containers..."
    docker-compose up -d --build
    echo ""
    docker-compose ps
    echo ""
    echo "Acesse: http://localhost:3000"
    ;;

  stop)
    echo "Parando containers..."
    docker-compose down
    ;;

  restart)
    echo "Reiniciando containers..."
    docker-compose restart
    ;;

  logs)
    docker-compose logs -f
    ;;

  *)
    echo "Uso: $0 {dev|docker|stop|restart|logs}"
    exit 1
    ;;
esac