package media

import (
	"context"
	"io"
	"net/http"
	"strings"
	"testing"
)

type roundTrip func(*http.Request) (*http.Response, error)

func (fn roundTrip) RoundTrip(r *http.Request) (*http.Response, error) {
	return fn(r)
}

func TestUploadUsesSignedServerRequest(t *testing.T) {
	cloudinary := Cloudinary{
		CloudName: "demo",
		APIKey:    "key",
		APISecret: "secret",
		Client: &http.Client{Transport: roundTrip(func(r *http.Request) (*http.Response, error) {
			if !strings.Contains(r.URL.Path, "/demo/image/upload") {
				t.Fatalf("endpoint salah: %s", r.URL)
			}
			body, err := io.ReadAll(r.Body)
			if err != nil {
				t.Fatal(err)
			}
			text := string(body)
			for _, field := range []string{"signature", "public_id", "savoria/menu/42"} {
				if !strings.Contains(text, field) {
					t.Fatalf("multipart tidak memuat %s", field)
				}
			}
			return &http.Response{
				StatusCode: http.StatusOK,
				Body:       io.NopCloser(strings.NewReader(`{"public_id":"savoria/menu/42","secure_url":"https://cdn.test/menu.jpg"}`)),
				Header:     make(http.Header),
			}, nil
		})},
	}
	asset, err := cloudinary.Upload(context.Background(), "menu.jpg", strings.NewReader("bytes"), "savoria/menu/42")
	if err != nil {
		t.Fatal(err)
	}
	if asset.PublicID != "savoria/menu/42" || asset.SecureURL == "" {
		t.Fatalf("asset salah: %#v", asset)
	}
}
