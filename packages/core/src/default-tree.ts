import type { Tree, TreeNode } from './types.js';

export class DefaultTree<T> implements Tree<T> {
  constructor(
    readonly type: string,
    readonly root: TreeNode<T>,
  ) {}

  *walk(order: 'depth-first' | 'breadth-first' = 'depth-first'): Iterable<TreeNode<T>> {
    if (order === 'breadth-first') {
      yield* this.breadthFirst();
    } else {
      yield* this.depthFirst();
    }
  }

  findById(id: string): TreeNode<T> | undefined {
    for (const node of this.walk()) {
      if (node.id === id) {
        return node;
      }
    }
    return undefined;
  }

  private *depthFirst(): Iterable<TreeNode<T>> {
    const stack: TreeNode<T>[] = [this.root];

    while (stack.length > 0) {
      const node = stack.pop()!;
      yield node;

      const children = node.getChildren();
      for (let i = children.length - 1; i >= 0; i--) {
        stack.push(children[i]);
      }
    }
  }

  private *breadthFirst(): Iterable<TreeNode<T>> {
    const queue: TreeNode<T>[] = [this.root];

    while (queue.length > 0) {
      const node = queue.shift()!;
      yield node;

      for (const child of node.getChildren()) {
        queue.push(child);
      }
    }
  }
}
