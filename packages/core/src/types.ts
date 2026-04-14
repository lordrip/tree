export type NodeKind = 'group' | 'leaf' | 'placeholder';

export interface NodeAccessors<T> {
  getLabel: (data: T) => string;
  getDescription: (data: T) => string;
  getName: (data: T) => string;
  getIconUrl: (data: T) => string | undefined;
}

export interface TreeNodeConfig<T> {
  id: string;
  nodeKind: NodeKind;
  data: T;
  accessors: NodeAccessors<T>;
}

export interface TreeNode<T> {
  readonly id: string;
  readonly nodeKind: NodeKind;
  readonly data: T;

  getLabel(): string;
  getDescription(): string;
  getName(): string;
  getIconUrl(): string | undefined;

  getParent(): TreeNode<T> | undefined;
  setParent(node: TreeNode<T> | undefined): void;
  getChildren(): TreeNode<T>[];
  addChild(child: TreeNode<T>): void;
  removeChild(child: TreeNode<T>): void;
  getNextNode(): TreeNode<T> | undefined;
  setNextNode(node: TreeNode<T> | undefined): void;
  getPreviousNode(): TreeNode<T> | undefined;
  setPreviousNode(node: TreeNode<T> | undefined): void;
}

export interface Tree<T> {
  readonly type: string;
  readonly root: TreeNode<T>;

  walk(order?: 'depth-first' | 'breadth-first'): Iterable<TreeNode<T>>;
  findById(id: string): TreeNode<T> | undefined;
}
