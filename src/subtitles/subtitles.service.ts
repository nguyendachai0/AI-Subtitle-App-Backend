// ============================================
// FILE: backend/src/subtitles/subtitles.service.ts
// ENHANCED VERSION with Better Error Handling
// ============================================
import { Injectable, Logger } from "@nestjs/common";
import { FfmpegService } from "./ffmpeg.service";
import { WhisperService } from "./whisper.service";
import { SubtitleStylerService } from "./subtitle-styler.service";
import * as fs from "fs/promises";
import * as path from "path";

@Injectable()
export class SubtitlesService {
	private readonly logger = new Logger(SubtitlesService.name);

	constructor(
		private readonly ffmpegService: FfmpegService,
		private readonly whisperService: WhisperService,
		private readonly stylerService: SubtitleStylerService,
	) {}

	async processVideo(inputVideoPath: string): Promise<string> {
		const timestamp = Date.now();
		const tempDir = path.join("./temp", `project-${timestamp}`);

		this.logger.log(`Starting video processing: ${inputVideoPath}`);

		try {
			await fs.mkdir(tempDir, { recursive: true });

			// 1. Scale video (optional, for better subtitle rendering)
			this.logger.log("Step 1/7: Scaling video...");
			const scaledVideoPath = path.join(tempDir, "scaled.mp4");
			await this.ffmpegService.scaleVideo(inputVideoPath, scaledVideoPath);

			// 2. Extract audio
			this.logger.log("Step 2/7: Extracting audio...");
			const audioPath = path.join(tempDir, "audio.mp3");
			await this.ffmpegService.extractAudio(scaledVideoPath, audioPath);

			// 3. Transcribe with Whisper
			this.logger.log("Step 3/7: Transcribing audio...");
			const transcription = await this.whisperService.transcribe(audioPath);

			if (!transcription.words || transcription.words.length === 0) {
				throw new Error("No transcription data received from Whisper API");
			}

			// 4. Generate plain ASS subtitle
			this.logger.log("Step 4/7: Generating subtitle file...");
			const plainSubtitle = this.generatePlainSubtitle(transcription);

			// 5. Style subtitle
			this.logger.log("Step 5/7: Styling subtitles...");
			const styledSubtitle =
				await this.stylerService.styleSubtitle(plainSubtitle);

			// 6. Save subtitle file
			this.logger.log("Step 6/7: Saving subtitle file...");
			const subtitlePath = path.join(tempDir, "subtitles.ass");
			await fs.writeFile(subtitlePath, styledSubtitle, "utf8");

			// 7. Burn subtitles onto video
			this.logger.log("Step 7/7: Burning subtitles onto video...");
			const outputVideoPath = path.join(tempDir, "output.mp4");
			await this.ffmpegService.burnSubtitles(
				scaledVideoPath,
				subtitlePath,
				outputVideoPath,
			);

			// Cleanup temporary files (keep only output)
			this.logger.log("Cleaning up temporary files...");
			await this.cleanup([
				inputVideoPath,
				scaledVideoPath,
				audioPath,
				subtitlePath,
			]);

			this.logger.log("Video processing completed successfully");
			return outputVideoPath;
		} catch (error) {
			this.logger.error("Video processing failed:", error.message);

			// Cleanup on error
			try {
				await fs.rm(tempDir, { recursive: true, force: true });
				await fs.unlink(inputVideoPath).catch(() => {});
			} catch (cleanupError) {
				this.logger.error("Cleanup failed:", cleanupError.message);
			}

			throw new Error(`Video processing failed: ${error.message}`);
		}
	}

	private async cleanup(filePaths: string[]): Promise<void> {
		for (const filePath of filePaths) {
			try {
				await fs.unlink(filePath);
			} catch (error) {
				this.logger.warn(`Failed to delete ${filePath}:`, error.message);
			}
		}
	}

	private generatePlainSubtitle(transcription: any): string {
		let assContent = `[Script Info]
Title: Auto-Generated Subtitles
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,22,&H00FFFFFF,&H0000FFFF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,2,2,2,10,10,75,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

		for (const word of transcription.words) {
			const start = this.formatTime(word.start);
			const end = this.formatTime(word.end);
			const text = word.word.trim();

			if (text) {
				assContent += `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}\n`;
			}
		}

		return assContent;
	}

	private formatTime(seconds: number): string {
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60)
			.toString()
			.padStart(2, "0");
		const s = Math.floor(seconds % 60)
			.toString()
			.padStart(2, "0");
		const cs = Math.round((seconds - Math.floor(seconds)) * 100)
			.toString()
			.padStart(2, "0");
		return `${h}:${m}:${s}.${cs}`;
	}
}
