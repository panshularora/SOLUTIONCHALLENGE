import io
from PIL import Image
import imagehash
import torch
import numpy as np
from transformers import CLIPProcessor, CLIPModel

class ImageFingerprinter:
    """
    Expert AI Image Fingerprinting module combining CLIP embeddings and Perceptual Hashing (pHash).
    """
    def __init__(self, model_id="openai/clip-vit-base-patch32"):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.processor = CLIPProcessor.from_pretrained(model_id)
        self.model = CLIPModel.from_pretrained(model_id).to(self.device)
        self.model.eval()
        
    def load_image(self, image_source):
        """
        Safely loads an image handling JPEG, PNG, WebP formats.
        Converts all images to RGB to normalize Alpha channels or grayscale.
        """
        if isinstance(image_source, bytes):
            img = Image.open(io.BytesIO(image_source))
        elif isinstance(image_source, str):
            img = Image.open(image_source)
        elif isinstance(image_source, Image.Image):
            img = image_source
        else:
            raise ValueError("Unsupported image source type. Must be bytes, path, or PIL Image.")
            
        return img.convert("RGB")
        
    def get_phash(self, img: Image.Image):
        """Computes a 64-bit perceptual hash."""
        return imagehash.phash(img)
        
    def get_clip_embedding(self, img: Image.Image):
        """Generates normalized CLIP image embeddings."""
        inputs = self.processor(images=img, return_tensors="pt").to(self.device)
        
        with torch.no_grad():
            features = self.model.get_image_features(**inputs)
            
        # Normalize features (L2 norm) so that dot product equals cosine similarity
        features = features / features.norm(dim=-1, keepdim=True)
        return features.cpu().numpy().tolist()[0]
        
    def compute_fingerprint(self, image_source):
        """
        Computes both the pHash and CLIP embedding for an image.
        Useful for storing in a database.
        """
        img = self.load_image(image_source)
        return {
            "phash": self.get_phash(img),
            "clip_embedding": self.get_clip_embedding(img)
        }

    def compare_fingerprints(self, phash1, emb1, phash2, emb2):
        """
        Compares two pre-computed fingerprints and calculates the combined similarity.
        """
        # 1. pHash comparison
        # Maximum hamming distance for a 64-bit hash is 64. 
        # Normalized similarity = 1 - (hamming_distance / 64)
        if isinstance(phash1, str):
            phash1 = imagehash.hex_to_hash(phash1)
        if isinstance(phash2, str):
            phash2 = imagehash.hex_to_hash(phash2)
            
        hamming_distance = phash1 - phash2
        phash_similarity = 1.0 - (hamming_distance / 64.0)
        
        # 2. CLIP Embedding comparison (Cosine Similarity)
        # Assuming embeddings are already L2 normalized, cosine similarity is just the dot product
        clip_similarity = float(np.dot(np.array(emb1), np.array(emb2)))
        
        # 3. Combined similarity score (70% CLIP + 30% pHash)
        combined_score = (0.7 * clip_similarity) + (0.3 * phash_similarity)
        
        # Clamp score to exactly [0.0, 1.0] to avoid float precision artifacts
        combined_score = max(0.0, min(1.0, float(combined_score)))
        
        # 4. Threshold check
        is_violation = combined_score > 0.82
        
        return {
            "combined_score": combined_score,
            "clip_similarity": clip_similarity,
            "phash_similarity": phash_similarity,
            "is_violation": is_violation
        }

    def compare_images(self, img1_source, img2_source):
        """
        End-to-end function that loads images, computes fingerprints, and compares them.
        """
        fp1 = self.compute_fingerprint(img1_source)
        fp2 = self.compute_fingerprint(img2_source)
        
        return self.compare_fingerprints(
            phash1=fp1["phash"], 
            emb1=fp1["clip_embedding"], 
            phash2=fp2["phash"], 
            emb2=fp2["clip_embedding"]
        )
