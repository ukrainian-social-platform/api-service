import { readFile } from 'node:fs/promises';
import { Inject, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { loadSync as protoLoader } from '@grpc/proto-loader';
import {
	CommonUtilsService,
	CronUtilsService,
	MicroserviceUtilsService,
} from '@/utils';
import { GrpcDocsService } from '@/dev/grpc-docs';

export class ProtoHotReloadService implements OnApplicationBootstrap {
	private readonly logger = new Logger(ProtoHotReloadService.name);
	private lastGrpcProtoContent: string;

	constructor(
		@Inject(CommonUtilsService)
		private readonly utils: CommonUtilsService,
		@Inject(CronUtilsService)
		private readonly cron: CronUtilsService,
		@Inject(MicroserviceUtilsService)
		private readonly microservice: MicroserviceUtilsService,
		private readonly grpcDocs: GrpcDocsService,
	) {}

	private checkGrpcProtoChanges = async (): Promise<void> => {
		const nextContent = await this.getGrpcProtoContents();
		if (this.lastGrpcProtoContent !== nextContent) {
			this.lastGrpcProtoContent = nextContent;
			if (!this.checkProto()) return;
			this.logger.log(
				`${this.microservice.getGrpcProtoPath()} has been changed, restarting the app`,
			);
			await this.grpcDocs.generateDocs();
			this.utils.reloadApp();
		}
	};

	private getGrpcProtoContents(): Promise<string> {
		return readFile(this.microservice.getGrpcProtoPath(), 'utf8');
	}

	private checkProto() {
		try {
			protoLoader(this.microservice.getGrpcProtoPath());
			return true;
		} catch (e) {
			this.logger.error(e);
			return false;
		}
	}

	private async prepareGrpcHotReload(): Promise<void> {
		this.lastGrpcProtoContent = await this.getGrpcProtoContents();
		const tab = this.cron.Tab.fromPeriod(Date.now(), 200);
		this.cron.add(tab, this.checkGrpcProtoChanges, '', false);
	}

	async onApplicationBootstrap() {
		await this.prepareGrpcHotReload();
		await this.grpcDocs.generateDocs();
	}
}
