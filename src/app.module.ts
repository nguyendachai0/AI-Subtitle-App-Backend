// ============================================
// FILE: backend/src/app.module.ts
// ============================================
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { SubtitlesModule } from "./subtitles/subtitles.module";

@Module({
	imports: [ConfigModule.forRoot({ isGlobal: true }), SubtitlesModule],
})
export class AppModule {}
