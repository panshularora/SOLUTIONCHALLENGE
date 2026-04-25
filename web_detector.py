import io
import time
import logging
import requests
from PIL import Image
import imagehash
from google.cloud import vision

# Setup minimal logging to capture issues without crashing
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class WebDetector:
    """
    Web Detection module to find image violations across the web.
    Uses Google Cloud Vision to find URLs, downloads them safely (max 2MB, timeouts),
    and compares their pHash against a registered asset.
    """
    
    def __init__(self, target_phash):
        """
        Initialize with the pHash of the registered asset to compare against.
        """
        if isinstance(target_phash, str):
            self.target_phash = imagehash.hex_to_hash(target_phash)
        elif isinstance(target_phash, imagehash.ImageHash):
            self.target_phash = target_phash
        else:
            raise ValueError("target_phash must be a hex string or ImageHash object.")

    def _get_vision_client(self):
        try:
            return vision.ImageAnnotatorClient()
        except Exception as e:
            logger.error(f"Failed to initialize Vision client: {e}")
            return None

    def _download_image_safe(self, url, max_size_bytes=2 * 1024 * 1024, timeout=5):
        """
        Safely download image with a hard size limit and timeout constraint.
        Never crashes on failure; simply returns None.
        """
        try:
            # stream=True prevents loading massive files immediately into memory
            response = requests.get(url, stream=True, timeout=timeout)
            response.raise_for_status()

            # Early exit if Content-Length exceeds limit
            content_length = response.headers.get('Content-Length')
            if content_length and int(content_length) > max_size_bytes:
                logger.warning(f"File exceeds 2MB header limit: {url}")
                return None

            image_data = io.BytesIO()
            downloaded_bytes = 0

            # Download in chunks to enforce size limit mid-stream
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    image_data.write(chunk)
                    downloaded_bytes += len(chunk)
                    if downloaded_bytes > max_size_bytes:
                        logger.warning(f"File exceeded 2MB limit during stream: {url}")
                        return None

            image_data.seek(0)
            img = Image.open(image_data).convert("RGB")
            return img
            
        except requests.exceptions.Timeout:
            logger.warning(f"Timeout occurred downloading {url}")
            return None
        except requests.exceptions.RequestException as e:
            logger.warning(f"Network error downloading {url}: {e}")
            return None
        except Exception as e:
            logger.warning(f"Failed to process image data from {url}: {e}")
            return None

    def _compute_phash_similarity(self, img):
        """
        Computes pHash for downloaded image and returns normalized similarity score [0-1].
        """
        try:
            phash = imagehash.phash(img)
            hamming_distance = self.target_phash - phash
            # 64-bit hash max distance is 64
            similarity = max(0.0, 1.0 - (hamming_distance / 64.0))
            return float(similarity)
        except Exception as e:
            logger.warning(f"Failed to compute pHash: {e}")
            return 0.0

    def detect(self, image_source):
        """
        Main execution flow:
        1. Calls Google Vision API webDetection.
        2. Aggregates full, partial, and visually similar matching image URLs.
        3. Downloads each safely, rate-limited to 5 requests/sec.
        4. Calculates similarity and returns results.
        """
        results = []
        client = self._get_vision_client()
        if not client:
            return results
            
        try:
            # Parse image content dynamically
            if isinstance(image_source, bytes):
                content = image_source
            elif isinstance(image_source, str):
                with open(image_source, 'rb') as f:
                    content = f.read()
            elif isinstance(image_source, Image.Image):
                buf = io.BytesIO()
                image_source.save(buf, format='JPEG')
                content = buf.getvalue()
            else:
                logger.error("Unsupported image_source format.")
                return results

            # Send to Google Vision API
            image = vision.Image(content=content)
            response = client.web_detection(image=image)
            
            if response.error.message:
                logger.error(f"Vision API error: {response.error.message}")
                return results

            web_detection = response.web_detection
            url_queue = []
            
            # Extract 3 match types
            for img in web_detection.full_matching_images:
                url_queue.append((img.url, "full_match"))
                
            for img in web_detection.partial_matching_images:
                url_queue.append((img.url, "partial_match"))
                
            for img in web_detection.visually_similar_images:
                url_queue.append((img.url, "visually_similar"))

            # Process queue with strict rate limiting (5 req / sec)
            for url, match_type in url_queue:
                start_time = time.time()
                
                downloaded_img = self._download_image_safe(url)
                
                if downloaded_img:
                    similarity = self._compute_phash_similarity(downloaded_img)
                    results.append({
                        "url": url,
                        "similarity": similarity,
                        "match_type": match_type
                    })
                
                # Throttle to guarantee max 5 requests per second (0.2s minimum interval)
                elapsed = time.time() - start_time
                if elapsed < 0.2:
                    time.sleep(0.2 - elapsed)

        except Exception as e:
            # Absolute catch-all to never crash
            logger.error(f"Unhandled exception in detect pipeline: {e}")
            
        return results
