// ============================================
// FILE: backend/src/subtitles/subtitles.module.ts
// ============================================
import { Module } from "@nestjs/common";
import { SubtitlesController } from "./subtitles.controller";
import { SubtitlesService } from "./subtitles.service";
import { WhisperService } from "./whisper.service";
import { FfmpegService } from "./ffmpeg.service";
import { SubtitleStylerService } from "./subtitle-styler.service";

@Module({
	controllers: [SubtitlesController],
	providers: [
		SubtitlesService,
		WhisperService,
		FfmpegService,
		SubtitleStylerService,
	],
})
export class SubtitlesModule {}
