import { useState } from 'react';
import type { Tree } from '@iron-bark/tree';
import { createCamelTree } from '@iron-bark/tree-camel';
import type { CamelNodeData } from '@iron-bark/tree-camel';
import { TreeRenderer } from './components/TreeRenderer.js';
import { NodeDetails } from './components/NodeDetails.js';
import './App.css';

const SAMPLE_ROUTE = `- route:
    id: my-route
    from:
      uri: timer:tick?period=1000
      steps:
        - log:
            message: "Hello World"
        - choice:
            when:
              - simple:
                  expression: "\${header.foo} == 1"
                steps:
                  - log:
                      message: "matched"
            otherwise:
              steps:
                - to:
                    uri: direct:fallback
        - to:
            uri: direct:end`;

export function App() {
  const [source, setSource] = useState(SAMPLE_ROUTE);
  const [tree, setTree] = useState<Tree<CamelNodeData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function handleParse() {
    try {
      const result = createCamelTree(source, 'yaml');
      setTree(result);
      setError(null);
      setSelectedId(null);
    } catch (e) {
      setError(String(e));
      setTree(null);
    }
  }

  const selectedNode = tree && selectedId ? tree.findById(selectedId) : null;

  return (
    <div className="app">
      <div className="header">@iron-bark/tree playground</div>
      <div className="input-pane">
        <textarea value={source} onChange={(e) => setSource(e.target.value)} />
        <div>
          <button onClick={handleParse}>Parse</button>
        </div>
        {error && <div className="error">{error}</div>}
      </div>
      <div className="output-pane">
        {tree && (
          <>
            <TreeRenderer
              node={tree.root}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
            {selectedNode && <NodeDetails node={selectedNode} />}
          </>
        )}
      </div>
    </div>
  );
}
