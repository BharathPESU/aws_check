#!/usr/bin/env python3
"""
Maya Monitor - Raspberry Pi 4 Mock Streaming Telemetry & Image Sender
Reads mock sensor telemetry and images from disk, sends them via HTTP multipart POST to the Node.js backend.
Supports both `requests` library and standard library `urllib` fallback.
"""

import os
import sys
import csv
import time
import json
import uuid
from pathlib import Path

# Optional requests import with urllib fallback
try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    import urllib.request
    import urllib.error
    HAS_REQUESTS = False

# ==============================================================================
# Configuration
# Can be overridden using environment variables (e.g. BACKEND_URL=http://EC2_IP/api/telemetry)
# ==============================================================================
SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3000/api/telemetry")
SEND_INTERVAL = float(os.getenv("SEND_INTERVAL", "3.0"))
CSV_FILE = os.getenv("CSV_FILE", str(SCRIPT_DIR / "mock_data.csv"))
IMAGE_DIRECTORY = os.getenv("IMAGE_DIRECTORY", str(SCRIPT_DIR / "images"))
LOOP_MODE = os.getenv("LOOP_MODE", "true").lower() in ("true", "1", "yes")

def check_backend_health():
    """Performs a quick pre-flight check to verify the Node.js backend is reachable."""
    if "/api/telemetry" in BACKEND_URL:
        health_url = BACKEND_URL.replace("/api/telemetry", "/api/health")
    else:
        health_url = BACKEND_URL.rstrip("/") + "/api/health"

    print(f"[*] Checking backend health at: {health_url}")
    try:
        if HAS_REQUESTS:
            response = requests.get(health_url, timeout=5)
            if response.status_code == 200:
                print(f"[+] Backend is healthy! Response: {response.json()}")
                return True
            else:
                print(f"[-] Backend returned status {response.status_code}: {response.text}")
                return False
        else:
            req = urllib.request.Request(health_url)
            with urllib.request.urlopen(req, timeout=5) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode('utf-8'))
                    print(f"[+] Backend is healthy! Response: {data}")
                    return True
                else:
                    print(f"[-] Backend returned status {response.status}")
                    return False
    except Exception as e:
        print(f"[!] Warning: Could not reach health endpoint ({e}).")
        print(f"    Will proceed to send telemetry directly to {BACKEND_URL}...")
        return False

def _build_multipart_payload(fields, files):
    """Encodes multipart/form-data using standard Python library."""
    boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
    body = bytearray()

    for name, value in fields.items():
        body.extend(f"--{boundary}\r\n".encode('utf-8'))
        body.extend(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode('utf-8'))
        body.extend(f"{value}\r\n".encode('utf-8'))

    for name, (filename, file_bytes, content_type) in files.items():
        body.extend(f"--{boundary}\r\n".encode('utf-8'))
        body.extend(f'Content-Disposition: form-data; name="{name}"; filename="{filename}"\r\n'.encode('utf-8'))
        body.extend(f"Content-Type: {content_type}\r\n\r\n".encode('utf-8'))
        body.extend(file_bytes)
        body.extend(b"\r\n")

    body.extend(f"--{boundary}--\r\n".encode('utf-8'))
    content_type_header = f"multipart/form-data; boundary={boundary}"
    return bytes(body), content_type_header

def send_telemetry_record(row_num, record):
    """
    Sends a single row of telemetry along with the image file to the backend.
    """
    timestamp = record.get("timestamp", "").strip()
    temperature = record.get("temperature", "").strip()
    fan_status = record.get("fan_status", "").strip().upper()
    mist_status = record.get("mist_status", "").strip().upper()
    image_filename = record.get("image", "").strip()

    print("--------------------------------------------------")
    print(f"Sending record {row_num}...")
    print(f"Timestamp   : {timestamp}")
    print(f"Temperature : {temperature} °C")
    print(f"Fan         : {fan_status}")
    print(f"Mist        : {mist_status}")
    print(f"Image       : {image_filename}")

    form_data = {
        "timestamp": timestamp,
        "temperature": temperature,
        "fan_status": fan_status,
        "mist_status": mist_status,
    }

    image_path = Path(IMAGE_DIRECTORY) / image_filename

    if not image_path.exists():
        print(f"[!] Error: Image file not found: {image_path}")
        return False

    try:
        if HAS_REQUESTS:
            with open(image_path, "rb") as img_file:
                files = {
                    "image": (image_filename, img_file, "image/jpeg")
                }
                response = requests.post(BACKEND_URL, data=form_data, files=files, timeout=15)

            if response.status_code in (200, 201):
                print(f"\nResponse: {response.status_code} OK")
                try:
                    resp_json = response.json()
                    print(f"Backend Msg : {resp_json.get('message', '')} (Image ID: {resp_json.get('imageId', 'N/A')})")
                except Exception:
                    print(f"Backend Body: {response.text}")
                return True
            else:
                print(f"\nResponse Error: {response.status_code} - {response.text}")
                return False
        else:
            with open(image_path, "rb") as img_file:
                img_bytes = img_file.read()

            files = {
                "image": (image_filename, img_bytes, "image/jpeg")
            }
            body_data, content_type_hdr = _build_multipart_payload(form_data, files)
            req = urllib.request.Request(
                BACKEND_URL,
                data=body_data,
                headers={"Content-Type": content_type_hdr},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=15) as response:
                status_code = response.status
                body_resp = response.read().decode('utf-8')
                print(f"\nResponse: {status_code} OK")
                try:
                    resp_json = json.loads(body_resp)
                    print(f"Backend Msg : {resp_json.get('message', '')} (Image ID: {resp_json.get('imageId', 'N/A')})")
                except Exception:
                    print(f"Backend Body: {body_resp}")
                return True

    except Exception as e:
        print(f"\n[!] Transmission error: {e}")
        return False

def main():
    print("==================================================")
    print("   Maya Monitor - Raspberry Pi 4 Mock Sender     ")
    print("==================================================")
    print(f"Backend Endpoint : {BACKEND_URL}")
    print(f"CSV File         : {CSV_FILE}")
    print(f"Image Directory  : {IMAGE_DIRECTORY}")
    print(f"Send Interval    : {SEND_INTERVAL} seconds")
    print(f"Loop Mode        : {'Enabled (Continuous)' if LOOP_MODE else 'Single Pass'}")
    print(f"HTTP Engine      : {'requests' if HAS_REQUESTS else 'urllib (standard library)'}")
    print("==================================================\n")

    if not os.path.exists(CSV_FILE):
        print(f"Error: CSV file not found at '{CSV_FILE}'")
        sys.exit(1)

    if not os.path.exists(IMAGE_DIRECTORY):
        print(f"Error: Image directory not found at '{IMAGE_DIRECTORY}'")
        sys.exit(1)

    check_backend_health()
    print("\nStarting mock streaming transmission...\n")

    iteration = 1
    total_sent = 0

    try:
        while True:
            if iteration > 1:
                print(f"\n>>> Starting Loop #{iteration} Through CSV Dataset <<<\n")

            with open(CSV_FILE, mode="r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                rows = list(reader)

                if not rows:
                    print("Error: CSV file is empty!")
                    break

                for row in rows:
                    total_sent += 1
                    send_telemetry_record(total_sent, row)
                    print(f"\nWaiting {SEND_INTERVAL} seconds...")
                    time.sleep(SEND_INTERVAL)

            if not LOOP_MODE:
                print("\n[+] Completed single pass through CSV dataset. Exiting.")
                break

            iteration += 1

    except KeyboardInterrupt:
        print("\n\n[!] Stream transmission stopped by user (Ctrl+C). Total records sent:", total_sent)
        sys.exit(0)

if __name__ == "__main__":
    main()
