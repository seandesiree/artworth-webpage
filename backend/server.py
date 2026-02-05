from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
import os
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()

api_key = os.getenv("OPENAI_API_KEY")
print(f"API Key loaded: {api_key[:10]}..." if api_key else "API Key NOT found!")


if not api_key:
    raise ValueError("OPENAI_API_KEY not found in environment variables")

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "https://www.artworthai.com",
        "https://artworthai.com",
        "https://artwork-pricing-calculator.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"], 
)

class CVRequest(BaseModel):
    fullText: str

class AnalyzeRequest(BaseModel):
    prompt: str

class PricingRequest(BaseModel):
    artworkDetails: dict
    costs: dict
    timeInvestment: dict
    careerInfo: dict
    marketFactors: dict


@app.post("/extract-career")
async def extract_career(data: CVRequest):
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": """Extract career information from this CV and return ONLY valid JSON (no markdown, no code blocks) with:
                        {
                            "yearsExperience": number,
                            "exhibitions": number,
                            "exhibitionDetails": "string",
                            "awards": number,
                            "awardDetails": "string",
                            "fellowships": number,
                            "fellowshipDetails": "string",
                            "publications": number,
                            "publicationDetails": "string",
                            "residencies": number,
                            "residencyDetails": "string",
                            "representation": "none|emerging|midsize|bluechip|megagallery",
                            "education": "string",
                            "notableAchievements": ["string1", "string2", "string3"]
                        }""",
                },
                {"role": "user", "content": data.fullText[:4000]},
            ],
            temperature=0.3,
            max_tokens=800,
        )

        content = response.choices[0].message.content
        
        # Clean the response to ensure it's valid JSON
        if content:
            # Remove markdown code blocks if present
            content = content.replace("```json", "").replace("```", "").strip()
            
            # Validate it's proper JSON
            try:
                json.loads(content)  # This will throw if invalid
            except json.JSONDecodeError:
                # If parsing fails, return a default structure
                content = json.dumps({
                    "yearsExperience": 0,
                    "exhibitions": 0,
                    "exhibitionDetails": "",
                    "awards": 0,
                    "awardDetails": "",
                    "fellowships": 0,
                    "fellowshipDetails": "",
                    "publications": 0,
                    "publicationDetails": "",
                    "residencies": 0,
                    "residencyDetails": "",
                    "representation": "none",
                    "education": "",
                    "notableAchievements": []
                })
        
        return {"careerInfo": content}
    except Exception as e:
        print(f"Error in extract_career: {str(e)}")  # Server-side logging
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze")
async def analyze(data: AnalyzeRequest):
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "user", "content": data.prompt}
            ],
            temperature=0.7,
            max_tokens=500,
        )
        
        content = response.choices[0].message.content
        return {"result": content}
    except Exception as e:
        print(f"Error in analyze: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/calculate-pricing")
async def calculate_pricing(data: PricingRequest):
    try:
        # Extract data from request
        artwork = data.artworkDetails
        costs = data.costs
        time = data.timeInvestment
        career = data.careerInfo
        market = data.marketFactors
        
        # Calculate totals
        total_hours = time['conceptDevelopment'] + time['creation'] + time['finishing']
        total_costs = costs['materials'] + costs['framing'] + costs['studio'] + costs['other']
        
        # Handle depth dimension
        depth_str = f" × {artwork['depth']}\"" if artwork.get('depth') else ""
        
        # Build comprehensive prompt
        prompt = f"""As an art pricing consultant, analyze the following artwork details and provide pricing recommendations:
        
        ARTWORK: "{artwork['title']}"
        Medium: {artwork['medium']}
        Size: {artwork['width']}" × {artwork['height']}"{depth_str}
        Year: {artwork['yearCreated']}
        Materials: {artwork['materialsUsed']}
        Complexity: {artwork['complexity']}
        Emotional Value: {artwork['emotionalValue']}
        
        COSTS:
        Materials: ${costs['materials']}
        Framing: ${costs['framing']}
        Studio: ${costs['studio']}
        Other: ${costs['other']}
        Total Costs: ${total_costs}
        
        TIME INVESTMENT:
        Total Hours: {total_hours}
        (Concept: {time['conceptDevelopment']}h, Creation: {time['creation']}h, Finishing: {time['finishing']}h)
        
        ARTIST CAREER:
        Experience: {career['yearsExperience']} years
        Exhibitions: {career['exhibitions']} total
        Awards: {career['awards']} total
        Representation: {career['representation']}
        Education: {career['education']}
        
        MARKET FACTORS:
        Demand Level: {market['demandLevel']}
        Target Market: {market['targetMarket']}
        Economic Climate: {market['economicClimate']}
        Location: {market['location']}
        
        Provide pricing recommendations as valid JSON with:
        {{
            "baseCost": number,
            "marketPrice": number,
            "premiumPrice": number,
            "reasoning": {{
                "costBreakdown": "string explaining costs",
                "marketAnalysis": "string explaining market position",
                "valueProposition": "string explaining unique value"
            }},
            "recommendations": ["tip 1", "tip 2", "tip 3"]
        }}
        
        Return ONLY valid JSON without any markdown formatting or code blocks."""
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an expert art pricing consultant. Return only valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=800,
        )
        
        content = response.choices[0].message.content
        
        # Clean the response
        if content:
            content = content.replace("```json", "").replace("```", "").strip()
        
        # Try to parse to validate JSON
        try:
            parsed = json.loads(content)
            return {"pricingResult": parsed}  # Return as object, not string
        except json.JSONDecodeError:
            # If parsing fails, return the string for frontend to handle
            return {"pricingResult": content}
            
    except Exception as e:
        print(f"Error in calculate_pricing: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Health check endpoint
@app.get("/")
async def root():
    return {"message": "Art Pricing Calculator API is running"}