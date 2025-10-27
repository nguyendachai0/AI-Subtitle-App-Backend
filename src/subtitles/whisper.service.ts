// ============================================
// FILE: backend/src/subtitles/whisper.service.ts
// ENHANCED VERSION with Retry Logic
// ============================================
import { Injectable, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import FormData from "form-data";
import * as fs from "fs";
import axios, { AxiosError } from "axios";

@Injectable()
export class WhisperService {
	private readonly logger = new Logger(WhisperService.name);
	private readonly apiKey: string;
	private readonly maxRetries: number = 3;

	constructor(private configService: ConfigService) {
		const key = this.configService.get<string>("GROQ_API_KEY");

		if (!key) {
			this.logger.error("GROQ_API_KEY is not configured");
			throw new Error("GROQ_API_KEY environment variable is required");
		}

		this.apiKey = key;
	}

	async transcribe(audioPath: string): Promise<any> {
		let lastError: Error = new Error("Unknown error");

		for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
			try {
				this.logger.log(`Transcription attempt ${attempt}/${this.maxRetries}`);

				const formData = new FormData();
				formData.append("file", fs.createReadStream(audioPath));
				formData.append("model", "whisper-large-v3-turbo");
				formData.append("language", "en");
				formData.append("response_format", "verbose_json");
				formData.append("timestamp_granularities[]", "word");

				const response = await axios.post(
					"https://api.groq.com/openai/v1/audio/transcriptions",
					formData,
					{
						headers: {
							...formData.getHeaders(),
							Authorization: `Bearer ${this.apiKey}`,
						},
						timeout: 60000, // 60 second timeout
					},
				);

				if (!response.data || !response.data.words) {
					throw new Error("Invalid response from Whisper API");
				}

				this.logger.log(
					`Transcription successful: ${response.data.words.length} words`,
				);
				return response.data;
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));

				if (axios.isAxiosError(error)) {
					const axiosError = error as AxiosError;
					this.logger.error(
						`Whisper API error (attempt ${attempt}):`,
						axiosError.response?.data || axiosError.message,
					);

					// Don't retry on authentication errors
					if (axiosError.response?.status === 401) {
						throw new HttpException(
							"Invalid Groq API key",
							HttpStatus.UNAUTHORIZED,
						);
					}

					// Don't retry on bad request errors
					if (axiosError.response?.status === 400) {
						throw new HttpException(
							"Invalid audio file or request",
							HttpStatus.BAD_REQUEST,
						);
					}
				}

				// Wait before retrying (exponential backoff)
				if (attempt < this.maxRetries) {
					const delay = Math.pow(2, attempt) * 1000;
					this.logger.log(`Retrying in ${delay}ms...`);
					await new Promise(resolve => setTimeout(resolve, delay));
				}
			}
		}

		// All retries failed
		throw new HttpException(
			`Whisper transcription failed after ${this.maxRetries} attempts: ${lastError.message}`,
			HttpStatus.INTERNAL_SERVER_ERROR,
		);
	}
}
