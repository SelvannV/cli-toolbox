export type ChecksResult = {
  system: {
    platform: string;
    architecture: string;
    shell: string;
  };

  resources: {
    cpuCores: number;
    totalMemoryBytes: number;
    freeMemoryBytes: number;
  };

  runtimes: {
    node: string;
    pnpm: string;
    python: string;
    java: string;
  };

  development: {
    git: string;
    gitBranch: string;
    gitWorkingTreeClean: boolean;
    typescript: string;
  };

  docker: {
    clientVersion: string;
    serverVersion: string;
    context: string;
    runningContainers: number;
    images: number;
  };

  tools: {
    curl: string;
    dockerCompose: string;
    dockerBuildx: string;
  };
};
