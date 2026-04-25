"""Quiz generation prompts"""
from typing import List, Dict, Any
from services.llm import llm_service

async def generate_quiz(sources: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Generate quiz from sources"""
    # Build context
    context = "\n\n".join([
        f"Source: {s.get('title', 'Untitled')}\n{s.get('summary', '')}"
        for s in sources[:5]
    ])
    
    prompt = f"""Generate a 10-question multiple choice quiz based on these sources:

{context}

Format as JSON:
{{
  "questions": [
    {{
      "question": "Question text?",
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
      "correct_answer": "A",
      "explanation": "Why this is correct"
    }}
  ]
}}

Make questions test understanding, not just memorization."""
    
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
        return {"questions": [], "error": "Failed to parse quiz"}
