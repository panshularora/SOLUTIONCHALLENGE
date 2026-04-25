import os
import torch
import numpy as np
from transformers import CLIPProcessor, CLIPModel
from google.cloud import vision

# Load CLIP model and processor globally to avoid reloading on each request
_clip_model_id = "openai/clip-vit-base-patch32"
_processor = None
_model = None

def get_clip_models():
    global _processor, _model
    if _processor is None or _model is None:
        _processor = CLIPProcessor.from_pretrained(_clip_model_id)
        _model = CLIPModel.from_pretrained(_clip_model_id)
    return _processor, _model

def get_clip_embedding(image):
    """
    Computes normalized CLIP embedding for a given PIL Image.
    """
    processor, model = get_clip_models()
    inputs = processor(images=image, return_tensors="pt")
    
    with torch.no_grad():
        image_features = model.get_image_features(**inputs)
        
    # Normalize features for cosine similarity
    image_features = image_features / image_features.norm(dim=-1, keepdim=True)
    return image_features.cpu().numpy().tolist()[0]

def compute_similarity(emb1, emb2):
    """
    Computes cosine similarity between two normalized embeddings.
    """
    return float(np.dot(np.array(emb1), np.array(emb2)))

def get_google_vision_urls(image_bytes):
    """
    Calls Google Cloud Vision API for Web Detection.
    Returns a list of URLs where the image or partial image was found.
    """
    if not os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
        print("Warning: GOOGLE_APPLICATION_CREDENTIALS not set. Skipping Vision API.")
        return []
        
    try:
        client = vision.ImageAnnotatorClient()
        image = vision.Image(content=image_bytes)
        response = client.web_detection(image=image)
        
        if response.error.message:
             raise Exception(f"{response.error.message}")
        
        web_detection = response.web_detection
        urls = []
        
        # Collect fully matching images
        for img in web_detection.full_matching_images:
            urls.append({"url": img.url, "score": img.score, "type": "full_match"})
        
        # Collect partially matching images
        for img in web_detection.partial_matching_images:
            urls.append({"url": img.url, "score": img.score, "type": "partial_match"})
            
        # Collect pages with matching images
        for page in web_detection.pages_with_matching_images:
            # pages_with_matching_images may not expose score in the same way, providing default 0.0
            urls.append({"url": page.url, "score": getattr(page, 'score', 0.0), "type": "page_match"})
            
        return urls
    except Exception as e:
        print(f"Vision API error: {e}")
        return []
