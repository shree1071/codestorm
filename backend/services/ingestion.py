"""
Content ingestion service
Extracts content from URLs, PDFs, YouTube videos, and GitHub repositories
"""
import httpx
from bs4 import BeautifulSoup
from PyPDF2 import PdfReader
import io
from youtube_transcript_api import YouTubeTranscriptApi
import re
from typing import Dict, Any, List
from services.llm import llm_service
import base64

class IngestionService:
    async def extract_url(self, url: str) -> Dict[str, Any]:
        """Extract content from URL"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, follow_redirects=True)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Extract title
            title = soup.find('title')
            title = title.get_text().strip() if title else url
            
            # Remove script and style elements
            for script in soup(["script", "style"]):
                script.decompose()
            
            # Get text
            text = soup.get_text()
            lines = (line.strip() for line in text.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            text = ' '.join(chunk for chunk in chunks if chunk)
            
            # Generate summary
            summary = await self.summarize_text(text[:5000])  # First 5000 chars
            
            return {
                "title": title,
                "content": text,
                "summary": summary,
                "credibility_score": self._score_url_credibility(url)
            }
    
    async def extract_pdf(self, pdf_bytes: bytes, filename: str) -> Dict[str, Any]:
        """Extract text from PDF using PyPDF2"""
        try:
            pdf_file = io.BytesIO(pdf_bytes)
            pdf_reader = PdfReader(pdf_file)
            
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text()
            
            # Generate summary
            summary = await self.summarize_text(text[:5000])
            
            return {
                "title": filename.replace('.pdf', ''),
                "content": text,
                "summary": summary
            }
        except Exception as e:
            # Fallback if PDF parsing fails
            return {
                "title": filename.replace('.pdf', ''),
                "content": f"PDF uploaded: {filename}",
                "summary": f"PDF document: {filename}"
            }
    
    async def extract_youtube(self, url: str) -> Dict[str, Any]:
        """Extract transcript from YouTube video"""
        # Extract video ID
        video_id = self._extract_youtube_id(url)
        if not video_id:
            raise ValueError("Invalid YouTube URL")
        
        # Get transcript
        try:
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
            transcript = " ".join([entry['text'] for entry in transcript_list])
        except Exception as e:
            raise ValueError(f"Could not fetch transcript: {str(e)}")
        
        # Get video title (would need YouTube API for this, using placeholder)
        title = f"YouTube Video {video_id}"
        
        # Generate summary
        summary = await self.summarize_text(transcript[:5000])
        
        return {
            "title": title,
            "transcript": transcript,
            "summary": summary
        }
    
    async def summarize_text(self, text: str) -> str:
        """Generate summary of text using LLM"""
        if len(text) < 100:
            return text
        
        try:
            response = await llm_service.chat(
                messages=[
                    {
                        "role": "system",
                        "content": "Summarize the following text in 2-3 sentences. Focus on key points."
                    },
                    {
                        "role": "user",
                        "content": text[:4000]  # Limit to 4000 chars
                    }
                ],
                model="gpt-4",
                temperature=0.3,
                max_tokens=200
            )
            return response["content"]
        except Exception as e:
            # Fallback to simple truncation if LLM fails
            return text[:500] + "..."
    
    def _score_url_credibility(self, url: str) -> int:
        """Score URL credibility 1-10"""
        url_lower = url.lower()
        
        if any(domain in url_lower for domain in [
            "arxiv.org", "nature.com", "science.org", "ieee.org"
        ]):
            return 10
        elif any(domain in url_lower for domain in [
            ".gov", ".edu", "who.int", "worldbank.org"
        ]):
            return 9
        elif any(domain in url_lower for domain in [
            "nytimes.com", "wsj.com", "economist.com", "reuters.com"
        ]):
            return 8
        elif any(domain in url_lower for domain in [
            "forbes.com", "techcrunch.com", "wired.com"
        ]):
            return 6
        else:
            return 5
    
    def _extract_youtube_id(self, url: str) -> str:
        """Extract video ID from YouTube URL"""
        patterns = [
            r'(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)',
            r'youtube\.com\/embed\/([^&\n?#]+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        
        return None
    
    async def extract_github(self, url: str) -> Dict[str, Any]:
        """Extract content from GitHub repository or file"""
        # Parse GitHub URL
        github_info = self._parse_github_url(url)
        if not github_info:
            raise ValueError("Invalid GitHub URL")
        
        owner = github_info["owner"]
        repo = github_info["repo"]
        path = github_info.get("path", "")
        
        # Fetch content from GitHub API
        content_data = await self._fetch_github_content(owner, repo, path)
        
        # Generate summary
        summary = await self.summarize_text(content_data["content"][:5000])
        
        return {
            "title": content_data["title"],
            "content": content_data["content"],
            "summary": summary,
            "credibility_score": 8  # GitHub repos generally credible
        }
    
    def _parse_github_url(self, url: str) -> Dict[str, str]:
        """Parse GitHub URL to extract owner, repo, and path"""
        # Pattern: https://github.com/owner/repo or https://github.com/owner/repo/blob/branch/path
        pattern = r'github\.com/([^/]+)/([^/]+)(?:/(?:blob|tree)/[^/]+/(.+))?'
        match = re.search(pattern, url)
        
        if not match:
            return None
        
        result = {
            "owner": match.group(1),
            "repo": match.group(2)
        }
        
        if match.group(3):
            result["path"] = match.group(3)
        
        return result
    
    async def _fetch_github_content(self, owner: str, repo: str, path: str = "") -> Dict[str, Any]:
        """Fetch content from GitHub API"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            if path:
                # Fetch specific file
                api_url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"
                response = await client.get(api_url, headers={"Accept": "application/vnd.github.v3+json"})
                response.raise_for_status()
                
                data = response.json()
                
                if data.get("type") == "file":
                    # Decode base64 content
                    content = base64.b64decode(data["content"]).decode("utf-8")
                    return {
                        "title": f"{owner}/{repo}/{data['name']}",
                        "content": content
                    }
                else:
                    raise ValueError("Path is not a file")
            else:
                # Fetch README and repository info
                readme_url = f"https://api.github.com/repos/{owner}/{repo}/readme"
                repo_url = f"https://api.github.com/repos/{owner}/{repo}"
                
                # Get README
                readme_response = await client.get(readme_url, headers={"Accept": "application/vnd.github.v3+json"})
                readme_content = ""
                if readme_response.status_code == 200:
                    readme_data = readme_response.json()
                    readme_content = base64.b64decode(readme_data["content"]).decode("utf-8")
                
                # Get repo info
                repo_response = await client.get(repo_url, headers={"Accept": "application/vnd.github.v3+json"})
                repo_response.raise_for_status()
                repo_data = repo_response.json()
                
                # Combine repo description and README
                content = f"Repository: {repo_data['full_name']}\n"
                content += f"Description: {repo_data.get('description', 'No description')}\n"
                content += f"Stars: {repo_data.get('stargazers_count', 0)}\n"
                content += f"Language: {repo_data.get('language', 'Unknown')}\n\n"
                
                if readme_content:
                    content += "README:\n" + readme_content
                
                return {
                    "title": f"{owner}/{repo}",
                    "content": content
                }

# Singleton instance
ingestion_service = IngestionService()
