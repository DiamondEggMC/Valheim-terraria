/** Oxlint 自定义插件 - 检查样式文件是否存在 */

import fs from 'node:fs';
import path from 'node:path';
import { ResolverFactory, type ResolveResult } from 'oxc-resolver';
import type { Rule, ESLint } from 'eslint';
import type { ImportDeclaration } from 'estree';

const STYLE_EXTENSIONS: RegExp = /\.(css|scss|sass|less|styl)$/i;

const resolverCache = new Map<string, ResolverFactory>();

function getResolver(projectRoot: string): ResolverFactory {
  if (!resolverCache.has(projectRoot)) {
    resolverCache.set(projectRoot, new ResolverFactory({
      extensions: ['.css', '.scss', '.sass', '.less', '.styl'],
      conditionNames: ['import', 'require', 'node', 'default'],
      tsconfig: {
        configFile: path.join(projectRoot, 'tsconfig.json'),
        references: 'auto',
      },
    }));
  }
  return resolverCache.get(projectRoot)!;
}

const checkStyleImportRule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: { description: 'Check if imported style files exist' },
    messages: {
      styleNotFound: "Style file '{{source}}' does not exist or cannot be resolved",
    },
    schema: [],
  },
  create(context: Rule.RuleContext): Rule.RuleListener {
    let projectRoot: string = path.dirname(context.filename);
    while (projectRoot !== path.dirname(projectRoot)) {
      if (fs.existsSync(path.join(projectRoot, 'package.json'))) break;
      projectRoot = path.dirname(projectRoot);
    }

    const resolver = getResolver(projectRoot);
    const currentDir = path.dirname(context.filename);

    return {
      ImportDeclaration(node: ImportDeclaration & Rule.NodeParentExtension) {
        const source = node.source.value as string | null;
        if (typeof source !== 'string' || !STYLE_EXTENSIONS.test(source)) return;

        try {
          const resolved: ResolveResult = resolver.sync(currentDir, source);
          if (!resolved.path || !fs.existsSync(resolved.path)) {
            context.report({ node: node.source, messageId: 'styleNotFound', data: { source } });
          }
        } catch {
          context.report({ node: node.source, messageId: 'styleNotFound', data: { source } });
        }
      },
    };
  },
};

const plugin: ESLint.Plugin = {
  meta: { name: 'check-style-exists' },
  rules: { 'no-missing-style': checkStyleImportRule },
};

export default plugin;
