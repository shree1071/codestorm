"""
Deep Research Agent using LangChain + Tavily
Autonomously searches web and returns curated sources
"""
import os
from typing import List, Dict, Any, AsyncGenerator
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langgraph.prebuilt import create_react_agent
import json

class ResearchAgent:
    def __init__(self):
        self.tavily_api_key = os.getenv("TAVILY_API_KEY")
        openrouter_key = os.getenv("OPENROUTER_API_KEY")
        openai_key = openrouter_key or os.getenv("OPENAI_API_KEY")
        
        # Initialize Tavily search tool
        self.search_tool = TavilySearchResults(
            max_results=8,
            search_depth="advanced",
            include_answer=True,
            include_raw_content=True
        )
        
        # Initialize LLM (use OpenRouter if available)
        if openrouter_key:
            self.llm = ChatOpenAI(
                model="openai/gpt-4-turbo",
                temperature=0.3,
                streaming=True,
                openai_api_key=openrouter_key,
                openai_api_base="https://openrouter.ai/api/v1"
            )
        else:
            self.llm = ChatOpenAI(
                model="gpt-4-turbo-preview",
                temperature=0.3,
                streaming=True,
                openai_api_key=openai_key
            )
        
        # Create agent prompt
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a research assistant that finds high-quality sources on any topic.

Your task:
1. Search for credible sources on the given topic
2. Evaluate source quality and credibility (1-10 score)
3. Extract key information from each source
4. Return 5-8 of the best sources

Credibility scoring criteria:
- 9-10: Academic papers, official reports, peer-reviewed journals
- 7-8: Reputable news outlets, established organizations
- 5-6: Blog posts from experts, industry publications
- 3-4: General blogs, opinion pieces
- 1-2: Questionable sources, unverified claims

For each source, provide:
- title: Clear, descriptive title
- url: Source URL
- summary: 2-3 sentence summary of key points
- credibility_score: 1-10 rating
- key_insights: List of 3-5 main takeaways"""),
            ("user", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])
        
        # Create agent using LangGraph
        self.agent_executor = create_react_agent(
            model=self.llm,
            tools=[self.search_tool]
        )
    
    async def research(
        self,
        topic: str,
        depth: str = "deep"
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Research a topic and yield progress updates
        
        Args:
            topic: Research topic
            depth: "quick" (30s), "deep" (2min), or "expert" (5min)
        
        Yields:
            Progress updates with type: "step", "source", or "complete"
        """
        # Adjust search parameters based on depth
        max_results = {
            "quick": 5,
            "deep": 8,
            "expert": 12
        }.get(depth, 8)
        
        # Step 1: Searching
        yield {
            "type": "step",
            "message": "🔍 Searching for sources...",
            "progress": 10
        }
        
        # Execute search
        search_results = self.search_tool.invoke({"query": topic})
        
        yield {
            "type": "step",
            "message": f"📄 Analyzing {len(search_results)} results...",
            "progress": 40
        }
        
        # Step 2: Analyze and score sources
        sources = []
        for idx, result in enumerate(search_results[:max_results]):
            # Score credibility based on domain and content
            credibility_score = self._score_credibility(result)
            
            source = {
                "title": result.get("title", "Untitled"),
                "url": result.get("url", ""),
                "summary": result.get("content", "")[:500],  # First 500 chars
                "fulltext": result.get("raw_content", result.get("content", "")),
                "credibility_score": credibility_score,
                "key_insights": self._extract_insights(result.get("content", ""))
            }
            
            sources.append(source)
            
            yield {
                "type": "source",
                "source": source,
                "progress": 40 + (idx + 1) * (40 / max_results)
            }
        
        # Step 3: Rank and filter
        yield {
            "type": "step",
            "message": "✅ Ranking sources by quality...",
            "progress": 90
        }
        
        # Sort by credibility score
        sources.sort(key=lambda x: x["credibility_score"], reverse=True)
        
        # Return top sources
        final_sources = sources[:8]
        
        yield {
            "type": "complete",
            "message": f"🧠 Research complete! Found {len(final_sources)} high-quality sources",
            "sources": final_sources,
            "progress": 100
        }
    
    def _score_credibility(self, result: Dict[str, Any]) -> int:
        """Score source credibility 1-10"""
        url = result.get("url", "").lower()
        content = result.get("content", "").lower()
        
        score = 5  # Base score
        
        # High credibility domains
        if any(domain in url for domain in [
            "arxiv.org", "nature.com", "science.org", "ieee.org",
            "acm.org", "springer.com", "sciencedirect.com"
        ]):
            score = 10
        elif any(domain in url for domain in [
            "gov", "edu", "who.int", "worldbank.org", "oecd.org"
        ]):
            score = 9
        elif any(domain in url for domain in [
            "nytimes.com", "wsj.com", "economist.com", "reuters.com",
            "bbc.com", "theguardian.com"
        ]):
            score = 8
        elif any(domain in url for domain in [
            "forbes.com", "techcrunch.com", "wired.com", "medium.com"
        ]):
            score = 6
        
        # Adjust based on content indicators
        if any(term in content for term in ["study", "research", "data", "analysis"]):
            score = min(10, score + 1)
        
        if any(term in content for term in ["opinion", "i think", "in my view"]):
            score = max(1, score - 1)
        
        return score
    
    def _extract_insights(self, content: str) -> List[str]:
        """Extract key insights from content"""
        # Simple extraction - split into sentences and take first 3-5
        sentences = [s.strip() for s in content.split(".") if len(s.strip()) > 20]
        return sentences[:5]

# Singleton instance
research_agent = ResearchAgent()
