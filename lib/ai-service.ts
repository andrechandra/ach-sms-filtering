import { OpenAI } from 'openai'

// Define the structure of our analysis result
export type AnalysisResult = {
  isScam: boolean
  confidence: number
  explanation: string
}

/**
 * Configuration options for the scam checker
 */
export type ScamCheckerConfig = {
  apiKey?: string
  model?: string
  temperature?: number
  forceOfflineMode?: boolean
}

// Define a proper type for window with our custom property
interface CustomWindow extends Window {
  __OPENAI_API_KEY?: string
}

/**
 * SMS Scam Checker class
 * Can work in both online mode (with OpenAI API) or offline mode (rule-based)
 */
export class ScamChecker {
  private openai: OpenAI | null = null
  private config: Required<ScamCheckerConfig>
  private isOfflineMode: boolean = false

  /**
   * Creates a new ScamChecker instance
   */
  constructor(config: ScamCheckerConfig = {}) {
    // Default configuration
    this.config = {
      apiKey: config.apiKey || this.getEnvironmentApiKey() || '',
      model: config.model || 'gpt-3.5-turbo',
      temperature: config.temperature ?? 0.3,
      forceOfflineMode: config.forceOfflineMode ?? false,
    }

    if (this.config.forceOfflineMode) {
      this.isOfflineMode = true
      console.log('SMS Scam Checker running in offline mode (rule-based)')
    } else {
      this.initOpenAI()
    }
  }

  /**
   * Get API key from environment variables
   */
  private getEnvironmentApiKey(): string | null {
    // Browser environment
    if (typeof window !== 'undefined') {
      // Look for Next.js public env vars or explicitly exposed variables
      const customWindow = window as CustomWindow
      if (customWindow.__OPENAI_API_KEY) {
        return customWindow.__OPENAI_API_KEY
      }

      // Check for environment variables exposed to the client
      // (e.g., NEXT_PUBLIC_OPENAI_API_KEY in Next.js)
      if (typeof process !== 'undefined' && process.env) {
        return process.env.NEXT_PUBLIC_OPENAI_API_KEY || null
      }
    }

    // Node.js environment
    if (typeof process !== 'undefined' && process.env) {
      return process.env.OPENAI_API_KEY || null
    }

    return null
  }

  /**
   * Initialize the OpenAI client
   */
  private initOpenAI(): void {
    if (!this.config.apiKey) {
      console.warn(
        'No OpenAI API key available. Switching to offline mode (rule-based analysis).'
      )
      this.isOfflineMode = true
      return
    }

    try {
      this.openai = new OpenAI({
        apiKey: this.config.apiKey,
        dangerouslyAllowBrowser: true,
      })
    } catch (error) {
      console.error('Failed to initialize OpenAI client:', error)
      console.warn('Switching to offline mode (rule-based analysis).')
      this.isOfflineMode = true
      this.openai = null
    }
  }

  /**
   * Set a new API key and reinitialize the client
   */
  public setApiKey(apiKey: string): void {
    this.config.apiKey = apiKey
    this.isOfflineMode = false // Reset offline mode flag
    this.initOpenAI()
  }

  /**
   * Force offline mode (no API calls)
   */
  public setOfflineMode(enabled: boolean): void {
    this.isOfflineMode = enabled
    if (!enabled && !this.openai) {
      this.initOpenAI()
    }
  }

  /**
   * Analyze a message to check if it's a scam
   */
  // Static flag to remember if quota has been exceeded across instances
  private static quotaExceeded: boolean = false

  public async checkMessage(messageText: string): Promise<AnalysisResult> {
    // Check the static quota flag first to avoid repeated API calls when we know quota is exceeded
    if (ScamChecker.quotaExceeded) {
      console.log('Using offline mode due to previously detected quota limit')
      return this.performOfflineAnalysis(messageText)
    }

    // Use offline mode if explicitly set or if API client initialization failed
    if (this.isOfflineMode || !this.openai) {
      return this.performOfflineAnalysis(messageText)
    }

    try {
      const systemPrompt = `
You are an AI analyzer specialized in detecting scams and fraudulent messages in any language.
Analyze the provided message and determine if it's likely a scam or legitimate.
Consider common scam indicators such as:
- Urgency and pressure tactics
- Requests for personal information
- Suspicious links
- Offers that seem too good to be true
- Unusual sender or unexpected message
- Impersonation of known companies or services

Respond with JSON:
{
  "isScam": boolean,
  "confidence": number (0-100),
  "explanation": string
}`

      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze this message:\n"${messageText}"` },
        ],
        temperature: this.config.temperature,
      })

      const content = response.choices[0].message.content

      if (!content) {
        throw new Error('Empty response from OpenAI')
      }

      const result = JSON.parse(content) as AnalysisResult

      // Validate response format
      if (
        typeof result.isScam !== 'boolean' ||
        typeof result.confidence !== 'number' ||
        typeof result.explanation !== 'string'
      ) {
        throw new Error('Invalid response format from OpenAI')
      }

      // Ensure confidence is within range
      result.confidence = Math.max(0, Math.min(100, result.confidence))

      return result
    } catch (error: unknown) {
      // Define a type guard to check for OpenAI error properties
      interface OpenAIError {
        message: string
      }

      function isOpenAIError(err: unknown): err is OpenAIError {
        return (
          typeof err === 'object' &&
          err !== null &&
          'message' in err &&
          typeof (err as OpenAIError).message === 'string'
        )
      }

      // Check for specific OpenAI error codes that indicate quota/rate limiting
      if (isOpenAIError(error)) {
        const errorMessage = error.message
        if (
          errorMessage.includes('429') ||
          errorMessage.includes('exceeded your current quota') ||
          errorMessage.includes('rate limit')
        ) {
          console.warn(
            'OpenAI API quota or rate limit exceeded. Switching to offline mode permanently.'
          )
          // Set both instance and static flags to remember quota exceeded status
          this.isOfflineMode = true
          ScamChecker.quotaExceeded = true
          return this.performOfflineAnalysis(messageText)
        }
      }

      console.error('Error analyzing message with OpenAI:', error)
      return this.performOfflineAnalysis(messageText)
    }
  }

  /**
   * Perform rule-based analysis without using OpenAI API
   */
  private performOfflineAnalysis(messageText: string): AnalysisResult {
    // More comprehensive regex patterns for common scam indicators in multiple languages
    const scamPatterns = [
      // Universal patterns (works across many languages)
      /https?:\/\/[^\s]{1,20}\.[^\s]{2,5}/i, // Short/suspicious links
      /bitcoin|btc|crypto|ethereum|eth|usdt/i, // Crypto terms (often in scams)
      /\d{9,}/, // Long numbers (potential account numbers)

      // English patterns
      /urgent|verify|account.*suspend/i, // Urgency and account issues
      /limited time|act now|expires|deadline/i, // Time pressure
      /won|prize|claim|lottery|free money/i, // Too good to be true offers
      /password|pin|ssn|social security/i, // Personal info requests
      /bank details|credit card|cvv|expiry/i, // Financial info requests
      /\$\d+,\d+|\d+\s*%\s*discount/i, // Large money amounts
      /update.*account|confirm.*details/i, // Account verification
      /western union|moneygram|wire transfer/i, // Payment methods common in scams

      // Suspicious punctuation and formatting patterns
      /[!?]{2,}/, // Multiple exclamation/question marks
      /[A-Z]{5,}/, // WORDS IN ALL CAPS (common in scams)
      /\d{1,3}[,.]\d{3}[,.]\d{3}/, // Large monetary amounts in various formats
    ]

    // Count matches
    let matchCount = 0
    const matchedPatterns: number[] = []

    for (let i = 0; i < scamPatterns.length; i++) {
      if (scamPatterns[i].test(messageText)) {
        matchCount++
        matchedPatterns.push(i)
      }
    }

    // Additional heuristics
    const lengthScore = Math.min(messageText.length / 20, 5) // Longer messages get up to 5 points
    const urlCount = (messageText.match(/https?:\/\//g) || []).length * 10 // Each URL adds 10 points
    const capsPercentage =
      messageText.split('').filter((c) => c >= 'A' && c <= 'Z').length /
      messageText.length
    const capsScore = capsPercentage > 0.3 ? 10 : 0 // More than 30% caps gets 10 points

    // Calculate total score
    const totalScore = matchCount * 10 + lengthScore + urlCount + capsScore

    // Normalize to 0-100 scale
    const confidenceScore = Math.min(totalScore, 100)

    // Threshold for classifying as scam (adjustable)
    const scamThreshold = 30
    const isScam = confidenceScore >= scamThreshold

    // Generate explanation
    let explanation = ''
    if (isScam) {
      explanation = `Rule-based analysis detected ${matchCount} potential scam indicators with a confidence score of ${confidenceScore.toFixed(1)}.`

      if (matchedPatterns.length > 0) {
        explanation += ' Suspicious elements include: '
        const indicators: string[] = []

        if (matchedPatterns.includes(0)) indicators.push('suspicious links')
        if (matchedPatterns.includes(1))
          indicators.push('cryptocurrency references')
        if (matchedPatterns.includes(2)) indicators.push('sensitive numbers')
        if (matchedPatterns.some((p) => p >= 3 && p <= 9))
          indicators.push('urgency/pressure tactics')
        if (matchedPatterns.some((p) => p >= 10))
          indicators.push('suspicious formatting')
        if (urlCount > 0)
          indicators.push(
            `${messageText.match(/https?:\/\//g)?.length || 0} URLs`
          )

        explanation += indicators.join(', ')
      }

      if (capsScore > 0) {
        explanation += ' The message contains excessive use of capital letters.'
      }
    } else {
      explanation = `Rule-based analysis found limited scam indicators (score: ${confidenceScore.toFixed(1)}).`

      if (matchCount > 0) {
        explanation +=
          " Some potentially concerning elements were found, but they didn't reach the threshold for classification as a scam."
      } else {
        explanation += ' No common scam patterns were detected.'
      }
    }

    // Add disclaimer
    explanation +=
      ' Note: This analysis uses rule-based detection without AI assistance.'

    return {
      isScam,
      confidence: isScam ? confidenceScore : 100 - confidenceScore,
      explanation,
    }
  }
}

/**
 * Reset the quota exceeded status (for testing purposes)
 */
export function resetQuotaStatus(): void {
  interface ScamCheckerStatic {
    quotaExceeded: boolean
  }

  ;(ScamChecker as unknown as ScamCheckerStatic).quotaExceeded = false
}

/**
 * Standalone function for simple usage
 * @param messageText - The message to analyze
 * @param apiKey - Optional OpenAI API key (will use environment variables if not provided)
 * @param offlineMode - Force offline mode (rule-based analysis without API calls)
 * @returns Analysis result indicating if the message is a scam
 */
export async function checkMessage(
  messageText: string,
  apiKey?: string,
  offlineMode: boolean = false
): Promise<AnalysisResult> {
  const checker = new ScamChecker({
    apiKey,
    forceOfflineMode: offlineMode,
  })
  return checker.checkMessage(messageText)
}
