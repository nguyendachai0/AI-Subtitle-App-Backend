// ============================================
// FILE: backend/src/subtitles/dto/process-video.dto.ts

import {
	IsNotEmpty,
	IsOptional,
	IsBoolean,
	IsNumber,
	Min,
	Max,
} from "class-validator";

export class ProcessVideoDto {
	@IsOptional()
	@IsBoolean()
	useAiStyling?: boolean;

	@IsOptional()
	@IsNumber()
	@Min(12)
	@Max(48)
	fontSize?: number;

	@IsOptional()
	@IsBoolean()
	scaleVideo?: boolean;
}
