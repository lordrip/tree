import type { TreeNode } from '@iron-bark/tree';

interface NodeDetailsProps {
  node: TreeNode<unknown>;
}

export function NodeDetails({ node }: NodeDetailsProps) {
  return (
    <div className="node-details">
      <h3>Node Details</h3>
      <dl>
        <dt>ID</dt>
        <dd>{node.id}</dd>

        <dt>Label</dt>
        <dd>{node.getLabel()}</dd>

        <dt>Name</dt>
        <dd>{node.getName()}</dd>

        <dt>Description</dt>
        <dd>{node.getDescription()}</dd>

        <dt>Icon URL</dt>
        <dd>{node.getIconUrl() ?? '(none)'}</dd>

        <dt>Kind</dt>
        <dd>{node.nodeKind}</dd>

        <dt>Parent</dt>
        <dd>{node.getParent()?.id ?? '(none)'}</dd>

        <dt>Previous</dt>
        <dd>{node.getPreviousNode()?.id ?? '(none)'}</dd>

        <dt>Next</dt>
        <dd>{node.getNextNode()?.id ?? '(none)'}</dd>

        <dt>Children</dt>
        <dd>{node.getChildren().map((c) => c.id).join(', ') || '(none)'}</dd>

        <dt>Data</dt>
        <dd><pre>{JSON.stringify(node.data, null, 2)}</pre></dd>
      </dl>
    </div>
  );
}
