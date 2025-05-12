import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Module } from "@nestjs/common";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        host: configService.getOrThrow("DB_HOST"),
        port: configService.getOrThrow("DB_PORT"),
        username: configService.getOrThrow("DB_USERNAME"),
        password: configService.getOrThrow("DB_PASSWORD"),
        database: configService.getOrThrow("DB_NAME"),
        entities: [__dirname + "/../**/*.entity{.ts,.js}"],
        autoLoadEntities: true,
        synchronize: configService.getOrThrow("DB_SYNCHRONIZE") === "true",
      }),
    }),
  ],
})
export class DatabaseModule {}
