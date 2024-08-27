import subprocess
import re
import json
from http.server import BaseHTTPRequestHandler, HTTPServer

# Function to continuously extract latitude and longitude
def extract_lat_long_continuous():
    try:
        # Run gpspipe command and capture the output
        process = subprocess.Popen(['gpspipe', '-w'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        while True:
            output = process.stdout.readline()
            if output == '' and process.poll() is not None:
                break
            if output:
                # Search for latitude and longitude in the output
                lat_long_match = re.search(r'"lat":([-+]?\d{1,3}\.\d+),"lon":([-+]?\d{1,3}\.\d+)', output)
                if lat_long_match:
                    latitude = lat_long_match.group(1)
                    longitude = lat_long_match.group(2)
                    return latitude, longitude
    except Exception as e:
        print(f"An error occurred: {e}")
        return None, None

class GPSRequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/gps':
            lat, lon = extract_lat_long_continuous()
            if lat and lon:
                self.send_response(200)
                self.send_header("Content-type", "application/json")
                self.end_headers()
                response_data = {"lat": lat, "lon": lon}
                self.wfile.write(json.dumps(response_data).encode("utf-8"))
            else:
                error_response = {"error": "Error retrieving GPS data"}
                self.send_response(500)
                self.send_header("Content-type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps(error_response).encode("utf-8"))
        else:
            self.send_response(404)
            self.send_header("Content-type", "text/plain")
            self.end_headers()
            self.wfile.write(b"Not found")

    def do_POST(self):
        if self.path == '/save-directions':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                directions_data = json.loads(post_data)
                directions_text = directions_data.get('directions', '')

                # Save directions to a file on the Raspberry Pi
                with open('/home/pi/directions.txt', 'w') as file:
                    file.write(directions_text)

                self.send_response(200)
                self.end_headers()
                self.wfile.write(b"Directions saved successfully.")
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(b"Failed to save directions.")

def run_server():
    server_address = ('', 8000)
    httpd = HTTPServer(server_address, GPSRequestHandler)
    print("Starting GPS server on port 8000...")
    httpd.serve_forever()

if __name__ == "__main__":
    run_server()