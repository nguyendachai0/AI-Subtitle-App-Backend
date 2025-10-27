// ============================================
// FILE: backend/src/subtitles/subtitles.controller.ts
// ============================================
import {
	Controller,
	Post,
	UploadedFile,
	UseInterceptors,
	Res,
	HttpException,
	HttpStatus,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { SubtitlesService } from "./subtitles.service";
import { diskStorage } from "multer";
import { extname } from "path";

@Controller("api/subtitles")
export class SubtitlesController {
	constructor(private readonly subtitlesService: SubtitlesService) {}

	@Post("process")
	@UseInterceptors(
		FileInterceptor("video", {
			storage: diskStorage({
				destination: "./uploads",
				filename: (req, file, cb) => {
					const uniqueSuffix =
						Date.now() + "-" + Math.round(Math.random() * 1e9);
					cb(null, `video-${uniqueSuffix}${extname(file.originalname)}`);
				},
			}),
			limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
			fileFilter: (req, file, cb) => {
				if (!file.mimetype.startsWith("video/")) {
					return cb(new Error("Only video files are allowed"), false);
				}
				cb(null, true);
			},
		}),
	)
	async processVideo(
		@UploadedFile() file: Express.Multer.File,
		@Res() res: Response,
	) {
		if (!file) {
			throw new HttpException("No video file provided", HttpStatus.BAD_REQUEST);
		}

		try {
			const outputPath = await this.subtitlesService.processVideo(file.path);

			res.download(outputPath, `subtitled_${file.originalname}`, err => {
				if (err) {
					console.error("Download error:", err);
				}
			});
		} catch (error) {
			throw new HttpException(
				error.message || "Failed to process video",
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}
}
