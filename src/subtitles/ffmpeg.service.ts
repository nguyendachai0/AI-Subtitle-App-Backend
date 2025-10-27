// ============================================
// FILE: backend/src/subtitles/ffmpeg.service.ts
// ENHANCED FOR RAILWAY DEPLOYMENT
// Auto-detects FFmpeg path (works locally + Nixpacks)
// ============================================

import { Injectable, Logger } from "@nestjs/common";
import { exec, execSync } from "child_process";
import { promisify } from "util";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";

const execAsync = promisify(exec);

@Injectable()
export class FfmpegService {
	private readonly logger = new Logger(FfmpegService.name);
	private readonly ffmpegPath: string;
	private readonly ffprobePath: string;

	constructor() {
		this.ffmpegPath = this.resolveBinaryPath("ffmpeg", ffmpegInstaller.path);
		this.ffprobePath = this.resolveBinaryPath("ffprobe", ffprobeInstaller.path);

		this.logger.log(`FFmpeg path: ${this.ffmpegPath}`);
		this.logger.log(`FFprobe path: ${this.ffprobePath}`);
	}

	private resolveBinaryPath(binaryName: string, fallbackPath: string): string {
		try {
			if (process.env.NODE_ENV === "production") {
				// Railway/Nixpacks environment
				const path = execSync(`which ${binaryName}`).toString().trim();
				if (path) return path;
			}
		} catch {
			this.logger.warn(
				`${binaryName} not found via "which", falling back to package binary.`,
			);
		}
		return fallbackPath;
	}

	async scaleVideo(inputPath: string, outputPath: string): Promise<void> {
		const command = `${this.ffmpegPath} -y -i "${inputPath}" -vf "scale=iw*1.2:ih*1.2,crop=iw/1.2:ih/1.2" -c:a copy "${outputPath}"`;

		try {
			const { stderr } = await execAsync(command);
			this.logger.debug("Scale video output:", stderr);
		} catch (error: any) {
			this.logger.error("Scale video failed:", error.message);
			throw new Error(`Failed to scale video: ${error.message}`);
		}
	}

	async extractAudio(videoPath: string, audioPath: string): Promise<void> {
		const command = `${this.ffmpegPath} -y -i "${videoPath}" -q:a 0 -map a "${audioPath}"`;

		try {
			const { stderr } = await execAsync(command);
			this.logger.debug("Extract audio output:", stderr);
		} catch (error: any) {
			this.logger.error("Extract audio failed:", error.message);
			throw new Error(`Failed to extract audio: ${error.message}`);
		}
	}

	async burnSubtitles(
		videoPath: string,
		subtitlePath: string,
		outputPath: string,
	): Promise<void> {
		const escapedSubtitlePath = subtitlePath
			.replace(/\\/g, "/")
			.replace(/:/g, "\\:");
		const command = `${this.ffmpegPath} -y -i "${videoPath}" -vf "subtitles='${escapedSubtitlePath}'" -c:a copy "${outputPath}"`;

		try {
			const { stderr } = await execAsync(command, {
				maxBuffer: 10 * 1024 * 1024,
			});
			this.logger.debug("Burn subtitles output:", stderr);
		} catch (error: any) {
			this.logger.error("Burn subtitles failed:", error.message);
			throw new Error(`Failed to burn subtitles: ${error.message}`);
		}
	}

	async getVideoInfo(videoPath: string): Promise<any> {
		const command = `${this.ffprobePath} -v quiet -print_format json -show_format -show_streams "${videoPath}"`;

		try {
			const { stdout } = await execAsync(command);
			return JSON.parse(stdout);
		} catch (error: any) {
			this.logger.error("Get video info failed:", error.message);
			throw new Error(`Failed to get video info: ${error.message}`);
		}
	}
}
