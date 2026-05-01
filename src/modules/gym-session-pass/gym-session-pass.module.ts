import { Module } from "@nestjs/common";
import { GymSessionPassController } from "./gym-session-pass.controller";
import { GymSessionPassService } from "./gym-session-pass.service";
import { PrismaService } from "../../prisma/prisma.service";

@Module({
  controllers: [GymSessionPassController],
  providers: [GymSessionPassService, PrismaService],
})
export class GymSessionPassModule {}
