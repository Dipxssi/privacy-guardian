from transformers import AutoTokenizer, AutoModelForTokenClassification, pipeline
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
from fastapi.responses import JSONResponse
import numpy as np
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Global variable to store the pipeline (lazy loading)
ner_pipeline = None
model_name = "SoelMgd/bert-pii-detection"

def load_model():
    """Load the PII detection model. This is called lazily on first request."""
    global ner_pipeline
    if ner_pipeline is None:
        try:
            logger.info(f"Loading model: {model_name}")
            tokenizer = AutoTokenizer.from_pretrained(model_name)
            model = AutoModelForTokenClassification.from_pretrained(model_name)
            ner_pipeline = pipeline(
                "ner",
                model=model,
                tokenizer=tokenizer,
                aggregation_strategy="simple"
            )
            logger.info("Model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise HTTPException(status_code=500, detail=f"Model loading failed: {str(e)}")
    return ner_pipeline

class TextInput(BaseModel):
    text: str

@app.post("/detect_pii")
async def detect_pii(data: TextInput):
    """Detect PII entities in the provided text."""
    try:
        pipeline = load_model()
        entities = pipeline(data.text)
        # Convert np.float32 to float and ensure dict-like output for JSON serialization
        clean_entities = []
        for ent in entities:
            clean_ent = {k: (float(v) if isinstance(v, np.float32) else v) for k, v in ent.items()}
            clean_entities.append(clean_ent)
        return JSONResponse(content={"entities": clean_entities})
    except Exception as e:
        logger.error(f"Error detecting PII: {e}")
        raise HTTPException(status_code=500, detail=f"PII detection failed: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "model_loaded": ner_pipeline is not None}

def cli_test():
    """Test the PII detection with a sample text."""
    try:
        pipeline = load_model()
        sample_text = "Hi, my name is John Smith and my email is john.smith@company.com"
        entities = pipeline(sample_text)
        print("Detected PII entities:", entities)
    except Exception as e:
        print(f"CLI test failed: {e}")

if __name__ == "__main__":
    import sys
    
    # If --test flag is provided, run CLI test and exit
    if "--test" in sys.argv:
        cli_test()
        sys.exit(0)
    
    # Otherwise, start the FastAPI server
    logger.info("Starting PII detection API server on http://0.0.0.0:8000")
    logger.info("Use --test flag to run a test instead of starting the server")
    uvicorn.run(app, host="0.0.0.0", port=8000)
