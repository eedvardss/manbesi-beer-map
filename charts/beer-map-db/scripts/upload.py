import datetime
import http.client
import os
import socket
import subprocess
import urllib.parse

# gcloud storage cp performs destination reads. This create-only media upload
# uses a generation precondition and works with storage.objectCreator alone.
# This is a short-lived runtime credential; the ConfigMap stores only source.
credential = subprocess.check_output(["gcloud", "auth", "print-access-token"], text=True).strip()
bucket = os.environ["BACKUP_BUCKET"]
name = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%S") + "-" + socket.gethostname() + ".dump"
path = "/upload/storage/v1/b/" + urllib.parse.quote(bucket, safe="") + "/o?uploadType=media&ifGenerationMatch=0&name=" + urllib.parse.quote(name, safe="")
connection = http.client.HTTPSConnection("storage.googleapis.com", timeout=60)
with open("/backup/catalog.dump", "rb") as source:
    connection.request("POST", path, body=source, headers={
        "Authorization": "Bearer " + credential,
        "Content-Type": "application/octet-stream",
        "Content-Length": str(os.fstat(source.fileno()).st_size),
    })
response = connection.getresponse()
if response.status not in (200, 201):
    raise RuntimeError("Backup upload failed: HTTP " + str(response.status))
response.read()
connection.close()
print("Uploaded backup: gs://" + bucket + "/" + name)
