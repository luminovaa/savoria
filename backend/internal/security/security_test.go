package security

import (
	"testing"
	"time"
)

func TestPasswordHash(t *testing.T) {
	hash, err := HashPassword("owner-password-kuat")
	if err != nil {
		t.Fatal(err)
	}
	if !VerifyPassword("owner-password-kuat", hash) {
		t.Fatal("password valid tidak terverifikasi")
	}
	if VerifyPassword("salah", hash) {
		t.Fatal("password salah terverifikasi")
	}
}

func TestTokens(t *testing.T) {
	manager := NewManager("secret-yang-cukup-panjang-untuk-test", time.Minute, time.Hour)
	access, _, err := manager.Access("9b7e07f2-1d38-42a0-a379-79a137b96733", "Owner")
	if err != nil {
		t.Fatal(err)
	}
	claims, err := manager.Parse(access)
	if err != nil || claims.Subject == "" || claims.Role != "Owner" {
		t.Fatalf("claims tidak valid: %#v, %v", claims, err)
	}

	raw, hash, _, err := manager.NewRefreshToken()
	if err != nil {
		t.Fatal(err)
	}
	if raw == "" || hash != HashToken(raw) || raw == hash {
		t.Fatal("refresh token tidak di-hash dengan benar")
	}
}
