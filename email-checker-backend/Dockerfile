# Use specific Go version for better compatibility
FROM golang:1.21-alpine AS builder

# Install necessary packages for compilation
RUN apk add --no-cache git ca-certificates tzdata

# Set working directory
WORKDIR /app

# Copy go mod files first for better caching
COPY go.mod go.sum ./

# Set Go environment variables for better performance
ENV GO111MODULE=on
ENV CGO_ENABLED=0
ENV GOOS=linux
ENV GOARCH=amd64
ENV GOPROXY=direct

# Download dependencies
RUN go mod download && go mod verify

# Copy source code
COPY . .

# Build the application with optimizations
RUN go build -ldflags="-w -s" -a -installsuffix cgo -o main cmd/server/main.go

# Use minimal alpine image for runtime
FROM alpine:latest

# Install ca-certificates for HTTPS requests and tzdata for timezone
RUN apk --no-cache add ca-certificates tzdata

# Create non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Set working directory
WORKDIR /root/

# Copy binary from builder stage
COPY --from=builder /app/main .

# Change ownership to non-root user
RUN chown appuser:appgroup main

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:8080/api/v1/health || exit 1

# Run the application
CMD ["./main"]