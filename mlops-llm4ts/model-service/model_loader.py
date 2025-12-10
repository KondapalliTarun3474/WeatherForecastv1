import torch
from model import ForecastingModel

MODEL_PATH = "models/latest.pt"

_model = None

def load_model():
    global _model
    if _model is None:
        _model = ForecastingModel()
        _model.load_state_dict(torch.load(MODEL_PATH, map_location="cpu"))
        _model.eval()
    return _model

