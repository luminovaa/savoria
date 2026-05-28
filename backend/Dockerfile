FROM golang:1.23-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/savoria-api ./cmd/api
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/savoria-migrate ./cmd/migrate
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/savoria-import-supabase ./cmd/import-supabase

FROM scratch
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
COPY --from=build /out/savoria-api /savoria-api
COPY --from=build /out/savoria-migrate /savoria-migrate
COPY --from=build /out/savoria-import-supabase /savoria-import-supabase
COPY migrations /migrations
USER 65532:65532
EXPOSE 8080
ENTRYPOINT ["/savoria-api"]
