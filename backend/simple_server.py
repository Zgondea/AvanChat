#!/usr/bin/env python3

from fastapi import FastAPI
from pydantic import BaseModel
from uuid import UUID, uuid4
from typing import List
import uvicorn

# Simple in-memory storage for testing
laws_db = []

class LawCreate(BaseModel):
    title: str

class LawRead(BaseModel):
    id: str
    title: str

app = FastAPI(title="Laws API Test")

@app.post("/api/v1/laws/", response_model=LawRead)
def create_law(law: LawCreate):
    new_law = {
        "id": str(uuid4()),
        "title": law.title
    }
    laws_db.append(new_law)
    return new_law

@app.get("/api/v1/laws/", response_model=List[LawRead])  
def list_laws():
    return laws_db

@app.get("/")
def root():
    return {"message": "Laws API is running"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)