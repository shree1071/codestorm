"""
Text-to-Speech service for podcast generation
Uses OpenAI TTS API with two voices (alloy + echo)
"""
import os
from typing import Dict, Any, List
from openai import AsyncOpenAI
from services.llm import llm_service
import asyncio

class TTSService:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.output_dir = "audio_output"
        os.makedirs(self.output_dir, exist_ok=True)
    
    async def generate_podcast(
        self,
        notebook_title: str,
        sources: List[Dict[str, Any]],
        format: str = "deep_dive",
        length: str = "medium"
    ) -> Dict[str, Any]:
        """
        Generate podcast script and audio
        
        Args:
            notebook_title: Title of notebook
            sources: List of sources
            format: deep_dive, quick_brief, debate, interview
            length: short (3min), medium (10min), long (20min)
        
        Returns:
            Dict with script, audio_url, duration
        """
        # Generate script
        script = await self._generate_script(notebook_title, sources, format, length)
        
        # Parse script into segments (Host and Expert lines)
        segments = self._parse_script(script)
        
        # Generate audio for each segment
        audio_files = []
        for idx, segment in enumerate(segments):
            voice = "alloy" if segment["speaker"] == "Host" else "echo"
            audio_file = await self._generate_audio(
                text=segment["text"],
                voice=voice,
                filename=f"segment_{idx}.mp3"
            )
            audio_files.append(audio_file)
        
        # Combine audio files (simplified - in production use pydub)
        final_audio = audio_files[0]  # For now, just use first segment
        # TODO: Combine all segments into one file
        
        # Calculate duration (rough estimate: 150 words per minute)
        word_count = len(script.split())
        duration = int((word_count / 150) * 60)  # seconds
        
        return {
            "script": script,
            "audio_url": f"/api/notebooks/{notebook_title}/podcast/audio/{os.path.basename(final_audio)}",
            "duration": duration
        }
    
    async def _generate_script(
        self,
        notebook_title: str,
        sources: List[Dict[str, Any]],
        format: str,
        length: str
    ) -> str:
        """Generate podcast script using LLM"""
        # Build context from sources
        context = "\n\n".join([
            f"Source: {s.get('title', 'Untitled')}\n{s.get('summary', '')}"
            for s in sources[:5]  # Top 5 sources
        ])
        
        # Length guidelines
        length_guide = {
            "short": "3 minutes (approximately 450 words)",
            "medium": "10 minutes (approximately 1500 words)",
            "long": "20 minutes (approximately 3000 words)"
        }
        
        # Format-specific prompts
        format_prompts = {
            "deep_dive": """Create a deep-dive podcast script exploring the topic comprehensively.
Host introduces the topic, Expert provides detailed analysis with examples.""",
            
            "quick_brief": """Create a quick briefing podcast script hitting key highlights only.
Keep it concise and actionable.""",
            
            "debate": """Create a debate-style podcast where Host and Expert present different viewpoints.
Show multiple perspectives on the topic.""",
            
            "interview": """Create an interview-style podcast where Host asks questions and Expert answers.
Make it conversational and engaging."""
        }
        
        prompt = f"""Generate a two-speaker podcast script about: {notebook_title}

Format: {format}
Length: {length_guide.get(length, 'medium')}

{format_prompts.get(format, format_prompts['deep_dive'])}

SOURCES:
{context}

Script format:
Host: [opening line]
Expert: [response]
Host: [follow-up]
Expert: [detailed explanation]
...

Make it natural, conversational, and engaging. Use the sources to provide accurate information."""
        
        response = await llm_service.chat(
            messages=[{"role": "user", "content": prompt}],
            model="gpt-4",
            temperature=0.7,
            max_tokens=3000
        )
        
        return response["content"]
    
    def _parse_script(self, script: str) -> List[Dict[str, str]]:
        """Parse script into speaker segments"""
        segments = []
        lines = script.split('\n')
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            if line.startswith("Host:"):
                segments.append({
                    "speaker": "Host",
                    "text": line.replace("Host:", "").strip()
                })
            elif line.startswith("Expert:"):
                segments.append({
                    "speaker": "Expert",
                    "text": line.replace("Expert:", "").strip()
                })
        
        return segments
    
    async def _generate_audio(
        self,
        text: str,
        voice: str,
        filename: str
    ) -> str:
        """Generate audio file from text"""
        response = await self.client.audio.speech.create(
            model="tts-1",
            voice=voice,
            input=text
        )
        
        audio_path = os.path.join(self.output_dir, filename)
        
        # Save audio file
        with open(audio_path, 'wb') as f:
            async for chunk in response.iter_bytes():
                f.write(chunk)
        
        return audio_path

# Singleton instance
tts_service = TTSService()
