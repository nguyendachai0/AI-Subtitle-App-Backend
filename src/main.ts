// ============================================
// FILE: backend/src/main.ts
// ============================================
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
	const app = await NestFactory.create(AppModule);
	app.enableCors({
		origin: "*",
		credentials: true,
		methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization"],
	});
	await app.listen(3001);
	console.log("🚀 Backend running on http://localhost:3001");
}
bootstrap();
