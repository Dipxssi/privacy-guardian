from transformers import AutoTokenizer, AutoModelForTokenClassification, pipeline
from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn
from fastapi.responses import JSONResponse
import numpy as np

model_name = "SoelMgd/bert-pii-detection"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForTokenClassification.from_pretrained(model_name)

ner_pipeline = pipeline(
    "ner",
    model=model,
    tokenizer=tokenizer,
    aggregation_strategy="simple"
)




app = FastAPI()

class TextInput(BaseModel):
    text: str

@app.post("/detect_pii")
async def detect_pii(data: TextInput):
    entities = ner_pipeline(data.text)
    # Convert np.float32 to float and ensure dict-like output for JSON serialization
    clean_entities = []
    for ent in entities:
        clean_ent = {k: (float(v) if isinstance(v, np.float32) else v) for k, v in ent.items()}
        clean_entities.append(clean_ent)
    return JSONResponse(content={"entities": clean_entities})

def cli_test():
    sample_text = "Hi, my name is John Smith and my email is john.smith@company.com"
    entities = ner_pipeline(sample_text)
    print("Detected PII entities:", entities)

if __name__ == "__main__":
    # Run CLI test
    cli_test()

    # To run FastAPI server, uncomment below and run with: python pii_inference.py
    uvicorn.run(app, host="0.0.0.0", port=8000)
