import Docker from 'dockerode';
import { PassThrough } from 'stream';

// =============================================================================
// Types
// =============================================================================

interface ContainerInfo {
  id: string;
  sessionId: string;
  stream: NodeJS.ReadWriteStream | null;
  createdAt: number;
}

interface ContainerStats {
  totalCreated: number;
  totalDestroyed: number;
  activeContainers: number;
  averageLifetimeMs: number;
}

// =============================================================================
// Container Manager (Singleton)
// =============================================================================

export class ContainerManager {
  private static instance: ContainerManager;
  private docker: Docker;
  private containers: Map<string, ContainerInfo> = new Map();
  private stats: ContainerStats = {
    totalCreated: 0,
    totalDestroyed: 0,
    activeContainers: 0,
    averageLifetimeMs: 0,
  };
  
  private readonly IMAGE_NAME = 'terminal-sandbox';
  private readonly CONTAINER_LIMITS = {
    Memory: 256 * 1024 * 1024, // 256MB
    MemorySwap: 256 * 1024 * 1024, // No swap
    NanoCpus: 0.5 * 1e9, // 0.5 CPU
    PidsLimit: 50, // Max 50 processes
  };
  
  private constructor() {
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
    this.verifyImage();
  }
  
  public static getInstance(): ContainerManager {
    if (!ContainerManager.instance) {
      ContainerManager.instance = new ContainerManager();
    }
    return ContainerManager.instance;
  }
  
  private async verifyImage(): Promise<void> {
    try {
      await this.docker.getImage(this.IMAGE_NAME).inspect();
      console.log(`Docker image '${this.IMAGE_NAME}' found`);
    } catch (error) {
      console.error(`Docker image '${this.IMAGE_NAME}' not found. Build it first with: npm run docker:build`);
      process.exit(1);
    }
  }
  
  // ===========================================================================
  // Container Lifecycle
  // ===========================================================================
  
  public async createContainer(
    sessionId: string,
    onOutput: (data: string) => void
  ): Promise<string> {
    console.log(`[${sessionId}] Creating container...`);
    
    const container = await this.docker.createContainer({
      Image: this.IMAGE_NAME,
      
      // Interactive TTY
      Tty: true,
      OpenStdin: true,
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      
      // Security hardening
      HostConfig: {
        // No network access
        NetworkMode: 'none',
        
        // Read-only root filesystem
        ReadonlyRootfs: true,
        
        // Writable tmpfs for /tmp and home
        Tmpfs: {
          '/tmp': 'rw,noexec,nosuid,size=64m',
          '/home/learner/.local': 'rw,noexec,nosuid,size=32m',
        },
        
        // Resource limits
        Memory: this.CONTAINER_LIMITS.Memory,
        MemorySwap: this.CONTAINER_LIMITS.MemorySwap,
        NanoCpus: this.CONTAINER_LIMITS.NanoCpus,
        PidsLimit: this.CONTAINER_LIMITS.PidsLimit,
        
        // Drop all capabilities
        CapDrop: ['ALL'],
        
        // Security options
        SecurityOpt: [
          'no-new-privileges:true',
          'seccomp=unconfined', // TODO: Add custom seccomp profile
        ],
        
        // Auto-remove on exit (backup cleanup)
        AutoRemove: true,
        
        // No privileged mode
        Privileged: false,
        
        // Limit ulimits
        Ulimits: [
          { Name: 'nofile', Soft: 1024, Hard: 2048 },
          { Name: 'nproc', Soft: 50, Hard: 100 },
        ],
      },
      
      // User
      User: 'learner',
      
      // Working directory
      WorkingDir: '/home/learner/practice',
      
      // Environment
      Env: [
        'TERM=xterm-256color',
        'LANG=en_US.UTF-8',
        'HOME=/home/learner',
      ],
      
      // Labels for identification
      Labels: {
        'app': 'terminal-learning',
        'session': sessionId,
      },
    });
    
    // Start container
    await container.start();
    
    // Attach to container
    const stream = await container.attach({
      stream: true,
      stdin: true,
      stdout: true,
      stderr: true,
      hijack: true,
    });
    
    // Handle output
    const stdout = new PassThrough();
    const stderr = new PassThrough();
    
    container.modem.demuxStream(stream, stdout, stderr);
    
    stdout.on('data', (chunk: Buffer) => {
      onOutput(chunk.toString('utf8'));
    });
    
    stderr.on('data', (chunk: Buffer) => {
      onOutput(chunk.toString('utf8'));
    });
    
    // Store container info
    const containerId = container.id;
    this.containers.set(containerId, {
      id: containerId,
      sessionId,
      stream,
      createdAt: Date.now(),
    });
    
    // Update stats
    this.stats.totalCreated++;
    this.stats.activeContainers = this.containers.size;
    
    console.log(`[${sessionId}] Container created: ${containerId.substring(0, 12)}`);
    
    return containerId;
  }
  
  public async sendInput(containerId: string, data: string): Promise<void> {
    const info = this.containers.get(containerId);
    if (!info || !info.stream) {
      throw new Error('Container not found or not attached');
    }
    
    info.stream.write(data);
  }
  
  public async resize(containerId: string, cols: number, rows: number): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.resize({ w: cols, h: rows });
    } catch (error) {
      console.error(`Failed to resize container ${containerId}:`, error);
    }
  }
  
  public async destroyContainer(containerId: string): Promise<void> {
    const info = this.containers.get(containerId);
    if (!info) return;
    
    console.log(`[${info.sessionId}] Destroying container: ${containerId.substring(0, 12)}`);
    
    try {
      const container = this.docker.getContainer(containerId);
      
      // Try graceful stop first
      try {
        await container.stop({ t: 5 });
      } catch (e) {
        // Container might already be stopped
      }
      
      // Force remove
      try {
        await container.remove({ force: true });
      } catch (e) {
        // Container might be auto-removed
      }
    } catch (error) {
      console.error(`Failed to destroy container ${containerId}:`, error);
    }
    
    // Update stats
    const lifetime = Date.now() - info.createdAt;
    this.stats.averageLifetimeMs = 
      (this.stats.averageLifetimeMs * this.stats.totalDestroyed + lifetime) /
      (this.stats.totalDestroyed + 1);
    this.stats.totalDestroyed++;
    
    this.containers.delete(containerId);
    this.stats.activeContainers = this.containers.size;
  }
  
  public async destroyAllContainers(): Promise<void> {
    console.log('Destroying all containers...');
    
    const promises = Array.from(this.containers.keys()).map(id => 
      this.destroyContainer(id).catch(e => console.error(`Failed to destroy ${id}:`, e))
    );
    
    await Promise.all(promises);
    console.log('All containers destroyed');
  }
  
  // ===========================================================================
  // Stats
  // ===========================================================================
  
  public getActiveSessionCount(): number {
    return this.containers.size;
  }
  
  public getStats(): ContainerStats & { containers: { id: string; sessionId: string; uptime: number }[] } {
    const now = Date.now();
    return {
      ...this.stats,
      containers: Array.from(this.containers.values()).map(c => ({
        id: c.id.substring(0, 12),
        sessionId: c.sessionId,
        uptime: Math.round((now - c.createdAt) / 1000),
      })),
    };
  }
  
  // ===========================================================================
  // Cleanup orphaned containers (in case of crashes)
  // ===========================================================================
  
  public async cleanupOrphanedContainers(): Promise<void> {
    try {
      const containers = await this.docker.listContainers({
        all: true,
        filters: {
          label: ['app=terminal-learning'],
        },
      });
      
      for (const containerInfo of containers) {
        const id = containerInfo.Id;
        if (!this.containers.has(id)) {
          console.log(`Cleaning up orphaned container: ${id.substring(0, 12)}`);
          try {
            const container = this.docker.getContainer(id);
            await container.stop({ t: 1 }).catch(() => {});
            await container.remove({ force: true }).catch(() => {});
          } catch (e) {
            // Ignore
          }
        }
      }
    } catch (error) {
      console.error('Failed to cleanup orphaned containers:', error);
    }
  }
}

// Cleanup orphaned containers on startup
ContainerManager.getInstance().cleanupOrphanedContainers();
