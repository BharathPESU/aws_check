# Maya Monitor — Raspberry Pi 4 to AWS IoT Telemetry & Image System

> **A minimal, AWS-deployable IoT telemetry pipeline.**  
> Streams temperature, ventilation fan status, mist sprayer status, and camera images from a **Raspberry Pi 4** to an **AWS EC2 Node.js backend**, storing images in **AWS S3** and indexing metadata in **AWS RDS PostgreSQL**, with real-time monitoring via a **React** dashboard.

---

## 1. Project Overview

Maya Monitor demonstrates the minimum working production architecture for edge-to-cloud IoT data ingestion on AWS. 

- **Edge Device**: Raspberry Pi 4 streams sensor telemetry + camera JPEG images over HTTP multipart `POST`.
- **Compute**: Node.js & Express REST API hosted on an AWS EC2 Ubuntu instance managed by PM2 and reverse-proxied by Nginx.
- **Object Storage**: AWS S3 bucket stores original images under an organized date-partitioned key structure (`images/YYYY/MM/DD/unique-image.jpg`).
- **Relational Database**: AWS RDS PostgreSQL stores image records (IDs, S3 object keys, timestamps).
- **Web Dashboard**: React SPA served via Nginx displaying live temperature, fan status, mist sprayer state, latest image, and image history.

---

## 2. Architecture & Data Flow

```text
Raspberry Pi 4 (Edge Device)
      |
      | HTTP POST multipart/form-data
      | (/api/telemetry)
      v
Nginx Reverse Proxy (Port 80 / 443 on AWS EC2)
      |
      +----> React Static Build (/var/www/maya-monitor/frontend/dist)
      |
      +----> Node.js Express Backend (Port 5000 on 127.0.0.1)
                |
                +----> AWS S3 Bucket (ap-south-1)
                |         |
                |         +---- Store original image files
                |               (Key: images/YYYY/MM/DD/<id>-<name>.jpg)
                |
                +----> AWS RDS PostgreSQL (ap-south-1)
                |         |
                |         +---- Store image ID, original filename, S3 key, timestamp
                |
                v
        React Dashboard
                |
                +---- Display current temperature (°C)
                +---- Display fan status (ON / OFF)
                +---- Display mist sprayer status (ON / OFF)
                +---- Display latest image via S3 Presigned URL
                +---- Display image history grid
```

---

## 3. Tech Stack

- **Edge / Device**: Python 3, `requests`, `csv`
- **Backend**: Node.js (v20+), Express.js, `@aws-sdk/client-s3` (v3), `@aws-sdk/s3-request-presigner`, `pg` (node-postgres), `multer`, `cors`, `dotenv`
- **Frontend**: React 19, Vite, Tailwind CSS, Lucide Icons
- **Database**: AWS RDS PostgreSQL (Free-tier eligible `db.t4g.micro` or `db.t3.micro`)
- **Object Storage**: AWS S3 (Private bucket with IAM Role access & presigned URLs)
- **Server**: AWS EC2 (Ubuntu 24.04 LTS `t4g.micro` or `t3.micro`)
- **Process Manager**: PM2
- **Reverse Proxy**: Nginx
- **AWS Region**: `ap-south-1` (Mumbai, India)

---

## 4. Folder Structure

```text
maya-monitor/
│
├── frontend/                     # Standalone React + Vite Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── TelemetryCard.jsx
│   │   │   ├── LatestImage.jsx
│   │   │   └── ImageHistory.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── public/
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
│
├── backend/                      # Standalone Express REST API
│   ├── src/
│   │   ├── server.js             # Express app entry point
│   │   ├── routes/
│   │   │   ├── telemetryRoutes.js
│   │   │   ├── imageRoutes.js
│   │   │   └── healthRoutes.js
│   │   ├── controllers/
│   │   │   ├── telemetryController.js
│   │   │   └── imageController.js
│   │   ├── services/
│   │   │   └── s3Service.js      # AWS SDK v3 S3 upload & presigner
│   │   ├── db/
│   │   │   └── index.js          # PostgreSQL RDS client & fallback
│   │   └── middleware/
│   │       └── uploadMiddleware.js # Multer multipart memory storage
│   ├── package.json
│   └── .env.example
│
├── pi-client/                    # Raspberry Pi 4 Edge Client
│   ├── mock_sender.py            # Python streaming telemetry loop
│   ├── mock_data.csv             # Sensor readings & image filenames
│   ├── images/                   # Sample camera captures
│   │   ├── image001.jpg
│   │   ├── image002.jpg
│   │   └── image003.jpg
│   └── requirements.txt
│
├── database/
│   └── schema.sql                # PostgreSQL RDS migration script
│
├── nginx/
│   └── default.conf              # Nginx reverse proxy configuration
│
├── pm2/
│   └── ecosystem.config.js       # PM2 production process configuration
│
├── server.ts                     # Integrated full-stack dev/preview server
├── README.md
└── .gitignore
```

---

## 5. Local Development Setup

Before deploying to AWS, run the system on your local workstation.

### Step 1: Clone and Install Dependencies

```bash
git clone https://github.com/your-repo/maya-monitor.git
cd maya-monitor
```

### Step 2: Start the Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

The backend starts at `http://localhost:5000`.

### Step 3: Start the Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The dashboard opens at `http://localhost:3000`.

### Step 4: Run the Raspberry Pi Mock Sender

In a third terminal:

```bash
cd pi-client
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run the mock sender targeting your local backend
BACKEND_URL=http://localhost:5000/api/telemetry SEND_INTERVAL=3 python mock_sender.py
```

You will see incoming telemetry, updated temperature, fan status, and images rendering in real time on the React dashboard!

---

## 6. Database Setup (AWS RDS PostgreSQL)

### Step 1: Provision RDS Instance
1. Open the **AWS Management Console** and select region **ap-south-1 (Mumbai)**.
2. Navigate to **RDS** &rarr; **Databases** &rarr; **Create database**.
3. Choose **Standard create**.
4. Engine type: **PostgreSQL**.
5. Version: **PostgreSQL 16.x** or **15.x**.
6. Template: **Free tier**.
7. DB instance identifier: `maya-postgres-db`.
8. Master username: `maya_admin`.
9. Master password: Set a strong password (e.g., `YourSecurePassword123!`).
10. Instance configuration: `db.t4g.micro` or `db.t3.micro`.
11. Storage: General Purpose SSD (gp2 or gp3), 20 GiB, autoscaling disabled (to prevent accidental billing).
12. Connectivity:
    - **VPC**: Default VPC (or your custom application VPC).
    - **Public access**: **No** (best security practice; access only from EC2).
    - **VPC security group**: Create new &rarr; `maya-rds-sg`.
13. Additional configuration: Initial database name: `maya_monitor`.
14. Click **Create database** (takes 4–6 minutes).

### Step 2: Configure RDS Security Group
1. Go to **EC2** &rarr; **Security Groups**.
2. Find `maya-rds-sg`.
3. Edit **Inbound rules**:
   - **Type**: PostgreSQL (Port 5432)
   - **Source**: Select the security group ID of your EC2 instance (e.g., `sg-0123456789abcdef0` named `maya-ec2-sg`).
   - *Note: Never use 0.0.0.0/0 for RDS PostgreSQL!*

### Step 3: Run the Database Migration
From your EC2 instance (which has network access to RDS):

```bash
sudo apt update && sudo apt install -y postgresql-client
psql -h <RDS_ENDPOINT> -U maya_admin -d maya_monitor -f database/schema.sql
```

The schema creates:
```sql
CREATE TABLE images (
    id SERIAL PRIMARY KEY,
    original_filename VARCHAR(255),
    s3_key VARCHAR(500) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_images_created_at ON images (created_at DESC);
```

---

## 7. Storage Setup (AWS S3)

### Step 1: Create the Bucket
1. Open **S3** in the AWS Console.
2. Click **Create bucket**.
3. Bucket name: `maya-monitor-iot-images-ap-south-1` (must be globally unique).
4. AWS Region: `ap-south-1` (Asia Pacific - Mumbai).
5. Object Ownership: **ACLs disabled (recommended)**.
6. **Block Public Access**: Keep **Block all public access enabled** (Checked).  
   *Security Note: The S3 bucket remains completely private. The frontend accesses images solely through time-limited presigned URLs generated by the Node.js backend.*
7. Bucket Versioning: Optional (can leave disabled).
8. Default Encryption: **Server-side encryption with Amazon S3 managed keys (SSE-S3)**.
9. Click **Create bucket**.

---

## 8. IAM Role Setup (Secure EC2 Access to S3)

Never hardcode AWS Access Keys (`AKIA...`) in source code or `.env` files on EC2. Instead, attach an IAM Role to your EC2 instance.

### Step 1: Create the IAM Policy
1. Go to **IAM Console** &rarr; **Policies** &rarr; **Create policy**.
2. Switch to **JSON** and paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowS3UploadsAndPresigning",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::maya-monitor-iot-images-ap-south-1/*"
    }
  ]
}
```

3. Name the policy: `MayaMonitorS3AccessPolicy`.

### Step 2: Create IAM Role & Attach to EC2
1. In IAM, go to **Roles** &rarr; **Create role**.
2. Trusted entity type: **AWS service** &rarr; Use case: **EC2**.
3. Attach policy: Search and select `MayaMonitorS3AccessPolicy`.
4. Name the role: `MayaMonitorEC2Role`.
5. Finish creating the role.
6. Attach to EC2:
   - Go to **EC2 Console** &rarr; Select your instance.
   - Click **Actions** &rarr; **Security** &rarr; **Modify IAM role**.
   - Select `MayaMonitorEC2Role` and click **Update IAM role**.

The AWS SDK v3 in Node.js will automatically authenticate using the instance metadata service!

---

## 9. AWS EC2 Deployment Step-by-Step

### Step 1: Launch Ubuntu EC2 Instance
1. In EC2 Console (region `ap-south-1`), click **Launch instances**.
2. Name: `maya-monitor-server`.
3. AMI: **Ubuntu Server 24.04 LTS** (or 22.04 LTS).
4. Instance type: `t4g.micro` (ARM Graviton) or `t3.micro` (Free-tier eligible).
5. Key pair: Select or create an SSH `.pem` key pair.
6. Network settings (Security Group):
   - Inbound Rules:
     - SSH (Port 22) from `My IP`
     - HTTP (Port 80) from `0.0.0.0/0`
     - HTTPS (Port 443) from `0.0.0.0/0`
7. Click **Launch instance**.

### Step 2: SSH into EC2 & Install Node.js, Nginx, PM2
Connect to EC2:

```bash
ssh -i /path/to/key.pem ubuntu@<EC2_PUBLIC_IP>
```

Install prerequisites:

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx git postgresql-client

# Verify versions
node -v
npm -v
nginx -v

# Install PM2 globally
sudo npm install -g pm2
```

### Step 3: Clone Code & Configure Environment
```bash
sudo mkdir -p /var/www/maya-monitor
sudo chown -R ubuntu:ubuntu /var/www/maya-monitor

cd /var/www/maya-monitor
git clone <YOUR_GIT_REPO_URL> .

# Setup backend
cd /var/www/maya-monitor/backend
npm install --omit=dev

# Configure .env
cat << 'EOF' > .env
PORT=5000
AWS_REGION=ap-south-1
S3_BUCKET_NAME=maya-monitor-iot-images-ap-south-1
DATABASE_URL=postgresql://maya_admin:YourSecurePassword123!@maya-postgres-db.c123456789.ap-south-1.rds.amazonaws.com:5432/maya_monitor
EOF
```

### Step 4: Build the React Frontend
```bash
cd /var/www/maya-monitor/frontend
npm install
npm run build
```
This generates the production bundle inside `/var/www/maya-monitor/frontend/dist`.

### Step 5: Start the Backend with PM2
```bash
cd /var/www/maya-monitor
mkdir -p logs
pm2 start pm2/ecosystem.config.js
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

Check status and logs:
```bash
pm2 status
pm2 logs maya-backend
```

### Step 6: Configure Nginx as Reverse Proxy
Copy the Nginx configuration:

```bash
sudo cp /var/www/maya-monitor/nginx/default.conf /etc/nginx/sites-available/maya-monitor
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -s /etc/nginx/sites-available/maya-monitor /etc/nginx/sites-enabled/

# Test syntax and reload
sudo nginx -t
sudo systemctl reload nginx
```

Now visiting `http://<EC2_PUBLIC_IP>/` in your browser will load the live React dashboard, and `http://<EC2_PUBLIC_IP>/api/health` will return `{ "status": "ok", "service": "maya-backend" }`.

---

## 10. Raspberry Pi 4 Configuration & Streaming

### Step 1: Install Python Dependencies on Raspberry Pi
Open a terminal on your Raspberry Pi 4:

```bash
sudo apt update
sudo apt install -y python3 python3-pip python3-venv git

# Navigate to client directory
cd /home/pi/maya-monitor/pi-client
pip3 install -r requirements.txt
```

### Step 2: Test Network Connectivity to EC2
```bash
curl http://<EC2_PUBLIC_IP>/api/health
```
Expected response:
```json
{"status":"ok","service":"maya-backend","timestamp":"2026-10-05T10:00:00.000Z"}
```

### Step 3: Start Streaming Sensor Data
```bash
BACKEND_URL=http://<EC2_PUBLIC_IP>/api/telemetry \
SEND_INTERVAL=3.0 \
LOOP_MODE=true \
python3 mock_sender.py
```

### Expected Output on the Raspberry Pi:
```text
==================================================
   Maya Monitor - Raspberry Pi 4 Mock Sender     
==================================================
Backend Endpoint : http://13.233.55.101/api/telemetry
CSV File         : /home/pi/maya-monitor/pi-client/mock_data.csv
Image Directory  : /home/pi/maya-monitor/pi-client/images
Send Interval    : 3.0 seconds
Loop Mode        : Enabled (Continuous)
==================================================

[*] Checking backend health at: http://13.233.55.101/api/health
[+] Backend is healthy! Response: {'status': 'ok', 'service': 'maya-backend'}

Starting mock streaming transmission...

--------------------------------------------------
Sending record 1...
Timestamp   : 2026-10-05T10:00:00
Temperature : 28.5 °C
Fan         : ON
Mist        : OFF
Image       : image001.jpg

Response: 200 OK
Backend Msg : Telemetry received successfully (Image ID: 101)

Waiting 3.0 seconds...
```

---

## 11. REST API Documentation

### 1. Health Check
- **Endpoint**: `GET /api/health`
- **Description**: Verifies API process, database connection, and storage status.
- **Response (200 OK)**:
```json
{
  "status": "ok",
  "service": "maya-backend",
  "timestamp": "2026-10-05T10:00:00Z",
  "uptime": 1420,
  "database": {
    "connected": true,
    "type": "AWS RDS PostgreSQL"
  },
  "storage": {
    "s3_configured": true,
    "bucket": "maya-monitor-iot-images-ap-south-1",
    "region": "ap-south-1"
  }
}
```

### 2. Ingest Telemetry & Image
- **Endpoint**: `POST /api/telemetry`
- **Content-Type**: `multipart/form-data`
- **Body Fields**:
  - `temperature` *(float/number, required)*: e.g. `28.5`
  - `fan_status` *(string, required)*: `ON` or `OFF`
  - `mist_status` *(string, required)*: `ON` or `OFF`
  - `timestamp` *(string, optional)*: ISO-8601 string
  - `image` *(binary file, required)*: JPEG image
- **Response (201 Created)**:
```json
{
  "success": true,
  "imageId": 101,
  "s3_key": "images/2026/10/05/1728123456-a1b2-image001.jpg",
  "message": "Telemetry received successfully"
}
```

### 3. Get Current Telemetry State
- **Endpoint**: `GET /api/telemetry`
- **Description**: Retrieves current active sensor values.
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "temperature": 28.5,
    "fan_status": "ON",
    "mist_status": "OFF",
    "timestamp": "2026-10-05T10:00:00Z",
    "device_id": "Raspberry Pi 4 Model B",
    "packets_received": 14
  }
}
```

### 4. Get Latest Image
- **Endpoint**: `GET /api/images/latest`
- **Description**: Retrieves the most recent image record from RDS and generates a presigned S3 URL.
- **Response (200 OK)**:
```json
{
  "id": 101,
  "original_filename": "image001.jpg",
  "s3_key": "images/2026/10/05/1728123456-a1b2-image001.jpg",
  "url": "https://maya-monitor-iot-images-ap-south-1.s3.ap-south-1.amazonaws.com/images/2026/10/05/...X-Amz-Signature=...",
  "created_at": "2026-10-05T10:00:00.000Z"
}
```

### 5. Get Image History
- **Endpoint**: `GET /api/images?limit=20`
- **Description**: Returns recent image records with presigned URLs.
- **Response (200 OK)**:
```json
[
  {
    "id": 101,
    "original_filename": "image001.jpg",
    "s3_key": "images/2026/10/05/1728123456-a1b2-image001.jpg",
    "url": "https://maya-monitor-iot-images-ap-south-1.s3.ap-south-1.amazonaws.com/...",
    "created_at": "2026-10-05T10:00:00.000Z"
  }
]
```

---

## 12. End-to-End Test Procedure

1. **Verify Backend on EC2**:
   ```bash
   curl http://<EC2_PUBLIC_IP>/api/health
   ```
2. **Open React Frontend**: Navigate to `http://<EC2_PUBLIC_IP>/` in your browser. Verify "Backend: Healthy" indicator is active.
3. **Trigger Manual Test Request from Terminal**:
   ```bash
   curl -X POST http://<EC2_PUBLIC_IP>/api/telemetry \
     -F "temperature=28.5" \
     -F "fan_status=ON" \
     -F "mist_status=OFF" \
     -F "timestamp=2026-10-05T10:00:00Z" \
     -F "image=@pi-client/images/image001.jpg"
   ```
4. **Observe Response**:
   ```json
   {"success":true,"imageId":1,"message":"Telemetry received successfully"}
   ```
5. **Verify S3 Object**: Check AWS S3 Console &rarr; Bucket `maya-monitor-iot-images-ap-south-1` &rarr; `images/YYYY/MM/DD/` folder exists with uploaded JPEG.
6. **Verify RDS Row**:
   ```bash
   psql -h <RDS_ENDPOINT> -U maya_admin -d maya_monitor -c "SELECT * FROM images ORDER BY id DESC LIMIT 5;"
   ```
7. **Start Raspberry Pi Stream**: Run `python3 mock_sender.py`. Within 3 seconds, watch the React dashboard update with the live telemetry and stream photos!

---

## 13. Troubleshooting & FAQ

| Problem | Root Cause | Solution |
| :--- | :--- | :--- |
| **`Connection refused` on Raspberry Pi** | Port 80 not open in EC2 Security Group or Nginx stopped | Check EC2 Security Group inbound rule allows TCP port 80 from `0.0.0.0/0`. Run `sudo systemctl status nginx` on EC2. |
| **`413 Request Entity Too Large`** | Nginx default client max body size (1M) exceeded | Ensure `client_max_body_size 25M;` is present in `/etc/nginx/sites-available/maya-monitor` and run `sudo systemctl reload nginx`. |
| **`AccessDenied` on S3 upload** | EC2 missing IAM role or incorrect bucket name | Verify `MayaMonitorEC2Role` is attached to EC2 instance and matches `arn:aws:s3:::<BUCKET_NAME>/*`. |
| **`ETIMEDOUT` connecting to RDS** | RDS Security Group blocking EC2 | In RDS Security Group, add inbound PostgreSQL rule (port 5432) pointing specifically to the EC2 Security Group ID. |
| **Presigned image URLs expire** | Presigned URLs default to 3600s (1h) | The dashboard auto-refreshes presigned URLs every query. For permanent archives, use private CDN or download endpoints. |

---

## 14. License

Apache-2.0 License.
