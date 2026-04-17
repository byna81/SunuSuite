import { AdminSystemModule } from './modules/admin-system/admin-system.module';

@Module({
  imports: [
    AdminSystemModule, // ✅ AJOUT
  ],
})
export class AppModule {}
