import { Module } from '@nestjs/common';
import { ProtoHotReloadModule } from '@/dev/proto-hot-reload';

@Module({
	imports: [ProtoHotReloadModule],
})
export class DevModule {}
