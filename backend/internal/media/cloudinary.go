package media

import (
	"bytes"
	"context"
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"strconv"
	"time"
)

type Cloudinary struct {
	CloudName string
	APIKey    string
	APISecret string
	Client    *http.Client
}

type Asset struct {
	PublicID  string `json:"public_id"`
	SecureURL string `json:"secure_url"`
}

func (c Cloudinary) Ready() bool {
	return c.CloudName != "" && c.APIKey != "" && c.APISecret != ""
}

func (c Cloudinary) Upload(ctx context.Context, filename string, data io.Reader, publicID string) (Asset, error) {
	if !c.Ready() {
		return Asset{}, errors.New("Cloudinary is not configured")
	}
	timestamp := strconv.FormatInt(time.Now().Unix(), 10)
	unsigned := "overwrite=true&public_id=" + publicID + "&timestamp=" + timestamp + c.APISecret
	sum := sha1.Sum([]byte(unsigned))
	signature := hex.EncodeToString(sum[:])

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	file, err := writer.CreateFormFile("file", filename)
	if err != nil {
		return Asset{}, err
	}
	if _, err = io.Copy(file, data); err != nil {
		return Asset{}, err
	}
	for name, value := range map[string]string{
		"api_key": c.APIKey, "timestamp": timestamp, "public_id": publicID,
		"overwrite": "true", "signature": signature,
	} {
		_ = writer.WriteField(name, value)
	}
	_ = writer.Close()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		fmt.Sprintf("https://api.cloudinary.com/v1_1/%s/image/upload", c.CloudName), &body)
	if err != nil {
		return Asset{}, err
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())
	client := c.Client
	if client == nil {
		client = http.DefaultClient
	}
	res, err := client.Do(req)
	if err != nil {
		return Asset{}, err
	}
	defer res.Body.Close()
	if res.StatusCode >= 300 {
		message, _ := io.ReadAll(io.LimitReader(res.Body, 2048))
		return Asset{}, fmt.Errorf("cloudinary upload failed: %s", message)
	}
	var asset Asset
	if err := json.NewDecoder(res.Body).Decode(&asset); err != nil {
		return Asset{}, err
	}
	return asset, nil
}
