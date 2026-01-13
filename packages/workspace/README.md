# @nahisaho/katashiro-workspace

KATASHIRO Workspace Management - Unified workspace interface for file operations across local, remote, and Docker environments.

## Features

- **Unified Interface** (REQ-011-01): Single interface for file operations regardless of workspace type
- **LocalWorkspace** (REQ-011-02): Operations on local file system
- **DockerWorkspace** (REQ-011-04): Operations within Docker containers
- **Identical API** (REQ-011-05): Tools work the same regardless of workspace type
- **Fast Search** (REQ-011-06): Glob search within 1 second for up to 10,000 files

## Installation

```bash
npm install @nahisaho/katashiro-workspace
```

## Usage

### LocalWorkspace

```typescript
import { LocalWorkspace, WorkspaceFactory } from '@nahisaho/katashiro-workspace';

// Direct instantiation
const workspace = new LocalWorkspace({
  type: 'local',
  workingDir: '/path/to/project',
});

// Or using factory
const workspace2 = WorkspaceFactory.createLocal('/path/to/project');

// File operations
const content = await workspace.read('README.md');
await workspace.write('output.txt', 'Hello World');
const files = await workspace.search('**/*.ts');
```

### DockerWorkspace

```typescript
import { DockerWorkspace, WorkspaceFactory } from '@nahisaho/katashiro-workspace';

const workspace = new DockerWorkspace({
  type: 'docker',
  containerId: 'container123',
  workingDir: '/app',
});

// Initialize connection
await workspace.initialize();

// Same API as LocalWorkspace
const content = await workspace.read('config.json');
await workspace.write('output.txt', 'Hello Docker');

// Cleanup
await workspace.cleanup();
```

### Factory Pattern

```typescript
import { WorkspaceFactory, createWorkspace } from '@nahisaho/katashiro-workspace';

// Create workspace from config
const workspace = WorkspaceFactory.create({
  type: 'local',  // or 'docker'
  workingDir: '/path/to/project',
});

// Create and initialize in one step
const workspace2 = await createWorkspace({
  type: 'docker',
  containerId: 'container123',
  workingDir: '/app',
});
```

### Unified Tool Development (REQ-011-05)

Tools can be written once and work with any workspace type:

```typescript
import type { Workspace } from '@nahisaho/katashiro-workspace';

// Tool that works with any workspace type
async function analyzeProject(workspace: Workspace): Promise<ProjectAnalysis> {
  // Read package.json
  const packageJson = await workspace.read('package.json');
  
  // Search for TypeScript files
  const tsFiles = await workspace.search('**/*.ts');
  
  // List src directory
  const srcFiles = await workspace.list('src');
  
  return {
    dependencies: JSON.parse(packageJson).dependencies,
    fileCount: tsFiles.length,
    srcEntries: srcFiles.map(f => f.name),
  };
}

// Use with LocalWorkspace
const local = WorkspaceFactory.createLocal('/local/project');
const localResult = await analyzeProject(local);

// Use with DockerWorkspace
const docker = WorkspaceFactory.createDocker('container123', '/app');
await docker.initialize();
const dockerResult = await analyzeProject(docker);
```

## API Reference

### Workspace Interface

```typescript
interface Workspace {
  readonly type: 'local' | 'remote' | 'docker';
  readonly workingDir: string;
  readonly readOnly: boolean;

  read(path: string, encoding?: BufferEncoding): Promise<string>;
  readBuffer(path: string): Promise<Buffer>;
  write(path: string, content: string): Promise<void>;
  writeBuffer(path: string, buffer: Buffer): Promise<void>;
  list(path: string): Promise<FileInfo[]>;
  listEntries(path: string): Promise<DirectoryEntry[]>;
  search(pattern: string): Promise<string[]>;
  exists(path: string): Promise<boolean>;
  delete(path: string): Promise<void>;
  mkdir(path: string, recursive?: boolean): Promise<void>;
  stat(path: string): Promise<FileInfo>;
  copy(src: string, dest: string): Promise<void>;
  move(src: string, dest: string): Promise<void>;
  initialize?(): Promise<void>;
  cleanup?(): Promise<void>;
}
```

### Error Handling

```typescript
import { WorkspaceError } from '@nahisaho/katashiro-workspace';

try {
  await workspace.read('nonexistent.txt');
} catch (error) {
  if (error instanceof WorkspaceError) {
    switch (error.code) {
      case 'NOT_FOUND':
        console.log('File not found:', error.path);
        break;
      case 'PERMISSION_DENIED':
        console.log('Permission denied');
        break;
      case 'READ_ONLY':
        console.log('Workspace is read-only');
        break;
    }
  }
}
```

## Requirements Coverage

| Requirement | Status | Description |
|------------|--------|-------------|
| REQ-011-01 | ✅ | Unified interface for file operations |
| REQ-011-02 | ✅ | LocalWorkspace for local file system |
| REQ-011-03 | ⏳ | RemoteWorkspace (planned) |
| REQ-011-04 | ✅ | DockerWorkspace for Docker containers |
| REQ-011-05 | ✅ | Tools work identically regardless of type |
| REQ-011-06 | ✅ | Fast glob search |

## License

MIT
