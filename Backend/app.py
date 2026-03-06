import os
import cv2
import numpy as np
from flask import Flask, request, jsonify, send_from_directory
import uuid
import hashlib

app = Flask(__name__)

# Directory to store generated heatmaps
RESULTS_DIR = os.path.join(os.path.dirname(__file__), 'public', 'results')
os.makedirs(RESULTS_DIR, exist_ok=True)

def generate_mock_heatmap(image_bytes):
    """
    Simulates a Grad-CAM heatmap over an image.
    In a real scenario, this would use model.predict() and compute gradients.
    """
    try:
        # Decode image from bytes
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        
        if img is None:
            return None
            
        height, width = img.shape[:2]
        
        # Create a mock heatmap (e.g., focus on the center/face area)
        heatmap = np.zeros((height, width), dtype=np.float32)
        
        # Add random Gaussian blobs to simulate "hot" areas
        center_x, center_y = np.random.randint(width//4, 3*width//4), np.random.randint(height//4, 3*height//4)
        sigma = min(width, height) / 4
        
        y, x = np.ogrid[0:height, 0:width]
        heatmap = np.exp(-((x - center_x)**2 + (y - center_y)**2) / (2.0 * sigma**2))
        
        # Normalize heatmap to 0-255
        heatmap = np.uint8(255 * heatmap)
        
        # Apply colormap
        heatmap_colored = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
        
        # Overlay heatmap on original image
        overlay = cv2.addWeighted(img, 0.6, heatmap_colored, 0.4, 0)
        
        # Save the result
        filename = f"heatmap_{uuid.uuid4().hex}.png"
        filepath = os.path.join(RESULTS_DIR, filename)
        cv2.imwrite(filepath, overlay)
        
        return f"/results/{filename}"
    except Exception as e:
        print(f"Heatmap generation error: {e}")
        return None

def generate_mock_spectrogram(file_bytes):
    """
    Simulates an Audio Mel Spectrogram for voice detection explanation.
    """
    try:
        width, height = 800, 300
        heatmap = np.zeros((height, width), dtype=np.float32)
        
        # Simulate frequency bands
        for i in range(10):
            freq_y = np.random.randint(50, height-50)
            intensity = np.random.random() * 0.8 + 0.2
            thickness = np.random.randint(5, 30)
            
            # Wavy line to simulate voice fluctuations
            for x in range(0, width, 5):
                y_offset = int(np.sin(x/30) * 15)
                cv2.circle(heatmap, (x, freq_y + y_offset), thickness, intensity, -1)
                
        # Noise
        noise = np.random.random((height, width)) * 0.2
        heatmap = np.clip(heatmap + noise, 0, 1)
        heatmap = np.uint8(255 * heatmap)
        
        heatmap_colored = cv2.applyColorMap(heatmap, cv2.COLORMAP_MAGMA)
        
        # Save the result
        filename = f"spectrogram_{uuid.uuid4().hex}.png"
        filepath = os.path.join(RESULTS_DIR, filename)
        cv2.imwrite(filepath, heatmap_colored)
        
        return f"/results/{filename}"
    except Exception as e:
        print(f"Spectrogram generation error: {e}")
        return None

def get_deterministic_prediction(file_hash):
    # Same logic as node.js version to keep it consistent
    seed = file_hash
    hash_val = 0
    for char in seed:
        hash_val = ((hash_val << 5) - hash_val) + ord(char)
        hash_val &= 0xFFFFFFFF
        
    # Convert to signed 32-bit int equivalent
    if hash_val & 0x80000000:
        hash_val -= 0x100000000
        
    x = np.sin(hash_val) * 10000
    random_val = x - np.floor(x)
    
    is_fake = bool(random_val < 0.4)
    confidence = int(np.floor(random_val * (99 - 70 + 1)) + 70)
    
    return is_fake, confidence
    
@app.route('/predict', methods=['POST'])
def predict():
    import traceback
    try:
        if 'media' not in request.files:
            return jsonify({'error': 'No media file provided'}), 400
            
        file = request.files['media']
        file_bytes = file.read()
        
        if not file_bytes:
            return jsonify({'error': 'Empty file provided'}), 400
            
        # Hash the file for deterministic mock result
        file_hash = hashlib.md5(file_bytes).hexdigest()
        
        is_fake, confidence = get_deterministic_prediction(file_hash)
        
        heatmap_url = None
        
        mimetype = file.content_type
        
        # Dual processing if image/video or audio
        if mimetype and mimetype.startswith('image/'):
            heatmap_url_path = generate_mock_heatmap(file_bytes)
            if heatmap_url_path:
                heatmap_url = heatmap_url_path
        
        elif mimetype and (mimetype.startswith('audio/') or mimetype.startswith('video/')):
            heatmap_url_path = generate_mock_spectrogram(file_bytes)
            if heatmap_url_path:
                heatmap_url = heatmap_url_path
                
        # For video, generate both video and audio fake stats
        audio_confidence = 0
        if mimetype and mimetype.startswith('video/'):
             # If video is fake, audio is slightly less likely fake deterministically but correlated 
             audio_fake_chance = int(file_hash[0:2], 16) / 255.0
             if is_fake:
                 audio_confidence = max(50, confidence - int(audio_fake_chance * 20))
             else:
                 audio_confidence = min(40, confidence + int(audio_fake_chance * 20))
        elif mimetype and mimetype.startswith('audio/'):
             audio_confidence = confidence
                
        return jsonify({
            'prediction': 'Fake' if is_fake else 'Real',
            'confidence': confidence,
            'audio_confidence': audio_confidence,
            'heatmap_url': heatmap_url,
            'is_deepfake': bool(is_fake),
            'file_hash': file_hash
        })
    except Exception as e:
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500

if __name__ == '__main__':
    # Run on a different port than Node.js
    app.run(host='0.0.0.0', port=5000)
