# Build Stage
FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o gokso ./cmd/web/main.go

# Run Stage
FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/gokso .
#COPY --from=builder /app/templates ./templates
COPY --from=builder /app/.env ./.env

EXPOSE 9001
CMD ["./gokso"]
