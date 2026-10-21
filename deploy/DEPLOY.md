# Deploying to a VPS

This runs the app as a single Node process under systemd, behind nginx, with
the SQLite database kept in `/var/lib/cds-election`, outside the code directory.

Tested layout: Ubuntu 22.04/24.04, Node 20+ (Node 24 works), nginx, certbot.

## 1. Server prerequisites

```bash
sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx git
# Node 20+ (via NodeSource or nvm), then:
node -v
```

## 2. Create the service user and directories

```bash
sudo useradd --system --home /opt/cds-election --shell /usr/sbin/nologin cds
sudo mkdir -p /var/lib/cds-election
sudo chown cds:cds /var/lib/cds-election
```

## 3. Get the code

```bash
sudo git clone <your-repo-url> /opt/cds-election
cd /opt/cds-election
sudo npm ci --omit=dev
sudo chown -R cds:cds /opt/cds-election
```

Candidate photos in `public/images/candidates/` must be committed to the repo,
or copied to the server manually. They are not all tracked yet.

## 4. Configure secrets

```bash
sudo cp .env.example .env
sudo nano .env    # fill in JWT_SECRET and ADMIN_KEY (generate them, see the file)
sudo chown cds:cds .env && sudo chmod 600 .env
```

Do not reuse the values from the development `.env` (`ADMIN_KEY=free&fair.`).

## 5. Start the service

```bash
sudo cp deploy/cds-election.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now cds-election
sudo systemctl status cds-election
curl -s http://127.0.0.1:3000/api/health
```

The app refuses to start in production if `JWT_SECRET` or `ADMIN_KEY` is missing.

## 6. Put nginx in front and add HTTPS

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/cds-election
# edit server_name to your domain
sudo ln -s /etc/nginx/sites-available/cds-election /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d vote.yourdomain.org
```

## 7. Load the voter register

A fresh database has no voters. Sign in to `/admin.html` with `ADMIN_KEY` and
upload the voter CSV from the Voter Register section. Do not copy the local
`data/election.db` to the server, because it holds development data.

## Updating later

```bash
cd /opt/cds-election
sudo -u cds git pull
sudo -u cds npm ci --omit=dev
sudo systemctl restart cds-election
```

Back up the database before each update:

```bash
sudo cp /var/lib/cds-election/election.db /var/lib/cds-election/election.db.$(date +%F-%H%M).bak
```

Logs: `journalctl -u cds-election -f`
