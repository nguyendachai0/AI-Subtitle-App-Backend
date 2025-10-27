// ============================================
// FILE: backend/src/subtitles/ffmpeg.service.ts
// ENHANCED VERSION with Better Error Handling
// ============================================
import { Injectable, Logger } from "@nestjs/common";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

@Injectable()
export class FfmpegService {
	private readonly logger = new Logger(FfmpegService.name);

	async scaleVideo(inputPath: string, outputPath: string): Promise<void> {
		const command = `ffmpeg -y -i "${inputPath}" -vf "scale=iw*1.2:ih*1.2,crop=iw/1.2:ih/1.2" -c:a copy "${outputPath}"`;

		try {
			const { stdout, stderr } = await execAsync(command);
			this.logger.debug("Scale video output:", stderr);
		} catch (error) {
			this.logger.error("Scale video failed:", error.message);
			throw new Error(`Failed to scale video: ${error.message}`);
		}
	}

	async extractAudio(videoPath: string, audioPath: string): Promise<void> {
		const command = `ffmpeg -y -i "${videoPath}" -q:a 0 -map a "${audioPath}"`;

		try {
			const { stdout, stderr } = await execAsync(command);
			this.logger.debug("Extract audio output:", stderr);
		} catch (error) {
			this.logger.error("Extract audio failed:", error.message);
			throw new Error(`Failed to extract audio: ${error.message}`);
		}
	}

	async burnSubtitles(
		videoPath: string,
		subtitlePath: string,
		outputPath: string,
	): Promise<void> {
		// Escape subtitle path for ffmpeg filter
		const escapedSubtitlePath = subtitlePath
			.replace(/\\/g, "/")
			.replace(/:/g, "\\:");
		const command = `ffmpeg -y -i "${videoPath}" -vf "subtitles='${escapedSubtitlePath}'" -c:a copy "${outputPath}"`;

		try {
			const { stdout, stderr } = await execAsync(command, {
				maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large videos
			});
			this.logger.debug("Burn subtitles output:", stderr);
		} catch (error) {
			this.logger.error("Burn subtitles failed:", error.message);
			throw new Error(`Failed to burn subtitles: ${error.message}`);
		}
	}

	async getVideoInfo(videoPath: string): Promise<any> {
		const command = `ffprobe -v quiet -print_format json -show_format -show_streams "${videoPath}"`;

		try {
			const { stdout } = await execAsync(command);
			return JSON.parse(stdout);
		} catch (error) {
			this.logger.error("Get video info failed:", error.message);
			throw new Error(`Failed to get video info: ${error.message}`);
		}
	}
}
