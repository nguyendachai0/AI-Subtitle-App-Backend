// ============================================
// FILE: backend/src/subtitles/subtitle-styler.service.ts
// ENHANCED VERSION with AI Integration Option
// ============================================
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

@Injectable()
export class SubtitleStylerService {
	private readonly useAI: boolean;
	private readonly geminiApiKey: string;

	constructor(private configService: ConfigService) {
		this.useAI = this.configService.get<string>("USE_AI_STYLING") === "true";
		this.geminiApiKey = this.configService.get<string>("GEMINI_API_KEY") || "";
	}

	private readonly tierWords = {
		// Tier 3: Connector words (no animation)
		connectors: [
			"a",
			"an",
			"the",
			"is",
			"are",
			"was",
			"were",
			"am",
			"be",
			"been",
			"to",
			"of",
			"in",
			"on",
			"at",
			"by",
			"for",
			"with",
			"from",
			"and",
			"or",
			"but",
			"as",
			"if",
			"it",
			"this",
			"that",
			"these",
			"those",
		],

		// Tier 1: Hero words (animation + color)
		heroWords: [
			"amazing",
			"incredible",
			"awesome",
			"epic",
			"wow",
			"best",
			"worst",
			"never",
			"always",
			"love",
			"hate",
			"perfect",
			"terrible",
			"beautiful",
			"stunning",
			"shocking",
			"unbelievable",
			"extraordinary",
			"phenomenal",
		],
	};

	// Color palette
	private readonly colors = {
		yellow: "&H0000FFFF&", // Impact Yellow
		cyan: "&H00FFFF00&", // Electric Cyan
		green: "&H0000FF00&", // Bright Green
		red: "&H000000FF&", // Vibrant Red
		orange: "&H0000A5FF&", // Orange
	};

	async styleSubtitle(plainSubtitle: string): Promise<string> {
		if (this.useAI && this.geminiApiKey) {
			return this.styleWithAI(plainSubtitle);
		}
		return this.styleWithRules(plainSubtitle);
	}

	private styleWithRules(plainSubtitle: string): string {
		const lines = plainSubtitle.split("\n");
		const styledLines = lines.map(line => {
			if (line.startsWith("Dialogue:")) {
				return this.styleLine(line);
			}
			return line;
		});

		return styledLines.join("\n");
	}

	private styleLine(line: string): string {
		// Parse dialogue line: Dialogue: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
		const parts = line.split(",,");
		if (parts.length !== 2) return line;

		const text = parts[1].trim();
		const word = text.toLowerCase();
		let style = "";

		if (this.tierWords.connectors.includes(word)) {
			// Tier 3: Static connector words
			style = "{\\an2\\bord(2)\\shad(1)\\fs22}";
		} else if (this.tierWords.heroWords.includes(word)) {
			// Tier 1: Hero words with color and animation
			const color = this.getRandomColor();
			style = `{\\an2\\bord(2)\\shad(1)\\fs22\\t(0,150,\\1c${color}\\fscx120\\fscy120\\fscx100\\fscy100)}`;
		} else {
			// Tier 2: Default animated words
			style =
				"{\\an2\\bord(2)\\shad(1)\\fs22\\t(0,150,\\fscx120\\fscy120\\fscx100\\fscy100)}";
		}

		return `${parts[0]},,${style}${text}`;
	}

	private getRandomColor(): string {
		const colorValues = Object.values(this.colors);
		return colorValues[Math.floor(Math.random() * colorValues.length)];
	}

	private async styleWithAI(plainSubtitle: string): Promise<string> {
		const prompt = `You are a subtitle styling expert. Transform this plain .ass subtitle file into a dynamic, engaging version.

Rules:
1. Add {\\fs22} to every word for consistent size
2. Add {\\an2\\bord(2)\\shad(1)} for readability
3. Connector words (a, the, is): Static text
4. Action words: Add animation {\\t(0,150,\\fscx120\\fscy120\\fscx100\\fscy100)}
5. Hero/impactful words: Add animation + color {\\t(0,150,\\1c&H00FFFF00&\\fscx120\\fscy120\\fscx100\\fscy100)}

ONLY modify the text at the end of each Dialogue line. DO NOT change timestamps.

Input:
${plainSubtitle}

Return ONLY the complete styled .ass file, no explanations.`;

		try {
			const response = await axios.post(
				`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${this.geminiApiKey}`,
				{
					contents: [
						{
							parts: [{ text: prompt }],
						},
					],
					generationConfig: {
						temperature: 0.3,
						maxOutputTokens: 8000,
					},
				},
			);

			let styledText = response.data.candidates[0].content.parts[0].text;

			// Clean markdown code blocks if present
			styledText = styledText
				.replace(/^```ass\s*/, "")
				.replace(/\s*```$/, "")
				.trim();

			return styledText;
		} catch (error) {
			console.error(
				"AI styling failed, falling back to rule-based:",
				error.message,
			);
			return this.styleWithRules(plainSubtitle);
		}
	}
}
