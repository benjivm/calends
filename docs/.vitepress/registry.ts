import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

interface RegistryFile {
    path: string;
    type: string;
}

interface RegistryItem {
    name: string;
    dependencies?: string[];
    files: RegistryFile[];
}

interface Registry {
    items: RegistryItem[];
}

const root = new URL('../../', import.meta.url);

async function readJson<T>(path: string): Promise<T> {
    return JSON.parse(await readFile(new URL(path, root), 'utf8')) as T;
}

/**
 * Writes `recipes/registry.json` as a shadcn-vue registry under `<outDir>/r`, which is what
 * `shadcn-vue build` would produce, except that `@calends/*` dependencies get a caret range on the
 * workspace version. In 0.x a caret only spans one minor, so a recipe never installs against a
 * release that predates the props and variables it uses.
 */
export async function writeRegistry(outDir: string): Promise<void> {
    const registry = await readJson<Registry>('recipes/registry.json');
    const { version } = await readJson<{ version: string }>('packages/vue/package.json');
    const pin = (dependency: string) =>
        dependency.startsWith('@calends/') ? `${dependency}@^${version}` : dependency;

    const dir = join(outDir, 'r');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'registry.json'), JSON.stringify(registry, null, 2));

    for (const item of registry.items) {
        const built = {
            $schema: 'https://shadcn-vue.com/schema/registry-item.json',
            ...item,
            dependencies: item.dependencies?.map(pin),
            files: await Promise.all(
                item.files.map(async (file) => ({
                    ...file,
                    content: await readFile(new URL(file.path, root), 'utf8'),
                })),
            ),
        };
        await writeFile(join(dir, `${item.name}.json`), JSON.stringify(built, null, 2));
    }
}
