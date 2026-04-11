# EcoShore Backend - Deployment Report

**Classification: Public-SLIIT** | **Version:** 1.0.0 | **Date:** February 27, 2026

---

## Architecture

```
Client  ->  Nginx (443)  ->  Node.js API (:4000)  ->  MongoDB Atlas
                                    |
                           Flask ML Service (:5001)
                                    |
                            Firebase (Chat)
```

---

## Local Development

```bash
npm install
npm run dev   # http://localhost:4000

# ML service (separate terminal)
cd ml-service && venv\Scripts\activate
python app.py   # http://localhost:5001
```

---

## Production Deployment

### 1. Node.js API - PM2

```bash
npm install -g pm2
pm2 start src/server.js --name ecoshore-api --env production
pm2 save && pm2 startup
```

### 2. ML Service - Gunicorn

```bash
cd ml-service && source venv/bin/activate
gunicorn -w 2 -b 0.0.0.0:5001 app:app
```

### 3. Nginx Reverse Proxy

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location /api      { proxy_pass http://localhost:4000; }
    location /api-docs { proxy_pass http://localhost:4000; }
    location /uploads  { alias /path/to/EcoShore-Backend/uploads; }
}
```

---

## Docker

```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    build: .
    ports: ['4000:4000']
    env_file: .env
    volumes: ['./uploads:/app/uploads']
    depends_on: [ml]
  ml:
    build: ./ml-service
    ports: ['5001:5001']
```

```bash
docker-compose up -d
```

---

## Cloud Platforms

| Platform    | Notes                                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------- |
| **Render**  | Web Service with `npm start`; second service for `ml-service/` using `gunicorn -w 2 -b 0.0.0.0:$PORT app:app` |
| **Railway** | Connect GitHub, add MongoDB plugin, set env vars in dashboard                                                 |
| **AWS EC2** | Ubuntu 22.04, t3.small+, follow PM2 + Nginx steps                                                             |

---

## Environment Variables

```dotenv
PORT=4000
NODE_ENV=production
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/ecoshore
JWT_SECRET=<32+ char secret>
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback
ML_SERVICE_URL=http://localhost:5001
ML_TRAIN_SECRET=<strong secret>
WEATHER_API_KEY=...
FIREBASE_DATABASE_URL=https://<project-id>-default-rtdb.firebaseio.com
FIREBASE_PROJECT_ID=<firebase-project-id>
FIREBASE_CLIENT_EMAIL=<service-account-email>
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
# Optional: full JSON blob alternative (instead of individual FIREBASE_* fields)
# FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

---

## Security Checklist

- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` is 32+ random characters
- [ ] `.env` and `firebase-service-account.json` not committed to Git
- [ ] MongoDB Atlas IP whitelist restricted to server IP
- [ ] HTTPS enforced via Nginx
- [ ] CORS origins restricted to known frontend domains
