FROM golang:1.24.4

WORKDIR /app

COPY go.mod go.sum ./

# Disable proxy to avoid TLS error
ENV GOPROXY=direct

RUN apt-get update && apt-get install -y ca-certificates

RUN go mod download

COPY . .

RUN go build -o main .

CMD ["./main"]
