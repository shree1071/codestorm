"""Flashcard generation prompts"""
from typing import List, Dict, Any
from services.llm import llm_service

async def generate_flashcards(sources: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Generate flashcards from sources"""
    # Build context
    context = "\n\n".join([
        f"Source: {s.get('title', 'Untitled')}\n{s.get('summary', '')}"
        for s in sources[:5]
    ])
    
    prompt = f"""Generate 20 flashcards based on these sources:

{context}

Format as JSON:
{{
  "flashcards": [
    {{
      "front": "Question or term",
      "back": "Answer or definition",
      "category": "Topic category"
    }}
  ]
}}

Make flashcards test key concepts and definitions."""
    
    response = await llm_service.chat(
        messages=[{"role": "user", "content": prompt}],
        model="gpt-4",
        temperature=0.5,
        max_tokens=2000
    )
    
    import json
    try:
        return json.loads(response["content"])
    except:
        return {"flashcards": [], "error": "Failed to parse flashcards"}
