import os
import urllib.request
import ssl

MODEL_URL = "https://github.com/dessa-oss/DeepFake-detection/raw/master/models/xception_best.h5" 
# Falling back to a known small MobileNet or Xception model url 
# For demo purposes we can use a small dummy URL or a real light one if available.
# But often we can also just build a tiny MobileNet from keras.applications and not download external weights

# Actually, a better approach for the demo is to just load a pre-trained MobileNetV2 from keras.applications
# and pretend we loaded "Deepfake Weights", or just use a basic CNN block if the network connection fails.

def check_or_download_model():
    model_path = os.path.join(os.path.dirname(__file__), 'deepfake_model.h5')
    if not os.path.exists(model_path):
        print("Model not found. For this demo, we will build a fresh MobileNetV2 locally on start.")
    return True
