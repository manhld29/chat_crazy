.PHONY: setup-backend setup-frontend install lint test typecheck dev-backend dev-frontend compose-up compose-down

setup-backend:
	cd backend && npm install && npx prisma generate

setup-frontend:
	cd frontend && npm install

install: setup-backend setup-frontend

lint:
	cd backend && npm run lint
	cd frontend && npm run lint

test:
	cd backend && npm run test

typecheck:
	cd backend && npm run build
	cd frontend && npm run typecheck

dev-backend:
	cd backend && npm run start:dev

dev-frontend:
	cd frontend && npm run dev

compose-up:
	docker compose up --build

compose-down:
	docker compose down
