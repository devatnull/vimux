export interface FileSystemNode {
  name: string;
  path: string;
  isDirectory: boolean;
  content?: string;
  children?: Map<string, FileSystemNode>;
  createdAt: number;
  modifiedAt: number;
}

export interface FileSystem {
  createFile(path: string, content: string): void;
  readFile(path: string): string;
  updateFile(path: string, content: string): void;
  deleteFile(path: string): void;
  renameFile(oldPath: string, newPath: string): void;
  createDirectory(path: string): void;
  listDirectory(path: string): string[];
  exists(path: string): boolean;
  isDirectory(path: string): boolean;
}

function normalizePath(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return "/" + parts.join("/");
}

function getParentPath(path: string): string {
  const normalized = normalizePath(path);
  const parts = normalized.split("/").filter(Boolean);
  parts.pop();
  return parts.length === 0 ? "/" : "/" + parts.join("/");
}

function getBaseName(path: string): string {
  const parts = normalizePath(path).split("/").filter(Boolean);
  return parts[parts.length - 1] || "";
}

class InMemoryFileSystem implements FileSystem {
  private root: FileSystemNode;

  constructor() {
    this.root = {
      name: "",
      path: "/",
      isDirectory: true,
      children: new Map(),
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };
  }

  private getNode(path: string): FileSystemNode | null {
    const normalized = normalizePath(path);
    if (normalized === "/") return this.root;

    const parts = normalized.split("/").filter(Boolean);
    let current = this.root;

    for (const part of parts) {
      if (!current.children?.has(part)) {
        return null;
      }
      current = current.children.get(part)!;
    }

    return current;
  }

  private getParentNode(path: string): FileSystemNode | null {
    const parentPath = getParentPath(path);
    return this.getNode(parentPath);
  }

  createFile(path: string, content: string): void {
    const normalized = normalizePath(path);
    if (this.exists(normalized)) {
      throw new Error(`File already exists: ${normalized}`);
    }

    const parent = this.getParentNode(normalized);
    if (!parent) {
      throw new Error(`Parent directory does not exist: ${getParentPath(normalized)}`);
    }
    if (!parent.isDirectory) {
      throw new Error(`Parent is not a directory: ${getParentPath(normalized)}`);
    }

    const name = getBaseName(normalized);
    const now = Date.now();
    const node: FileSystemNode = {
      name,
      path: normalized,
      isDirectory: false,
      content,
      createdAt: now,
      modifiedAt: now,
    };

    parent.children!.set(name, node);
    parent.modifiedAt = now;
  }

  readFile(path: string): string {
    const normalized = normalizePath(path);
    const node = this.getNode(normalized);

    if (!node) {
      throw new Error(`File not found: ${normalized}`);
    }
    if (node.isDirectory) {
      throw new Error(`Cannot read directory as file: ${normalized}`);
    }

    return node.content ?? "";
  }

  updateFile(path: string, content: string): void {
    const normalized = normalizePath(path);
    const node = this.getNode(normalized);

    if (!node) {
      throw new Error(`File not found: ${normalized}`);
    }
    if (node.isDirectory) {
      throw new Error(`Cannot update directory as file: ${normalized}`);
    }

    node.content = content;
    node.modifiedAt = Date.now();
  }

  deleteFile(path: string): void {
    const normalized = normalizePath(path);
    const node = this.getNode(normalized);

    if (!node) {
      throw new Error(`File not found: ${normalized}`);
    }

    const parent = this.getParentNode(normalized);
    if (parent?.children) {
      parent.children.delete(getBaseName(normalized));
      parent.modifiedAt = Date.now();
    }
  }

  renameFile(oldPath: string, newPath: string): void {
    const normalizedOld = normalizePath(oldPath);
    const normalizedNew = normalizePath(newPath);

    const node = this.getNode(normalizedOld);
    if (!node) {
      throw new Error(`File not found: ${normalizedOld}`);
    }

    if (this.exists(normalizedNew)) {
      throw new Error(`Destination already exists: ${normalizedNew}`);
    }

    const newParent = this.getParentNode(normalizedNew);
    if (!newParent) {
      throw new Error(`Parent directory does not exist: ${getParentPath(normalizedNew)}`);
    }
    if (!newParent.isDirectory) {
      throw new Error(`Parent is not a directory: ${getParentPath(normalizedNew)}`);
    }

    const oldParent = this.getParentNode(normalizedOld);
    if (oldParent?.children) {
      oldParent.children.delete(getBaseName(normalizedOld));
      oldParent.modifiedAt = Date.now();
    }

    const newName = getBaseName(normalizedNew);
    node.name = newName;
    node.path = normalizedNew;
    node.modifiedAt = Date.now();

    if (node.isDirectory && node.children) {
      this.updateChildPaths(node, normalizedNew);
    }

    newParent.children!.set(newName, node);
    newParent.modifiedAt = Date.now();
  }

  private updateChildPaths(node: FileSystemNode, parentPath: string): void {
    if (!node.children) return;

    for (const child of node.children.values()) {
      child.path = `${parentPath}/${child.name}`;
      if (child.isDirectory && child.children) {
        this.updateChildPaths(child, child.path);
      }
    }
  }

  createDirectory(path: string): void {
    const normalized = normalizePath(path);
    if (this.exists(normalized)) {
      throw new Error(`Path already exists: ${normalized}`);
    }

    const parent = this.getParentNode(normalized);
    if (!parent) {
      throw new Error(`Parent directory does not exist: ${getParentPath(normalized)}`);
    }
    if (!parent.isDirectory) {
      throw new Error(`Parent is not a directory: ${getParentPath(normalized)}`);
    }

    const name = getBaseName(normalized);
    const now = Date.now();
    const node: FileSystemNode = {
      name,
      path: normalized,
      isDirectory: true,
      children: new Map(),
      createdAt: now,
      modifiedAt: now,
    };

    parent.children!.set(name, node);
    parent.modifiedAt = now;
  }

  listDirectory(path: string): string[] {
    const normalized = normalizePath(path);
    const node = this.getNode(normalized);

    if (!node) {
      throw new Error(`Directory not found: ${normalized}`);
    }
    if (!node.isDirectory) {
      throw new Error(`Not a directory: ${normalized}`);
    }

    return Array.from(node.children?.keys() ?? []).sort();
  }

  exists(path: string): boolean {
    return this.getNode(normalizePath(path)) !== null;
  }

  isDirectory(path: string): boolean {
    const node = this.getNode(normalizePath(path));
    return node?.isDirectory ?? false;
  }
}

const SAMPLE_MAIN_TS = `import { greet } from './utils';
import type { User, Config } from './types';

const config: Config = {
  apiUrl: 'https://api.example.com',
  timeout: 5000,
  retries: 3,
};

async function main(): Promise<void> {
  const user: User = {
    id: '1',
    name: 'Alice',
    email: 'alice@example.com',
    role: 'admin',
  };

  console.log(greet(user.name));
  console.log('Config:', config);
}

main().catch(console.error);
`;

const SAMPLE_UTILS_TS = `export function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\\w\\s-]/g, '')
    .replace(/[\\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
`;

const SAMPLE_TYPES_TS = `export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Config {
  apiUrl: string;
  timeout: number;
  retries: number;
  debug?: boolean;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
  timestamp: number;
}

export type UserRole = User['role'];

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrev: boolean;
}
`;

const SAMPLE_README_MD = `# Sample Project

A TypeScript project demonstrating common patterns and best practices.

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## Project Structure

- \`src/\` - Source code
  - \`main.ts\` - Application entry point
  - \`utils.ts\` - Utility functions
  - \`types.ts\` - TypeScript type definitions
- \`tests/\` - Test files
- \`docs/\` - Documentation
- \`config/\` - Configuration files

## Scripts

- \`npm run dev\` - Start development server
- \`npm run build\` - Build for production
- \`npm test\` - Run tests
- \`npm run lint\` - Run linter

## License

MIT
`;

const SAMPLE_PACKAGE_JSON = `{
  "name": "sample-project",
  "version": "1.0.0",
  "description": "A sample TypeScript project",
  "main": "dist/main.js",
  "scripts": {
    "dev": "tsx watch src/main.ts",
    "build": "tsc",
    "test": "vitest",
    "lint": "eslint src/"
  },
  "dependencies": {
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "tsx": "^4.7.0",
    "vitest": "^1.2.0",
    "eslint": "^8.56.0"
  }
}
`;

const SAMPLE_MAIN_TEST_TS = `import { describe, it, expect } from 'vitest';
import { greet, capitalize, slugify } from '../src/utils';

describe('greet', () => {
  it('should greet the user by name', () => {
    expect(greet('Alice')).toBe('Hello, Alice!');
  });

  it('should handle empty string', () => {
    expect(greet('')).toBe('Hello, !');
  });
});

describe('capitalize', () => {
  it('should capitalize first letter', () => {
    expect(capitalize('hello')).toBe('Hello');
  });

  it('should handle already capitalized', () => {
    expect(capitalize('Hello')).toBe('Hello');
  });
});

describe('slugify', () => {
  it('should convert text to slug', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('should remove special characters', () => {
    expect(slugify('Hello! World?')).toBe('hello-world');
  });
});
`;

const SAMPLE_API_MD = `# API Documentation

## Endpoints

### GET /users

Returns a list of users.

**Response:**
\`\`\`json
{
  "items": [...],
  "total": 100,
  "page": 1,
  "pageSize": 10
}
\`\`\`

### GET /users/:id

Returns a single user by ID.

### POST /users

Creates a new user.

**Request Body:**
\`\`\`json
{
  "name": "string",
  "email": "string",
  "role": "admin" | "user" | "guest"
}
\`\`\`
`;

const SAMPLE_APP_CONFIG_JSON = `{
  "app": {
    "name": "Sample App",
    "version": "1.0.0",
    "environment": "development"
  },
  "server": {
    "port": 3000,
    "host": "localhost"
  },
  "database": {
    "host": "localhost",
    "port": 5432,
    "name": "sample_db"
  },
  "logging": {
    "level": "debug",
    "format": "json"
  }
}
`;

export function createDefaultFileSystem(): FileSystem {
  const fs = new InMemoryFileSystem();

  fs.createDirectory("/src");
  fs.createDirectory("/tests");
  fs.createDirectory("/docs");
  fs.createDirectory("/config");

  fs.createFile("/src/main.ts", SAMPLE_MAIN_TS);
  fs.createFile("/src/utils.ts", SAMPLE_UTILS_TS);
  fs.createFile("/src/types.ts", SAMPLE_TYPES_TS);

  fs.createFile("/tests/main.test.ts", SAMPLE_MAIN_TEST_TS);

  fs.createFile("/docs/api.md", SAMPLE_API_MD);

  fs.createFile("/config/app.json", SAMPLE_APP_CONFIG_JSON);

  fs.createFile("/README.md", SAMPLE_README_MD);
  fs.createFile("/package.json", SAMPLE_PACKAGE_JSON);

  return fs;
}
