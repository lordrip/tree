import type { TreeNode, TreeNodeConfig, NodeKind, NodeAccessors } from './types.js';

export class DefaultTreeNode<T> implements TreeNode<T> {
  readonly id: string;
  readonly nodeKind: NodeKind;
  readonly data: T;

  private readonly accessors: NodeAccessors<T>;
  private parent: TreeNode<T> | undefined;
  private readonly children: TreeNode<T>[] = [];
  private next: TreeNode<T> | undefined;
  private previous: TreeNode<T> | undefined;

  constructor(config: TreeNodeConfig<T>) {
    this.id = config.id;
    this.nodeKind = config.nodeKind;
    this.data = config.data;
    this.accessors = config.accessors;
  }

  getLabel(): string {
    return this.accessors.getLabel(this.data);
  }

  getDescription(): string {
    return this.accessors.getDescription(this.data);
  }

  getName(): string {
    return this.accessors.getName(this.data);
  }

  getIconUrl(): string | undefined {
    return this.accessors.getIconUrl(this.data);
  }

  getParent(): TreeNode<T> | undefined {
    return this.parent;
  }

  setParent(node: TreeNode<T> | undefined): void {
    this.parent = node;
  }

  getChildren(): TreeNode<T>[] {
    return this.children;
  }

  addChild(child: TreeNode<T>): void {
    this.children.push(child);
    child.setParent(this);
  }

  removeChild(child: TreeNode<T>): void {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      this.children.splice(index, 1);
      child.setParent(undefined);
    }
  }

  getNextNode(): TreeNode<T> | undefined {
    return this.next;
  }

  setNextNode(node: TreeNode<T> | undefined): void {
    this.next = node;
  }

  getPreviousNode(): TreeNode<T> | undefined {
    return this.previous;
  }

  setPreviousNode(node: TreeNode<T> | undefined): void {
    this.previous = node;
  }
}
