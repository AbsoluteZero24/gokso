# Stage 1: Build React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Go Backend
FROM golang:1.24-alpine AS backend-builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# Copy built frontend assets to the location Go expects (usually ./public or similar)
COPY --from=frontend-builder /app/frontend/dist ./public
RUN CGO_ENABLED=0 GOOS=linux go build -o gokso ./cmd/web/main.go

# Stage 3: Final Production Image
FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=backend-builder /app/gokso .
COPY --from=backend-builder /app/public ./public
# Copy any other necessary directories like templates or migrations
COPY templates ./templates

EXPOSE 9001
CMD ["./gokso"]
