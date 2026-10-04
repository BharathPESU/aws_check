import React, { useState } from 'react';
import {
  Layers,
  Server,
  Database,
  Cloud,
  Cpu,
  Shield,
  FileCode,
  Terminal,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';

interface ArchitectureModalProps {
  onClose: () => void;
}

export default function ArchitectureModal({ onClose }: ArchitectureModalProps) {
  const [activeTab, setActiveTab] = useState<'architecture' | 'ec2' | 'rds' | 's3' | 'pi'>('architecture');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">AWS Production Deployment Guide</h2>
              <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                ap-south-1
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Raspberry Pi 4 • EC2 Ubuntu • RDS PostgreSQL • S3 • Nginx • PM2
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-4 overflow-x-auto">
          {[
            { id: 'architecture', label: 'Architecture & Flow', icon: Layers },
            { id: 'ec2', label: 'EC2 & Nginx', icon: Server },
            { id: 'rds', label: 'RDS PostgreSQL', icon: Database },
            { id: 's3', label: 'S3 & IAM Role', icon: Cloud },
            { id: 'pi', label: 'Raspberry Pi 4', icon: Cpu },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold whitespace-nowrap border-b-2 transition ${
                  isActive
                    ? 'border-emerald-500 text-emerald-400 bg-slate-900/50'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
          {activeTab === 'architecture' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono leading-relaxed">
                <div className="text-emerald-400 font-bold mb-2">AWS Production System Architecture</div>
{`                      +---------------------------------------+
                      |         AWS Cloud (ap-south-1)        |
                      |                                       |
                      |   +-------------------------------+   |
                      |   |           EC2 Ubuntu          |   |
                      |   |                               |   |
                      |   |   +--------+     +--------+   |   |
                      |   |   | Nginx  |     | Node.js|   |   |
                      |   |   | Port 80|     |Express |   |   |
                      |   |   | (React)|     |Port5000|   |   |
                      |   |   +---+----+     +---+----+   |   |
                      |   +-------|--------------|--------+   |
                      |           |              |            |
                      |           |       +------+------+     |
                      |           |       |             |     |
                      |           v       v             v     |
                      |        Browser  AWS S3       AWS RDS  |
                      |       (Client)  Bucket      PostgreSQL|
                      |                 (Images)    (Metadata)|
                      +---------------------------------------+
                                  ^
                                  | HTTP POST multipart/form-data
                                  | (/api/telemetry)
                        +---------+----------+
                        |  Raspberry Pi 4    |
                        |  Python CSV Stream |
                        +--------------------+`}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <h4 className="font-bold text-white text-sm mb-2">Data Ingestion Contract</h4>
                  <ul className="space-y-1.5 text-slate-400">
                    <li><strong className="text-slate-200">Endpoint:</strong> <code className="text-emerald-400">POST /api/telemetry</code></li>
                    <li><strong className="text-slate-200">Content-Type:</strong> <code className="text-sky-400">multipart/form-data</code></li>
                    <li><strong className="text-slate-200">Fields:</strong> temperature, fan_status, mist_status, timestamp</li>
                    <li><strong className="text-slate-200">File Field:</strong> image (JPEG format)</li>
                  </ul>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <h4 className="font-bold text-white text-sm mb-2">Storage Responsibility</h4>
                  <ul className="space-y-1.5 text-slate-400">
                    <li><strong className="text-slate-200">AWS S3:</strong> Stores image files under <code className="text-sky-400">images/YYYY/MM/DD/unique-xxx.jpg</code></li>
                    <li><strong className="text-slate-200">AWS RDS:</strong> Stores image record ID, original filename, and s3_key</li>
                    <li><strong className="text-slate-200">Presigned URLs:</strong> Generated on-demand via AWS SDK v3 (1-hour expiry)</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ec2' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-white text-sm mb-1">1. EC2 Security Group Inbound Rules</h4>
                <p className="text-slate-400 mb-2">Only open the minimal required ports. Never expose RDS PostgreSQL (5432) to public internet.</p>
                <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                  <table className="w-full text-left font-mono">
                    <thead className="bg-slate-900 text-slate-300">
                      <tr>
                        <th className="p-2.5">Port</th>
                        <th className="p-2.5">Protocol</th>
                        <th className="p-2.5">Source</th>
                        <th className="p-2.5">Purpose</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      <tr>
                        <td className="p-2.5 text-emerald-400">22</td>
                        <td className="p-2.5">TCP</td>
                        <td className="p-2.5">Your IP /32</td>
                        <td className="p-2.5 text-slate-400">SSH Remote Terminal</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-emerald-400">80</td>
                        <td className="p-2.5">TCP</td>
                        <td className="p-2.5">0.0.0.0/0</td>
                        <td className="p-2.5 text-slate-400">HTTP Nginx (React + Node.js Proxy)</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-emerald-400">443</td>
                        <td className="p-2.5">TCP</td>
                        <td className="p-2.5">0.0.0.0/0</td>
                        <td className="p-2.5 text-slate-400">HTTPS SSL/TLS</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-white text-sm">2. Nginx Configuration (/etc/nginx/sites-available/default)</h4>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `server {
    listen 80 default_server;
    server_name _;
    client_max_body_size 25M;
    root /var/www/maya-monitor/frontend/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}`,
                        'nginx'
                      )
                    }
                    className="flex items-center gap-1 text-slate-400 hover:text-white"
                  >
                    {copiedSection === 'nginx' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSection === 'nginx' ? 'Copied' : 'Copy Conf'}</span>
                  </button>
                </div>
                <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] overflow-x-auto text-slate-300">
{`server {
    listen 80 default_server;
    server_name _;
    client_max_body_size 25M;
    root /var/www/maya-monitor/frontend/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}`}
                </pre>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1">3. Process Management via PM2</h4>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono space-y-1">
                  <p className="text-slate-400"># Start backend with PM2:</p>
                  <p className="text-emerald-400">pm2 start ecosystem.config.js</p>
                  <p className="text-slate-400"># Persist across server reboots:</p>
                  <p className="text-emerald-400">pm2 save && pm2 startup</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'rds' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-white text-sm mb-1">1. AWS RDS PostgreSQL Instance Setup</h4>
                <ol className="list-decimal list-inside space-y-2 text-slate-400 leading-relaxed">
                  <li>Open AWS RDS Console in <strong className="text-white">ap-south-1 (Mumbai)</strong>.</li>
                  <li>Click <strong className="text-white">Create database</strong> &rarr; Select <strong className="text-white">PostgreSQL</strong> (Version 15 or 16).</li>
                  <li>Choose <strong className="text-white">Free tier</strong> template.</li>
                  <li>DB instance identifier: <code className="text-emerald-400">maya-postgres-db</code></li>
                  <li>Master username: <code className="text-emerald-400">maya_admin</code></li>
                  <li>Master password: Create a secure password.</li>
                  <li>Connectivity: Attach to the same VPC as your EC2 instance. Set <strong className="text-white">Public access: No</strong>.</li>
                  <li>Under VPC Security Group, create or select a security group that allows inbound PostgreSQL (port 5432) <strong className="text-white">only from the EC2 Security Group ID</strong>.</li>
                </ol>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-white text-sm">2. Schema Definition (database/schema.sql)</h4>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `CREATE TABLE images (
    id SERIAL PRIMARY KEY,
    original_filename VARCHAR(255),
    s3_key VARCHAR(500) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_images_created_at ON images (created_at DESC);`,
                        'schema'
                      )
                    }
                    className="flex items-center gap-1 text-slate-400 hover:text-white"
                  >
                    {copiedSection === 'schema' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSection === 'schema' ? 'Copied' : 'Copy SQL'}</span>
                  </button>
                </div>
                <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] overflow-x-auto text-slate-300">
{`CREATE TABLE images (
    id SERIAL PRIMARY KEY,
    original_filename VARCHAR(255),
    s3_key VARCHAR(500) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_images_created_at ON images (created_at DESC);`}
                </pre>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1">3. Executing Migration from EC2</h4>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono space-y-1">
                  <p className="text-slate-400"># Run schema on RDS PostgreSQL endpoint:</p>
                  <p className="text-emerald-400 break-all">
                    psql -h maya-postgres-db.c123456789.ap-south-1.rds.amazonaws.com -U maya_admin -d postgres -f database/schema.sql
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 's3' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-white text-sm mb-1">1. S3 Bucket Configuration</h4>
                <ul className="list-disc list-inside space-y-1.5 text-slate-400">
                  <li>Bucket name: e.g. <code className="text-emerald-400">maya-monitor-iot-images-ap-south-1</code></li>
                  <li>AWS Region: <strong className="text-white">ap-south-1 (Asia Pacific - Mumbai)</strong></li>
                  <li><strong className="text-white">Block all public access: Checked (Enabled)</strong> — The bucket remains private! Images are securely accessed exclusively via backend-generated AWS SDK presigned URLs.</li>
                </ul>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-white text-sm">2. EC2 IAM Role Policy (Least Privilege)</h4>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::maya-monitor-iot-images-ap-south-1/*"
    }
  ]
}`,
                        'iam'
                      )
                    }
                    className="flex items-center gap-1 text-slate-400 hover:text-white"
                  >
                    {copiedSection === 'iam' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSection === 'iam' ? 'Copied' : 'Copy Policy JSON'}</span>
                  </button>
                </div>
                <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] overflow-x-auto text-slate-300">
{`{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::maya-monitor-iot-images-ap-south-1/*"
    }
  ]
}`}
                </pre>
                <p className="text-[11px] text-slate-400 mt-1">
                  Attach this role to your EC2 instance via <strong className="text-slate-200">EC2 Console &rarr; Actions &rarr; Security &rarr; Modify IAM role</strong>. No secret keys in source code!
                </p>
              </div>
            </div>
          )}

          {activeTab === 'pi' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-white text-sm mb-1">Raspberry Pi 4 Client Setup &amp; Execution</h4>
                <ol className="list-decimal list-inside space-y-2 text-slate-400">
                  <li>Ensure Python 3 and pip are installed on the Raspberry Pi:
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-emerald-400 mt-1">
                      sudo apt update && sudo apt install -y python3 python3-pip
                    </div>
                  </li>
                  <li>Transfer the <code className="text-slate-200">pi-client</code> folder to the Raspberry Pi:
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-emerald-400 mt-1">
                      cd pi-client<br />
                      pip3 install -r requirements.txt
                    </div>
                  </li>
                  <li>Verify backend connectivity before starting streaming:
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-emerald-400 mt-1">
                      curl http://&lt;EC2_PUBLIC_IP&gt;/api/health
                    </div>
                  </li>
                  <li>Run the mock streaming sender:
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-emerald-400 mt-1">
                      BACKEND_URL=http://&lt;EC2_PUBLIC_IP&gt;/api/telemetry SEND_INTERVAL=3.0 python3 mock_sender.py
                    </div>
                  </li>
                </ol>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px]">
                <div className="text-slate-400 mb-1">Expected Output in Raspberry Pi Terminal:</div>
                <div className="text-emerald-400">
{`Sending record 1...
Timestamp   : 2026-10-05T10:00:00
Temperature : 28.5 °C
Fan         : ON
Mist        : OFF
Image       : image001.jpg

Response: 200 OK
Backend Msg : Telemetry received successfully (Image ID: 123)

Waiting 3 seconds...`}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-mono">
            AWS Deployment Target: EC2 Ubuntu 24.04 LTS (ap-south-1)
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white rounded-lg transition"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
