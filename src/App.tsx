"use client"

declare global {
  interface PromiseConstructor {
    withResolvers<T>(): {
      promise: Promise<T>
      resolve: (value: T | PromiseLike<T>) => void
      reject: (reason?: any) => void
    }
  }
}

// Polyfill for Promise.withResolvers
if (typeof Promise.withResolvers === "undefined") {
  ;(Promise as any).withResolvers = <T,>() => {
    let resolve: (value: T | PromiseLike<T>) => void
    let reject: (reason?: any) => void
    const promise = new Promise<T>((res, rej) => {
      resolve = res
      reject = rej
    })
    return { promise, resolve: resolve!, reject: reject! }
  }
}

import { useState } from "react"
import "./App.css"
import jsPDF from "jspdf"
import { Upload, Download, AlertCircle, ChevronDown } from "lucide-react"
import * as pdfjsLib from "pdfjs-dist"
import { Link } from "react-router-dom"
import { motion } from "framer-motion"




// v5.x worker setup
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString()
}

interface ArtworkDetails {
  title: string
  medium: string
  width: number
  height: number
  depth: number
  yearCreated: number
  materialsUsed: string
  complexity: "low" | "medium" | "high"
  emotionalValue: "low" | "medium" | "high"
}

interface Costs {
  materials: number
  framing: number
  studio: number
  other: number
}

interface TimeInvestment {
  conceptDevelopment: number
  creation: number
  finishing: number
}

interface CareerInfo {
  fellowshipDetails: any
  fellowships: any
  yearsExperience: number
  exhibitions: number
  exhibitionDetails: string
  awards: number
  awardDetails: string
  publications: number
  publicationDetails: string
  residencies: number 
  residencyDetails: string 
  representation: "none" | "emerging" | "midsize" | "bluechip" | "megagallery"
  education: string
  portfolio: string
  notableAchievements: string[]
}

interface MarketFactors {
  demandLevel: "low" | "medium" | "high"
  targetMarket: "students" | "emerging-collectors" | "collectors" | "institutions"
  economicClimate: "recession" | "slow" | "stable" | "growing"
  trendingStyles: string
  location: string
}

interface PricingResult {
  baseCost: number
  marketPrice: number
  premiumPrice: number
  reasoning: {
    costBreakdown: string
    marketAnalysis: string
    valueProposition: string
  }
  recommendations: string[]
}

const AccordionItem = ({ title, content, color }: { title: string; content: string; color: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex justify-between items-center ${color} font-bold outline rounded-full p-4 text-4xl hover:opacity-90 transition-all`}
      >
        {title}
        <ChevronDown className={`w-6 h-6 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div
        className={`overflow-hidden transition-all duration-500 ${
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <p className="text-gray-300 text-2xl p-6 bg-gray-800 rounded-lg mt-2">
          {content}
        </p>
      </div>
    </div>
  );
};

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';



function App() {
  // State variables
  const [artworkDetails, setArtworkDetails] = useState<ArtworkDetails>({
    title: "",
    medium: "",
    width: 0,
    height: 0,
    depth: 0,
    yearCreated: new Date().getFullYear(),
    materialsUsed: "",
    complexity: "medium",
    emotionalValue: "medium",
  })

  const [costs, setCosts] = useState<Costs>({
    materials: 0,
    framing: 0,
    studio: 0,
    other: 0,
  })

  const [timeInvestment, setTimeInvestment] = useState<TimeInvestment>({
    conceptDevelopment: 0,
    creation: 0,
    finishing: 0,
  })

  const [careerInfo, setCareerInfo] = useState<CareerInfo>({
    yearsExperience: 0,
    exhibitions: 0,
    exhibitionDetails: "",
    awards: 0,
    awardDetails: "",
    publications: 0,
    publicationDetails: "",
    residencies: 0,
    residencyDetails: "",
    fellowships: 0,
    fellowshipDetails: "",
    representation: "none",
    education: "",
    portfolio: "",
    notableAchievements: [],
  })

  const [marketFactors, setMarketFactors] = useState<MarketFactors>({
    demandLevel: "medium",
    targetMarket: "collectors",
    economicClimate: "stable",
    trendingStyles: "",
    location: "",
  })

  const countFields = (obj: any): number => Object.keys(obj).length

  const countCompletedFields = (obj: any): number =>
    Object.values(obj).filter((value) => {
      if (typeof value === "string") return value.trim() !== ""
      if (typeof value === "number") return value > 0
      if (Array.isArray(value)) return value.length > 0
      return value !== null && value !== undefined
    }).length

  const totalFields =
    countFields(artworkDetails) +
    countFields(costs) +
    countFields(timeInvestment) +
    countFields(careerInfo) +
    countFields(marketFactors)

  const completedFields =
    countCompletedFields(artworkDetails) +
    countCompletedFields(costs) +
    countCompletedFields(timeInvestment) +
    countCompletedFields(careerInfo) +
    countCompletedFields(marketFactors)

  const progress = (completedFields / totalFields) * 100

  const [pricingResult, setPricingResult] = useState<PricingResult | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [cvProcessing, setCVProcessing] = useState(false)
  const [cvError, setCVError] = useState("")
  const [aiResult, setAiResult] = useState("");

  async function getAnalysis(prompt: string) {
    try {
      const res = await fetch(`${BACKEND_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        throw new Error("Failed to fetch analysis");
      }

      const data = await res.json();
      return data.result;
    } catch (error) {
      console.error("Error fetching analysis:", error);
      return "Sorry, something went wrong with the AI analysis.";
    }
  }

  const handleSubmit = async () => {
    try {
      setIsCalculating(true);
      
      // First calculate the pricing
      await calculatePricing();
      
      // Then get the analysis explanation
      const prompt = "Explain how my artwork pricing is calculated...";
      const analysis = await getAnalysis(prompt);
      console.log("AI Analysis:", analysis);
      setAiResult(analysis);
      
    } catch (err) {
      console.error("Error in handleSubmit:", err);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleCVUpload = async (file: File) => {
    try {
      setCVProcessing(true);
      setCVError("");
  
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
      let fullText = "";
  
      // Extract text from all pages
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(" ");
        fullText += pageText + "\n";
      }
  
      if (!fullText.trim()) {
        throw new Error("No text found in PDF");
      }
  
      // Call your backend endpoint
      const response = await fetch(`${BACKEND_URL}/extract-career`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullText }),
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${errorText}`);
      }
  
      const data = await response.json();
      console.log("Backend response:", data); // Debug log
  
      // Parse the careerInfo with better error handling
      let extractedData;
      try {
        // Handle if careerInfo is already an object or needs parsing
        if (typeof data.careerInfo === 'string') {
          extractedData = JSON.parse(data.careerInfo);
        } else {
          extractedData = data.careerInfo;
        }
      } catch (parseError) {
        console.error("Failed to parse career info:", data.careerInfo);
        throw new Error("Invalid response format from AI");
      }
  
      // Update form with extracted data
      setCareerInfo((prev) => ({
        ...prev,
        yearsExperience: extractedData.yearsExperience || prev.yearsExperience,
        exhibitions: extractedData.exhibitions || prev.exhibitions,
        exhibitionDetails: extractedData.exhibitionDetails || prev.exhibitionDetails,
        awards: extractedData.awards || prev.awards,
        awardDetails: extractedData.awardDetails || prev.awardDetails,
        publications: extractedData.publications || prev.publications,
        publicationDetails: extractedData.publicationDetails || prev.publicationDetails,
        residencies: extractedData.residencies || prev.residencies,
        residencyDetails: extractedData.residencyDetails || prev.residencyDetails,
        fellowships: extractedData.fellowships || prev.fellowships,
        fellowshipDetails: extractedData.fellowshipDetails || prev.fellowshipDetails,
        representation: extractedData.representation || prev.representation,
        education: extractedData.education || prev.education,
        notableAchievements: extractedData.notableAchievements || prev.notableAchievements,
      }));
  
      setCVProcessing(false);
    } catch (error) {
      console.error("CV processing failed:", error);
      setCVError(error instanceof Error ? error.message : "Failed to process CV");
      setCVProcessing(false);
    }
  };


      const totalHours = timeInvestment.conceptDevelopment + timeInvestment.creation + timeInvestment.finishing

      const totalCosts = costs.materials + costs.framing + costs.studio + costs.other

// Add the function declaration
const calculatePricing = async () => {
  try {
    setIsCalculating(true);
    
    const prompt = `As an art pricing consultant, analyze the following artwork details and provide pricing recommendations:
  
    ARTWORK: "${artworkDetails.title}"
    Medium: ${artworkDetails.medium}
    Size: ${artworkDetails.width}" × ${artworkDetails.height}" ${
      artworkDetails.depth ? `× ${artworkDetails.depth}"` : ""
    }
    Year: ${artworkDetails.yearCreated}
    Materials: ${artworkDetails.materialsUsed}
    Complexity: ${artworkDetails.complexity}
    Emotional Value: ${artworkDetails.emotionalValue}

    COSTS:
    Materials: $${costs.materials}
    Framing: $${costs.framing}
    Studio: $${costs.studio}
    Other: $${costs.other}
    Total Costs: $${totalCosts}

    TIME INVESTMENT:
    Total Hours: ${totalHours}
    (Concept: ${timeInvestment.conceptDevelopment}h, Creation: ${
      timeInvestment.creation
    }h, Finishing: ${timeInvestment.finishing}h)

    ARTIST CAREER:
    Experience: ${careerInfo.yearsExperience} years
    
    Exhibitions: ${careerInfo.exhibitions} total
    ${careerInfo.exhibitionDetails ? `Venues: ${careerInfo.exhibitionDetails}` : ""}
    
    Awards: ${careerInfo.awards} total
    ${careerInfo.awardDetails ? `Including: ${careerInfo.awardDetails}` : ""}
    
    Residencies: ${careerInfo.residencies} total
    ${careerInfo.residencyDetails ? `Including: ${careerInfo.residencyDetails}` : ""}
    
    Fellowships: ${careerInfo.fellowships} total
    ${careerInfo.fellowshipDetails ? `Including: ${careerInfo.fellowshipDetails}` : ""}

    Publications: ${careerInfo.publications} total
    ${careerInfo.publicationDetails ? `Featured in: ${careerInfo.publicationDetails}` : ""}
    
    Representation: ${careerInfo.representation}
    Education: ${careerInfo.education}

    MARKET FACTORS:
    Demand Level: ${marketFactors.demandLevel}
    Target Market: ${marketFactors.targetMarket}
    Economic Climate: ${marketFactors.economicClimate}
    Location: ${marketFactors.location}

    When calculating pricing, give significant weight to:
    - Prestigious exhibition venues (major museums = 2-3x multiplier vs. emerging galleries)
    - Significant awards (international awards = 2x multiplier vs. regional)
    - Elite residencies (MacDowell, Yaddo = 1.5x multiplier vs. local)
    - Major publications (Artforum, Art in America = 1.5x multiplier vs. blogs)
    - Quality over quantity for all achievements

    Provide pricing recommendations in JSON format with:
    - baseCost (number - covering costs + fair hourly rate)
    - marketPrice (number - competitive market positioning)
    - premiumPrice (number - collector/gallery pricing)
    - reasoning object with:
      - costBreakdown (string - explain the cost calculation in plain text)
      - marketAnalysis (string - explain market positioning in plain text)
      - valueProposition (string - explain the unique value in plain text)
    - recommendations (array of strings - 3-5 strategic pricing tips)

    Ensure all reasoning fields are plain text strings, not objects.`

    const response = await fetch(`${BACKEND_URL}/calculate-pricing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        prompt,
        artworkDetails,
        costs,
        timeInvestment,
        careerInfo,
        marketFactors
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to calculate pricing");
    }

    const data = await response.json();

    try {
      let content = data.pricingResult || "{}";
      
      // If your backend returns a string that needs parsing
      if (typeof content === 'string') {
        // 🧹 Clean up possible formatting issues
        content = content
          .replace(/```json\s*/g, "")
          .replace(/```\s*/g, "")
          .replace(/,\s*([}\]])/g, "$1")
          .trim();
        
        const parsedResult = JSON.parse(content);
        setPricingResult(parsedResult);
      } else {
        // If backend already returns parsed JSON
        setPricingResult(content);
      }
    } catch (parseError) {
      // If parsing fails, show raw text
      console.warn("Falling back to raw AI output:", data.pricingResult);
      setAiResult(data.pricingResult);
    }
    
  } catch (error) {
    console.error("Pricing calculation failed:", error);
    alert("Failed to calculate pricing. Please check your connection and try again.");
  } finally {
    setIsCalculating(false);
  }
};

const exportToPDF = () => {
  if (!pricingResult) return;

  const doc = new jsPDF();
  doc.setFontSize(20);
  doc.text("Artwork Pricing Report", 20, 20);

  doc.setFontSize(12);
  doc.text(`Artwork: ${artworkDetails.title}`, 20, 40);
  doc.text(`Medium: ${artworkDetails.medium}`, 20, 50);
  doc.text(`Size: ${artworkDetails.width}" × ${artworkDetails.height}"`, 20, 60);

  doc.setFontSize(16);
  doc.text("Pricing Recommendations", 20, 80);

  doc.setFontSize(12);
  doc.text(`Base Price: $${pricingResult.baseCost}`, 20, 90);
  doc.text(`Market Price: $${pricingResult.marketPrice}`, 20, 100);
  doc.text(`Premium Price: $${pricingResult.premiumPrice}`, 20, 110);

  doc.save(`${artworkDetails.title}_pricing_report.pdf`);
};     
      

  return (
    <div className="min-h-screen bg-cover bg-center">
      <div className="max-w-7xl mx-auto px-4 py-8 bg-gray-800 opacity-90">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="bg-gradient-to-r from-pink-400 to-orange-400 hover:bg-pink-600 p-1 rounded-lg">
            <div className="bg-gray-200 outline rounded p-1">
              <h1 className="text-6xl font mb-1 hover:bg-pink-100 rounded-full text-pink-400">
                ARTWorth: Smart Pricing Calculator
              </h1>
            </div>
          </div>
          <br></br>
          <div className="bg-gradient-to-r from-yellow-400 to-red-400 p-1 rounded-lg">
          <div className="bg-gray-200 outline hover:bg-orange-200 rounded p-1">
          <p className="text-gray-600  rounded-full font text-3xl">
            The first artwork pricing calculator that uses AI, career factors, and market analysis
          </p>
          <p className="text-gray-600 rounded-full font text-3xl">
            Price your art with confidence. ArtWorth helps artists factor in time, materials, career stage, and more to
            create fair and professional pricing for their work.
          </p>
          <h3 className="text-3xl rounded-full font mb-2 text-gray-600">
            Built by an Artist, for Artists - export report as PDF
          </h3>
        </div>
        </div>
        </div>
        <div className="sr-only">
          how to price artwork, art pricing calculator, artwork valuation tool, AI art pricing, price my art online,
          artist pricing guide, artwork pricing formula, art market pricing, professional art pricing, contemporary art
          valuation, sculpture pricing calculator, painting price estimator, art business pricing strategy
        </div>

        {/* Extra Content */}
        <section style={{ padding: "2rem", maxWidth: "1300px", margin: "0 auto" }}>
          <AccordionItem
            title="How to Price Your Artwork"
            color="text-orange-400"
            content="Pricing your artwork is one of the biggest challenges artists face. Unlike products with fixed production
        costs, every artwork is a unique blend of skill, time, and inspiration. A fair price should account for your
        materials, labor, and experience, while also reflecting the value the work brings to a collector’s life.
        Many artists make the mistake of charging only for their time and supplies, forgetting to include hidden
        expenses like studio rent, utilities, professional tools, and even marketing costs. For example, if a 24×36”
        acrylic painting took 20 hours, used $75 in materials, and draws on years of expertise, your price might
        fairly land in the $1,000–$1,500 range once all factors are included. This approach ensures that you’re not
        just covering costs — you’re valuing your creative contribution."
          />

          <AccordionItem
            title="Why Pricing Matters for Artists"
            color="text-yellow-400"
            content="The right price is more than just a number — it’s a signal of professionalism and self-respect. Collectors
        often interpret price as a measure of quality and rarity, and underpricing can unintentionally lower
        perceived value. Consistent, fair pricing builds trust, encourages repeat acquisitions, and helps you
        maintain strong relationships with galleries, agents, and online marketplaces. It also allows you to grow
        your career sustainably, ensuring that every sale supports your artistic practice instead of depleting it. A
        well-thought-out pricing strategy can help position you as a serious professional, whether you’re selling
        directly to collectors, at art fairs, or in established galleries."
          />

          <AccordionItem
            title="How ArtWorth Works"
            color="text-red-400"
            content="ArtWorth was built to take the guesswork out of pricing. Simply input details like the hours you’ve spent,
        your material costs, your level of experience, and the medium you’re working in. Our intelligent formula
        then calculates a suggested price that reflects both your costs and current market trends. You can also
        customize your calculation by adding factors like gallery commission, edition size, or special handling
        requirements. For example, if you’re producing a limited edition print series, you can adjust your pricing
        to reflect its exclusivity. This flexibility means you’ll always have a price that’s fair, competitive, and
        aligned with your artistic vision. By making informed pricing decisions, you can focus more on creating —
        and less on worrying if you’re selling yourself short."
          />
        </section>

        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-lg z-50">
  <p className="text-sm mb-1">Progress: {Math.round(progress)}%</p>
  <div className="w-40 h-2 bg-gray-700 rounded-full">
    <motion.div
      initial={{ width: "0%" }}
      animate={{ width: `${progress}%` }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      className="h-2 bg-gradient-to-r from-pink-500 to-orange-500 rounded-full"
    />
  </div>
</div>

        {/* Main Form */}
        <div className="bg-gray rounded-lg shadow-lg p-8 mb-8">
          {/* Artwork Details Section */}
          <div className="mb-8">
            <h2 className="text-4xl font-light mb-6 outline rounded-full p-2 text-pink-400">Artwork Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-med text-pink-400 font-bold mb-2">Title *</label>
                <input
                  type="text"
                  value={artworkDetails.title}
                  onChange={(e) =>
                    setArtworkDetails({
                      ...artworkDetails,
                      title: e.target.value,
                    })
                  }
                  className="w-full p-3 border border-pink-600 rounded-md focus:ring-2 focus:ring-red-500"
                  placeholder="Artwork Title"
                />
              </div>

              <div>
                <label className="block text-med text-pink-400 font-bold mb-2">Medium *</label>
                <input
                  type="text"
                  value={artworkDetails.medium}
                  onChange={(e) =>
                    setArtworkDetails({
                      ...artworkDetails,
                      medium: e.target.value,
                    })
                  }
                  className="w-full p-3 border border-pink-600 rounded-md focus:ring-2 focus:ring-indigo-500"
                  placeholder="Sculpture, Painting, etc."
                />
              </div>
              <div>
                <label className="block text-pink-400 text-med font-bold mb-2">Year Created</label>
                <input
                  type="number"
                  value={artworkDetails.yearCreated}
                  onChange={(e) =>
                    setArtworkDetails({
                      ...artworkDetails,
                      yearCreated: Number(e.target.value),
                    })
                  }
                  className="w-full p-3 border border-pink-600 rounded-md focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-med text-pink-400 font-bold mb-2">Width (inches)</label>
                <input
                  type="number"
                  value={artworkDetails.width}
                  onChange={(e) =>
                    setArtworkDetails({
                      ...artworkDetails,
                      width: Number(e.target.value),
                    })
                  }
                  className="w-full p-3 border border-pink-600 rounded-md focus:ring-2 focus:ring-indigo-500"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-med text-pink-400 font-bold mb-2">Height (inches)</label>
                <input
                  type="number"
                  value={artworkDetails.height}
                  onChange={(e) =>
                    setArtworkDetails({
                      ...artworkDetails,
                      height: Number(e.target.value),
                    })
                  }
                  className="w-full p-3 border border-pink-600 rounded-md focus:ring-2 focus:ring-indigo-500"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-med text-pink-400 font-bold mb-2">Depth (inches)</label>
                <input
                  type="number"
                  value={artworkDetails.depth}
                  onChange={(e) =>
                    setArtworkDetails({
                      ...artworkDetails,
                      depth: Number(e.target.value),
                    })
                  }
                  className="w-full p-3 border border-pink-600 rounded-md focus:ring-2 focus:ring-indigo-500"
                  min="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-med text-pink-400 font-bold mb-2">Complexity</label>
                <select
                  value={artworkDetails.complexity}
                  onChange={(e) =>
                    setArtworkDetails({
                      ...artworkDetails,
                      complexity: e.target.value as "low" | "medium" | "high",
                    })
                  }
                  className="w-full p-3 border border-pink-600 rounded-md focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-med text-pink-400 font-bold mb-2">Emotional Value</label>
                <select
                  value={artworkDetails.emotionalValue}
                  onChange={(e) =>
                    setArtworkDetails({
                      ...artworkDetails,
                      emotionalValue: e.target.value as "low" | "medium" | "high",
                    })
                  }
                  className="w-full p-3 border border-pink-600 rounded-md focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-med text-pink-400 font-bold mb-2">Materials Used</label>
              <textarea
                value={artworkDetails.materialsUsed}
                onChange={(e) =>
                  setArtworkDetails({
                    ...artworkDetails,
                    materialsUsed: e.target.value,
                  })
                }
                className="w-full p-3 border border-pink-600 rounded-md focus:ring-2 focus:ring-indigo-500"
                rows={2}
                placeholder="List all materials used..."
              />
            </div>
          </div>

          {/* Costs Section */}
          <div className="mb-8">
            <h2 className="text-4xl font-light mb-6 outline p-2 rounded-full text-orange-400">Costs</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-orange-400 text-med font-bold mb-2">Materials ($)</label>
                <input
                  type="number"
                  value={costs.materials}
                  onChange={(e) =>
                    setCosts({
                      ...costs,
                      materials: Number(e.target.value),
                    })
                  }
                  className="w-full p-3 border border-orange-600 rounded-md focus:ring-2 focus:ring-indigo-500"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-orange-400 text-med font-bold mb-2">Framing ($)</label>
                <input
                  type="number"
                  value={costs.framing}
                  onChange={(e) =>
                    setCosts({
                      ...costs,
                      framing: Number(e.target.value),
                    })
                  }
                  className="w-full p-3 border border-orange-600 rounded-md focus:ring-2 focus:ring-indigo-500"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-med text-orange-400 font-bold mb-2">
                  Studio Overhead (per artwork) ($)
                  {/* <span className="text-xs text-gray-500 block font-normal">
                                    Your share of monthly studio costs for this piece
                                    </span> */}
                </label>
                <input
                  type="number"
                  value={costs.studio}
                  onChange={(e) => setCosts({ ...costs, studio: Number(e.target.value) })}
                  className="w-full p-3 border border-orange-600 rounded-md focus:ring-2 focus:ring-indigo-500"
                  min="0"
                  placeholder="50"
                />
                <p className="text-xs text-gray-300 mt-1">
                  Example: If studio rent is $1000/month and you make 20 pieces/month, enter $50
                </p>
              </div>
              <div>
                <label className="block text-med text-orange-400 font-bold mb-2">Other Costs ($)</label>
                <input
                  type="number"
                  value={costs.other}
                  onChange={(e) =>
                    setCosts({
                      ...costs,
                      other: Number(e.target.value),
                    })
                  }
                  className="w-full p-3 border border-orange-600 rounded-md focus:ring-2 focus:ring-indigo-500"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Time Investment Section */}
          <div className="mb-8">
            <h2 className="text-4xl font-light mb-6 outline rounded-full p-2 text-yellow-400">Hours</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-med text-yellow-400 font-bold mb-2">Concept Development</label>
                <input
                  type="number"
                  value={timeInvestment.conceptDevelopment}
                  onChange={(e) =>
                    setTimeInvestment({
                      ...timeInvestment,
                      conceptDevelopment: Number(e.target.value),
                    })
                  }
                  className="w-full p-3 border border-yellow-400 rounded-md focus:ring-2 focus:ring-indigo-500"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-med text-yellow-400 font-bold mb-2">Creation</label>
                <input
                  type="number"
                  value={timeInvestment.creation}
                  onChange={(e) =>
                    setTimeInvestment({
                      ...timeInvestment,
                      creation: Number(e.target.value),
                    })
                  }
                  className="w-full p-3 border border-yellow-400 rounded-md focus:ring-2 focus:ring-indigo-500"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-med text-yellow-400 font-bold mb-2">Finishing</label>
                <input
                  type="number"
                  value={timeInvestment.finishing}
                  onChange={(e) =>
                    setTimeInvestment({
                      ...timeInvestment,
                      finishing: Number(e.target.value),
                    })
                  }
                  className="w-full p-3 border border-yellow-400 rounded-md focus:ring-2 focus:ring-indigo-500"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Career Information Section */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-light mb-6 outline p-2 rounded-full text-red-400">Career Information</h2>
              <h2 className="text-2xl font-light mb-6 outline p-2 rounded-full text-red-400">Enter manually or attach CV</h2>
              <div className="border-2 border-line border-gray-300 rounded-lg p-4">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => e.target.files?.[0] && handleCVUpload(e.target.files[0])}
                  className="hidden"
                  id="cv-upload"
                  disabled={cvProcessing}
                />
                <label
                  htmlFor="cv-upload"
                  className={`cursor-pointer flex items-center ${cvProcessing ? "opacity-50" : ""}`}
                >
                  <Upload className="w-5 h-5 mr-2 text-red-400" />
                  <span className="text-sm text-red-400">{cvProcessing ? "Processing..." : "Upload CV (PDF)"}</span>
                </label>
                {cvError && <p className="text-red-500 text-xs mt-2">{cvError}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-med text-red-400 font-bold mb-2">Years of Experience</label>
                <input
                  type="number"
                  value={careerInfo.yearsExperience}
                  onChange={(e) =>
                    setCareerInfo({
                      ...careerInfo,
                      yearsExperience: Number(e.target.value),
                    })
                  }
                  className="w-full p-3 border border-red-400 rounded-md focus:ring-2 focus:ring-indigo-500"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-med text-red-400 font-bold mb-2">Number of Exhibitions</label>
                <input
                  type="number"
                  value={careerInfo.exhibitions}
                  onChange={(e) =>
                    setCareerInfo({
                      ...careerInfo,
                      exhibitions: Number(e.target.value),
                    })
                  }
                  className="w-full p-3 border border-red-400 rounded-md focus:ring-2 focus:ring-indigo-500"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-med text-red-400 font-bold mb-2">Awards Won</label>
                <input
                  type="number"
                  value={careerInfo.awards}
                  onChange={(e) =>
                    setCareerInfo({
                      ...careerInfo,
                      awards: Number(e.target.value),
                    })
                  }
                  className="w-full p-3 border border-red-400 rounded-md focus:ring-2 focus:ring-indigo-500"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-med text-red-400 font-bold mb-2">Residencies</label>
                <input
                  type="number"
                  value={careerInfo.residencies}
                  onChange={(e) =>
                    setCareerInfo({
                      ...careerInfo,
                      residencies: Number(e.target.value),
                    })
                  }
                  className="w-full p-3 border border-red-400 rounded-md focus:ring-2 focus:ring-indigo-500"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-med text-red-400 font-bold mb-2">Fellowships</label>
                <input
                  type="number"
                  value={careerInfo.fellowships}
                  onChange={(e) =>
                    setCareerInfo({
                      ...careerInfo,
                      fellowships: Number(e.target.value),
                    })
                  }
                  className="w-full p-3 border border-red-400 rounded-md focus:ring-2 focus:ring-indigo-500"
                  min="0"
                />
              </div>
            </div>

            {/* Detailed information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-med text-red-400 font-bold mb-2">Exhibition Details</label>
                <textarea
                  value={careerInfo.exhibitionDetails}
                  onChange={(e) =>
                    setCareerInfo({
                      ...careerInfo,
                      exhibitionDetails: e.target.value,
                    })
                  }
                  className="w-full p-3 border border-red-400 rounded-md focus:ring-2 focus:ring-indigo-500"
                  placeholder="MoMA PS1, Guggenheim, Venice Biennale..."
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-med text-red-400 font-bold mb-2">Award Details</label>
                <textarea
                  value={careerInfo.awardDetails}
                  onChange={(e) =>
                    setCareerInfo({
                      ...careerInfo,
                      awardDetails: e.target.value,
                    })
                  }
                  className="w-full p-3 border border-red-400 rounded-md focus:ring-2 focus:ring-indigo-500"
                  placeholder="Guggenheim Fellowship, NEA Grant, Turner Prize..."
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-med text-red-400 font-bold mb-2">Fellowship Details</label>
                <textarea
                  value={careerInfo.fellowshipDetails}
                  onChange={(e) =>
                    setCareerInfo({
                      ...careerInfo,
                      fellowshipDetails: e.target.value,
                    })
                  }
                  className="w-full p-3 border border-red-400 rounded-md focus:ring-2 focus:ring-indigo-500"
                  placeholder="Guggenheim Fellowship, More Art, Leslie Lohman..."
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-med text-red-400 font-bold mb-2">Residency Details</label>
                <textarea
                  value={careerInfo.residencyDetails}
                  onChange={(e) =>
                    setCareerInfo({
                      ...careerInfo,
                      residencyDetails: e.target.value,
                    })
                  }
                  className="w-full p-3 border border-red-400 rounded-md focus:ring-2 focus:ring-indigo-500"
                  placeholder="MacDowell, Yaddo, Skowhegan..."
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-med text-red-400 font-bold mb-2">Publication Details</label>
                <textarea
                  value={careerInfo.publicationDetails}
                  onChange={(e) =>
                    setCareerInfo({
                      ...careerInfo,
                      publicationDetails: e.target.value,
                    })
                  }
                  className="w-full p-3 border border-red-400 rounded-md focus:ring-2 focus:ring-indigo-500"
                  placeholder="Artforum, Art in America, Frieze..."
                  rows={2}
                />
              </div>
            </div>

            {/* Career Factors with CV Upload Option */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-med text-red-400 font-bold mb-2">Publications</label>
                <input
                  type="number"
                  value={careerInfo.publications}
                  onChange={(e) =>
                    setCareerInfo({
                      ...careerInfo,
                      publications: Number(e.target.value),
                    })
                  }
                  className="w-full p-3 border border-red-400 rounded-md focus:ring-2 focus:ring-indigo-500"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-med text-red-400 font-bold mb-2">Representation Level</label>
                <select
                  value={careerInfo.representation}
                  onChange={(e) =>
                    setCareerInfo({
                      ...careerInfo,
                      representation: e.target.value as "none" | "emerging" | "midsize" | "bluechip" | "megagallery",
                    })
                  }
                  className="w-full p-3 border border-red-400 rounded-md focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="none">No Representation</option>
                  <option value="emerging">Emerging Gallery</option>
                  <option value="midsize">Mid Size Gallery</option>
                  <option value="bluechip">Blue Chip Gallery</option>
                  <option value="megagallery">Mega Gallery</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-med text-red-400 font-bold mb-2">Education</label>
                <input
                  type="text"
                  value={careerInfo.education}
                  onChange={(e) =>
                    setCareerInfo({
                      ...careerInfo,
                      education: e.target.value,
                    })
                  }
                  className="w-full p-3 border border-red-400 rounded-md focus:ring-2 focus:ring-indigo-500"
                  placeholder="MFA, BFA, etc."
                />
              </div>
              <div>
                <label className="block text-med text-red-400 font-bold mb-2">Portfolio Website</label>
                <input
                  type="text"
                  value={careerInfo.portfolio}
                  onChange={(e) =>
                    setCareerInfo({
                      ...careerInfo,
                      portfolio: e.target.value,
                    })
                  }
                  className="w-full p-3 border border-red-400 rounded-md focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          {/* Market Factors Section */}
          <div className="mb-8">
            <h2 className="text-4xl font-light outline rounded-full mb-6 p-2  text-purple-400">Market Factors</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-med text-purple-400 font-bold mb-2">Demand Level</label>
                <select
                  value={marketFactors.demandLevel}
                  onChange={(e) =>
                    setMarketFactors({
                      ...marketFactors,
                      demandLevel: e.target.value as "low" | "medium" | "high",
                    })
                  }
                  className="w-full p-3 border border-purple-500 rounded-md focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-med text-purple-400 font-bold mb-2">Target Market</label>
                <select
                  value={marketFactors.targetMarket}
                  onChange={(e) =>
                    setMarketFactors({
                      ...marketFactors,
                      targetMarket: e.target.value as
                        | "students"
                        | "emerging-collectors"
                        | "collectors"
                        | "institutions",
                    })
                  }
                  className="w-full p-3 border border-purple-500 rounded-md focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="students">Students</option>
                  <option value="emerging-collectors">Emerging Collectors</option>
                  <option value="collectors">Established Collectors</option>
                  <option value="institutions">Institutions</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-med text-purple-400 font-bold mb-2">Economic Climate</label>
                <select
                  value={marketFactors.economicClimate}
                  onChange={(e) =>
                    setMarketFactors({
                      ...marketFactors,
                      economicClimate: e.target.value as "recession" | "slow" | "stable" | "growing",
                    })
                  }
                  className="w-full p-3 border border-purple-500 rounded-md focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="recession">Recession</option>
                  <option value="slow">Slow</option>
                  <option value="stable">Stable</option>
                  <option value="growing">Growing</option>
                </select>
              </div>
              <div>
                <label className="block text-med text-purple-400 font-bold mb-2">Location</label>
                <input
                  type="text"
                  value={marketFactors.location}
                  onChange={(e) =>
                    setMarketFactors({
                      ...marketFactors,
                      location: e.target.value,
                    })
                  }
                  className="w-full p-3 border border-purple-500 rounded-md focus:ring-2 focus:ring-indigo-500"
                  placeholder="City/Country of where the work will be selling"
                />
              </div>
              <div>
                <label className="block text-med text-purple-400 font-bold mb-2">Trending Styles</label>
                <input
                  type="text"
                  value={marketFactors.trendingStyles}
                  onChange={(e) =>
                    setMarketFactors({
                      ...marketFactors,
                      trendingStyles: e.target.value,
                    })
                  }
                  className="w-full p-3 border border-purple-500 rounded-md focus:ring-2 focus:ring-indigo-500"
                  placeholder="Abstract, Contemporary..."
                />
              </div>
            </div>
          </div>
          
        {/* Calculate Button */}
        <button
          onClick={handleSubmit}
          disabled={isCalculating}
          className="w-full bg-purple-400 text-white py-4 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          //                            ^^^^^^^^^^^^ Fixed: was just "text-gray"
        >
          {isCalculating ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Calculating Pricing...
            </span>
          ) : (
            "Calculate Pricing"
          )}
        </button>

          {/* AI Result */}
          {aiResult && (
            <div className="mt-4 p-4 bg-gray-800 text-white rounded-lg">
              {aiResult}
            </div>
          )}


        {/* Results Section */}
        {pricingResult && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-semibold text-gray-800">Pricing Recommendations</h2>
              <button
                onClick={exportToPDF}
                className="flex items-center bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </button>
            </div>

            {/* Pricing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Base Cost Card */}
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <h3 className="text-lg font-medium text-gray-600 mb-2">Base Cost</h3>
                <p className="text-3xl font-bold text-gray-900 mb-2">${pricingResult.baseCost.toFixed(0)}</p>
                <p className="text-sm text-gray-500">Minimum viable price</p>
              </div>

              {/* Market Price Card - Highlighted */}
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg p-6 text-center text-white transform scale-105 shadow-xl">
                <div className="bg-white/20 text-xs font-semibold px-3 py-1 rounded-full inline-block mb-2">
                  RECOMMENDED
                </div>
                <h3 className="text-lg font-medium mb-2">Market Price</h3>
                <p className="text-4xl font-bold mb-2">${pricingResult.marketPrice.toFixed(0)}</p>
                <p className="text-sm text-white/80">Competitive market rate</p>
              </div>

              {/* Premium Price Card */}
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <h3 className="text-lg font-medium text-gray-600 mb-2">Premium Price</h3>
                <p className="text-3xl font-bold text-gray-900 mb-2">${pricingResult.premiumPrice.toFixed(0)}</p>
                <p className="text-sm text-gray-500">Collector pricing</p>
              </div>
            </div>

            {/* Reasoning Section */}
            <div className="space-y-6">
              {/* Cost Breakdown */}
              <div className="bg-blue-50 rounded-lg p-6">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-2">Cost Breakdown</h4>
                    <p className="text-blue-800 text-sm">{pricingResult.reasoning.costBreakdown}</p>
                  </div>
                </div>
              </div>

              {/* Market Analysis */}
              <div className="bg-green-50 rounded-lg p-6">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-green-900 mb-2">Market Analysis</h4>
                    <p className="text-green-800 text-sm">{pricingResult.reasoning.marketAnalysis}</p>
                  </div>
                </div>
              </div>

              {/* Value Proposition */}
              <div className="bg-purple-50 rounded-lg p-6">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-purple-600 mr-3 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-purple-900 mb-2">Value Proposition</h4>
                    <p className="text-purple-800 text-sm">{pricingResult.reasoning.valueProposition}</p>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              <div className="bg-amber-50 rounded-lg p-6">
                <h4 className="font-semibold text-amber-900 mb-4">Strategic Recommendations</h4>
                <ul className="space-y-2">
                  {pricingResult.recommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-amber-600 mr-2">•</span>
                      <span className="text-amber-800 text-sm">{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Additional Pricing Information */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pricing Summary */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-semibold text-gray-800 mb-4">Pricing Summary</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Material Costs:</span>
                    <span className="font-medium">${costs.materials + costs.framing + costs.studio + costs.other}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Hours:</span>
                    <span className="font-medium">
                      {timeInvestment.conceptDevelopment + timeInvestment.creation + timeInvestment.finishing} hours
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Size:</span>
                    <span className="font-medium">
                      {artworkDetails.width}" × {artworkDetails.height}"
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Price per Square Inch:</span>
                    <span className="font-medium">
                      ${(pricingResult.marketPrice / (artworkDetails.width * artworkDetails.height)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Career Impact */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-semibold text-gray-800 mb-4">Career Impact on Pricing</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Experience Factor:</span>
                    <span className="font-medium">
                      {careerInfo.yearsExperience > 10
                        ? "Established"
                        : careerInfo.yearsExperience > 5
                          ? "Mid-Career"
                          : "Emerging"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Exhibition History:</span>
                    <span className="font-medium">{careerInfo.exhibitions} shows</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Recognition Level:</span>
                    <span className="font-medium">{careerInfo.awards} awards</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Gallery Representation:</span>
                    <span className="font-medium capitalize">{careerInfo.representation}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing Guidelines */}
            <div className="mt-8 bg-indigo-50 rounded-lg p-6">
              <h4 className="font-semibold text-indigo-900 mb-4">💡 Pricing Guidelines</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-indigo-800">
                <div>
                  <p className="mb-2">
                    <strong>For Direct Sales:</strong> Use the market price as your standard rate.
                  </p>
                  <p className="mb-2">
                    <strong>For Galleries:</strong> Add 40-50% to account for commission.
                  </p>
                  <p>
                    <strong>For Commissions:</strong> Add 20-30% for custom work.
                  </p>
                </div>
                <div>
                  <p className="mb-2">
                    <strong>Payment Plans:</strong> Offer for works over $2,000.
                  </p>
                  <p className="mb-2">
                    <strong>Studio Visits:</strong> Consider 10-15% discount.
                  </p>
                  <p>
                    <strong>Returning Collectors:</strong> Maintain consistent pricing.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-300">
          <p>Pricing calculations are suggestions based on provided data.</p>
          <p className="mt-1">Always consider your local market conditions and personal circumstances.</p>
        </div>
      </div>



      {/* Creator Section */}
      <div className="mt-16 mb-8">
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-1 rounded-lg">
          <div className="bg-white rounded-lg p-8">
            <div className="max-w-3xl mx-auto text-center">
              {/* Main message */}
              <p className="text-gray-600 mb-6 leading-relaxed">
                This pricing calculator is a passion project created by a fellow artist who believes in pricing
                transparency. By sharing knowledge and demystifying art valuation, we can help ensure artists are fairly
                compensated and never taken advantage of. Together, we're building a more equitable art market.
              </p>

              {/* Living site note */}
              <div className="bg-purple-50 rounded-lg p-4 mb-6">
                                <p className="text-purple-800 text-sm font-medium">
                                    This is a living project that evolves
                                    with your input
                                </p>
                                <p className="text-purple-800 text-sm font-medium">
                                    Updated 8/25/2025
                                </p>
                            </div>

              {/* Upcoming project */}
              <div className="border-t border-gray-200 pt-6 mt-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-3">
                                    Coming Winter 2025: AI Art Assistant & Manager
                                </h4>
                                <p className="text-gray-600 mb-4">
                                    I'm developing a comprehensive AI-powered
                                    app to help artists manage their careers,
                                    inventory, sales, and creative process.
                                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mt-6">
                  <a
                    href="mailto:artworthai@gmail.com?subject=Feedback on ARTWorth"
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105"
                  >
                    Share Feedback
                  </a>
                  <a
                    href="mailto:artworthai@gmail.com?subject=Interested in supporting ARTWorth"
                    className="bg-white border-2 border-purple-500 text-purple-600 px-6 py-3 rounded-lg font-medium hover:bg-purple-50 transition-all"
                  >
                    Support or Invest
                  </a>
                </div>
              </div>

              {/* Social proof */}
              <div className="mt-8 flex items-center justify-center space-x-6 text-sm text-gray-500">
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path
                      fillRule="evenodd"
                      d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Used by painters, sculptures, etc.
                </span>
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Community-Driven
                </span>
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Constantly Improving
                </span>
              </div>

              <div>
                {/* Homepage layout */}
                <footer className="text-s text-gray-600 mt-10 text-center">
                  <Link to="/about" className="underline hover:text-gray-700">
                    About + Contact
                  </Link>{" "}
                  |{" "}
                  <Link to="/privacypolicy" className="underline hover:text-gray-700">
                    Privacy Policy
                  </Link>{" "}
                  |{" "}
                  <Link to="/artist-pricing-guide" className="underline hover:text-gray-700">
                    Artist Pricing Guide
                  </Link>
                </footer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  )
}

export default App
