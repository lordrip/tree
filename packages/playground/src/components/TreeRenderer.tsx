import type { TreeNode } from '@iron-bark/tree';

interface TreeRendererProps {
  node: TreeNode<unknown>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  depth?: number;
  isLast?: boolean;
  prefix?: string;
}

export function TreeRenderer({
  node,
  selectedId,
  onSelect,
  depth = 0,
  isLast = true,
  prefix = '',
}: TreeRendererProps) {
  const connector = depth === 0 ? '' : isLast ? '└── ' : '├── ';
  const kindTag = node.nodeKind === 'group' ? ' [group]' : '';
  const label = `${prefix}${connector}${node.getLabel()}${kindTag}`;

  const childPrefix = depth === 0 ? '' : prefix + (isLast ? '    ' : '│   ');
  const children = node.getChildren();

  return (
    <>
      <div
        className={`tree-line${node.id === selectedId ? ' selected' : ''}`}
        onClick={() => onSelect(node.id)}
      >
        {label}
      </div>
      {children.map((child, i) => (
        <TreeRenderer
          key={child.id}
          node={child}
          selectedId={selectedId}
          onSelect={onSelect}
          depth={depth + 1}
          isLast={i === children.length - 1}
          prefix={childPrefix}
        />
      ))}
    </>
  );
}
