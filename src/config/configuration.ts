// # ============================================
// # FILE: backend/src/config/configuration.ts
// # Configuration validation
// # ============================================
export default () => ({
	port: parseInt(process.env.PORT!, 10) || 3001,
	groq: {
		apiKey: process.env.GROQ_API_KEY,
	},
	gemini: {
		apiKey: process.env.GEMINI_API_KEY,
	},
	processing: {
		useAiStyling: process.env.USE_AI_STYLING === "true",
		maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB!, 10) || 100,
		enableVideoScaling: process.env.ENABLE_VIDEO_SCALING !== "false",
		defaultFontSize: parseInt(process.env.DEFAULT_FONT_SIZE!, 10) || 22,
	},
});
