# TLS Certificates

Place your TLS certificate files here before starting the stack in production:

| File | Description |
|------|-------------|
| `fullchain.pem` | Certificate + intermediate chain (from Let's Encrypt or your CA) |
| `privkey.pem` | Private key |

## Using Let's Encrypt (Certbot)

```bash
# On the host, generate certs for your domain:
certbot certonly --standalone -d yourdomain.com

# Copy them here:
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./fullchain.pem
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem   ./privkey.pem
```

## Local Development (no certs)

For local dev, comment out the HTTPS server block in `nginx.conf` and
uncomment the plain HTTP block at the bottom. No cert files are needed.

These files are gitignored — never commit private keys.
