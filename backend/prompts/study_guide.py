"""Study guide generation prompts"""
from typing import List, Dict, Any
from services.llm import llm_service

async def generate_study_guide(sources: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Generate study guide from sources"""
    # Build context
    context = "\n\n".join([
        f"Source: {s.get('title', 'Untitled')}\n{s.get('summary', '')}"
        for s in sources[:5]
    ])
    
    prompt = f"""Create a comprehensive study guide based on these sources:

{context}

Format as JSON:
{{
  "title": "Study Guide Title",
  "sections": [
    {{
      "heading": "Section Title",
      "content": "Detailed explanation",
      "key_points": ["Point 1", "Point 2", "Point 3"]
    }}
  ],
  "summary": "Overall summary",
  "further_reading": ["Suggestion 1", "Suggestion 2"]
}}

Make it structured and easy to study from."""
    
    response = await llm_service.chat(
        messages=[{"role": "user", "content": prompt}],
        model="gpt-4",
        temperature=0.5,
        max_tokens=2500
    )
    
    import json
    try:
        return json.loads(response["content"])
    except:
        return {"sections": [], "error": "Failed to parse study guide"}
